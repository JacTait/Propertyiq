import {
  type TesterCodeRecord,
  type TesterCodeStore,
  cloneTesterRecord,
} from "@/lib/auth/tester-codes";
import { ensureTesterAccessSchema, getSql } from "@/lib/db/postgres";

interface TesterCodeRow {
  id: string;
  code_hash: string;
  code_prefix: string;
  label: string;
  email_restriction: string | null;
  created_at: Date | string;
  expires_at: Date | string;
  maximum_activations: number | string;
  activation_count: number | string;
  active: boolean;
  revoked_at: Date | string | null;
  last_activated_at: Date | string | null;
  notes: string | null;
}

function asTime(value: Date | string | null): number | null {
  if (value == null) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function asInt(value: number | string): number {
  return typeof value === "number" ? value : Number.parseInt(value, 10);
}

function fromRow(row: TesterCodeRow): TesterCodeRecord {
  const createdAt = asTime(row.created_at) ?? Date.now();
  const expiresAt = asTime(row.expires_at) ?? createdAt;
  return {
    id: row.id,
    codeHash: row.code_hash,
    codePrefix: row.code_prefix,
    label: row.label,
    emailRestriction: row.email_restriction,
    createdAt,
    expiresAt,
    maximumActivations: asInt(row.maximum_activations),
    activationCount: asInt(row.activation_count),
    active: row.active,
    revokedAt: asTime(row.revoked_at),
    lastActivatedAt: asTime(row.last_activated_at),
    notes: row.notes,
  };
}

export class PostgresTesterStore implements TesterCodeStore {
  private async ready() {
    await ensureTesterAccessSchema();
    return getSql();
  }

  async create(record: TesterCodeRecord): Promise<TesterCodeRecord> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      INSERT INTO tester_access_codes (
        id,
        code_hash,
        code_prefix,
        label,
        email_restriction,
        created_at,
        expires_at,
        maximum_activations,
        activation_count,
        active,
        revoked_at,
        last_activated_at,
        notes
      ) VALUES (
        ${record.id},
        ${record.codeHash},
        ${record.codePrefix},
        ${record.label},
        ${record.emailRestriction},
        ${new Date(record.createdAt)},
        ${new Date(record.expiresAt)},
        ${record.maximumActivations},
        ${record.activationCount},
        ${record.active},
        ${record.revokedAt == null ? null : new Date(record.revokedAt)},
        ${record.lastActivatedAt == null ? null : new Date(record.lastActivatedAt)},
        ${record.notes}
      )
      RETURNING *
    `;
    const row = rows[0];
    if (!row) throw new Error("Failed to create tester access code.");
    return fromRow(row);
  }

  async findByHash(codeHash: string): Promise<TesterCodeRecord | null> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      SELECT * FROM tester_access_codes WHERE code_hash = ${codeHash} LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async findById(id: string): Promise<TesterCodeRecord | null> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      SELECT * FROM tester_access_codes WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async list(): Promise<TesterCodeRecord[]> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      SELECT * FROM tester_access_codes ORDER BY created_at DESC
    `;
    return rows.map(fromRow);
  }

  async incrementActivation(id: string, now: number): Promise<TesterCodeRecord | null> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      UPDATE tester_access_codes
      SET
        activation_count = activation_count + 1,
        last_activated_at = ${new Date(now)}
      WHERE id = ${id}
        AND active = TRUE
        AND revoked_at IS NULL
        AND expires_at > ${new Date(now)}
        AND activation_count < maximum_activations
      RETURNING *
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async revoke(id: string, now: number): Promise<TesterCodeRecord | null> {
    const sql = await this.ready();
    const rows = await sql<TesterCodeRow[]>`
      UPDATE tester_access_codes
      SET
        active = FALSE,
        revoked_at = COALESCE(revoked_at, ${new Date(now)})
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  }
}

let defaultStore: TesterCodeStore | null = null;

export function getTesterCodeStore(): TesterCodeStore {
  if (!defaultStore) defaultStore = new PostgresTesterStore();
  return defaultStore;
}

export function resetTesterCodeStoreForTests(): void {
  defaultStore = null;
}

export { cloneTesterRecord };
