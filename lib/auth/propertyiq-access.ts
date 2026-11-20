import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import {
  ACCESS_COOKIE_NAME,
  DEFAULT_POST_ACCESS_PATH,
  isProtectedApiPath,
  safeRedirectPath,
} from "@/lib/auth/routes";
import {
  type AccessCookieOptions,
  type AccessSession,
  type CookiePayload,
  type SessionValidation as ParsedSession,
  cookieOptions,
  emailsMatch,
  getSessionSecret,
  hashLicenceIdentifier,
  licenceTail,
  maskLicenceIdentifier,
  normalizeEmail,
  normalizeLicenceKey,
  parseAccessSession,
  publicSession,
  REVALIDATE_INTERVAL_MS,
  SESSION_TTL_MS,
  signAccessSession,
} from "@/lib/auth/session";

export {
  ACCESS_ERROR_MESSAGES,
  cookieOptions,
  emailsMatch,
  getSessionSecret,
  hashLicenceIdentifier,
  licenceTail,
  maskLicenceIdentifier,
  normalizeEmail,
  normalizeLicenceKey,
  parseAccessSession,
  publicSession,
  REVALIDATE_INTERVAL_MS,
  SESSION_TTL_MS,
  signAccessSession,
};

export type { AccessCookieOptions, AccessSession, CookiePayload };

export const DEFAULT_MAX_ACTIVATIONS = 2;

const PAYHIP_VERIFY_URL = "https://payhip.com/api/v2/license/verify";
const PAYHIP_USAGE_URL = "https://payhip.com/api/v2/license/usage";
const PAYHIP_DECREASE_URL = "https://payhip.com/api/v2/license/decrease";

export type AccessStatus = AccessSession["status"];

export type LicenceDenialReason =
  | "invalid"
  | "disabled"
  | "email_mismatch"
  | "activation_limit"
  | "network"
  | "rate_limited"
  | "misconfigured";

export interface AccessCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: AccessCookieOptions): void;
  delete(name: string): void;
}

export interface PayhipLicenceRecord {
  enabled: boolean;
  productLink: string;
  licenceKey: string;
  buyerEmail: string;
  uses: number;
  productName: string | null;
  issuedAt: string | null;
}

export type PayhipCallResult =
  | { status: "ok"; record: PayhipLicenceRecord }
  | { status: "empty" }
  | { status: "network" };

export interface PayhipClient {
  verify(licenceKey: string): Promise<PayhipCallResult>;
  incrementUsage(licenceKey: string): Promise<PayhipCallResult>;
  decrementUsage(licenceKey: string): Promise<PayhipCallResult>;
}

export type VerifyLicenceResult =
  | { ok: true; record: PayhipLicenceRecord }
  | { ok: false; reason: LicenceDenialReason };

export type SessionValidation =
  | { ok: true; session: AccessSession }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "disabled" | "network" };

export type ActivateAccessResult =
  | { ok: true; session: AccessSession; redirectTo: string }
  | { ok: false; reason: LicenceDenialReason };

interface ActivateAccessInput {
  email: string;
  licenceKey: string;
  from?: string | null;
  client?: PayhipClient;
  cookieStore?: AccessCookieStore;
  now?: number;
  incrementUsage?: boolean;
}

interface ValidateAccessInput {
  cookieStore?: AccessCookieStore;
  client?: PayhipClient;
  now?: number;
  revalidate?: boolean | "if_stale";
}

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getPayhipProductSecret(): string {
  return readEnv("PAYHIP_PRODUCT_SECRET_KEY");
}

export function getPayhipProductLink(): string {
  return readEnv("PAYHIP_PROPERTYIQ_PRODUCT_LINK");
}

export function getMaxActivations(): number {
  const raw = readEnv("PAYHIP_MAX_ACTIVATIONS");
  if (!raw) return DEFAULT_MAX_ACTIVATIONS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_MAX_ACTIVATIONS;
  return parsed;
}

export function accessSecretsConfigured(): boolean {
  return getPayhipProductSecret().length > 0 && getSessionSecret().length >= 16;
}

export async function getAccessCookieStore(): Promise<AccessCookieStore> {
  const store = await cookies();
  return {
    get(name) {
      const match = store.get(name);
      return match ? { value: match.value } : undefined;
    },
    set(name, value, options) {
      store.set(name, value, options);
    },
    delete(name) {
      store.set(name, "", { ...cookieOptions(0), expires: new Date(0), maxAge: 0 });
    },
  };
}

function logSafe(event: string, fields?: Record<string, string | number | boolean>): void {
  if (fields) {
    console.info(`[propertyiq-access] ${event}`, fields);
    return;
  }
  console.info(`[propertyiq-access] ${event}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parsePayhipLicencePayload(json: unknown): PayhipLicenceRecord | null {
  if (!isRecord(json)) return null;
  const data = isRecord(json.data) ? json.data : json;
  const enabled = asBoolean(data.enabled);
  const licenceKey = asString(data.license_key);
  const buyerEmail = asString(data.buyer_email);
  const productLink = asString(data.product_link);
  if (enabled === null || !licenceKey || !buyerEmail || productLink === null) {
    return null;
  }
  return {
    enabled,
    productLink,
    licenceKey,
    buyerEmail,
    uses: asNumber(data.uses) ?? 0,
    productName: asString(data.product_name),
    issuedAt: asString(data.date),
  };
}

async function payhipRequest(url: string, method: "GET" | "PUT", licenceKey: string): Promise<PayhipCallResult> {
  const secret = getPayhipProductSecret();
  if (!secret) return { status: "network" };

  const target = new URL(url);
  const body = method === "GET" ? undefined : new URLSearchParams({ license_key: licenceKey }).toString();
  if (method === "GET") {
    target.searchParams.set("license_key", licenceKey);
  }

  try {
    const response = await fetch(target, {
      method,
      headers: {
        "product-secret-key": secret,
        ...(method === "PUT" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status >= 500) {
      logSafe("payhip_unavailable", { status: response.status });
      return { status: "network" };
    }

    const text = (await response.text()).trim();
    if (!text) return { status: "empty" };

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      logSafe("payhip_unreadable", { status: response.status });
      return { status: "network" };
    }

    const record = parsePayhipLicencePayload(json);
    if (!record) return { status: "empty" };
    return { status: "ok", record };
  } catch {
    logSafe("payhip_network_failure");
    return { status: "network" };
  }
}

export const defaultPayhipClient: PayhipClient = {
  verify(licenceKey) {
    return payhipRequest(PAYHIP_VERIFY_URL, "GET", licenceKey);
  },
  incrementUsage(licenceKey) {
    return payhipRequest(PAYHIP_USAGE_URL, "PUT", licenceKey);
  },
  decrementUsage(licenceKey) {
    return payhipRequest(PAYHIP_DECREASE_URL, "PUT", licenceKey);
  },
};

function belongsToPropertyIq(record: PayhipLicenceRecord): boolean {
  const expected = getPayhipProductLink();
  if (!expected) return true;
  return record.productLink === expected;
}

export async function verifyPayhipLicence(
  email: string,
  licenceKey: string,
  client: PayhipClient = defaultPayhipClient,
): Promise<VerifyLicenceResult> {
  if (!accessSecretsConfigured()) {
    logSafe("verify_misconfigured");
    return { ok: false, reason: "misconfigured" };
  }

  const normalisedEmail = normalizeEmail(email);
  const normalisedKey = normalizeLicenceKey(licenceKey);
  if (!normalisedEmail || !normalisedKey) {
    return { ok: false, reason: "invalid" };
  }

  const result = await client.verify(normalisedKey);
  if (result.status === "network") return { ok: false, reason: "network" };
  if (result.status === "empty") {
    logSafe("verify_denied", { outcome: "invalid", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "invalid" };
  }

  const record = result.record;
  if (!belongsToPropertyIq(record)) {
    logSafe("verify_denied", { outcome: "invalid", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "invalid" };
  }
  if (!record.enabled) {
    logSafe("verify_denied", { outcome: "disabled", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "disabled" };
  }
  if (!emailsMatch(normalisedEmail, record.buyerEmail)) {
    logSafe("verify_denied", { outcome: "email_mismatch", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "email_mismatch" };
  }

  logSafe("verify_ok", { licence: maskLicenceIdentifier(normalisedKey) });
  return { ok: true, record };
}

async function resolveCookieStore(store?: AccessCookieStore): Promise<AccessCookieStore> {
  return store ?? (await getAccessCookieStore());
}

export async function createAccessSession(input: {
  email: string;
  licenceKey: string;
  usageCounted: boolean;
  now?: number;
  cookieStore?: AccessCookieStore;
}): Promise<AccessSession> {
  const now = input.now ?? Date.now();
  const email = normalizeEmail(input.email);
  const licenceKey = normalizeLicenceKey(input.licenceKey);
  const payload: CookiePayload = {
    accessId: randomUUID(),
    email,
    licenceHash: hashLicenceIdentifier(licenceKey),
    licenceTail: licenceTail(licenceKey),
    status: "active",
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
    lastRevalidatedAt: now,
    usageCounted: input.usageCounted,
    licenceKey,
  };
  const token = signAccessSession(payload);
  const store = await resolveCookieStore(input.cookieStore);
  store.set(ACCESS_COOKIE_NAME, token, cookieOptions(payload.expiresAt, now));
  return publicSession(payload);
}

export async function clearAccessSession(cookieStore?: AccessCookieStore): Promise<void> {
  const store = await resolveCookieStore(cookieStore);
  store.delete(ACCESS_COOKIE_NAME);
}

async function persistSession(payload: CookiePayload, cookieStore?: AccessCookieStore): Promise<AccessSession> {
  const token = signAccessSession(payload);
  const store = await resolveCookieStore(cookieStore);
  store.set(ACCESS_COOKIE_NAME, token, cookieOptions(payload.expiresAt, payload.lastRevalidatedAt));
  return publicSession(payload);
}

export async function validateAccessSession(options: ValidateAccessInput = {}): Promise<SessionValidation> {
  const store = await resolveCookieStore(options.cookieStore);
  const now = options.now ?? Date.now();
  const token = store.get(ACCESS_COOKIE_NAME)?.value;
  const parsed: ParsedSession = parseAccessSession(token, now);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  const stale = now - parsed.payload.lastRevalidatedAt >= REVALIDATE_INTERVAL_MS;
  const shouldRevalidate = options.revalidate === true || (options.revalidate === "if_stale" && stale);
  if (!shouldRevalidate) {
    return { ok: true, session: parsed.session };
  }

  const client = options.client ?? defaultPayhipClient;
  const verified = await verifyPayhipLicence(parsed.payload.email, parsed.payload.licenceKey, client);
  if (!verified.ok && verified.reason === "network") {
    return { ok: true, session: parsed.session };
  }
  if (!verified.ok) {
    await clearAccessSession(store);
    if (verified.reason === "disabled") return { ok: false, reason: "disabled" };
    return { ok: false, reason: "invalid" };
  }

  parsed.payload.lastRevalidatedAt = now;
  const session = await persistSession(parsed.payload, store);
  return { ok: true, session };
}

export async function activateAccess(input: ActivateAccessInput): Promise<ActivateAccessResult> {
  const now = input.now ?? Date.now();
  const client = input.client ?? defaultPayhipClient;
  const store = await resolveCookieStore(input.cookieStore);
  const verified = await verifyPayhipLicence(input.email, input.licenceKey, client);
  if (!verified.ok) return verified;

  const licenceKey = normalizeLicenceKey(input.licenceKey);
  const current = await validateAccessSession({ cookieStore: store, now, revalidate: false, client });
  const sameBrowser =
    current.ok &&
    current.session.licenceHash === hashLicenceIdentifier(licenceKey) &&
    current.session.email === normalizeEmail(input.email);

  let usageCounted = sameBrowser ? current.session.usageCounted : true;
  if (!sameBrowser && input.incrementUsage !== false) {
    if (verified.record.uses >= getMaxActivations()) {
      logSafe("verify_denied", { outcome: "activation_limit", licence: maskLicenceIdentifier(licenceKey) });
      return { ok: false, reason: "activation_limit" };
    }
    const incremented = await client.incrementUsage(licenceKey);
    if (incremented.status === "network") return { ok: false, reason: "network" };
    usageCounted = true;
  } else if (sameBrowser) {
    usageCounted = current.session.usageCounted;
  }

  const session = await createAccessSession({
    email: input.email,
    licenceKey,
    usageCounted,
    now,
    cookieStore: store,
  });

  return { ok: true, session, redirectTo: safeRedirectPath(input.from) };
}

export async function logoutAccess(options: {
  cookieStore?: AccessCookieStore;
  client?: PayhipClient;
  now?: number;
}): Promise<void> {
  const store = await resolveCookieStore(options.cookieStore);
  const token = store.get(ACCESS_COOKIE_NAME)?.value;
  const parsed = parseAccessSession(token, options.now ?? Date.now());
  if (parsed.ok && parsed.payload.usageCounted) {
    const client = options.client ?? defaultPayhipClient;
    const decreased = await client.decrementUsage(parsed.payload.licenceKey);
    if (decreased.status === "network") {
      logSafe("logout_usage_decrease_failed", { licence: maskLicenceIdentifier(parsed.payload.licenceKey) });
    } else {
      logSafe("logout_usage_decreased", { licence: maskLicenceIdentifier(parsed.payload.licenceKey) });
    }
  }
  await clearAccessSession(store);
}

export async function requirePropertyIqAccess(options: ValidateAccessInput = {}): Promise<SessionValidation> {
  return validateAccessSession({ revalidate: "if_stale", ...options });
}

export async function requireApiAccess(
  pathname: string,
  options: ValidateAccessInput = {},
): Promise<SessionValidation | { ok: true; session: AccessSession | null }> {
  if (!isProtectedApiPath(pathname)) {
    return { ok: true, session: null };
  }
  return requirePropertyIqAccess({ ...options, revalidate: options.revalidate ?? true });
}

export async function decreaseLicenceUsage(
  licenceKey: string,
  client: PayhipClient = defaultPayhipClient,
): Promise<VerifyLicenceResult> {
  const result = await client.decrementUsage(normalizeLicenceKey(licenceKey));
  if (result.status === "network") return { ok: false, reason: "network" };
  if (result.status === "empty") return { ok: false, reason: "invalid" };
  return { ok: true, record: result.record };
}

export function publicAccessStatus(session: AccessSession): {
  email: string;
  status: AccessStatus;
  activatedAt: string;
  licenceMask: string;
} {
  return {
    email: session.email,
    status: session.status,
    activatedAt: new Date(session.issuedAt).toISOString(),
    licenceMask: maskLicenceIdentifier(session.licenceTail),
  };
}

export function clientErrorReason(reason: LicenceDenialReason): keyof typeof ACCESS_ERROR_MESSAGES {
  if (reason === "misconfigured") return "network";
  return reason;
}

export function defaultRedirectPath(): string {
  return DEFAULT_POST_ACCESS_PATH;
}
