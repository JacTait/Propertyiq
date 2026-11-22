import { randomUUID } from "node:crypto";
import type { ISql } from "postgres";
import {
  type IssueLicenceResult,
  type IssuePurchasedLicenceInput,
  type PurchasedLicenceProvider,
  type PurchasedLicenceRecord,
  type PurchasedLicenceStatus,
  type PurchasedLicenceStore,
  type RecordWebhookEventInput,
  type WebhookEventRecord,
  hashPurchasedLicenceKey,
  purchasedLicencePrefix,
} from "@/lib/auth/purchased-licences";
import { normalizeEmail, normalizeLicenceKey } from "@/lib/auth/session";
import { ensurePurchasedLicenceSchema, getSql } from "@/lib/db/postgres";

interface PurchasedLicenceRow {
  id: string;
  provider: string;
  provider_purchase_id: string;
  provider_customer_id: string | null;
  provider_membership_id: string | null;
  product_id: string;
  customer_email: string;
  licence_hash: string;
  licence_prefix: string;
  created_at: Date | string;
  updated_at: Date | string;
  status: string;
  revoked_at: Date | string | null;
  last_activated_at: Date | string | null;
  metadata: Record<string, unknown> | null;
}

interface WebhookEventRow {
  id: string;
  provider: string;
  event_type: string;
  provider_purchase_id: string | null;
  processed_at: Date | string;
  outcome: string;
}

function asTime(value: Date | string | null): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function fromLicenceRow(row: PurchasedLicenceRow): PurchasedLicenceRecord {
  const createdAt = asTime(row.created_at) ?? Date.now();
  return {
    id: row.id,
    provider: row.provider as PurchasedLicenceProvider,
    providerPurchaseId: row.provider_purchase_id,
    providerCustomerId: row.provider_customer_id,
    providerMembershipId: row.provider_membership_id,
    productId: row.product_id,
    customerEmail: row.customer_email,
    licenceHash: row.licence_hash,
    licencePrefix: row.licence_prefix,
    createdAt,
    updatedAt: asTime(row.updated_at) ?? createdAt,
    status: row.status === "revoked" ? "revoked" : "active",
    revokedAt: asTime(row.revoked_at),
    lastActivatedAt: asTime(row.last_activated_at),
    metadata: row.metadata,
  };
}

function fromEventRow(row: WebhookEventRow): WebhookEventRecord {
  return {
    id: row.id,
    provider: row.provider as PurchasedLicenceProvider,
    eventType: row.event_type,
    providerPurchaseId: row.provider_purchase_id,
    processedAt: asTime(row.processed_at) ?? Date.now(),
    outcome: row.outcome,
  };
}

export class PostgresPurchasedLicenceStore implements PurchasedLicenceStore {
  constructor(private readonly sql: ISql = getSql()) {}

  private async ready(): Promise<ISql> {
    await ensurePurchasedLicenceSchema();
    return this.sql;
  }

  async recordWebhookEvent(input: RecordWebhookEventInput): Promise<{ inserted: boolean; record: WebhookEventRecord }> {
    const sql = await this.ready();
    const now = new Date(input.now ?? Date.now());
    const inserted = await sql<WebhookEventRow[]>`
      INSERT INTO webhook_events (
        id, provider, event_type, provider_purchase_id, processed_at, outcome
      ) VALUES (
        ${input.id},
        ${input.provider},
        ${input.eventType},
        ${input.providerPurchaseId ?? null},
        ${now},
        ${input.outcome}
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;
    if (inserted[0]) return { inserted: true, record: fromEventRow(inserted[0]) };

    const existing = await sql<WebhookEventRow[]>`
      SELECT * FROM webhook_events WHERE id = ${input.id} LIMIT 1
    `;
    const row = existing[0];
    if (!row) throw new Error("Failed to record webhook event.");
    return { inserted: false, record: fromEventRow(row) };
  }

  async findWebhookEvent(id: string): Promise<WebhookEventRecord | null> {
    const sql = await this.ready();
    const rows = await sql<WebhookEventRow[]>`
      SELECT * FROM webhook_events WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? fromEventRow(rows[0]) : null;
  }

  async findByPurchase(
    provider: PurchasedLicenceProvider,
    providerPurchaseId: string,
  ): Promise<PurchasedLicenceRecord | null> {
    const sql = await this.ready();
    const rows = await sql<PurchasedLicenceRow[]>`
      SELECT * FROM purchased_licences
      WHERE provider = ${provider} AND provider_purchase_id = ${providerPurchaseId}
      LIMIT 1
    `;
    return rows[0] ? fromLicenceRow(rows[0]) : null;
  }

  async findByHash(licenceHash: string): Promise<PurchasedLicenceRecord | null> {
    const sql = await this.ready();
    const rows = await sql<PurchasedLicenceRow[]>`
      SELECT * FROM purchased_licences WHERE licence_hash = ${licenceHash} LIMIT 1
    `;
    return rows[0] ? fromLicenceRow(rows[0]) : null;
  }

  async list(provider?: PurchasedLicenceProvider): Promise<PurchasedLicenceRecord[]> {
    const sql = await this.ready();
    const rows = provider
      ? await sql<PurchasedLicenceRow[]>`
          SELECT * FROM purchased_licences WHERE provider = ${provider} ORDER BY created_at DESC
        `
      : await sql<PurchasedLicenceRow[]>`
          SELECT * FROM purchased_licences ORDER BY created_at DESC
        `;
    return rows.map(fromLicenceRow);
  }

  async issueLicence(input: IssuePurchasedLicenceInput): Promise<IssueLicenceResult> {
    const sql = await this.ready();
    const now = new Date(input.now ?? Date.now());
    const licenceKey = normalizeLicenceKey(input.licenceKey);
    const licenceHash = hashPurchasedLicenceKey(licenceKey);
    const prefix = purchasedLicencePrefix(licenceKey);
    const email = normalizeEmail(input.customerEmail);
    const metadata = input.metadata == null ? null : sql.json(JSON.parse(JSON.stringify(input.metadata)) as never);

    const inserted = await sql<PurchasedLicenceRow[]>`
      INSERT INTO purchased_licences (
        id,
        provider,
        provider_purchase_id,
        provider_customer_id,
        provider_membership_id,
        product_id,
        customer_email,
        licence_hash,
        licence_prefix,
        created_at,
        updated_at,
        status,
        revoked_at,
        last_activated_at,
        metadata
      ) VALUES (
        ${randomUUID()},
        ${input.provider},
        ${input.providerPurchaseId},
        ${input.providerCustomerId ?? null},
        ${input.providerMembershipId ?? null},
        ${input.productId},
        ${email},
        ${licenceHash},
        ${prefix},
        ${now},
        ${now},
        ${"active"},
        ${null},
        ${null},
        ${metadata}
      )
      ON CONFLICT (provider, provider_purchase_id) DO NOTHING
      RETURNING *
    `;
    if (inserted[0]) return { created: true, duplicate: false, record: fromLicenceRow(inserted[0]) };

    const existing = await this.findByPurchase(input.provider, input.providerPurchaseId);
    if (!existing) throw new Error("Failed to issue purchased licence.");
    return { created: false, duplicate: true, record: existing };
  }

  async markActivated(id: string, now: number): Promise<PurchasedLicenceRecord | null> {
    const sql = await this.ready();
    const rows = await sql<PurchasedLicenceRow[]>`
      UPDATE purchased_licences
      SET last_activated_at = ${new Date(now)}, updated_at = ${new Date(now)}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? fromLicenceRow(rows[0]) : null;
  }

  async revokeByPurchase(
    provider: PurchasedLicenceProvider,
    providerPurchaseId: string,
    now: number,
  ): Promise<PurchasedLicenceRecord | null> {
    const sql = await this.ready();
    const stamp = new Date(now);
    const rows = await sql<PurchasedLicenceRow[]>`
      UPDATE purchased_licences
      SET
        status = ${"revoked"},
        revoked_at = COALESCE(revoked_at, ${stamp}),
        updated_at = ${stamp}
      WHERE provider = ${provider} AND provider_purchase_id = ${providerPurchaseId}
      RETURNING *
    `;
    return rows[0] ? fromLicenceRow(rows[0]) : null;
  }

  async setStatus(id: string, status: PurchasedLicenceStatus, now: number): Promise<PurchasedLicenceRecord | null> {
    const sql = await this.ready();
    const stamp = new Date(now);
    const rows = await sql<PurchasedLicenceRow[]>`
      UPDATE purchased_licences
      SET
        status = ${status},
        revoked_at = CASE
          WHEN ${status} = ${"revoked"} THEN COALESCE(revoked_at, ${stamp})
          ELSE NULL
        END,
        updated_at = ${stamp}
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? fromLicenceRow(rows[0]) : null;
  }

  async processVerifiedEvent<T>(
    event: RecordWebhookEventInput,
    work: (store: PurchasedLicenceStore, eventInserted: boolean) => Promise<T>,
  ): Promise<T> {
    await ensurePurchasedLicenceSchema();
    return getSql().begin(async (tx) => {
      const inner = new PostgresPurchasedLicenceStore(tx);
      const recorded = await inner.recordWebhookEvent(event);
      return work(inner, recorded.inserted);
    });
  }
}

let defaultStore: PurchasedLicenceStore | null = null;

export function getPurchasedLicenceStore(): PurchasedLicenceStore {
  if (!defaultStore) defaultStore = new PostgresPurchasedLicenceStore();
  return defaultStore;
}

export function resetPurchasedLicenceStoreForTests(): void {
  defaultStore = null;
}
