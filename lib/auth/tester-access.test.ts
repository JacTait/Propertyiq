import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/constants";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import { resolveAccessGate } from "@/lib/auth/gate";
import { ACCESS_COOKIE_NAME, isProtectedApiPath, isProtectedPath } from "@/lib/auth/routes";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  type PayhipCallResult,
  type PayhipClient,
  type PayhipLicenceRecord,
  activateAccess,
  activateTesterAccess,
  logoutAccess,
  publicAccessStatus,
  renewAccessSession,
  validateAccessSession,
} from "@/lib/auth/propertyiq-access";
import {
  type GumroadCallResult,
  type GumroadClient,
  type GumroadLicenceRecord,
} from "@/lib/auth/gumroad";
import {
  DEFAULT_TESTER_MAX_ACTIVATIONS,
  MemoryTesterStore,
  generateTesterCode,
  hashTesterCode,
  issueTesterCode,
  testerCodePrefix,
} from "@/lib/auth/tester-codes";
import { parseAccessSession } from "@/lib/auth/session";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const SECRET = "propertyiq-session-secret-key";
const PRODUCT_SECRET = "payhip-product-secret-key";
const EMAIL = "buyer@example.com";
const TESTER_EMAIL = "reviewer@example.com";
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

function payhipRecord(overrides: Partial<PayhipLicenceRecord> = {}): PayhipLicenceRecord {
  return {
    enabled: true,
    productLink: "PIQ1",
    licenceKey: PAYHIP_LICENCE,
    buyerEmail: EMAIL,
    uses: 0,
    productName: "PropertyIQ",
    issuedAt: "2026-01-01T00:00:00+00:00",
    ...overrides,
  };
}

function mockPayhip(options: { verify?: PayhipCallResult; increment?: PayhipCallResult } = {}): PayhipClient {
  return {
    async verify() {
      return options.verify ?? { status: "ok", record: payhipRecord() };
    },
    async incrementUsage() {
      return options.increment ?? { status: "ok", record: payhipRecord({ uses: 1 }) };
    },
    async decrementUsage() {
      return { status: "ok", record: payhipRecord({ uses: 0 }) };
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

function mockGumroad(options: { verify?: GumroadCallResult } = {}): GumroadClient {
  return {
    async verify() {
      return options.verify ?? { status: "ok", record: gumroadRecord() };
    },
  };
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
  process.env.PROPERTYIQ_SESSION_SECRET = SECRET;
  process.env.PAYHIP_PRODUCT_SECRET_KEY = PRODUCT_SECRET;
  process.env.PAYHIP_PROPERTYIQ_PRODUCT_LINK = "PIQ1";
  process.env.PAYHIP_MAX_ACTIVATIONS = "2";
  delete process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Complimentary tester access", () => {
  it("1. grants access for a valid tester code", async () => {
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "Reddit AppScout Reviewer" });
    const result = await activateTesterAccess({
      testerCode: issued.code.toLowerCase(),
      testerStore: store,
      cookieStore: cookies,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.provider).toBe("tester");
    expect(result.session.status).toBe("active");
    expect(result.session.testerRecordId).toBe(issued.record.id);
    expect(cookies.get(ACCESS_COOKIE_NAME)?.value).toBeTruthy();
    expect(resolveAccessGate("/quick-underwrite", "", cookies.raw(ACCESS_COOKIE_NAME))).toEqual({
      action: "allow",
      pathname: "/quick-underwrite",
    });
  });

  it("2. rejects an invalid tester code", async () => {
    const result = await activateTesterAccess({
      testerCode: "PIQ-TEST-ZZZZ-ZZZZ",
      testerStore: new MemoryTesterStore(),
      cookieStore: new MemoryCookieStore(),
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
    expect(ACCESS_ERROR_MESSAGES.tester).toBe("That tester code could not be activated.");
  });

  it("3. rejects an expired tester code", async () => {
    const store = new MemoryTesterStore();
    const now = Date.now();
    const issued = await issueTesterCode(store, {
      label: "Expired reviewer",
      expiresAt: now - 1000,
      now: now - 2000,
    });
    const result = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
      now,
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("4. rejects a revoked tester code", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, { label: "Revoked reviewer" });
    await store.revoke(issued.record.id, Date.now());
    const result = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(result).toEqual({ ok: false, reason: "disabled" });
  });

  it("5. rejects an inactive tester code", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, { label: "Inactive reviewer" });
    await store.deactivate(issued.record.id);
    const result = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(result).toEqual({ ok: false, reason: "disabled" });
  });

  it("6. rejects a code over its activation limit", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, {
      label: "Single-use reviewer",
      maximumActivations: DEFAULT_TESTER_MAX_ACTIVATIONS,
    });
    const first = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(first.ok).toBe(true);
    const second = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(second).toEqual({ ok: false, reason: "activation_limit" });
  });

  it("7. rejects the wrong email for an email-restricted code", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, {
      label: "Restricted reviewer",
      emailRestriction: TESTER_EMAIL,
    });
    const result = await activateTesterAccess({
      testerCode: issued.code,
      email: "other@example.com",
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(result).toEqual({ ok: false, reason: "email_mismatch" });
  });

  it("8. accepts the correct email for an email-restricted code", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, {
      label: "Restricted reviewer",
      emailRestriction: TESTER_EMAIL,
    });
    const result = await activateTesterAccess({
      testerCode: issued.code,
      email: ` ${TESTER_EMAIL.toUpperCase()} `,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.email).toBe(TESTER_EMAIL);
  });

  it("9. increments activation count only once for a new activation", async () => {
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "Once" });
    const first = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });
    expect(first.ok).toBe(true);
    const afterFirst = await store.findById(issued.record.id);
    expect(afterFirst?.activationCount).toBe(1);

    const second = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });
    expect(second.ok).toBe(true);
    const afterSecond = await store.findById(issued.record.id);
    expect(afterSecond?.activationCount).toBe(1);
  });

  it("10. does not increment activation count on refresh or navigation", async () => {
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "Refresh" });
    await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });

    const refreshed = await validateAccessSession({
      cookieStore: cookies,
      testerStore: store,
      revalidate: true,
    });
    expect(refreshed.ok).toBe(true);

    const navigated = await validateAccessSession({
      cookieStore: cookies,
      testerStore: store,
      revalidate: false,
    });
    expect(navigated.ok).toBe(true);

    const record = await store.findById(issued.record.id);
    expect(record?.activationCount).toBe(1);
  });

  it("11. sets tester session expiry to the tester-code expiry", async () => {
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const now = Date.now();
    const expiresAt = now + 4 * 24 * 60 * 60 * 1000;
    const issued = await issueTesterCode(store, {
      label: "Seven-day reviewer",
      expiresAt,
      now,
    });
    const result = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
      now,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.expiresAt).toBe(expiresAt);
    const parsed = parseAccessSession(cookies.raw(ACCESS_COOKIE_NAME), now);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.payload.expiresAt).toBe(expiresAt);
    expect(parseAccessSession(cookies.raw(ACCESS_COOKIE_NAME), expiresAt + 1).ok).toBe(false);
  });

  it("12. denies a revoked code after revalidation", async () => {
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "Later revoked" });
    const activated = await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });
    expect(activated.ok).toBe(true);

    await store.revoke(issued.record.id, Date.now());
    const validated = await validateAccessSession({
      cookieStore: cookies,
      testerStore: store,
      revalidate: true,
    });
    expect(validated).toEqual({ ok: false, reason: "disabled" });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeTruthy();

    const renewed = await renewAccessSession({
      cookieStore: cookies,
      testerStore: store,
    });
    expect(renewed).toEqual({ ok: false, reason: "disabled" });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeUndefined();
  });

  it("13. does not store the raw tester code in the database", async () => {
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, { label: "Hashed only" });
    const records = await store.list();
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain(issued.code);
    expect(serialized).toContain(hashTesterCode(issued.code));
    expect(serialized).toContain(testerCodePrefix(issued.code));
    expect(records[0]).not.toHaveProperty("code");
  });

  it("14. does not store the raw tester code in localStorage", async () => {
    const { map, storage } = installLocalStorage({
      [STORAGE_KEYS.sharedDeal]: JSON.stringify({ id: "deal" }),
    });
    const setSpy = vi.spyOn(storage, "setItem");
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "No localStorage" });
    await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });
    expect(setSpy).not.toHaveBeenCalled();
    expect([...map.values()].join(" ")).not.toContain(issued.code);
    const parsed = parseAccessSession(cookies.raw(ACCESS_COOKIE_NAME));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.payload.licenceKey).toBe("");
    expect(JSON.stringify(parsed.payload)).not.toContain(issued.code);
    expect(JSON.stringify(parsed.session)).not.toContain(issued.code);
    expect(JSON.stringify(publicAccessStatus(parsed.session))).not.toContain("testerRecordId");
  });

  it("15. does not log the raw tester code", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
      logs.push(args.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join(" "));
    });
    const store = new MemoryTesterStore();
    const issued = await issueTesterCode(store, { label: "Quiet logs" });
    await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    await activateTesterAccess({
      testerCode: "PIQ-TEST-NOPE-NOPE",
      testerStore: store,
      cookieStore: new MemoryCookieStore(),
    });
    const joined = logs.join("\n");
    expect(joined).toContain("tester_activation_success");
    expect(joined).toContain("tester_activation_failed");
    expect(joined).not.toContain(issued.code);
    expect(joined).not.toContain(hashTesterCode(issued.code));
  });

  it("16. still grants Payhip access", async () => {
    const cookies = new MemoryCookieStore();
    const result = await activateAccess({
      email: EMAIL,
      licenceKey: PAYHIP_LICENCE,
      client: mockPayhip(),
      cookieStore: cookies,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.provider).toBe("payhip");
  });

  it("17. still grants Gumroad access", async () => {
    process.env.GUMROAD_PROPERTYIQ_PRODUCT_ID = GUMROAD_PRODUCT;
    const cookies = new MemoryCookieStore();
    const result = await activateAccess({
      email: EMAIL,
      licenceKey: GUMROAD_LICENCE,
      payhipClient: mockPayhip({ verify: { status: "empty" } }),
      gumroadClient: mockGumroad(),
      cookieStore: cookies,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.provider).toBe("gumroad");
  });

  it("18. still rejects unauthorised visitors on protected routes", () => {
    for (const route of [
      "/quick-underwrite",
      "/dashboard",
      "/max-offer",
      "/resilience",
      "/downside",
      "/portfolio",
      "/compare",
      "/settings",
    ]) {
      expect(isProtectedPath(route)).toBe(true);
      const gate = resolveAccessGate(route);
      expect(gate.action).toBe("redirect");
    }
    expect(isProtectedApiPath("/api/access/tester")).toBe(false);
    expect(isProtectedApiPath("/api/admin/tester-codes")).toBe(false);
    expect(isProtectedApiPath("/api/access/status")).toBe(true);
  });

  it("19. creates cookies only from Route Handlers", () => {
    const testerRoute = readFileSync(path.resolve(__dirname, "../../app/api/access/tester/route.ts"), "utf8");
    const verifyRoute = readFileSync(path.resolve(__dirname, "../../app/api/access/verify/route.ts"), "utf8");
    const accessPage = readFileSync(path.resolve(__dirname, "../../app/access/page.tsx"), "utf8");
    const shell = readFileSync(path.resolve(__dirname, "../../components/layout/app-shell.tsx"), "utf8");
    expect(testerRoute).toContain("activateTesterAccess");
    expect(verifyRoute).toContain("activateAccess");
    expect(accessPage).not.toContain("createAccessSession");
    expect(accessPage).not.toContain("activateTesterAccess");
    expect(shell).not.toContain("createAccessSession");
    expect(shell).not.toContain("activateTesterAccess");
  });

  it("20. leaves existing PropertyIQ deal data intact after tester sign-out", async () => {
    const { map } = installLocalStorage({
      [STORAGE_KEYS.portfolio]: JSON.stringify([{ id: "keep" }]),
      [STORAGE_KEYS.buyBoxes]: JSON.stringify([{ id: "box" }]),
      [STORAGE_KEYS.sharedDeal]: JSON.stringify({ id: "deal" }),
      [STORAGE_KEYS.settings]: JSON.stringify({ theme: "dark" }),
    });
    const store = new MemoryTesterStore();
    const cookies = new MemoryCookieStore();
    const issued = await issueTesterCode(store, { label: "Keep drafts" });
    await activateTesterAccess({
      testerCode: issued.code,
      testerStore: store,
      cookieStore: cookies,
    });
    await logoutAccess({ cookieStore: cookies, client: mockPayhip() });
    expect(cookies.get(ACCESS_COOKIE_NAME)).toBeUndefined();
    expect(map.get(STORAGE_KEYS.portfolio)).toContain("keep");
    expect(map.get(STORAGE_KEYS.buyBoxes)).toContain("box");
    expect(map.get(STORAGE_KEYS.sharedDeal)).toContain("deal");
    expect(map.get(STORAGE_KEYS.settings)).toContain("theme");
  });
});

describe("Tester code generation and admin surface", () => {
  it("generates PIQ-TEST codes without Math.random or ambiguous characters", () => {
    const source = readFileSync(path.resolve(__dirname, "./tester-codes.ts"), "utf8");
    expect(source).not.toContain("Math.random");
    const code = generateTesterCode();
    expect(code).toMatch(/^PIQ-TEST-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    expect(code.slice("PIQ-TEST-".length)).not.toMatch(/[01IOL]/);
  });

  it("keeps the tester admin secret out of client bundles", () => {
    const root = path.resolve(__dirname, "../..");
    const clientHits: string[] = [];
    for (const file of collectSourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      if (/^\s*["']use client["']/.test(source) && source.includes("PROPERTYIQ_TESTER_ADMIN_SECRET")) {
        clientHits.push(file);
      }
    }
    expect(clientHits).toEqual([]);
    const screen = readFileSync(path.resolve(__dirname, "../../components/access/access-screen.tsx"), "utf8");
    expect(screen).toContain("Complimentary tester access");
    expect(screen).toContain("Activate Tester Access");
    expect(screen).toContain("/api/access/tester");
    expect(screen).not.toContain("PROPERTYIQ_TESTER_ADMIN_SECRET");
  });
});
