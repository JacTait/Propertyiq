import { createHmac } from "node:crypto";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";
import { WhopClient, WhopEnvironment } from "@whop/sdk";
import {
  type PurchasedLicenceRecord,
  type PurchasedLicenceStore,
  generateWhopLicenceKey,
  hashPurchasedLicenceKey,
  inspectWhopLicence,
  isWhopLicenceKey,
  maskWhopPaymentId,
  normalizeWhopLicenceKey,
  normalizeWhopPaymentId,
} from "@/lib/auth/purchased-licences";
import { emailsMatch, getSessionSecret, normalizeEmail } from "@/lib/auth/session";

export const WHOP_PAYMENT_SUCCEEDED = "payment.succeeded";
export const WHOP_PAYMENT_FAILED = "payment.failed";
export const WHOP_PAYMENT_REQUIRES_ACTION = "payment.requires_action";
export const WHOP_REFUND_CREATED = "refund.created";
export const WHOP_REFUND_UPDATED = "refund.updated";
export const WHOP_DISPUTE_CREATED = "dispute.created";
export const WHOP_DISPUTE_UPDATED = "dispute.updated";

export type WhopWebhookOutcome =
  | "created"
  | "duplicate"
  | "ignored"
  | "revoked"
  | "missing_email"
  | "wrong_product"
  | "invalid_payment";

export type WhopProcessResult =
  | { ok: true; outcome: WhopWebhookOutcome; httpStatus: 200 }
  | { ok: false; reason: "invalid_signature" | "malformed" | "misconfigured" | "network"; httpStatus: 400 | 401 | 503 };

export interface WhopPaymentSnapshot {
  id: string;
  productIds: string[];
  customerEmail: string | null;
  customerId: string | null;
  membershipId: string | null;
  status: string | null;
  substatus: string | null;
  paidAt: string | null;
}

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getWhopApiKey(): string {
  return readEnv("WHOP_API_KEY");
}

export function getWhopWebhookSecret(): string {
  return readEnv("WHOP_WEBHOOK_SECRET");
}

export function getWhopProductId(): string {
  return readEnv("WHOP_PROPERTYIQ_PRODUCT_ID");
}

export function getWhopEnvironmentName(): "sandbox" | "production" {
  return readEnv("WHOP_ENVIRONMENT").toLowerCase() === "sandbox" ? "sandbox" : "production";
}

export function whopProductConfigured(): boolean {
  return getWhopProductId().length > 0;
}

export function whopWebhookConfigured(): boolean {
  return getWhopWebhookSecret().length > 0 && whopProductConfigured();
}

export function whopApiConfigured(): boolean {
  return getWhopApiKey().length > 0 && whopProductConfigured();
}

function logSafe(event: string, fields?: Record<string, string | number | boolean>): void {
  if (fields) {
    console.info(`[propertyiq-access] ${event}`, fields);
    return;
  }
  console.info(`[propertyiq-access] ${event}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function collectWhopProductIds(data: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const parent = asString(data.product_id);
  if (parent) ids.add(parent);
  if (Array.isArray(data.line_items)) {
    for (const item of data.line_items) {
      if (!isRecord(item)) continue;
      const productId = asString(item.product_id);
      if (productId) ids.add(productId);
    }
  }
  return [...ids];
}

export function paymentMatchesPropertyIq(productIds: string[], expected = getWhopProductId()): boolean {
  if (!expected) return false;
  return productIds.includes(expected);
}

function nestedId(value: unknown): string | null {
  if (typeof value === "string") return asString(value);
  if (isRecord(value)) return asString(value.id);
  return null;
}

export function parseWhopPaymentSnapshot(data: unknown): WhopPaymentSnapshot | null {
  if (!isRecord(data)) return null;
  const id = asString(data.id);
  if (!id) return null;
  const user = isRecord(data.user) ? data.user : null;
  const member = isRecord(data.member) ? data.member : null;
  return {
    id,
    productIds: collectWhopProductIds(data),
    customerEmail: asString(data.customer_email) ?? (user ? asString(user.email) : null),
    customerId: nestedId(data.member_id) ?? (member ? asString(member.id) : null),
    membershipId: nestedId(data.membership_id) ?? nestedId(data.membership),
    status: asString(data.status),
    substatus: asString(data.substatus),
    paidAt: asString(data.paid_at),
  };
}

export function parseWhopRefundPaymentId(data: unknown): { paymentId: string; status: string | null } | null {
  if (!isRecord(data)) return null;
  const paymentId = asString(data.payment_id);
  if (!paymentId) return null;
  return { paymentId, status: asString(data.status) };
}

export function parseWhopDispute(data: unknown): { paymentId: string; status: string | null } | null {
  if (!isRecord(data)) return null;
  const payment = isRecord(data.payment) ? data.payment : null;
  const paymentId = (payment ? asString(payment.id) : null) ?? asString(data.payment_id);
  if (!paymentId) return null;
  return { paymentId, status: asString(data.status) };
}

function paymentLooksSucceeded(payment: WhopPaymentSnapshot): boolean {
  if (payment.status === "open" || payment.status === "void" || payment.status === "uncollectible") {
    return false;
  }
  if (payment.status === "paid" || payment.substatus === "succeeded" || payment.paidAt) return true;
  return payment.status == null && payment.substatus == null;
}

export function verifyWhopWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  secret = getWhopWebhookSecret(),
): { ok: true; payload: unknown } | { ok: false; reason: "invalid_signature" | "malformed" | "misconfigured" } {
  if (!secret) return { ok: false, reason: "misconfigured" };
  try {
    const payload = unwrapWebhook(rawBody, { headers, key: secret });
    return { ok: true, payload };
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return { ok: false, reason: "invalid_signature" };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, reason: "malformed" };
    }
    if (error instanceof Error && error.message.includes("Cannot verify a webhook without a key")) {
      return { ok: false, reason: "misconfigured" };
    }
    return { ok: false, reason: "malformed" };
  }
}

function envelopeFields(payload: unknown): { id: string | null; type: string | null; data: unknown } {
  if (!isRecord(payload)) return { id: null, type: null, data: payload };
  return {
    id: asString(payload.id),
    type: asString(payload.type),
    data: "data" in payload ? payload.data : payload,
  };
}

async function issueForPayment(
  store: PurchasedLicenceStore,
  payment: WhopPaymentSnapshot,
  productId: string,
  now: number,
): Promise<{ outcome: "created" | "duplicate"; record: PurchasedLicenceRecord }> {
  const licenceKey = generateWhopLicenceKey(payment.id);
  const issued = await store.issueLicence({
    provider: "whop",
    providerPurchaseId: payment.id,
    providerCustomerId: payment.customerId,
    providerMembershipId: payment.membershipId,
    productId,
    customerEmail: payment.customerEmail ?? "",
    licenceKey,
    now,
    metadata: {
      source: "whop",
      productMatch: true,
    },
  });
  return {
    outcome: issued.duplicate ? "duplicate" : "created",
    record: issued.record,
  };
}

export async function processWhopWebhookPayload(
  payload: unknown,
  options: {
    store: PurchasedLicenceStore;
    webhookId: string;
    now?: number;
    productId?: string;
  },
): Promise<{ outcome: WhopWebhookOutcome }> {
  const now = options.now ?? Date.now();
  const productId = options.productId ?? getWhopProductId();
  const envelope = envelopeFields(payload);
  const eventType = envelope.type ?? "";
  const webhookId = options.webhookId;

  if (!eventType) {
    logSafe("whop_webhook_ignored", { outcome: "malformed_type" });
    return { outcome: "ignored" };
  }

  if (eventType === WHOP_PAYMENT_FAILED || eventType === WHOP_PAYMENT_REQUIRES_ACTION) {
    logSafe("whop_webhook_ignored", { outcome: "not_succeeded", eventType });
    return { outcome: "ignored" };
  }

  if (eventType === WHOP_PAYMENT_SUCCEEDED) {
    if (!productId) {
      logSafe("whop_webhook_misconfigured", { outcome: "missing_product_id" });
      throw Object.assign(new Error("misconfigured"), { code: "misconfigured" as const });
    }
    const payment = parseWhopPaymentSnapshot(envelope.data);
    if (!payment) {
      logSafe("whop_webhook_ignored", { outcome: "invalid_payment", eventType });
      return { outcome: "invalid_payment" };
    }
    const paymentMask = maskWhopPaymentId(payment.id);
    if (!paymentLooksSucceeded(payment)) {
      logSafe("whop_webhook_ignored", {
        outcome: "not_completed",
        eventType,
        payment: paymentMask,
      });
      return { outcome: "ignored" };
    }
    if (!paymentMatchesPropertyIq(payment.productIds, productId)) {
      logSafe("whop_webhook_ignored", {
        outcome: "wrong_product",
        eventType,
        payment: paymentMask,
        productMatch: false,
      });
      return { outcome: "wrong_product" };
    }
    if (!payment.customerEmail || !normalizeEmail(payment.customerEmail)) {
      logSafe("whop_webhook_ignored", {
        outcome: "missing_email",
        eventType,
        payment: paymentMask,
        productMatch: true,
      });
      return { outcome: "missing_email" };
    }

    return options.store.processVerifiedEvent(
      {
        id: webhookId,
        provider: "whop",
        eventType,
        providerPurchaseId: payment.id,
        outcome: "pending",
        now,
      },
      async (tx, inserted) => {
        if (!inserted) {
          const existing = await tx.findByPurchase("whop", payment.id);
          logSafe("whop_webhook_duplicate", {
            outcome: "duplicate",
            eventType,
            payment: paymentMask,
            productMatch: true,
          });
          return { outcome: "duplicate" as const, record: existing };
        }
        const issued = await issueForPayment(tx, payment, productId, now);
        logSafe(issued.outcome === "created" ? "whop_licence_created" : "whop_webhook_duplicate", {
          outcome: issued.outcome,
          eventType,
          payment: paymentMask,
          productMatch: true,
          licence: issued.record.licencePrefix,
        });
        return { outcome: issued.outcome };
      },
    );
  }

  if (eventType === WHOP_REFUND_CREATED || eventType === WHOP_REFUND_UPDATED) {
    const refund = parseWhopRefundPaymentId(envelope.data);
    if (!refund || refund.status !== "succeeded") {
      logSafe("whop_webhook_ignored", { outcome: "refund_not_succeeded", eventType });
      return { outcome: "ignored" };
    }
    const paymentMask = maskWhopPaymentId(refund.paymentId);
    return options.store.processVerifiedEvent(
      {
        id: webhookId,
        provider: "whop",
        eventType,
        providerPurchaseId: refund.paymentId,
        outcome: "revoked",
        now,
      },
      async (tx, inserted) => {
        if (!inserted) {
          logSafe("whop_webhook_duplicate", { outcome: "duplicate", eventType, payment: paymentMask });
          return { outcome: "duplicate" as const };
        }
        const record = await tx.revokeByPurchase("whop", refund.paymentId, now);
        logSafe("whop_licence_revoked", {
          outcome: record ? "revoked" : "ignored",
          eventType,
          payment: paymentMask,
        });
        return { outcome: record ? ("revoked" as const) : ("ignored" as const) };
      },
    );
  }

  if (eventType === WHOP_DISPUTE_CREATED || eventType === WHOP_DISPUTE_UPDATED) {
    const dispute = parseWhopDispute(envelope.data);
    if (!dispute || (dispute.status !== "lost" && dispute.status !== "prevented")) {
      logSafe("whop_webhook_ignored", { outcome: "dispute_not_lost", eventType });
      return { outcome: "ignored" };
    }
    const paymentMask = maskWhopPaymentId(dispute.paymentId);
    return options.store.processVerifiedEvent(
      {
        id: webhookId,
        provider: "whop",
        eventType,
        providerPurchaseId: dispute.paymentId,
        outcome: "revoked",
        now,
      },
      async (tx, inserted) => {
        if (!inserted) {
          logSafe("whop_webhook_duplicate", { outcome: "duplicate", eventType, payment: paymentMask });
          return { outcome: "duplicate" as const };
        }
        const record = await tx.revokeByPurchase("whop", dispute.paymentId, now);
        logSafe("whop_licence_revoked", {
          outcome: record ? "revoked" : "ignored",
          eventType,
          payment: paymentMask,
        });
        return { outcome: record ? ("revoked" as const) : ("ignored" as const) };
      },
    );
  }

  logSafe("whop_webhook_ignored", { outcome: "unrelated_event", eventType });
  return { outcome: "ignored" };
}

export async function handleWhopWebhookRequest(
  request: Request,
  options: {
    store?: PurchasedLicenceStore;
    now?: number;
    secret?: string;
    productId?: string;
  } = {},
): Promise<{ body: Record<string, unknown>; status: number }> {
  const secret = options.secret ?? getWhopWebhookSecret();
  if (!secret) {
    logSafe("whop_webhook_misconfigured", { outcome: "missing_secret" });
    return { status: 503, body: { ok: false, error: "misconfigured" } };
  }

  const rawBody = await request.text();
  const headers = headersToRecord(request.headers);
  const verified = verifyWhopWebhookSignature(rawBody, headers, secret);
  if (!verified.ok) {
    const status = verified.reason === "invalid_signature" ? 401 : verified.reason === "misconfigured" ? 503 : 400;
    logSafe("whop_webhook_rejected", { outcome: verified.reason });
    return { status, body: { ok: false, error: verified.reason } };
  }

  if (!isRecord(verified.payload)) {
    logSafe("whop_webhook_rejected", { outcome: "malformed" });
    return { status: 400, body: { ok: false, error: "malformed" } };
  }

  const webhookId = asString(headers["webhook-id"]) ?? asString(verified.payload.id);
  if (!webhookId) {
    logSafe("whop_webhook_rejected", { outcome: "malformed" });
    return { status: 400, body: { ok: false, error: "malformed" } };
  }

  let store: PurchasedLicenceStore;
  try {
    store = options.store ?? (await import("@/lib/db/purchased-licence-store")).getPurchasedLicenceStore();
  } catch {
    logSafe("whop_webhook_failed", { outcome: "network" });
    return { status: 503, body: { ok: false, error: "network" } };
  }

  try {
    const processed = await processWhopWebhookPayload(verified.payload, {
      store,
      webhookId,
      now: options.now,
      productId: options.productId ?? getWhopProductId(),
    });
    return { status: 200, body: { ok: true, outcome: processed.outcome } };
  } catch (error) {
    if (isRecord(error) && error.code === "misconfigured") {
      return { status: 503, body: { ok: false, error: "misconfigured" } };
    }
    logSafe("whop_webhook_failed", { outcome: "network" });
    return { status: 503, body: { ok: false, error: "network" } };
  }
}

export type VerifyWhopLicenceResult =
  | { ok: true; record: PurchasedLicenceRecord }
  | { ok: false; reason: "invalid" | "disabled" | "email_mismatch" | "network" | "misconfigured" };

export async function verifyWhopLicence(
  email: string,
  licenceKey: string,
  store: PurchasedLicenceStore,
): Promise<VerifyWhopLicenceResult> {
  if (getSessionSecret().length < 16) {
    logSafe("verify_misconfigured", { provider: "whop" });
    return { ok: false, reason: "misconfigured" };
  }
  const normalisedKey = normalizeWhopLicenceKey(licenceKey);
  if (!isWhopLicenceKey(normalisedKey)) {
    return { ok: false, reason: "invalid" };
  }
  let record: PurchasedLicenceRecord | null;
  try {
    record = await store.findByHash(hashPurchasedLicenceKey(normalisedKey));
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!record) {
    logSafe("verify_denied", { provider: "whop", outcome: "invalid", licence: `PIQ-WHOP-****-****-${normalisedKey.slice(-4)}` });
    return { ok: false, reason: "invalid" };
  }
  const inspected = inspectWhopLicence(record, email, normalisedKey);
  if (!inspected.ok) {
    logSafe("verify_denied", {
      provider: "whop",
      outcome: inspected.reason,
      licence: record.licencePrefix,
    });
    return inspected;
  }
  logSafe("verify_ok", { provider: "whop", licence: record.licencePrefix });
  return { ok: true, record };
}

export type ClaimWhopLicenceResult =
  | { ok: true; licenceKey: string; email: string }
  | { ok: false; reason: "invalid" | "disabled" | "network" | "misconfigured" };

export async function claimWhopLicence(
  email: string,
  paymentId: string,
  store: PurchasedLicenceStore,
): Promise<ClaimWhopLicenceResult> {
  if (getSessionSecret().length < 16) {
    return { ok: false, reason: "misconfigured" };
  }
  const normalisedEmail = normalizeEmail(email);
  const normalisedPayment = normalizeWhopPaymentId(paymentId);
  if (!normalisedEmail || !normalisedPayment) {
    return { ok: false, reason: "invalid" };
  }

  // Constant-ish work so a missing purchase is not cheaper than a hit.
  createHmac("sha256", getSessionSecret()).update(`propertyiq:whop:claim:${normalisedPayment}`, "utf8").digest("hex");

  let record: PurchasedLicenceRecord | null;
  try {
    record = await store.findByPurchase("whop", normalisedPayment);
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!record || !emailsMatch(normalisedEmail, record.customerEmail)) {
    logSafe("whop_claim_denied", { outcome: "invalid", payment: maskWhopPaymentId(normalisedPayment) });
    return { ok: false, reason: "invalid" };
  }
  if (record.status !== "active" || record.revokedAt != null) {
    logSafe("whop_claim_denied", { outcome: "disabled", payment: maskWhopPaymentId(normalisedPayment) });
    return { ok: false, reason: "disabled" };
  }

  const licenceKey = generateWhopLicenceKey(record.providerPurchaseId);
  if (hashPurchasedLicenceKey(licenceKey) !== record.licenceHash) {
    logSafe("whop_claim_denied", { outcome: "invalid", payment: maskWhopPaymentId(normalisedPayment) });
    return { ok: false, reason: "invalid" };
  }

  logSafe("whop_claim_ok", { payment: maskWhopPaymentId(normalisedPayment), licence: record.licencePrefix });
  return { ok: true, licenceKey, email: record.customerEmail };
}

export interface WhopPaymentLookup {
  retrieve(paymentId: string): Promise<WhopPaymentSnapshot | null | "network">;
}

export function createWhopPaymentLookup(): WhopPaymentLookup {
  return {
    async retrieve(paymentId: string) {
      const token = getWhopApiKey();
      if (!token) return "network";
      try {
        const client = new WhopClient({
          token,
          environment:
            getWhopEnvironmentName() === "sandbox" ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
        });
        const payment = await client.payments.retrieve({ id: paymentId });
        return parseWhopPaymentSnapshot(payment);
      } catch {
        return "network";
      }
    },
  };
}

export async function reconcileWhopPayment(
  paymentId: string,
  options: {
    store: PurchasedLicenceStore;
    lookup?: WhopPaymentLookup;
    now?: number;
  },
): Promise<
  | { ok: true; outcome: "created" | "duplicate"; record: PurchasedLicenceRecord }
  | { ok: false; reason: "invalid" | "wrong_product" | "missing_email" | "network" | "misconfigured" }
> {
  if (!whopProductConfigured() || getSessionSecret().length < 16) {
    return { ok: false, reason: "misconfigured" };
  }
  const lookup = options.lookup ?? createWhopPaymentLookup();
  const snapshot = await lookup.retrieve(normalizeWhopPaymentId(paymentId));
  if (snapshot === "network") return { ok: false, reason: "network" };
  if (!snapshot || !paymentLooksSucceeded(snapshot)) return { ok: false, reason: "invalid" };
  if (!paymentMatchesPropertyIq(snapshot.productIds)) return { ok: false, reason: "wrong_product" };
  if (!snapshot.customerEmail) return { ok: false, reason: "missing_email" };

  const existing = await options.store.findByPurchase("whop", snapshot.id);
  if (existing) return { ok: true, outcome: "duplicate", record: existing };

  const issued = await issueForPayment(options.store, snapshot, getWhopProductId(), options.now ?? Date.now());
  return { ok: true, outcome: issued.outcome, record: issued.record };
}
