import "server-only";

import { emailsMatch, maskLicenceIdentifier, normalizeEmail, normalizeLicenceKey } from "@/lib/auth/session";

const GUMROAD_VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

export type GumroadDenialReason = "invalid" | "disabled" | "email_mismatch" | "network" | "misconfigured";

export interface GumroadLicenceRecord {
  success: true;
  productId: string;
  licenceKey: string;
  buyerEmail: string;
  uses: number;
  refunded: boolean;
  chargebacked: boolean;
  disputed: boolean;
  disputeWon: boolean;
}

export type GumroadCallResult =
  | { status: "ok"; record: GumroadLicenceRecord }
  | { status: "empty" }
  | { status: "network" };

export interface GumroadClient {
  verify(licenceKey: string, incrementUses: boolean): Promise<GumroadCallResult>;
}

export type VerifyGumroadResult =
  | { ok: true; record: GumroadLicenceRecord }
  | { ok: false; reason: GumroadDenialReason };

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function getGumroadProductId(): string {
  return readEnv("GUMROAD_PROPERTYIQ_PRODUCT_ID");
}

export function gumroadConfigured(): boolean {
  return getGumroadProductId().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseGumroadLicencePayload(json: unknown): GumroadLicenceRecord | null {
  if (!isRecord(json) || json.success !== true) return null;
  const purchase = isRecord(json.purchase) ? json.purchase : json;
  const buyerEmail = asString(purchase.email);
  const productId = asString(purchase.product_id) ?? asString(json.product_id);
  const licenceKey = asString(purchase.license_key) ?? asString(json.license_key);
  if (!buyerEmail || !productId || !licenceKey) return null;

  return {
    success: true,
    productId,
    licenceKey,
    buyerEmail,
    uses: asNumber(json.uses) ?? asNumber(purchase.uses) ?? 0,
    refunded: asBoolean(purchase.refunded),
    chargebacked: asBoolean(purchase.chargebacked),
    disputed: asBoolean(purchase.disputed),
    disputeWon: asBoolean(purchase.dispute_won),
  };
}

function logSafe(event: string, fields?: Record<string, string | number | boolean>): void {
  if (fields) {
    console.info(`[propertyiq-access] ${event}`, fields);
    return;
  }
  console.info(`[propertyiq-access] ${event}`);
}

async function gumroadRequest(licenceKey: string, incrementUses: boolean): Promise<GumroadCallResult> {
  const productId = getGumroadProductId();
  if (!productId) return { status: "network" };

  const body = new URLSearchParams({
    product_id: productId,
    license_key: licenceKey,
    increment_uses_count: incrementUses ? "true" : "false",
  });

  try {
    const response = await fetch(GUMROAD_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status >= 500) {
      logSafe("gumroad_unavailable", { status: response.status });
      return { status: "network" };
    }

    const text = (await response.text()).trim();
    if (!text) return { status: "empty" };

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      logSafe("gumroad_unreadable", { status: response.status });
      return { status: "network" };
    }

    if (isRecord(json) && json.success === false) return { status: "empty" };

    const record = parseGumroadLicencePayload(json);
    if (!record) return { status: "empty" };
    return { status: "ok", record };
  } catch {
    logSafe("gumroad_network_failure");
    return { status: "network" };
  }
}

export const defaultGumroadClient: GumroadClient = {
  verify(licenceKey, incrementUses) {
    return gumroadRequest(licenceKey, incrementUses);
  },
};

function purchaseIneligible(record: GumroadLicenceRecord): boolean {
  if (record.refunded || record.chargebacked) return true;
  if (record.disputed && !record.disputeWon) return true;
  return false;
}

export async function verifyGumroadLicence(
  email: string,
  licenceKey: string,
  options: { incrementUses?: boolean; client?: GumroadClient } = {},
): Promise<VerifyGumroadResult> {
  const productId = getGumroadProductId();
  if (!productId) {
    return { ok: false, reason: "misconfigured" };
  }

  const normalisedEmail = normalizeEmail(email);
  const normalisedKey = normalizeLicenceKey(licenceKey);
  if (!normalisedEmail || !normalisedKey) {
    return { ok: false, reason: "invalid" };
  }

  const client = options.client ?? defaultGumroadClient;
  const result = await client.verify(normalisedKey, options.incrementUses === true);
  if (result.status === "network") return { ok: false, reason: "network" };
  if (result.status === "empty") {
    logSafe("verify_denied", { provider: "gumroad", outcome: "invalid", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "invalid" };
  }

  const record = result.record;
  if (record.productId !== productId) {
    logSafe("verify_denied", { provider: "gumroad", outcome: "invalid", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "invalid" };
  }
  if (purchaseIneligible(record)) {
    logSafe("verify_denied", { provider: "gumroad", outcome: "disabled", licence: maskLicenceIdentifier(normalisedKey) });
    return { ok: false, reason: "disabled" };
  }
  if (!emailsMatch(normalisedEmail, record.buyerEmail)) {
    logSafe("verify_denied", {
      provider: "gumroad",
      outcome: "email_mismatch",
      licence: maskLicenceIdentifier(normalisedKey),
    });
    return { ok: false, reason: "email_mismatch" };
  }

  logSafe("verify_ok", { provider: "gumroad", licence: maskLicenceIdentifier(normalisedKey) });
  return { ok: true, record };
}
