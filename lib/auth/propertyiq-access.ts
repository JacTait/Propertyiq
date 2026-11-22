import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import {
  defaultGumroadClient,
  getGumroadProductId,
  gumroadConfigured,
  type GumroadClient,
  verifyGumroadLicence,
} from "@/lib/auth/gumroad";
import {
  ACCESS_COOKIE_NAME,
  DEFAULT_POST_ACCESS_PATH,
  isProtectedApiPath,
  safeRedirectPath,
} from "@/lib/auth/routes";
import {
  type PurchasedLicenceStore,
  isWhopLicenceKey,
  normalizeWhopLicenceKey,
} from "@/lib/auth/purchased-licences";
import {
  type TesterCodeStore,
  type TesterDenialReason,
  hashTesterCode,
  inspectExistingTesterSession,
  inspectNewTesterActivation,
  logTesterEvent,
  normalizeTesterCode,
  testerCodeTail,
} from "@/lib/auth/tester-codes";
import { verifyWhopLicence, whopProductConfigured } from "@/lib/auth/whop";
import {
  type AccessCookieOptions,
  type AccessSession,
  type CookiePayload,
  type LicenceProvider,
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
  sessionProvider,
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

export type { AccessCookieOptions, AccessSession, CookiePayload, LicenceProvider };

export { getGumroadProductId, gumroadConfigured, verifyGumroadLicence };

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

export type AuthorisedLicenceResult =
  | { ok: true; provider: LicenceProvider; uses: number }
  | { ok: false; reason: LicenceDenialReason };

export type SessionValidation =
  | { ok: true; session: AccessSession; needsRefresh: boolean }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "disabled" | "network" };

export type ActivateAccessResult =
  | { ok: true; session: AccessSession; redirectTo: string }
  | { ok: false; reason: LicenceDenialReason };

interface ActivateAccessInput {
  email: string;
  licenceKey: string;
  from?: string | null;
  client?: PayhipClient;
  payhipClient?: PayhipClient;
  gumroadClient?: GumroadClient;
  purchasedLicenceStore?: PurchasedLicenceStore;
  cookieStore?: AccessCookieStore;
  now?: number;
  incrementUsage?: boolean;
}

interface ValidateAccessInput {
  cookieStore?: AccessCookieStore;
  client?: PayhipClient;
  payhipClient?: PayhipClient;
  gumroadClient?: GumroadClient;
  testerStore?: TesterCodeStore;
  purchasedLicenceStore?: PurchasedLicenceStore;
  now?: number;
  revalidate?: boolean | "if_stale";
}

interface ActivateTesterAccessInput {
  testerCode: string;
  email?: string | null;
  from?: string | null;
  cookieStore?: AccessCookieStore;
  testerStore?: TesterCodeStore;
  now?: number;
}

export type ActivateTesterAccessResult =
  | { ok: true; session: AccessSession; redirectTo: string }
  | { ok: false; reason: TesterDenialReason };

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

export function payhipConfigured(): boolean {
  return getPayhipProductSecret().length > 0;
}

export function accessSecretsConfigured(): boolean {
  return getSessionSecret().length >= 16 && (payhipConfigured() || gumroadConfigured() || whopProductConfigured());
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

async function readAccessCookie(store?: AccessCookieStore): Promise<string | undefined> {
  if (store) return store.get(ACCESS_COOKIE_NAME)?.value;
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE_NAME)?.value;
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
  if (!payhipConfigured() || getSessionSecret().length < 16) {
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

  logSafe("verify_ok", { provider: "payhip", licence: maskLicenceIdentifier(normalisedKey) });
  return { ok: true, record };
}

function pickLicenceDenial(outcomes: AuthorisedLicenceResult[]): AuthorisedLicenceResult {
  const reasons = outcomes.filter((outcome): outcome is { ok: false; reason: LicenceDenialReason } => !outcome.ok).map(
    (outcome) => outcome.reason,
  );
  if (reasons.length === 0) return { ok: false, reason: "invalid" };

  const onlyWeak = reasons.every((reason) => reason === "invalid" || reason === "network" || reason === "misconfigured");
  if (onlyWeak && reasons.includes("network")) return { ok: false, reason: "network" };

  const ranked: LicenceDenialReason[] = [
    "email_mismatch",
    "disabled",
    "activation_limit",
    "network",
    "misconfigured",
    "invalid",
    "rate_limited",
  ];
  for (const reason of ranked) {
    if (reasons.includes(reason)) return { ok: false, reason };
  }
  return { ok: false, reason: "invalid" };
}

export async function verifyAuthorisedLicence(
  email: string,
  licenceKey: string,
  options: {
    payhipClient?: PayhipClient;
    gumroadClient?: GumroadClient;
    purchasedLicenceStore?: PurchasedLicenceStore;
    incrementGumroadUses?: boolean;
  } = {},
): Promise<AuthorisedLicenceResult> {
  if (
    getSessionSecret().length < 16 ||
    (!payhipConfigured() && !gumroadConfigured() && !whopProductConfigured() && !isWhopLicenceKey(licenceKey))
  ) {
    logSafe("verify_misconfigured");
    return { ok: false, reason: "misconfigured" };
  }

  if (isWhopLicenceKey(licenceKey)) {
    try {
      const store = await resolvePurchasedStore(options.purchasedLicenceStore);
      const whop = await verifyWhopLicence(email, licenceKey, store);
      if (whop.ok) return { ok: true, provider: "whop", uses: 0 };
      return whop;
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  const outcomes: AuthorisedLicenceResult[] = [];
  const payhipClient = options.payhipClient ?? defaultPayhipClient;
  const gumroadClient = options.gumroadClient ?? defaultGumroadClient;

  if (payhipConfigured()) {
    const payhip = await verifyPayhipLicence(email, licenceKey, payhipClient);
    if (payhip.ok) return { ok: true, provider: "payhip", uses: payhip.record.uses };
    outcomes.push(payhip);
  }

  if (gumroadConfigured()) {
    const gumroad = await verifyGumroadLicence(email, licenceKey, {
      client: gumroadClient,
      incrementUses: options.incrementGumroadUses === true,
    });
    if (gumroad.ok) return { ok: true, provider: "gumroad", uses: gumroad.record.uses };
    outcomes.push(gumroad);
  }

  return pickLicenceDenial(outcomes);
}

async function resolveCookieStore(store?: AccessCookieStore): Promise<AccessCookieStore> {
  return store ?? (await getAccessCookieStore());
}

async function resolveTesterStore(store?: TesterCodeStore): Promise<TesterCodeStore> {
  if (store) return store;
  const { getTesterCodeStore } = await import("@/lib/db/tester-store");
  return getTesterCodeStore();
}

async function resolvePurchasedStore(store?: PurchasedLicenceStore): Promise<PurchasedLicenceStore> {
  if (store) return store;
  const { getPurchasedLicenceStore } = await import("@/lib/db/purchased-licence-store");
  return getPurchasedLicenceStore();
}

export async function createAccessSession(input: {
  email: string;
  licenceKey: string;
  usageCounted: boolean;
  provider?: LicenceProvider;
  now?: number;
  cookieStore?: AccessCookieStore;
  expiresAt?: number;
  testerRecordId?: string;
  licenceTail?: string;
}): Promise<AccessSession> {
  const now = input.now ?? Date.now();
  const provider = input.provider ?? "payhip";
  const isTester = provider === "tester";
  const email = normalizeEmail(input.email);
  const licenceKey = isTester ? "" : normalizeLicenceKey(input.licenceKey);
  const testerRecordId = isTester ? input.testerRecordId : undefined;
  if (isTester && !testerRecordId) {
    throw new Error("Tester sessions require a testerRecordId.");
  }
  const payload: CookiePayload = {
    accessId: randomUUID(),
    email,
    licenceHash: isTester
      ? hashLicenceIdentifier(`tester:${testerRecordId}`)
      : hashLicenceIdentifier(licenceKey),
    licenceTail: input.licenceTail ?? licenceTail(licenceKey),
    status: "active",
    issuedAt: now,
    expiresAt: input.expiresAt ?? now + SESSION_TTL_MS,
    lastRevalidatedAt: now,
    usageCounted: input.usageCounted,
    provider,
    licenceKey,
    ...(testerRecordId ? { testerRecordId } : {}),
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

type StoredAccessCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "disabled" | "expired" | "network" | "email_mismatch" | "activation_limit" | "misconfigured" | "rate_limited" };

function toSessionFailure(reason: Exclude<StoredAccessCheck, { ok: true }>["reason"]): "invalid" | "expired" | "disabled" | "network" {
  if (reason === "disabled") return "disabled";
  if (reason === "expired") return "expired";
  if (reason === "network") return "network";
  return "invalid";
}

async function revalidateStoredAccess(
  payload: CookiePayload,
  options: ValidateAccessInput,
  now: number,
): Promise<StoredAccessCheck> {
  const provider = sessionProvider(payload);
  if (provider === "tester") {
    const testerRecordId = payload.testerRecordId;
    if (!testerRecordId) return { ok: false, reason: "invalid" };
    try {
      const testerStore = await resolveTesterStore(options.testerStore);
      const record = await testerStore.findById(testerRecordId);
      if (!record) return { ok: false, reason: "invalid" };
      return inspectExistingTesterSession(record, now, payload.email);
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  if (provider === "whop") {
    try {
      const store = await resolvePurchasedStore(options.purchasedLicenceStore);
      const verified = await verifyWhopLicence(payload.email, payload.licenceKey, store);
      return verified.ok ? { ok: true } : verified;
    } catch {
      return { ok: false, reason: "network" };
    }
  }

  const payhipClient = options.payhipClient ?? options.client ?? defaultPayhipClient;
  const gumroadClient = options.gumroadClient ?? defaultGumroadClient;
  if (provider === "gumroad") {
    const verified = await verifyGumroadLicence(payload.email, payload.licenceKey, {
      client: gumroadClient,
      incrementUses: false,
    });
    return verified.ok ? { ok: true } : verified;
  }

  const verified = await verifyPayhipLicence(payload.email, payload.licenceKey, payhipClient);
  return verified.ok ? { ok: true } : verified;
}

export async function getAccessSession(options: ValidateAccessInput = {}): Promise<SessionValidation> {
  return validateAccessSession(options);
}

export async function validateAccessSession(options: ValidateAccessInput = {}): Promise<SessionValidation> {
  const now = options.now ?? Date.now();
  const token = await readAccessCookie(options.cookieStore);
  const parsed: ParsedSession = parseAccessSession(token, now);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  const provider = sessionProvider(parsed.payload);
  const stale = now - parsed.payload.lastRevalidatedAt >= REVALIDATE_INTERVAL_MS;
  const shouldRevalidate =
    options.revalidate === true ||
    (options.revalidate === "if_stale" && (stale || provider === "tester"));
  if (!shouldRevalidate) {
    return { ok: true, session: parsed.session, needsRefresh: false };
  }

  const verified = await revalidateStoredAccess(parsed.payload, options, now);
  if (!verified.ok && verified.reason === "network") {
    return { ok: true, session: parsed.session, needsRefresh: true };
  }
  if (!verified.ok) {
    return { ok: false, reason: toSessionFailure(verified.reason) };
  }

  return { ok: true, session: parsed.session, needsRefresh: true };
}

export async function renewAccessSession(options: ValidateAccessInput = {}): Promise<SessionValidation> {
  const store = await resolveCookieStore(options.cookieStore);
  const now = options.now ?? Date.now();
  const token = store.get(ACCESS_COOKIE_NAME)?.value;
  const parsed: ParsedSession = parseAccessSession(token, now);
  if (!parsed.ok) {
    await clearAccessSession(store);
    return { ok: false, reason: parsed.reason };
  }

  const verified = await revalidateStoredAccess(parsed.payload, options, now);
  if (!verified.ok && verified.reason === "network") {
    return { ok: true, session: parsed.session, needsRefresh: true };
  }
  if (!verified.ok) {
    await clearAccessSession(store);
    return { ok: false, reason: toSessionFailure(verified.reason) };
  }

  parsed.payload.lastRevalidatedAt = now;
  parsed.payload.provider = sessionProvider(parsed.payload);
  const session = await persistSession(parsed.payload, store);
  return { ok: true, session, needsRefresh: false };
}

export async function activateAccess(input: ActivateAccessInput): Promise<ActivateAccessResult> {
  const now = input.now ?? Date.now();
  const payhipClient = input.payhipClient ?? input.client ?? defaultPayhipClient;
  const gumroadClient = input.gumroadClient ?? defaultGumroadClient;
  const store = await resolveCookieStore(input.cookieStore);
  const inspected = await verifyAuthorisedLicence(input.email, input.licenceKey, {
    payhipClient,
    gumroadClient,
    purchasedLicenceStore: input.purchasedLicenceStore,
    incrementGumroadUses: false,
  });
  if (!inspected.ok) return inspected;

  const licenceKey =
    inspected.provider === "whop" ? normalizeWhopLicenceKey(input.licenceKey) : normalizeLicenceKey(input.licenceKey);
  const current = await validateAccessSession({
    cookieStore: store,
    now,
    revalidate: false,
    payhipClient,
    gumroadClient,
    purchasedLicenceStore: input.purchasedLicenceStore,
  });
  const sameBrowser =
    current.ok &&
    current.session.licenceHash === hashLicenceIdentifier(licenceKey) &&
    current.session.email === normalizeEmail(input.email) &&
    current.session.provider === inspected.provider;

  let usageCounted = sameBrowser ? current.session.usageCounted : true;
  if (inspected.provider === "whop") {
    usageCounted = true;
    if (!sameBrowser) {
      try {
        const purchased = await resolvePurchasedStore(input.purchasedLicenceStore);
        const record = await verifyWhopLicence(input.email, licenceKey, purchased);
        if (record.ok) await purchased.markActivated(record.record.id, now);
      } catch {
        return { ok: false, reason: "network" };
      }
    }
  } else if (!sameBrowser && input.incrementUsage !== false) {
    if (inspected.uses >= getMaxActivations()) {
      logSafe("verify_denied", {
        provider: inspected.provider,
        outcome: "activation_limit",
        licence: maskLicenceIdentifier(licenceKey),
      });
      return { ok: false, reason: "activation_limit" };
    }
    if (inspected.provider === "payhip") {
      const incremented = await payhipClient.incrementUsage(licenceKey);
      if (incremented.status === "network") return { ok: false, reason: "network" };
    } else {
      const incremented = await verifyGumroadLicence(input.email, licenceKey, {
        client: gumroadClient,
        incrementUses: true,
      });
      if (!incremented.ok && incremented.reason === "network") return { ok: false, reason: "network" };
      if (!incremented.ok) return incremented;
    }
    usageCounted = true;
  } else if (sameBrowser) {
    usageCounted = current.session.usageCounted;
  }

  const session = await createAccessSession({
    email: input.email,
    licenceKey,
    usageCounted,
    provider: inspected.provider,
    now,
    cookieStore: store,
  });

  return { ok: true, session, redirectTo: safeRedirectPath(input.from) };
}

export async function activateTesterAccess(input: ActivateTesterAccessInput): Promise<ActivateTesterAccessResult> {
  const now = input.now ?? Date.now();
  if (getSessionSecret().length < 16) {
    logTesterEvent("tester_activation_failed", { outcome: "misconfigured" });
    return { ok: false, reason: "misconfigured" };
  }

  const normalisedCode = normalizeTesterCode(input.testerCode);
  if (!normalisedCode) {
    logTesterEvent("tester_activation_failed", { outcome: "invalid" });
    return { ok: false, reason: "invalid" };
  }

  const store = await resolveCookieStore(input.cookieStore);
  let testerStore: TesterCodeStore;
  try {
    testerStore = await resolveTesterStore(input.testerStore);
  } catch {
    logTesterEvent("tester_activation_failed", { outcome: "network" });
    return { ok: false, reason: "network" };
  }

  const codePrefix = `PIQ-TEST-****-${normalisedCode.slice(-4)}`;
  let record;
  try {
    record = await testerStore.findByHash(hashTesterCode(normalisedCode));
  } catch {
    logTesterEvent("tester_activation_failed", { outcome: "network" });
    return { ok: false, reason: "network" };
  }

  if (!record) {
    logTesterEvent("tester_activation_failed", { outcome: "invalid", codePrefix });
    return { ok: false, reason: "invalid" };
  }

  const email = input.email ? normalizeEmail(input.email) : "";
  const current = await validateAccessSession({
    cookieStore: store,
    testerStore,
    now,
    revalidate: false,
  });
  const sameBrowser =
    current.ok &&
    current.session.provider === "tester" &&
    current.session.testerRecordId === record.id;

  const inspected = sameBrowser
    ? inspectExistingTesterSession(record, now, email || current.session.email)
    : inspectNewTesterActivation(record, now, email || undefined);
  if (!inspected.ok) return inspected;

  if (!sameBrowser) {
    let incremented: typeof record | null;
    try {
      incremented = await testerStore.incrementActivation(record.id, now);
    } catch {
      logTesterEvent("tester_activation_failed", {
        recordId: record.id,
        codePrefix: record.codePrefix,
        outcome: "network",
      });
      return { ok: false, reason: "network" };
    }
    if (!incremented) {
      logTesterEvent("tester_activation_failed", {
        recordId: record.id,
        codePrefix: record.codePrefix,
        outcome: "activation_limit",
      });
      return { ok: false, reason: "activation_limit" };
    }
    record = incremented;
  }

  const session = await createAccessSession({
    email: record.emailRestriction ?? email,
    licenceKey: "",
    usageCounted: true,
    provider: "tester",
    now,
    cookieStore: store,
    expiresAt: record.expiresAt,
    testerRecordId: record.id,
    licenceTail: testerCodeTail(record.codePrefix),
  });

  logTesterEvent("tester_activation_success", {
    recordId: record.id,
    codePrefix: record.codePrefix,
  });
  return { ok: true, session, redirectTo: safeRedirectPath(input.from) };
}

export async function logoutAccess(options: {
  cookieStore?: AccessCookieStore;
  client?: PayhipClient;
  payhipClient?: PayhipClient;
  now?: number;
}): Promise<void> {
  const store = await resolveCookieStore(options.cookieStore);
  const token = store.get(ACCESS_COOKIE_NAME)?.value;
  const parsed = parseAccessSession(token, options.now ?? Date.now());
  const provider = parsed.ok ? sessionProvider(parsed.payload) : "payhip";
  if (parsed.ok && parsed.payload.usageCounted && provider === "payhip") {
    const client = options.payhipClient ?? options.client ?? defaultPayhipClient;
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
