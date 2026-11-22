import { readFileSync } from "node:fs";
import { createHmac as hmac } from "node:crypto";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import {
  MemoryPurchasedLicenceStore,
  generateWhopLicenceKey,
  isWhopLicenceKey,
  normalizeWhopLicenceKey,
} from "@/lib/auth/purchased-licences";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  type PayhipCallResult,
  type PayhipClient,
  activateAccess,
  activateTesterAccess,
  createAccessSession,
  validateAccessSession,
} from "@/lib/auth/propertyiq-access";
import { ACCESS_COOKIE_NAME, isProtectedApiPath, isProtectedPath } from "@/lib/auth/routes";
import { resolveAccessGate } from "@/lib/auth/gate";
import { MemoryTesterStore, generateTesterCode } from "@/lib/auth/tester-codes";
import {
  handleWhopWebhookRequest,
  processWhopWebhookPayload,
  reconcileWhopPayment,
  verifyWhopWebhookSignature,
} from "@/lib/auth/whop";
import { parseAccessSession } from "@/lib/auth/session";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const SECRET = "propertyiq-session-secret-key";
const WEBHOOK_SECRET = "ws_propertyiq_test_webhook_secret";
const PRODUCT_ID = "prod_propertyiq_test";
const EMAIL = "buyer@example.com";
const PAYMENT_ID = "pay_propertyiq_test1";

class MemoryCookieStore implements AccessCookieStore {
  private readonly values = new Map<string, string>();

  get(name: string): { value: string } | undefined {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }

  set(name: string, value: string, options?: AccessCookieOptions): void {
    void options;
    if (!value) this.values.delete(name);
    else this.values.set(name, value);
  }

  delete(name: string): void {
    this.values.delete(name);
  }

  raw(name: string): string | undefined {
    return this.values.get(name);
  }
}

function emptyPayhip(): PayhipClient {
  return {
    async verify(): Promise<PayhipCallResult> {
      return { status: "empty" };
    },
    async incrementUsage(): Promise<PayhipCallResult> {
      return { status: "empty" };
    },
    async decrementUsage(): Promise<PayhipCallResult> {
      return { status: "empty" };
    },
  };
}

function signWhopWebhook(
  body: string,
  secret = WEBHOOK_SECRET,
  id = "msg_whop_test",
  timestamp = Math.floor(Date.now() / 1000),
): { id: string; timestamp: number; headers: Record<string, string> } {
  const signature = hmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    id,
    timestamp,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
  };
}

function paymentPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_payment_1",
    api_version: "v1",
    type: "payment.succeeded",
    data: {
      id: PAYMENT_ID,
      status: "paid",
      substatus: "succeeded",
      paid_at: "2026-01-01T12:00:00.000Z",
      customer_email: EMAIL,
      product_id: PRODUCT_ID,
      membership_id: "mem_propertyiq",
      member_id: "mber_propertyiq",
      line_items: [{ product_id: PRODUCT_ID, quantity: 1, label: "PropertyIQ" }],
      ...overrides,
    },
  };
}

function signedRequest(payload: unknown, options: { id?: string; secret?: string; raw?: string } = {}) {
  const body = options.raw ?? JSON.stringify(payload);
  const signed = signWhopWebhook(body, options.secret ?? WEBHOOK_SECRET, options.id);
  return new Request("https://propertyiq.test/api/webhooks/whop", {
    method: "POST",
    headers: { ...signed.headers, "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  process.env.PROPERTYIQ_SESSION_SECRET = SECRET;
  process.env.WHOP_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.WHOP_PROPERTYIQ_PRODUCT_ID = PRODUCT_ID;
  delete process.env.PAYHIP_PRODUCT_SECRET_KEY;
  delete process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Whop webhook security", () => {
  it("10. accepts a valid signed payment.succeeded event", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const payload = paymentPayload();
    const result = await handleWhopWebhookRequest(signedRequest(payload), { store });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, outcome: "created" });
    expect(await store.list("whop")).toHaveLength(1);
  });

  it("11. rejects a missing signature", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const request = new Request("https://propertyiq.test/api/webhooks/whop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(paymentPayload()),
    });
    const result = await handleWhopWebhookRequest(request, { store });
    expect(result.status).toBe(401);
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("12. rejects an invalid signature", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const body = JSON.stringify(paymentPayload());
    const signed = signWhopWebhook(body);
    signed.headers["webhook-signature"] = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const request = new Request("https://propertyiq.test/api/webhooks/whop", {
      method: "POST",
      headers: { ...signed.headers, "content-type": "application/json" },
      body,
    });
    const result = await handleWhopWebhookRequest(request, { store });
    expect(result.status).toBe(401);
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("13. rejects a modified payload with an old signature", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const original = JSON.stringify(paymentPayload());
    const signed = signWhopWebhook(original);
    const modified = JSON.stringify(paymentPayload({ customer_email: "other@example.com" }));
    const request = new Request("https://propertyiq.test/api/webhooks/whop", {
      method: "POST",
      headers: { ...signed.headers, "content-type": "application/json" },
      body: modified,
    });
    const result = await handleWhopWebhookRequest(request, { store });
    expect(result.status).toBe(401);
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("14. rejects malformed JSON after signature validation", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const raw = "{not-json";
    const result = await handleWhopWebhookRequest(signedRequest({}, { raw }), { store });
    expect(result.status).toBe(400);
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("15. ignores unrelated event types", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const payload = { ...paymentPayload(), type: "payment.failed" };
    const result = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_failed" }), { store });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, outcome: "ignored" });
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("16. ignores the wrong product ID", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const payload = paymentPayload({
      product_id: "prod_other",
      line_items: [{ product_id: "prod_other", quantity: 1 }],
    });
    const result = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_wrong_product" }), { store });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, outcome: "wrong_product" });
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("17. handles a missing customer email safely", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const payload = paymentPayload({ customer_email: null, user: { email: null } });
    const result = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_no_email" }), { store });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, outcome: "missing_email" });
    expect(await store.list("whop")).toHaveLength(0);
  });

  it("18. verifies the raw request body, not a re-serialized object", () => {
    const raw = JSON.stringify(paymentPayload());
    const signed = signWhopWebhook(raw);
    const verified = verifyWhopWebhookSignature(raw, signed.headers, WEBHOOK_SECRET);
    expect(verified.ok).toBe(true);
    const pretty = JSON.stringify(paymentPayload(), null, 2);
    const reencoded = verifyWhopWebhookSignature(pretty, signed.headers, WEBHOOK_SECRET);
    expect(reencoded.ok).toBe(false);
  });
});

describe("Whop webhook idempotency", () => {
  it("19-23. issues one licence for retries and concurrent deliveries", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const payload = paymentPayload();
    const first = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_one" }), { store });
    const retry = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_one" }), { store });
    const otherDelivery = await handleWhopWebhookRequest(signedRequest(payload, { id: "msg_two" }), { store });
    expect(first.body).toEqual({ ok: true, outcome: "created" });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({ ok: true, outcome: "duplicate" });
    expect(otherDelivery.status).toBe(200);
    expect(otherDelivery.body).toEqual({ ok: true, outcome: "duplicate" });
    expect(await store.list("whop")).toHaveLength(1);

    const concurrentStore = new MemoryPurchasedLicenceStore();
    const concurrent = await Promise.all([
      processWhopWebhookPayload(payload, { store: concurrentStore, webhookId: "msg_a" }),
      processWhopWebhookPayload(payload, { store: concurrentStore, webhookId: "msg_b" }),
    ]);
    expect(concurrent.map((item) => item.outcome).sort()).toEqual(["created", "duplicate"]);
    expect(await concurrentStore.list("whop")).toHaveLength(1);

    const sql = readFileSync(path.resolve(__dirname, "../../lib/db/purchased-licence-store.ts"), "utf8");
    const schema = readFileSync(path.resolve(__dirname, "../../lib/db/postgres.ts"), "utf8");
    expect(schema).toContain("UNIQUE (provider, provider_purchase_id)");
    expect(schema).toContain("UNIQUE (licence_hash)");
    expect(sql).toContain("ON CONFLICT (provider, provider_purchase_id) DO NOTHING");
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
    expect(sql).toContain("getSql().begin");
  });
});

describe("Whop licence activation", () => {
  it("24-32. activates matching Whop licences and rejects the rest generically", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const cookies = new MemoryCookieStore();
    const payload = paymentPayload();
    await handleWhopWebhookRequest(signedRequest(payload), { store });
    const licenceKey = generateWhopLicenceKey(PAYMENT_ID);
    expect(isWhopLicenceKey(licenceKey)).toBe(true);
    expect(normalizeWhopLicenceKey(licenceKey.replaceAll("-", "").toLowerCase())).toBe(licenceKey);

    const result = await activateAccess({
      email: ` ${EMAIL.toUpperCase()} `,
      licenceKey: ` ${licenceKey.toLowerCase()} `,
      from: "/quick-underwrite",
      cookieStore: cookies,
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.provider).toBe("whop");
    expect(result.redirectTo).toBe("/quick-underwrite");
    const parsed = parseAccessSession(cookies.raw(ACCESS_COOKIE_NAME));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.payload.provider).toBe("whop");
    expect(resolveAccessGate("/quick-underwrite", "", cookies.raw(ACCESS_COOKIE_NAME)).action).toBe("allow");
    expect(isProtectedPath("/quick-underwrite")).toBe(true);

    const wrongEmail = await activateAccess({
      email: "other@example.com",
      licenceKey,
      cookieStore: new MemoryCookieStore(),
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    expect(wrongEmail.ok).toBe(false);
    if (wrongEmail.ok) return;
    expect(["invalid", "email_mismatch"]).toContain(wrongEmail.reason);
    expect(ACCESS_ERROR_MESSAGES[wrongEmail.reason === "email_mismatch" ? "email_mismatch" : "invalid"]).toBeTruthy();

    const wrongKey = await activateAccess({
      email: EMAIL,
      licenceKey: "PIQ-WHOP-AAAA-BBBB-CCCC",
      cookieStore: new MemoryCookieStore(),
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    expect(wrongKey).toEqual({ ok: false, reason: "invalid" });

    await store.revokeByPurchase("whop", PAYMENT_ID, Date.now());
    const revoked = await activateAccess({
      email: EMAIL,
      licenceKey,
      cookieStore: new MemoryCookieStore(),
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    expect(revoked).toEqual({ ok: false, reason: "disabled" });

    const testerStore = new MemoryTesterStore();
    const testerCode = generateTesterCode();
    await testerStore.create({
      id: "tester-1",
      codeHash: "hash",
      codePrefix: "PIQ-TEST-****-XXXX",
      label: "Reviewer",
      emailRestriction: null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
      maximumActivations: 1,
      activationCount: 0,
      active: true,
      revokedAt: null,
      lastActivatedAt: null,
      notes: null,
    });
    const testerFromWhop = await activateTesterAccess({
      testerCode: licenceKey,
      testerStore,
      cookieStore: new MemoryCookieStore(),
    });
    expect(testerFromWhop.ok).toBe(false);

    const whopFromTester = await activateAccess({
      email: EMAIL,
      licenceKey: testerCode,
      cookieStore: new MemoryCookieStore(),
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    expect(whopFromTester.ok).toBe(false);
  });

  it("revalidates a Whop session against the purchased-licence record", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const cookies = new MemoryCookieStore();
    await handleWhopWebhookRequest(signedRequest(paymentPayload()), { store });
    const licenceKey = generateWhopLicenceKey(PAYMENT_ID);
    await activateAccess({
      email: EMAIL,
      licenceKey,
      cookieStore: cookies,
      purchasedLicenceStore: store,
      payhipClient: emptyPayhip(),
    });
    const ok = await validateAccessSession({
      cookieStore: cookies,
      purchasedLicenceStore: store,
      revalidate: true,
    });
    expect(ok.ok).toBe(true);
    await store.revokeByPurchase("whop", PAYMENT_ID, Date.now());
    const denied = await validateAccessSession({
      cookieStore: cookies,
      purchasedLicenceStore: store,
      revalidate: true,
    });
    expect(denied).toEqual({ ok: false, reason: "disabled" });
  });
});

describe("Whop refunds, claims and reconcile", () => {
  it("revokes on a succeeded refund without deleting the record", async () => {
    const store = new MemoryPurchasedLicenceStore();
    await handleWhopWebhookRequest(signedRequest(paymentPayload(), { id: "msg_pay" }), { store });
    const refund = {
      id: "evt_refund_1",
      type: "refund.created",
      data: { id: "rf_test", payment_id: PAYMENT_ID, status: "succeeded" },
    };
    const result = await handleWhopWebhookRequest(signedRequest(refund, { id: "msg_refund" }), { store });
    expect(result.body).toEqual({ ok: true, outcome: "revoked" });
    const records = await store.list("whop");
    expect(records).toHaveLength(1);
    expect(records[0]?.status).toBe("revoked");
    const replay = await handleWhopWebhookRequest(signedRequest(refund, { id: "msg_refund" }), { store });
    expect(replay.body).toEqual({ ok: true, outcome: "duplicate" });
  });

  it("revokes on a lost dispute", async () => {
    const store = new MemoryPurchasedLicenceStore();
    await handleWhopWebhookRequest(signedRequest(paymentPayload(), { id: "msg_pay2" }), { store });
    const dispute = {
      id: "evt_dispute_1",
      type: "dispute.updated",
      data: { id: "dspt_test", status: "lost", payment: { id: PAYMENT_ID } },
    };
    const result = await handleWhopWebhookRequest(signedRequest(dispute, { id: "msg_dispute" }), { store });
    expect(result.body).toEqual({ ok: true, outcome: "revoked" });
  });

  it("does not reveal a licence from email alone during claim", async () => {
    const { claimWhopLicence } = await import("@/lib/auth/whop");
    const store = new MemoryPurchasedLicenceStore();
    await handleWhopWebhookRequest(signedRequest(paymentPayload()), { store });
    const missing = await claimWhopLicence(EMAIL, "pay_unknown", store);
    const wrongEmail = await claimWhopLicence("other@example.com", PAYMENT_ID, store);
    expect(missing).toEqual({ ok: false, reason: "invalid" });
    expect(wrongEmail).toEqual({ ok: false, reason: "invalid" });
    const claimed = await claimWhopLicence(EMAIL, PAYMENT_ID, store);
    expect(claimed.ok).toBe(true);
    if (claimed.ok) expect(claimed.licenceKey).toBe(generateWhopLicenceKey(PAYMENT_ID));
  });

  it("reconciles a missed payment without duplicating", async () => {
    const store = new MemoryPurchasedLicenceStore();
    const snapshot = {
      id: PAYMENT_ID,
      productIds: [PRODUCT_ID],
      customerEmail: EMAIL,
      customerId: "mber_propertyiq",
      membershipId: "mem_propertyiq",
      status: "paid",
      substatus: "succeeded",
      paidAt: "2026-01-01T12:00:00.000Z",
    };
    const lookup = { retrieve: async () => snapshot };
    const first = await reconcileWhopPayment(PAYMENT_ID, { store, lookup });
    const second = await reconcileWhopPayment(PAYMENT_ID, { store, lookup });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.outcome).toBe("created");
      expect(second.outcome).toBe("duplicate");
    }
    expect(await store.list("whop")).toHaveLength(1);
  });
});

describe("Whop configuration isolation", () => {
  it("38-39. missing Whop configuration does not break /access or other providers", async () => {
    delete process.env.WHOP_WEBHOOK_SECRET;
    delete process.env.WHOP_PROPERTYIQ_PRODUCT_ID;
    delete process.env.WHOP_API_KEY;
    process.env.PAYHIP_PRODUCT_SECRET_KEY = "payhip-product-secret-key";
    const urls = readFileSync(path.resolve(__dirname, "./purchase-urls.ts"), "utf8");
    expect(urls).toContain("process.env.NEXT_PUBLIC_WHOP_PRODUCT_URL");
    expect(urls).not.toContain("process.env[");
    const access = readFileSync(path.resolve(__dirname, "../../components/access/access-screen.tsx"), "utf8");
    expect(access).toContain("Already purchased?");
    expect(access).toContain("<PurchaseOptions");
    expect(access).toContain("<WhopLicenceClaim");
    expect(access.indexOf("<PurchaseOptions")).toBeLessThan(access.indexOf("<WhopLicenceClaim"));
    expect(access.indexOf("<WhopLicenceClaim")).toBeLessThan(access.indexOf("Received a complimentary tester code?"));
    expect(isProtectedApiPath("/api/webhooks/whop")).toBe(false);
    const route = readFileSync(path.resolve(__dirname, "../../app/api/webhooks/whop/route.ts"), "utf8");
    expect(route).not.toContain('runtime = "edge"');
    expect(route).toContain("handleWhopWebhookRequest");
    const webhook = readFileSync(path.resolve(__dirname, "./whop.ts"), "utf8");
    expect(webhook).toContain("request.text()");
    expect(webhook).toContain("unwrapWebhook");
    expect(webhook).not.toContain("console.info(rawBody");
    expect(webhook).not.toContain("customer_email}");

    const cookies = new MemoryCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: "WTKP4-66NL5-HMKQW-GFSCZ",
      usageCounted: true,
      provider: "payhip",
      cookieStore: cookies,
    });
    expect(resolveAccessGate("/dashboard", "", cookies.raw(ACCESS_COOKIE_NAME)).action).toBe("allow");
  });
});
