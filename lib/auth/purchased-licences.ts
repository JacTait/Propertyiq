import { createHmac, randomUUID } from "node:crypto";
import {
  emailsMatch,
  getSessionSecret,
  hashLicenceIdentifier,
  licenceTail,
  normalizeEmail,
  normalizeLicenceKey,
} from "@/lib/auth/session";

export const PURCHASED_LICENCE_PROVIDERS = ["whop"] as const;
export type PurchasedLicenceProvider = (typeof PURCHASED_LICENCE_PROVIDERS)[number];

export type PurchasedLicenceStatus = "active" | "revoked";

export const WHOP_LICENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WHOP_LICENCE_PREFIX = "PIQ-WHOP";

export interface PurchasedLicenceRecord {
  id: string;
  provider: PurchasedLicenceProvider;
  providerPurchaseId: string;
  providerCustomerId: string | null;
  providerMembershipId: string | null;
  productId: string;
  customerEmail: string;
  licenceHash: string;
  licencePrefix: string;
  createdAt: number;
  updatedAt: number;
  status: PurchasedLicenceStatus;
  revokedAt: number | null;
  lastActivatedAt: number | null;
  metadata: Record<string, unknown> | null;
}

export interface WebhookEventRecord {
  id: string;
  provider: PurchasedLicenceProvider;
  eventType: string;
  providerPurchaseId: string | null;
  processedAt: number;
  outcome: string;
}

export interface IssuePurchasedLicenceInput {
  provider: PurchasedLicenceProvider;
  providerPurchaseId: string;
  providerCustomerId?: string | null;
  providerMembershipId?: string | null;
  productId: string;
  customerEmail: string;
  licenceKey: string;
  now?: number;
  metadata?: Record<string, unknown> | null;
}

export interface RecordWebhookEventInput {
  id: string;
  provider: PurchasedLicenceProvider;
  eventType: string;
  providerPurchaseId?: string | null;
  outcome: string;
  now?: number;
}

export type IssueLicenceResult =
  | { created: true; duplicate: false; record: PurchasedLicenceRecord }
  | { created: false; duplicate: true; record: PurchasedLicenceRecord };

export interface PurchasedLicenceStore {
  recordWebhookEvent(input: RecordWebhookEventInput): Promise<{ inserted: boolean; record: WebhookEventRecord }>;
  findWebhookEvent(id: string): Promise<WebhookEventRecord | null>;
  findByPurchase(provider: PurchasedLicenceProvider, providerPurchaseId: string): Promise<PurchasedLicenceRecord | null>;
  findByHash(licenceHash: string): Promise<PurchasedLicenceRecord | null>;
  list(provider?: PurchasedLicenceProvider): Promise<PurchasedLicenceRecord[]>;
  issueLicence(input: IssuePurchasedLicenceInput): Promise<IssueLicenceResult>;
  markActivated(id: string, now: number): Promise<PurchasedLicenceRecord | null>;
  revokeByPurchase(
    provider: PurchasedLicenceProvider,
    providerPurchaseId: string,
    now: number,
  ): Promise<PurchasedLicenceRecord | null>;
  setStatus(
    id: string,
    status: PurchasedLicenceStatus,
    now: number,
  ): Promise<PurchasedLicenceRecord | null>;
  processVerifiedEvent<T>(
    event: RecordWebhookEventInput,
    work: (store: PurchasedLicenceStore, eventInserted: boolean) => Promise<T>,
  ): Promise<T>;
}

export function normalizeWhopPaymentId(paymentId: string): string {
  return paymentId.trim();
}

export function maskWhopPaymentId(paymentId: string): string {
  const id = normalizeWhopPaymentId(paymentId);
  if (!id) return "pay_****";
  const tail = id.replace(/[^A-Za-z0-9]/g, "").slice(-4).padStart(4, "X");
  return `pay_****${tail}`;
}

export function normalizeWhopLicenceKey(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("PIQWHOP") && compact.length === 19) {
    return `PIQ-WHOP-${compact.slice(7, 11)}-${compact.slice(11, 15)}-${compact.slice(15, 19)}`;
  }
  return normalizeLicenceKey(input);
}

export function isWhopLicenceKey(input: string): boolean {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.startsWith("PIQWHOP") && compact.length === 19;
}

export function generateWhopLicenceKey(paymentId: string, secret = getSessionSecret()): string {
  if (!secret) {
    throw new Error("PROPERTYIQ_SESSION_SECRET is not configured");
  }
  const digest = createHmac("sha256", secret)
    .update(`propertyiq:whop:licence:${normalizeWhopPaymentId(paymentId)}`, "utf8")
    .digest();
  let raw = "";
  for (let i = 0; i < 12; i += 1) {
    raw += WHOP_LICENCE_ALPHABET[digest[i]! & 31];
  }
  return `PIQ-WHOP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function purchasedLicencePrefix(licenceKey: string): string {
  const normalised = normalizeWhopLicenceKey(licenceKey);
  return `PIQ-WHOP-****-****-${licenceTail(normalised)}`;
}

export function hashPurchasedLicenceKey(licenceKey: string, secret = getSessionSecret()): string {
  return hashLicenceIdentifier(normalizeWhopLicenceKey(licenceKey), secret);
}

export function maskPurchasedEmail(email: string): string {
  const normalised = normalizeEmail(email);
  const at = normalised.indexOf("@");
  if (at <= 0) return "***";
  const local = normalised.slice(0, at);
  const domain = normalised.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function publicPurchasedLicence(record: PurchasedLicenceRecord) {
  return {
    id: record.id,
    provider: record.provider,
    providerPurchaseId: maskWhopPaymentId(record.providerPurchaseId),
    productId: record.productId,
    customerEmail: maskPurchasedEmail(record.customerEmail),
    licencePrefix: record.licencePrefix,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revokedAt: record.revokedAt,
    lastActivatedAt: record.lastActivatedAt,
  };
}

function cloneRecord(record: PurchasedLicenceRecord): PurchasedLicenceRecord {
  return {
    ...record,
    metadata: record.metadata ? { ...record.metadata } : null,
  };
}

function cloneEvent(record: WebhookEventRecord): WebhookEventRecord {
  return { ...record };
}

export class MemoryPurchasedLicenceStore implements PurchasedLicenceStore {
  private readonly licences = new Map<string, PurchasedLicenceRecord>();
  private readonly events = new Map<string, WebhookEventRecord>();
  private readonly hashIndex = new Map<string, string>();
  private readonly purchaseIndex = new Map<string, string>();

  private purchaseKey(provider: string, providerPurchaseId: string): string {
    return `${provider}:${providerPurchaseId}`;
  }

  async recordWebhookEvent(input: RecordWebhookEventInput): Promise<{ inserted: boolean; record: WebhookEventRecord }> {
    const existing = this.events.get(input.id);
    if (existing) return { inserted: false, record: cloneEvent(existing) };
    const record: WebhookEventRecord = {
      id: input.id,
      provider: input.provider,
      eventType: input.eventType,
      providerPurchaseId: input.providerPurchaseId ?? null,
      processedAt: input.now ?? Date.now(),
      outcome: input.outcome,
    };
    this.events.set(record.id, record);
    return { inserted: true, record: cloneEvent(record) };
  }

  async findWebhookEvent(id: string): Promise<WebhookEventRecord | null> {
    const record = this.events.get(id);
    return record ? cloneEvent(record) : null;
  }

  async findByPurchase(
    provider: PurchasedLicenceProvider,
    providerPurchaseId: string,
  ): Promise<PurchasedLicenceRecord | null> {
    const id = this.purchaseIndex.get(this.purchaseKey(provider, providerPurchaseId));
    if (!id) return null;
    const record = this.licences.get(id);
    return record ? cloneRecord(record) : null;
  }

  async findByHash(licenceHash: string): Promise<PurchasedLicenceRecord | null> {
    const id = this.hashIndex.get(licenceHash);
    if (!id) return null;
    const record = this.licences.get(id);
    return record ? cloneRecord(record) : null;
  }

  async list(provider?: PurchasedLicenceProvider): Promise<PurchasedLicenceRecord[]> {
    const records = [...this.licences.values()].filter((record) => !provider || record.provider === provider);
    return records
      .sort((left, right) => right.createdAt - left.createdAt)
      .map(cloneRecord);
  }

  async issueLicence(input: IssuePurchasedLicenceInput): Promise<IssueLicenceResult> {
    const purchaseKey = this.purchaseKey(input.provider, input.providerPurchaseId);
    const existingId = this.purchaseIndex.get(purchaseKey);
    if (existingId) {
      const existing = this.licences.get(existingId);
      if (existing) return { created: false, duplicate: true, record: cloneRecord(existing) };
    }

    const now = input.now ?? Date.now();
    const licenceKey = normalizeWhopLicenceKey(input.licenceKey);
    const licenceHash = hashPurchasedLicenceKey(licenceKey);
    const hashedExisting = this.hashIndex.get(licenceHash);
    if (hashedExisting) {
      const record = this.licences.get(hashedExisting);
      if (record) return { created: false, duplicate: true, record: cloneRecord(record) };
    }

    const record: PurchasedLicenceRecord = {
      id: randomUUID(),
      provider: input.provider,
      providerPurchaseId: input.providerPurchaseId,
      providerCustomerId: input.providerCustomerId ?? null,
      providerMembershipId: input.providerMembershipId ?? null,
      productId: input.productId,
      customerEmail: normalizeEmail(input.customerEmail),
      licenceHash,
      licencePrefix: purchasedLicencePrefix(licenceKey),
      createdAt: now,
      updatedAt: now,
      status: "active",
      revokedAt: null,
      lastActivatedAt: null,
      metadata: input.metadata ?? null,
    };
    this.licences.set(record.id, record);
    this.hashIndex.set(record.licenceHash, record.id);
    this.purchaseIndex.set(purchaseKey, record.id);
    return { created: true, duplicate: false, record: cloneRecord(record) };
  }

  async markActivated(id: string, now: number): Promise<PurchasedLicenceRecord | null> {
    const record = this.licences.get(id);
    if (!record) return null;
    record.lastActivatedAt = now;
    record.updatedAt = now;
    return cloneRecord(record);
  }

  async revokeByPurchase(
    provider: PurchasedLicenceProvider,
    providerPurchaseId: string,
    now: number,
  ): Promise<PurchasedLicenceRecord | null> {
    const existing = await this.findByPurchase(provider, providerPurchaseId);
    if (!existing) return null;
    const record = this.licences.get(existing.id);
    if (!record) return null;
    record.status = "revoked";
    record.revokedAt = record.revokedAt ?? now;
    record.updatedAt = now;
    return cloneRecord(record);
  }

  async setStatus(id: string, status: PurchasedLicenceStatus, now: number): Promise<PurchasedLicenceRecord | null> {
    const record = this.licences.get(id);
    if (!record) return null;
    record.status = status;
    record.updatedAt = now;
    record.revokedAt = status === "revoked" ? (record.revokedAt ?? now) : null;
    return cloneRecord(record);
  }

  async processVerifiedEvent<T>(
    event: RecordWebhookEventInput,
    work: (store: PurchasedLicenceStore, eventInserted: boolean) => Promise<T>,
  ): Promise<T> {
    const recorded = await this.recordWebhookEvent(event);
    return work(this, recorded.inserted);
  }
}

export function inspectWhopLicence(
  record: PurchasedLicenceRecord,
  email: string,
  licenceKey: string,
): { ok: true } | { ok: false; reason: "invalid" | "disabled" | "email_mismatch" } {
  const normalisedKey = normalizeWhopLicenceKey(licenceKey);
  if (!isWhopLicenceKey(normalisedKey)) return { ok: false, reason: "invalid" };
  if (hashPurchasedLicenceKey(normalisedKey) !== record.licenceHash) {
    return { ok: false, reason: "invalid" };
  }
  if (record.status !== "active" || record.revokedAt != null) {
    return { ok: false, reason: "disabled" };
  }
  if (!emailsMatch(email, record.customerEmail)) {
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}
