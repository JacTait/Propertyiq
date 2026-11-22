import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { emailsMatch, hashLicenceIdentifier, normalizeEmail } from "@/lib/auth/session";

export const DEFAULT_TESTER_MAX_ACTIVATIONS = 1;
export const DEFAULT_TESTER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TESTER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type TesterDenialReason =
  | "invalid"
  | "disabled"
  | "expired"
  | "email_mismatch"
  | "activation_limit"
  | "network"
  | "misconfigured";

export interface TesterCodeRecord {
  id: string;
  codeHash: string;
  codePrefix: string;
  label: string;
  emailRestriction: string | null;
  createdAt: number;
  expiresAt: number;
  maximumActivations: number;
  activationCount: number;
  active: boolean;
  revokedAt: number | null;
  lastActivatedAt: number | null;
  notes: string | null;
}

export interface TesterCodeStore {
  create(record: TesterCodeRecord): Promise<TesterCodeRecord>;
  findByHash(codeHash: string): Promise<TesterCodeRecord | null>;
  findById(id: string): Promise<TesterCodeRecord | null>;
  list(): Promise<TesterCodeRecord[]>;
  incrementActivation(id: string, now: number): Promise<TesterCodeRecord | null>;
  revoke(id: string, now: number): Promise<TesterCodeRecord | null>;
}

export interface IssueTesterCodeInput {
  label: string;
  expiresAt?: number;
  ttlMs?: number;
  maximumActivations?: number;
  emailRestriction?: string | null;
  notes?: string | null;
  now?: number;
}

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getTesterAdminSecret(): string {
  return readEnv("PROPERTYIQ_TESTER_ADMIN_SECRET");
}

export function testerAdminConfigured(): boolean {
  return getTesterAdminSecret().length >= 16;
}

export function testerAdminAuthorized(provided: string): boolean {
  const expected = getTesterAdminSecret();
  if (!testerAdminConfigured()) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function normalizeTesterCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("PIQTEST") && compact.length === 15) {
    return `PIQ-TEST-${compact.slice(7, 11)}-${compact.slice(11, 15)}`;
  }
  return compact;
}

function randomToken(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += TESTER_CODE_ALPHABET[bytes[i]! & 31];
  }
  return out;
}

export function generateTesterCode(): string {
  return `PIQ-TEST-${randomToken(4)}-${randomToken(4)}`;
}

export function testerCodePrefix(code: string): string {
  const normalised = normalizeTesterCode(code);
  const last = normalised.slice(-4).padStart(4, "X");
  return `PIQ-TEST-****-${last}`;
}

export function testerCodeTail(prefixOrCode: string): string {
  const compact = prefixOrCode.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length <= 4) return compact.toUpperCase().padStart(4, "X");
  return compact.slice(-4).toUpperCase();
}

export function hashTesterCode(code: string, secret?: string): string {
  return hashLicenceIdentifier(`tester-code:${normalizeTesterCode(code)}`, secret);
}

export function cloneTesterRecord(record: TesterCodeRecord): TesterCodeRecord {
  return { ...record };
}

function logSafe(event: string, fields?: Record<string, string | number | boolean>): void {
  if (fields) {
    console.info(`[propertyiq-access] ${event}`, fields);
    return;
  }
  console.info(`[propertyiq-access] ${event}`);
}

export function logTesterEvent(
  event: "tester_activation_success" | "tester_activation_failed" | "tester_expired" | "tester_revoked",
  fields?: { recordId?: string; codePrefix?: string; outcome?: string },
): void {
  const safe: Record<string, string> = {};
  if (fields?.recordId) safe.recordId = fields.recordId;
  if (fields?.codePrefix) safe.codePrefix = fields.codePrefix;
  if (fields?.outcome) safe.outcome = fields.outcome;
  logSafe(event, Object.keys(safe).length > 0 ? safe : undefined);
}

export function maskTesterEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalised = normalizeEmail(email);
  const at = normalised.indexOf("@");
  if (at <= 0) return "***";
  const local = normalised.slice(0, at);
  const domain = normalised.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function publicTesterCode(record: TesterCodeRecord): {
  id: string;
  codePrefix: string;
  label: string;
  emailRestricted: boolean;
  emailMask: string | null;
  createdAt: string;
  expiresAt: string;
  maximumActivations: number;
  activationCount: number;
  active: boolean;
  revokedAt: string | null;
  lastActivatedAt: string | null;
  notes: string | null;
} {
  return {
    id: record.id,
    codePrefix: record.codePrefix,
    label: record.label,
    emailRestricted: Boolean(record.emailRestriction),
    emailMask: maskTesterEmail(record.emailRestriction),
    createdAt: new Date(record.createdAt).toISOString(),
    expiresAt: new Date(record.expiresAt).toISOString(),
    maximumActivations: record.maximumActivations,
    activationCount: record.activationCount,
    active: record.active && record.revokedAt == null,
    revokedAt: record.revokedAt == null ? null : new Date(record.revokedAt).toISOString(),
    lastActivatedAt: record.lastActivatedAt == null ? null : new Date(record.lastActivatedAt).toISOString(),
    notes: record.notes,
  };
}

export function inspectExistingTesterSession(
  record: TesterCodeRecord,
  now: number,
  sessionEmail = "",
): { ok: true } | { ok: false; reason: TesterDenialReason } {
  if (record.revokedAt != null) {
    logTesterEvent("tester_revoked", { recordId: record.id, codePrefix: record.codePrefix });
    return { ok: false, reason: "disabled" };
  }
  if (!record.active) {
    logTesterEvent("tester_activation_failed", {
      recordId: record.id,
      codePrefix: record.codePrefix,
      outcome: "inactive",
    });
    return { ok: false, reason: "disabled" };
  }
  if (record.expiresAt <= now) {
    logTesterEvent("tester_expired", { recordId: record.id, codePrefix: record.codePrefix });
    return { ok: false, reason: "expired" };
  }
  if (record.activationCount > record.maximumActivations) {
    logTesterEvent("tester_activation_failed", {
      recordId: record.id,
      codePrefix: record.codePrefix,
      outcome: "activation_limit",
    });
    return { ok: false, reason: "activation_limit" };
  }
  if (record.emailRestriction && !emailsMatch(sessionEmail, record.emailRestriction)) {
    logTesterEvent("tester_activation_failed", {
      recordId: record.id,
      codePrefix: record.codePrefix,
      outcome: "email_mismatch",
    });
    return { ok: false, reason: "email_mismatch" };
  }
  return { ok: true };
}

export function inspectNewTesterActivation(
  record: TesterCodeRecord,
  now: number,
  email?: string,
): { ok: true } | { ok: false; reason: TesterDenialReason } {
  const existing = inspectExistingTesterSession(record, now, email ?? "");
  if (!existing.ok) return existing;
  if (record.activationCount >= record.maximumActivations) {
    logTesterEvent("tester_activation_failed", {
      recordId: record.id,
      codePrefix: record.codePrefix,
      outcome: "activation_limit",
    });
    return { ok: false, reason: "activation_limit" };
  }
  return { ok: true };
}

export async function issueTesterCode(
  store: TesterCodeStore,
  input: IssueTesterCodeInput,
): Promise<{ record: TesterCodeRecord; code: string }> {
  const now = input.now ?? Date.now();
  const label = input.label.trim();
  if (!label) {
    throw new Error("A tester-code label is required.");
  }
  const maximumActivations = input.maximumActivations ?? DEFAULT_TESTER_MAX_ACTIVATIONS;
  if (!Number.isFinite(maximumActivations) || maximumActivations < 1) {
    throw new Error("maximumActivations must be at least 1.");
  }
  const expiresAt = input.expiresAt ?? now + (input.ttlMs ?? DEFAULT_TESTER_TTL_MS);
  if (expiresAt <= now) {
    throw new Error("Tester codes must expire in the future.");
  }
  const emailRestriction = input.emailRestriction ? normalizeEmail(input.emailRestriction) : null;
  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const code = generateTesterCode();
  const record: TesterCodeRecord = {
    id: randomUUID(),
    codeHash: hashTesterCode(code),
    codePrefix: testerCodePrefix(code),
    label,
    emailRestriction,
    createdAt: now,
    expiresAt,
    maximumActivations: Math.floor(maximumActivations),
    activationCount: 0,
    active: true,
    revokedAt: null,
    lastActivatedAt: null,
    notes,
  };
  const saved = await store.create(record);
  return { record: saved, code };
}

export class MemoryTesterStore implements TesterCodeStore {
  private readonly records = new Map<string, TesterCodeRecord>();
  private readonly byHash = new Map<string, string>();

  async create(record: TesterCodeRecord): Promise<TesterCodeRecord> {
    if (this.byHash.has(record.codeHash) || this.records.has(record.id)) {
      throw new Error("Tester code record already exists.");
    }
    const copy = cloneTesterRecord(record);
    this.records.set(copy.id, copy);
    this.byHash.set(copy.codeHash, copy.id);
    return cloneTesterRecord(copy);
  }

  async findByHash(codeHash: string): Promise<TesterCodeRecord | null> {
    const id = this.byHash.get(codeHash);
    if (!id) return null;
    return this.findById(id);
  }

  async findById(id: string): Promise<TesterCodeRecord | null> {
    const record = this.records.get(id);
    return record ? cloneTesterRecord(record) : null;
  }

  async list(): Promise<TesterCodeRecord[]> {
    return [...this.records.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(cloneTesterRecord);
  }

  async incrementActivation(id: string, now: number): Promise<TesterCodeRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    if (!record.active || record.revokedAt != null) return null;
    if (record.expiresAt <= now) return null;
    if (record.activationCount >= record.maximumActivations) return null;
    record.activationCount += 1;
    record.lastActivatedAt = now;
    return cloneTesterRecord(record);
  }

  async revoke(id: string, now: number): Promise<TesterCodeRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    record.active = false;
    record.revokedAt = record.revokedAt ?? now;
    return cloneTesterRecord(record);
  }

  async deactivate(id: string): Promise<TesterCodeRecord | null> {
    const record = this.records.get(id);
    if (!record) return null;
    record.active = false;
    return cloneTesterRecord(record);
  }
}
