import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
export const REVALIDATE_INTERVAL_MS = 12 * 60 * 60 * 1000;

const AES_ALGORITHM = "aes-256-gcm";
const SESSION_VERSION = "v1";

export type AccessStatus = "active";

export type LicenceProvider = "payhip" | "gumroad";

export interface AccessSession {
  accessId: string;
  email: string;
  licenceHash: string;
  licenceTail: string;
  status: AccessStatus;
  issuedAt: number;
  expiresAt: number;
  lastRevalidatedAt: number;
  usageCounted: boolean;
  provider: LicenceProvider;
}

export interface CookiePayload extends Omit<AccessSession, "provider"> {
  licenceKey: string;
  /** Absent on sessions issued before Gumroad support; treated as Payhip. */
  provider?: LicenceProvider;
}

export interface AccessCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  expires: Date;
  maxAge?: number;
}

export type SessionValidation =
  | { ok: true; session: AccessSession; payload: CookiePayload }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

export function getSessionSecret(): string {
  const value = process.env.PROPERTYIQ_SESSION_SECRET;
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/\s+/g, "");
}

export function normalizeLicenceKey(licenceKey: string): string {
  return licenceKey.trim();
}

export function emailsMatch(entered: string, buyer: string): boolean {
  return normalizeEmail(entered) === normalizeEmail(buyer);
}

export function licenceTail(licenceKey: string): string {
  const compact = normalizeLicenceKey(licenceKey).replace(/[^A-Za-z0-9]/g, "");
  if (compact.length <= 4) return compact.padStart(4, "X").toUpperCase();
  return compact.slice(-4).toUpperCase();
}

export function maskLicenceIdentifier(licenceKeyOrTail: string): string {
  const tail =
    licenceKeyOrTail.length <= 4
      ? licenceKeyOrTail.toUpperCase().padStart(4, "X")
      : licenceTail(licenceKeyOrTail);
  return `XXXX-XXXX-XXXX-${tail}`;
}

export function hashLicenceIdentifier(licenceKey: string, secret = getSessionSecret()): string {
  const key = secret.length > 0 ? secret : "propertyiq-test-hash";
  return createHmac("sha256", key).update(normalizeLicenceKey(licenceKey), "utf8").digest("hex");
}

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLicenceProvider(value: unknown): value is LicenceProvider {
  return value === "payhip" || value === "gumroad";
}

function isCookiePayload(value: unknown): value is CookiePayload {
  if (!isRecord(value)) return false;
  if (value.provider !== undefined && !isLicenceProvider(value.provider)) return false;
  return (
    typeof value.accessId === "string" &&
    typeof value.email === "string" &&
    typeof value.licenceHash === "string" &&
    typeof value.licenceTail === "string" &&
    value.status === "active" &&
    typeof value.issuedAt === "number" &&
    typeof value.expiresAt === "number" &&
    typeof value.lastRevalidatedAt === "number" &&
    typeof value.usageCounted === "boolean" &&
    typeof value.licenceKey === "string"
  );
}

export function sessionProvider(payload: Pick<CookiePayload, "provider">): LicenceProvider {
  return payload.provider ?? "payhip";
}

export function publicSession(payload: CookiePayload): AccessSession {
  return {
    accessId: payload.accessId,
    email: payload.email,
    licenceHash: payload.licenceHash,
    licenceTail: payload.licenceTail,
    status: payload.status,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    lastRevalidatedAt: payload.lastRevalidatedAt,
    usageCounted: payload.usageCounted,
    provider: sessionProvider(payload),
  };
}

export function cookieOptions(expiresAt: number, now = Date.now()): AccessCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Math.max(expiresAt, now)),
  };
}

export function signAccessSession(payload: CookiePayload, secret = getSessionSecret()): string {
  if (!secret) {
    throw new Error("PROPERTYIQ_SESSION_SECRET is not configured");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, encryptionKey(secret), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SESSION_VERSION, toBase64Url(iv), toBase64Url(Buffer.concat([encrypted, tag]))].join(".");
}

export function parseAccessSession(
  token: string | undefined,
  now = Date.now(),
  secret = getSessionSecret(),
): SessionValidation {
  if (!token) return { ok: false, reason: "missing" };
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== SESSION_VERSION) return { ok: false, reason: "invalid" };
  const ivPart = parts[1];
  const dataPart = parts[2];
  if (!ivPart || !dataPart) return { ok: false, reason: "invalid" };
  try {
    const iv = fromBase64Url(ivPart);
    const packed = fromBase64Url(dataPart);
    if (iv.length !== 12 || packed.length < 17) return { ok: false, reason: "invalid" };
    const tag = packed.subarray(packed.length - 16);
    const encrypted = packed.subarray(0, packed.length - 16);
    const decipher = createDecipheriv(AES_ALGORITHM, encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed: unknown = JSON.parse(decrypted.toString("utf8"));
    if (!isCookiePayload(parsed)) return { ok: false, reason: "invalid" };
    if (parsed.expiresAt <= now) return { ok: false, reason: "expired" };
    return { ok: true, session: publicSession(parsed), payload: parsed };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function tamperSessionToken(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[2]) return `${token}x`;
  const mutated = parts[2].endsWith("A") ? `${parts[2].slice(0, -1)}B` : `${parts[2].slice(0, -1)}A`;
  return `${parts[0]}.${parts[1]}.${mutated}`;
}
