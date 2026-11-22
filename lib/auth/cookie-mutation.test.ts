import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE_NAME } from "@/lib/auth/routes";
import { resolveAccessGate } from "@/lib/auth/gate";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  type PayhipClient,
  activateAccess,
  createAccessSession,
  logoutAccess,
  renewAccessSession,
  requirePropertyIqAccess,
  validateAccessSession,
} from "@/lib/auth/propertyiq-access";
import { type GumroadCallResult, type GumroadClient, type GumroadLicenceRecord } from "@/lib/auth/gumroad";
import { REVALIDATE_INTERVAL_MS, type CookiePayload, signAccessSession } from "@/lib/auth/session";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    },
    delete: () => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    },
  }),
}));

const SECRET = "propertyiq-session-secret-key";
const EMAIL = "buyer@example.com";
const PAYHIP_LICENCE = "WTKP4-66NL5-HMKQW-GFSCZ";
const GUMROAD_LICENCE = "A1B2C3D4-E5F60718-9ABCDEF0-1234ABCD";
const GUMROAD_PRODUCT = "gumroad-propertyiq-product";

class RecordingCookieStore implements AccessCookieStore {
  private readonly values = new Map<string, string>();
  sets = 0;
  deletes = 0;

  get(name: string): { value: string } | undefined {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }

  set(name: string, value: string, options?: AccessCookieOptions): void {
    void options;
    this.sets += 1;
    if (!value) {
      this.deletes += 1;
      this.values.delete(name);
      return;
    }
    this.values.set(name, value);
  }

  delete(name: string): void {
    this.deletes += 1;
    this.values.delete(name);
  }

  raw(name: string): string | undefined {
    return this.values.get(name);
  }
}

function payhipClient(): PayhipClient {
  return {
    async verify() {
      return {
        status: "ok",
        record: {
          enabled: true,
          productLink: "PIQ1",
          licenceKey: PAYHIP_LICENCE,
          buyerEmail: EMAIL,
          uses: 0,
          productName: "PropertyIQ",
          issuedAt: "2026-01-01T00:00:00+00:00",
        },
      };
    },
    async incrementUsage() {
      return {
        status: "ok",
        record: {
          enabled: true,
          productLink: "PIQ1",
          licenceKey: PAYHIP_LICENCE,
          buyerEmail: EMAIL,
          uses: 1,
          productName: "PropertyIQ",
          issuedAt: "2026-01-01T00:00:00+00:00",
        },
      };
    },
    async decrementUsage() {
      return {
        status: "ok",
        record: {
          enabled: true,
          productLink: "PIQ1",
          licenceKey: PAYHIP_LICENCE,
          buyerEmail: EMAIL,
          uses: 0,
          productName: "PropertyIQ",
          issuedAt: "2026-01-01T00:00:00+00:00",
        },
      };
    },
  };
}

function gumroadRecord(overrides: Partial<GumroadLicenceRecord> = {}): GumroadLicenceRecord {
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

function gumroadClient(): GumroadClient & { incrementFlags: boolean[] } {
  const client = {
    incrementFlags: [] as boolean[],
    async verify(_key: string, incrementUses: boolean): Promise<GumroadCallResult> {
      client.incrementFlags.push(incrementUses);
      return { status: "ok", record: gumroadRecord({ uses: incrementUses ? 1 : 0 }) };
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

describe("Cookie mutation contexts", () => {
  it("sets propertyiq_access from Gumroad activation (Route Handler helper)", async () => {
    const cookies = new RecordingCookieStore();
    const result = await activateAccess({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroadClient(),
      cookieStore: cookies,
    });
    expect(result.ok).toBe(true);
    expect(cookies.sets).toBeGreaterThan(0);
    expect(cookies.raw(ACCESS_COOKIE_NAME)).toBeTruthy();
  });

  it("sets propertyiq_access from Payhip activation", async () => {
    delete process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID;
    const cookies = new RecordingCookieStore();
    const result = await activateAccess({
      email: EMAIL,
      licenceKey: PAYHIP_LICENCE,
      client: payhipClient(),
      cookieStore: cookies,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.provider).toBe("payhip");
    expect(cookies.sets).toBeGreaterThan(0);
  });

  it("does not mutate cookies while rendering a valid protected session", async () => {
    const cookies = new RecordingCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      usageCounted: true,
      provider: "gumroad",
      cookieStore: cookies,
    });
    const setsAfterCreate = cookies.sets;
    const deletesAfterCreate = cookies.deletes;

    const first = await requirePropertyIqAccess({
      cookieStore: cookies,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroadClient(),
      revalidate: "if_stale",
    });
    expect(first.ok).toBe(true);
    expect(cookies.sets).toBe(setsAfterCreate);
    expect(cookies.deletes).toBe(deletesAfterCreate);

    const refresh = await requirePropertyIqAccess({
      cookieStore: cookies,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroadClient(),
      revalidate: true,
    });
    expect(refresh.ok).toBe(true);
    expect(cookies.sets).toBe(setsAfterCreate);
    expect(cookies.deletes).toBe(deletesAfterCreate);
    expect(resolveAccessGate("/quick-underwrite", "", cookies.raw(ACCESS_COOKIE_NAME)).action).toBe("allow");
    expect(resolveAccessGate("/dashboard", "", cookies.raw(ACCESS_COOKIE_NAME)).action).toBe("allow");
  });

  it("does not rewrite the cookie when navigating between protected routes", async () => {
    const cookies = new RecordingCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: PAYHIP_LICENCE,
      usageCounted: true,
      provider: "payhip",
      cookieStore: cookies,
    });
    const setsAfterCreate = cookies.sets;

    for (const path of ["/quick-underwrite", "/max-offer", "/settings", "/portfolio"]) {
      const access = await requirePropertyIqAccess({
        cookieStore: cookies,
        client: payhipClient(),
        revalidate: "if_stale",
      });
      expect(access.ok).toBe(true);
      expect(resolveAccessGate(path, "", cookies.raw(ACCESS_COOKIE_NAME)).action).toBe("allow");
    }
    expect(cookies.sets).toBe(setsAfterCreate);
  });

  it("redirects expired sessions without render-time cookie mutation", async () => {
    const cookies = new RecordingCookieStore();
    const now = Date.now();
    const payload: CookiePayload = {
      accessId: "expired",
      email: EMAIL,
      licenceHash: "abc",
      licenceTail: "ABCD",
      status: "active",
      issuedAt: now - 2000,
      expiresAt: now - 1000,
      lastRevalidatedAt: now - 2000,
      usageCounted: true,
      provider: "gumroad",
      licenceKey: GUMROAD_LICENCE,
    };
    cookies.set(ACCESS_COOKIE_NAME, signAccessSession(payload, SECRET), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date(now - 1000),
    });
    const setsBefore = cookies.sets;
    const result = await requirePropertyIqAccess({ cookieStore: cookies, now, revalidate: "if_stale" });
    expect(result).toEqual({ ok: false, reason: "expired" });
    expect(cookies.sets).toBe(setsBefore);
    expect(cookies.deletes).toBe(0);
    expect(resolveAccessGate("/quick-underwrite", "", cookies.raw(ACCESS_COOKIE_NAME), now).action).toBe("redirect");
  });

  it("clears the cookie on logout through a mutation helper", async () => {
    const cookies = new RecordingCookieStore();
    await activateAccess({
      email: EMAIL,
      licenceKey: PAYHIP_LICENCE,
      client: payhipClient(),
      cookieStore: cookies,
      payhipClient: payhipClient(),
    });
    expect(cookies.raw(ACCESS_COOKIE_NAME)).toBeTruthy();
    await logoutAccess({ cookieStore: cookies, client: payhipClient() });
    expect(cookies.raw(ACCESS_COOKIE_NAME)).toBeUndefined();
    expect(cookies.deletes).toBeGreaterThan(0);
  });

  it("renews Gumroad sessions only through the mutating revalidate helper", async () => {
    const cookies = new RecordingCookieStore();
    const gumroad = gumroadClient();
    await activateAccess({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
      cookieStore: cookies,
      now: Date.now() - REVALIDATE_INTERVAL_MS - 1000,
    });
    const setsAfterCreate = cookies.sets;

    const readOnly = await validateAccessSession({
      cookieStore: cookies,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
      revalidate: true,
    });
    expect(readOnly.ok).toBe(true);
    if (readOnly.ok) expect(readOnly.needsRefresh).toBe(true);
    expect(cookies.sets).toBe(setsAfterCreate);
    expect(gumroad.incrementFlags.at(-1)).toBe(false);

    const renewed = await renewAccessSession({
      cookieStore: cookies,
      payhipClient: emptyPayhip(),
      gumroadClient: gumroad,
    });
    expect(renewed.ok).toBe(true);
    if (renewed.ok) expect(renewed.needsRefresh).toBe(false);
    expect(cookies.sets).toBeGreaterThan(setsAfterCreate);
    expect(gumroad.incrementFlags.at(-1)).toBe(false);
  });

  it("keeps legacy Payhip sessions readable without mutation", async () => {
    const cookies = new RecordingCookieStore();
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
    cookies.set(ACCESS_COOKIE_NAME, signAccessSession(payload, SECRET), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date(now + 60_000),
    });
    const setsBefore = cookies.sets;
    const access = await requirePropertyIqAccess({
      cookieStore: cookies,
      client: payhipClient(),
      revalidate: false,
    });
    expect(access.ok).toBe(true);
    if (access.ok) expect(access.session.provider).toBe("payhip");
    expect(cookies.sets).toBe(setsBefore);
  });
});

describe("Render helpers do not write Next.js cookies", () => {
  it("keeps AppShell and access page on read-only session helpers", () => {
    const shell = readFileSync(path.resolve(__dirname, "../../components/layout/app-shell.tsx"), "utf8");
    const accessPage = readFileSync(path.resolve(__dirname, "../../app/access/page.tsx"), "utf8");
    expect(shell).toContain("requirePropertyIqAccess");
    expect(shell).not.toContain("createAccessSession");
    expect(shell).not.toContain("clearAccessSession");
    expect(shell).not.toContain("renewAccessSession");
    expect(accessPage).toContain("requirePropertyIqAccess");
    expect(accessPage).not.toContain("createAccessSession");
    expect(accessPage).not.toContain("clearAccessSession");
    expect(accessPage).not.toContain("renewAccessSession");
  });

  it("renews cookies from the revalidate Route Handler", () => {
    const route = readFileSync(path.resolve(__dirname, "../../app/api/access/revalidate/route.ts"), "utf8");
    const verify = readFileSync(path.resolve(__dirname, "../../app/api/access/verify/route.ts"), "utf8");
    const logout = readFileSync(path.resolve(__dirname, "../../app/api/access/logout/route.ts"), "utf8");
    const tester = readFileSync(path.resolve(__dirname, "../../app/api/access/tester/route.ts"), "utf8");
    expect(route).toContain("renewAccessSession");
    expect(verify).toContain("activateAccess");
    expect(logout).toContain("logoutAccess");
    expect(tester).toContain("activateTesterAccess");
    expect(tester).not.toContain("cookies()");
  });
});
