import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE_NAME } from "@/lib/auth/routes";
import { licenceKeyFromAccessQuery, accessQueryWithoutLicenceKey } from "@/lib/auth/access-query";
import { type GumroadCallResult, type GumroadClient, type GumroadLicenceRecord } from "@/lib/auth/gumroad";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  type PayhipClient,
  activateAccess,
  createAccessSession,
  validateAccessSession,
  verifyGumroadLicence,
} from "@/lib/auth/propertyiq-access";
import { type CookiePayload, parseAccessSession, signAccessSession } from "@/lib/auth/session";
import { resolveAccessGate } from "@/lib/auth/gate";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const SECRET = "propertyiq-session-secret-key";
const EMAIL = "buyer@example.com";
const PAYHIP_LICENCE = "WTKP4-66NL5-HMKQW-GFSCZ";
const GUMROAD_LICENCE = "A1B2C3D4-E5F60718-9ABCDEF0-1234ABCD";
const GUMROAD_PRODUCT = "gumroad-propertyiq-product";

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

function validGumroad(overrides: Partial<GumroadLicenceRecord> = {}): GumroadLicenceRecord {
  return {
    success: true,
    productId: GUMROAD_PRODUCT,
    licenceKey: GUMROAD_LICENCE,
    buyerEmail: EMAIL,
    uses: 0,
    refunded: false,
    chargebacked: false,
    disputed: false,
    disputeWon: false,
    ...overrides,
  };
}

function mockGumroad(options: {
  inspect?: GumroadCallResult;
  increment?: GumroadCallResult;
} = {}): GumroadClient & { calls: boolean[] } {
  const client = {
    calls: [] as boolean[],
    async verify(_licenceKey: string, incrementUses: boolean): Promise<GumroadCallResult> {
      client.calls.push(incrementUses);
      if (incrementUses) return options.increment ?? options.inspect ?? { status: "ok", record: validGumroad({ uses: 1 }) };
      return options.inspect ?? { status: "ok", record: validGumroad() };
    },
  };
  return client;
}

function emptyPayhip(): PayhipClient {
  return {
    async verify() {
      return { status: "empty" };
    },
    async incrementUsage() {
      return { status: "empty" };
    },
    async decrementUsage() {
      return { status: "empty" };
    },
  };
}

function installLocalStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return { map, storage };
}

beforeEach(() => {
  process.env.PAYHIP_PRODUCT_SECRET_KEY = "payhip-product-secret-key";
  process.env.PROPERTYIQ_SESSION_SECRET = SECRET;
  process.env.PAYHIP_PROPERTYIQ_PRODUCT_LINK = "PIQ1";
  process.env.PAYHIP_MAX_ACTIVATIONS = "2";
  process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID = GUMROAD_PRODUCT;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Gumroad licence verification", () => {
  it("grants access for a valid Gumroad licence", async () => {
    const cookies = new MemoryCookieStore();
    const gumroad = mockGumroad();
    const result = await activateAccess({
      email: ` ${EMAIL.toUpperCase()} `,
      licenceKey: ` ${GUMROAD_LICENCE} `,
      from: "/quick-underwrite",
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
      cookieStore: cookies,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.provider).toBe("gumroad");
    expect(result.session.email).toBe(EMAIL);
    expect(gumroad.calls).toContain(true);
    expect(cookies.get(ACCESS_COOKIE_NAME)?.value).toBeTruthy();
  });

  it("rejects an invalid Gumroad licence", async () => {
    const result = await verifyGumroadLicence(
      EMAIL,
      GUMROAD_LICENCE,
      { client: mockGumroad({ inspect: { status: "empty" } }), incrementUses: false },
    );
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a Gumroad email mismatch", async () => {
    const result = await verifyGumroadLicence("other@example.com", GUMROAD_LICENCE, {
      client: mockGumroad(),
      incrementUses: false,
    });
    expect(result).toEqual({ ok: false, reason: "email_mismatch" });
  });

  it("rejects a refunded Gumroad purchase", async () => {
    const result = await verifyGumroadLicence(EMAIL, GUMROAD_LICENCE, {
      client: mockGumroad({ inspect: { status: "ok", record: validGumroad({ refunded: true }) } }),
      incrementUses: false,
    });
    expect(result).toEqual({ ok: false, reason: "disabled" });
  });

  it("rejects a chargebacked or disputed Gumroad purchase", async () => {
    const charged = await verifyGumroadLicence(EMAIL, GUMROAD_LICENCE, {
      client: mockGumroad({ inspect: { status: "ok", record: validGumroad({ chargebacked: true }) } }),
    });
    expect(charged).toEqual({ ok: false, reason: "disabled" });

    const disputed = await verifyGumroadLicence(EMAIL, GUMROAD_LICENCE, {
      client: mockGumroad({ inspect: { status: "ok", record: validGumroad({ disputed: true, disputeWon: false }) } }),
    });
    expect(disputed).toEqual({ ok: false, reason: "disabled" });
  });

  it("rejects a Gumroad licence for the wrong product", async () => {
    const result = await verifyGumroadLicence(EMAIL, GUMROAD_LICENCE, {
      client: mockGumroad({
        inspect: { status: "ok", record: validGumroad({ productId: "some-other-product" }) },
      }),
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("Gumroad usage and storage", () => {
  it("does not increment Gumroad uses during routine revalidation", async () => {
    const cookies = new MemoryCookieStore();
    const gumroad = mockGumroad();
    await activateAccess({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
      cookieStore: cookies,
    });
    const incrementsOnActivate = gumroad.calls.filter((flag) => flag).length;
    expect(incrementsOnActivate).toBe(1);

    const again = await validateAccessSession({
      cookieStore: cookies,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
      revalidate: true,
    });
    expect(again.ok).toBe(true);
    expect(gumroad.calls.filter((flag) => flag).length).toBe(incrementsOnActivate);
    expect(gumroad.calls.at(-1)).toBe(false);
  });

  it("does not write the raw Gumroad licence to localStorage", async () => {
    const { map, storage } = installLocalStorage();
    const setSpy = vi.spyOn(storage, "setItem");
    const cookies = new MemoryCookieStore();
    await activateAccess({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      payhipClient: emptyPayhip(),
      gumroadClient: mockGumroad(),
      cookieStore: cookies,
    });
    expect(setSpy).not.toHaveBeenCalled();
    expect([...map.values()].join(" ")).not.toContain(GUMROAD_LICENCE);
    const parsed = parseAccessSession(cookies.raw(ACCESS_COOKIE_NAME));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(JSON.stringify(parsed.session)).not.toContain(GUMROAD_LICENCE);
    }
  });
});

describe("Gumroad prefilled licence key", () => {
  it("pre-fills the licence key from the access query string", () => {
    const search = new URLSearchParams(`key=${GUMROAD_LICENCE}&from=/quick-underwrite`);
    expect(licenceKeyFromAccessQuery(search)).toBe(GUMROAD_LICENCE);
    expect(accessQueryWithoutLicenceKey(search)).toBe("/access?from=%2Fquick-underwrite");
  });

  it("does not automatically activate a prefilled licence", () => {
    const source = readFileSync(path.resolve(__dirname, "../../components/access/access-screen.tsx"), "utf8");
    const submitIndex = source.indexOf("async function onSubmit");
    expect(submitIndex).toBeGreaterThan(0);
    expect(source.slice(0, submitIndex)).not.toContain("fetch(");
    expect(source.slice(submitIndex)).toContain('fetch("/api/access/verify"');
    expect(source).toContain("licenceKeyFromAccessQuery");
  });
});

describe("Payhip migration compatibility", () => {
  it("keeps a Payhip session without a provider field valid", () => {
    const now = Date.now();
    const payload: CookiePayload = {
      accessId: "legacy_payhip",
      email: EMAIL,
      licenceHash: "abc",
      licenceTail: "FSCZ",
      status: "active",
      issuedAt: now,
      expiresAt: now + 60_000,
      lastRevalidatedAt: now,
      usageCounted: true,
      licenceKey: PAYHIP_LICENCE,
    };
    const token = signAccessSession(payload, SECRET);
    const parsed = parseAccessSession(token, now, SECRET);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.session.provider).toBe("payhip");
    expect(resolveAccessGate("/max-offer", "", token, now)).toEqual({ action: "allow", pathname: "/max-offer" });
  });

  it("still protects routes after adding Gumroad", async () => {
    expect(resolveAccessGate("/settings").action).toBe("redirect");
    const cookies = new MemoryCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: PAYHIP_LICENCE,
      usageCounted: true,
      provider: "payhip",
      cookieStore: cookies,
    });
    expect(resolveAccessGate("/portfolio", "", cookies.raw(ACCESS_COOKIE_NAME))).toEqual({
      action: "allow",
      pathname: "/portfolio",
    });
  });
});
