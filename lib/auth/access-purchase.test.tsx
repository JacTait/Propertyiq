import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOptions } from "@/components/access/purchase-options";
import { licenceKeyFromAccessQuery } from "@/lib/auth/access-query";
import { resolveAccessGate } from "@/lib/auth/gate";
import {
  type AccessCookieOptions,
  type AccessCookieStore,
  createAccessSession,
} from "@/lib/auth/propertyiq-access";
import {
  getGumroadProductUrl,
  getPayhipProductUrl,
  getPurchaseUrls,
  getWhopProductUrl,
  resetPurchaseUrlWarningsForTests,
  sanitizePublicProductUrl,
} from "@/lib/auth/purchase-urls";
import { ACCESS_COOKIE_NAME, isProtectedPath } from "@/lib/auth/routes";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

const GUMROAD_URL = "https://meridianproducts.gumroad.com/l/PortfolioIQ";
const PAYHIP_URL = "https://payhip.com/b/4kT9y";
const WHOP_URL = "https://whop.com/propertyiq";
const SECRET = "propertyiq-session-secret-key";

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

function accessScreenSource(): string {
  return readFileSync(path.resolve(__dirname, "../../components/access/access-screen.tsx"), "utf8");
}

function purchaseOptionsSource(): string {
  return readFileSync(path.resolve(__dirname, "../../components/access/purchase-options.tsx"), "utf8");
}

function anchorFor(html: string, href: string): string | null {
  const matches = html.match(/<a\b[^>]*>/g) ?? [];
  return matches.find((tag) => tag.includes(`href="${href}"`)) ?? null;
}

beforeEach(() => {
  process.env.PROPERTYIQ_SESSION_SECRET = SECRET;
  resetPurchaseUrlWarningsForTests();
});

afterEach(() => {
  resetPurchaseUrlWarningsForTests();
});

describe("Access page purchase options", () => {
  it("1. keeps existing Gumroad activation wiring", () => {
    const source = accessScreenSource();
    expect(source).toContain('fetch("/api/access/verify"');
    expect(source).toContain("licenceKeyFromAccessQuery");
    const gumroad = readFileSync(path.resolve(__dirname, "./gumroad.ts"), "utf8");
    expect(gumroad).toContain("https://api.gumroad.com/v2/licenses/verify");
  });

  it("2. keeps existing Payhip activation wiring", () => {
    const access = readFileSync(path.resolve(__dirname, "./propertyiq-access.ts"), "utf8");
    expect(access).toContain("https://payhip.com/api/v2/license/verify");
    expect(accessScreenSource()).toContain('fetch("/api/access/verify"');
  });

  it("3. still pre-fills a Gumroad licence key from the query string", () => {
    const search = new URLSearchParams("key=A1B2C3D4-E5F60718-9ABCDEF0-1234ABCD&from=/quick-underwrite");
    expect(licenceKeyFromAccessQuery(search)).toBe("A1B2C3D4-E5F60718-9ABCDEF0-1234ABCD");
  });

  it("4. resolves the Gumroad purchase button to the PropertyIQ Gumroad URL", () => {
    expect(getGumroadProductUrl({ NEXT_PUBLIC_GUMROAD_PRODUCT_URL: GUMROAD_URL })).toBe(GUMROAD_URL);
    const html = renderToStaticMarkup(
      <PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} whopUrl={WHOP_URL} />,
    );
    expect(html).toContain(`href="${GUMROAD_URL}"`);
    expect(html).toContain("Buy on Gumroad");
  });

  it("5. resolves the Payhip purchase button to the PropertyIQ Payhip URL", () => {
    expect(getPayhipProductUrl({ NEXT_PUBLIC_PAYHIP_PRODUCT_URL: PAYHIP_URL })).toBe(PAYHIP_URL);
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} />);
    expect(html).toContain(`href="${PAYHIP_URL}"`);
    expect(html).toContain("Buy on Payhip");
  });

  it("6. opens the Gumroad link in a new tab", () => {
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} />);
    const anchor = anchorFor(html, GUMROAD_URL);
    expect(anchor).toBeTruthy();
    expect(anchor).toContain('target="_blank"');
    expect(anchor).toContain('rel="noopener noreferrer"');
  });

  it("7. opens the Payhip link in a new tab", () => {
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} />);
    const anchor = anchorFor(html, PAYHIP_URL);
    expect(anchor).toBeTruthy();
    expect(anchor).toContain('target="_blank"');
    expect(anchor).toContain('rel="noopener noreferrer"');
  });

  it("8. does not crash /access when the Gumroad URL is missing", () => {
    expect(getPurchaseUrls({}).gumroadUrl).toBeNull();
    expect(() => renderToStaticMarkup(<PurchaseOptions gumroadUrl={null} payhipUrl={PAYHIP_URL} />)).not.toThrow();
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={null} payhipUrl={PAYHIP_URL} />);
    expect(html).toContain("Purchase option temporarily unavailable.");
    expect(html).not.toContain("Buy on Gumroad");
    expect(html).toContain("Buy on Payhip");
  });

  it("9. does not crash /access when the Payhip URL is missing", () => {
    expect(getPurchaseUrls({}).payhipUrl).toBeNull();
    expect(() => renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={null} />)).not.toThrow();
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={null} />);
    expect(html).toContain("Purchase option temporarily unavailable.");
    expect(html).not.toContain("NEXT_PUBLIC_");
  });

  it("10. keeps protected routes protected", () => {
    expect(isProtectedPath("/quick-underwrite")).toBe(true);
    expect(resolveAccessGate("/quick-underwrite").action).toBe("redirect");
  });

  it("11. keeps an existing valid session valid", async () => {
    const cookies = new MemoryCookieStore();
    await createAccessSession({
      email: "buyer@example.com",
      licenceKey: "WTKP4-66NL5-HMKQW-GFSCZ",
      usageCounted: true,
      cookieStore: cookies,
    });
    expect(resolveAccessGate("/dashboard", "", cookies.raw(ACCESS_COOKIE_NAME))).toEqual({
      action: "allow",
      pathname: "/dashboard",
    });
  });

  it("12. keeps the activation form above the purchase options", () => {
    const source = accessScreenSource();
    const already = source.indexOf("Already purchased?");
    const purchase = source.indexOf("<PurchaseOptions");
    const tester = source.indexOf("Received a complimentary tester code?");
    expect(already).toBeGreaterThan(0);
    expect(purchase).toBeGreaterThan(already);
    expect(tester).toBeGreaterThan(purchase);
  });

  it("13. stacks purchase actions full-width on small screens", () => {
    const purchase = purchaseOptionsSource();
    const access = accessScreenSource();
    expect(purchase).toContain("flex-col");
    expect(purchase).toContain("w-full");
    expect(purchase).toContain("sm:flex-row");
    expect(access).toContain("overflow-x-hidden");
    expect(access).toContain("w-full sm:flex-1");
  });

  it("14. does not put licence or session data on purchase links", () => {
    const html = renderToStaticMarkup(<PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} />);
    const gumroad = anchorFor(html, GUMROAD_URL);
    const payhip = anchorFor(html, PAYHIP_URL);
    expect(gumroad).toBeTruthy();
    expect(payhip).toBeTruthy();
    expect(gumroad).not.toMatch(/licence|license|email=|propertyiq_access|session/i);
    expect(payhip).not.toMatch(/licence|license|email=|propertyiq_access|session/i);
    expect(sanitizePublicProductUrl("javascript:alert(1)")).toBeNull();
  });

  it("15. keeps complimentary tester access as a separate section", () => {
    const source = accessScreenSource();
    expect(source).toContain("Complimentary tester access");
    expect(source).toContain("Activate Tester Access");
    expect(source).toContain("/api/access/tester");
    expect(source.indexOf("<PurchaseOptions")).toBeLessThan(
      source.indexOf("Received a complimentary tester code?"),
    );
    expect(source).not.toContain("NEXT_PUBLIC_GUMROAD_PRODUCT_URL");
    expect(source).not.toContain("NEXT_PUBLIC_PAYHIP_PRODUCT_URL");
    expect(source).not.toContain("NEXT_PUBLIC_WHOP_PRODUCT_URL");
  });

  it("16. shows the Whop button when NEXT_PUBLIC_WHOP_PRODUCT_URL is configured", () => {
    expect(getWhopProductUrl({ NEXT_PUBLIC_WHOP_PRODUCT_URL: WHOP_URL })).toBe(WHOP_URL);
    const html = renderToStaticMarkup(
      <PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} whopUrl={WHOP_URL} />,
    );
    const anchor = anchorFor(html, WHOP_URL);
    expect(html).toContain("Buy on Whop");
    expect(anchor).toBeTruthy();
    expect(anchor).toContain(`href="${WHOP_URL}"`);
    expect(anchor).toContain('target="_blank"');
    expect(anchor).toContain('rel="noopener noreferrer"');
  });

  it("17. replaces only the Whop button when the Whop URL is missing", () => {
    expect(getPurchaseUrls({ NEXT_PUBLIC_GUMROAD_PRODUCT_URL: GUMROAD_URL, NEXT_PUBLIC_PAYHIP_PRODUCT_URL: PAYHIP_URL }).whopUrl).toBeNull();
    const html = renderToStaticMarkup(
      <PurchaseOptions gumroadUrl={GUMROAD_URL} payhipUrl={PAYHIP_URL} whopUrl={null} />,
    );
    expect(html).toContain("Buy on Gumroad");
    expect(html).toContain("Buy on Payhip");
    expect(html).not.toContain("Buy on Whop");
    expect(html).toContain("Purchase option temporarily unavailable.");
  });
});

describe("Public purchase URL configuration", () => {
  it("documents the marketplace URLs in .env.example", () => {
    const example = readFileSync(path.resolve(__dirname, "../../.env.example"), "utf8");
    expect(example).toContain(`NEXT_PUBLIC_GUMROAD_PRODUCT_URL=${GUMROAD_URL}`);
    expect(example).toContain(`NEXT_PUBLIC_PAYHIP_PRODUCT_URL=${PAYHIP_URL}`);
    expect(example).toContain("NEXT_PUBLIC_WHOP_PRODUCT_URL=");
    expect(example).toContain("WHOP_WEBHOOK_SECRET=");
    expect(example).not.toMatch(/WHOP_API_KEY=.+/);
  });

  it("rejects unsafe purchase URLs", () => {
    expect(sanitizePublicProductUrl("not-a-url")).toBeNull();
    expect(sanitizePublicProductUrl("https://user:pass@payhip.com/b/4kT9y")).toBeNull();
  });
});
