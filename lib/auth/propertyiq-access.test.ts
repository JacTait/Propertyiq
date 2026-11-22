import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import { BROWSER_OWNED_STORAGE_KEYS } from "@/lib/data/customer-scope";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import { resolveAccessGate } from "@/lib/auth/gate";
import { ACCESS_COOKIE_NAME } from "@/lib/auth/routes";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  type PayhipCallResult,
  type PayhipClient,
  type PayhipLicenceRecord,
  activateAccess,
  createAccessSession,
  logoutAccess,
  renewAccessSession,
  validateAccessSession,
  verifyPayhipLicence,
} from "@/lib/auth/propertyiq-access";
import {
  type CookiePayload,
  maskLicenceIdentifier,
  parseAccessSession,
  signAccessSession,
  tamperSessionToken,
} from "@/lib/auth/session";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const SECRET = "propertyiq-session-secret-key";
const PRODUCT_SECRET = "payhip-product-secret-key";
const EMAIL = "buyer@example.com";
const LICENCE = "WTKP4-66NL5-HMKQW-GFSCZ";

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

function validRecord(overrides: Partial<PayhipLicenceRecord> = {}): PayhipLicenceRecord {
  return {
    enabled: true,
    productLink: "PIQ1",
    licenceKey: LICENCE,
    buyerEmail: EMAIL,
    uses: 0,
    productName: "PropertyIQ",
    issuedAt: "2026-01-01T00:00:00+00:00",
    ...overrides,
  };
}

function mockClient(options: {
  verify?: PayhipCallResult;
  increment?: PayhipCallResult;
  decrement?: PayhipCallResult;
}): PayhipClient & { verifyCalls: number; incrementCalls: number; decrementCalls: number } {
  const client = {
    verifyCalls: 0,
    incrementCalls: 0,
    decrementCalls: 0,
    async verify(): Promise<PayhipCallResult> {
      client.verifyCalls += 1;
      return options.verify ?? { status: "ok", record: validRecord() };
    },
    async incrementUsage(): Promise<PayhipCallResult> {
      client.incrementCalls += 1;
      return options.increment ?? { status: "ok", record: validRecord({ uses: 1 }) };
    },
    async decrementUsage(): Promise<PayhipCallResult> {
      client.decrementCalls += 1;
      return options.decrement ?? { status: "ok", record: validRecord({ uses: 0 }) };
    },
  };
  return client;
}

function installLocalStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  return { map, storage };
}

function collectSourceFiles(root: string): string[] {
  const files: string[] = [];
  const skip = new Set(["node_modules", ".next", ".git", "coverage"]);
  const visit = (current: string) => {
    for (const entry of readdirSync(current)) {
      if (skip.has(entry)) continue;
      const full = path.join(current, entry);
      const stats = statSync(full);
      if (stats.isDirectory()) visit(full);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) files.push(full);
    }
  };
  visit(root);
  return files;
}

beforeEach(() => {
  process.env.PAYHIP_PRODUCT_SECRET_KEY = PRODUCT_SECRET;
  process.env.PROPERTYIQ_SESSION_SECRET = SECRET;
  process.env.PAYHIP_PROPERTYIQ_PRODUCT_LINK = "PIQ1";
  process.env.PAYHIP_MAX_ACTIVATIONS = "2";
  delete process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Payhip licence verification", () => {
  it("grants access for a valid enabled licence", async () => {
    const cookies = new MemoryCookieStore();
    const client = mockClient({});
    const result = await activateAccess({
      email: ` ${EMAIL.toUpperCase()} `,
      licenceKey: ` ${LICENCE} `,
      from: "/max-offer",
      client,
      cookieStore: cookies,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.status).toBe("active");
    expect(result.session.email).toBe(EMAIL);
    expect(result.redirectTo).toBe("/max-offer");
    expect(client.incrementCalls).toBe(1);
    expect(cookies.get(ACCESS_COOKIE_NAME)?.value).toBeTruthy();
  });

  it("denies an invalid licence", async () => {
    const result = await verifyPayhipLicence(EMAIL, "NOPE-NOPE-NOPE-NOPE", mockClient({ verify: { status: "empty" } }));
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("denies a disabled licence", async () => {
    const result = await verifyPayhipLicence(
      EMAIL,
      LICENCE,
      mockClient({ verify: { status: "ok", record: validRecord({ enabled: false }) } }),
    );
    expect(result).toEqual({ ok: false, reason: "disabled" });
    expect(ACCESS_ERROR_MESSAGES.disabled).toBe("This PropertyIQ licence is no longer active.");
  });

  it("denies an email mismatch", async () => {
    const result = await verifyPayhipLicence("other@example.com", LICENCE, mockClient({}));
    expect(result).toEqual({ ok: false, reason: "email_mismatch" });
  });

  it("returns a safe retry message when Payhip is unavailable", async () => {
    const cookies = new MemoryCookieStore();
    const result = await activateAccess({
      email: EMAIL,
      licenceKey: LICENCE,
      client: mockClient({ verify: { status: "network" } }),
      cookieStore: cookies,
    });
    expect(result).toEqual({ ok: false, reason: "network" });
    expect(ACCESS_ERROR_MESSAGES.network).toMatch(/try again/i);
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeUndefined();
  });
});

describe("Route protection", () => {
  it("redirects protected routes without a session", () => {
    const gate = resolveAccessGate("/quick-underwrite", "?id=abc");
    expect(gate.action).toBe("redirect");
    if (gate.action !== "redirect") return;
    expect(gate.location).toContain("/access?");
    expect(gate.location).toContain(encodeURIComponent("/quick-underwrite?id=abc"));
  });

  it("allows a protected route with a valid session", async () => {
    const cookies = new MemoryCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: LICENCE,
      usageCounted: true,
      cookieStore: cookies,
    });
    const gate = resolveAccessGate("/dashboard", "", cookies.raw(ACCESS_COOKIE_NAME));
    expect(gate).toEqual({ action: "allow", pathname: "/dashboard" });
  });
});

describe("Session security", () => {
  it("rejects a tampered session", async () => {
    const cookies = new MemoryCookieStore();
    await createAccessSession({
      email: EMAIL,
      licenceKey: LICENCE,
      usageCounted: true,
      cookieStore: cookies,
    });
    const tampered = tamperSessionToken(cookies.raw(ACCESS_COOKIE_NAME) ?? "");
    expect(parseAccessSession(tampered).ok).toBe(false);
    cookies.set(ACCESS_COOKIE_NAME, tampered, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 1000),
    });
    const validated = await validateAccessSession({ cookieStore: cookies, revalidate: false });
    expect(validated.ok).toBe(false);
  });

  it("rejects an expired session", () => {
    const now = Date.now();
    const payload: CookiePayload = {
      accessId: "access_test",
      email: EMAIL,
      licenceHash: "abc",
      licenceTail: "SCZ",
      status: "active",
      issuedAt: now - 2000,
      expiresAt: now - 1000,
      lastRevalidatedAt: now - 2000,
      usageCounted: true,
      licenceKey: LICENCE,
    };
    const token = signAccessSession(payload, SECRET);
    expect(parseAccessSession(token, now)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("Browser storage boundaries", () => {
  it("does not write the raw licence key to localStorage", async () => {
    const { map, storage } = installLocalStorage();
    const setSpy = vi.spyOn(storage, "setItem");
    const cookies = new MemoryCookieStore();
    await activateAccess({
      email: EMAIL,
      licenceKey: LICENCE,
      client: mockClient({}),
      cookieStore: cookies,
    });
    expect(setSpy).not.toHaveBeenCalled();
    expect([...map.values()].join(" ")).not.toContain(LICENCE);
    const cookieValue = cookies.raw(ACCESS_COOKIE_NAME) ?? "";
    expect(cookieValue).not.toContain(LICENCE);
    const parsed = parseAccessSession(cookieValue);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session).not.toHaveProperty("licenceKey");
      expect(JSON.stringify(parsed.session)).not.toContain(LICENCE);
    }
  });

  it("clears the session on logout without deleting Portfolio or Buy Boxes", async () => {
    const { map } = installLocalStorage({
      [STORAGE_KEYS.portfolio]: JSON.stringify([{ id: "keep" }]),
      [STORAGE_KEYS.buyBoxes]: JSON.stringify([{ id: "box" }]),
      [STORAGE_KEYS.sharedDeal]: JSON.stringify({ id: "deal" }),
    });
    const cookies = new MemoryCookieStore();
    const client = mockClient({});
    await activateAccess({
      email: EMAIL,
      licenceKey: LICENCE,
      client,
      cookieStore: cookies,
    });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeTruthy();

    await logoutAccess({ cookieStore: cookies, client });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeUndefined();
    expect(client.decrementCalls).toBe(1);
    expect(map.get(STORAGE_KEYS.portfolio)).toContain("keep");
    expect(map.get(STORAGE_KEYS.buyBoxes)).toContain("box");
    expect(map.get(STORAGE_KEYS.sharedDeal)).toContain("deal");
    expect(Object.values(BROWSER_OWNED_STORAGE_KEYS)).toContain(STORAGE_KEYS.portfolio);
  });
});

describe("Secret exposure", () => {
  it("never includes the product secret in client bundles", () => {
    const root = path.resolve(__dirname, "../..");
    const files = collectSourceFiles(root);
    const clientHits: string[] = [];
    const publicEnvHits: string[] = [];

    for (const file of files) {
      if (file.endsWith("propertyiq-access.test.ts")) continue;
      const source = readFileSync(file, "utf8");
      if (
        source.includes("NEXT_PUBLIC_PAYHIP_PRODUCT_SECRET") ||
        source.includes("NEXT_PUBLIC_PAYHIP_PRODUCT_LINK") ||
        source.includes("NEXT_PUBLIC_GUMROAD_PROPERTYIQ") ||
        source.includes("NEXT_PUBLIC_GUMROAD_PRODUCT_ID") ||
        source.includes("NEXT_PUBLIC_PROPERTYIQ_SESSION") ||
        source.includes("NEXT_PUBLIC_PROPERTYIQ_TESTER")
      ) {
        publicEnvHits.push(file);
      }
      const isClient = /^\s*["']use client["']/.test(source);
      if (
        isClient &&
        (source.includes("PAYHIP_PRODUCT_SECRET_KEY") ||
          source.includes("PROPERTYIQ_SESSION_SECRET") ||
          source.includes("GUMROAD_PROPERTYIQ_PRODUCT_ID") ||
          source.includes("PROPERTYIQ_TESTER_ADMIN_SECRET") ||
          source.includes("POSTGRES_URL") ||
          source.includes("DATABASE_URL"))
      ) {
        clientHits.push(file);
      }
    }

    expect(publicEnvHits).toEqual([]);
    expect(clientHits).toEqual([]);
    expect(readFileSync(path.join(root, "components/access/access-screen.tsx"), "utf8")).not.toContain(
      "PAYHIP_PRODUCT_SECRET_KEY",
    );
  });
});

describe("Activation limits and revalidation", () => {
  it("does not increment usage on session revalidation", async () => {
    const cookies = new MemoryCookieStore();
    const client = mockClient({});
    await activateAccess({ email: EMAIL, licenceKey: LICENCE, client, cookieStore: cookies });
    expect(client.incrementCalls).toBe(1);

    const again = await validateAccessSession({ cookieStore: cookies, client, revalidate: true });
    expect(again.ok).toBe(true);
    expect(client.incrementCalls).toBe(1);
    expect(client.verifyCalls).toBeGreaterThan(1);
  });

  it("revokes the session when Payhip reports the licence is disabled", async () => {
    const cookies = new MemoryCookieStore();
    const live = mockClient({});
    await activateAccess({ email: EMAIL, licenceKey: LICENCE, client: live, cookieStore: cookies });

    const disabled = mockClient({
      verify: { status: "ok", record: validRecord({ enabled: false }) },
    });
    const result = await validateAccessSession({ cookieStore: cookies, client: disabled, revalidate: true });
    expect(result).toEqual({ ok: false, reason: "disabled" });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeTruthy();

    const renewed = await renewAccessSession({ cookieStore: cookies, client: disabled });
    expect(renewed).toEqual({ ok: false, reason: "disabled" });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeUndefined();
  });

  it("masks licence identifiers in logs and UI", () => {
    expect(maskLicenceIdentifier(LICENCE)).toBe("XXXX-XXXX-XXXX-FSCZ");
    expect(maskLicenceIdentifier(LICENCE)).not.toContain("WTKP4");
  });
});
