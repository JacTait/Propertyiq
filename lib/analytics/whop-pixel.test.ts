import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildWhopPixelSnippet,
  getWhopAccountId,
  isWhopAccountId,
  trackWhopPageView,
  WHOP_PIXEL_BOOTSTRAP,
  WHOP_PIXEL_ORIGIN,
  WHOP_PIXEL_SCRIPT_ID,
  WHOP_PIXEL_SCRIPT_SRC,
} from "@/lib/analytics/whop-pixel";

const ACCOUNT_ID = "biz_ASZG9rHRLkhBN2";
const ROOT = path.resolve(__dirname, "../..");

function source(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8");
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID;
  const w = (globalThis as { window?: Window }).window;
  if (w) delete w.whop;
});

describe("Whop Ads pixel configuration", () => {
  it("uses the official script origin and s.js source", () => {
    expect(WHOP_PIXEL_ORIGIN).toBe("https://t.whop.tw");
    expect(WHOP_PIXEL_SCRIPT_SRC).toBe("https://t.whop.tw/s.js");
    expect(WHOP_PIXEL_BOOTSTRAP).toContain('"https://t.whop.tw"');
    expect(WHOP_PIXEL_BOOTSTRAP).toContain('u+"/s.js"');
    expect(WHOP_PIXEL_BOOTSTRAP).toContain("if(w[n])return");
  });

  it("accepts only public biz_ account IDs", () => {
    expect(isWhopAccountId(ACCOUNT_ID)).toBe(true);
    expect(isWhopAccountId("")).toBe(false);
    expect(isWhopAccountId("prod_123")).toBe(false);
    expect(isWhopAccountId("biz_")).toBe(false);
    expect(getWhopAccountId({})).toBe("");
    expect(getWhopAccountId({ NEXT_PUBLIC_WHOP_ACCOUNT_ID: `  ${ACCOUNT_ID}  ` })).toBe(ACCOUNT_ID);
    expect(getWhopAccountId({ NEXT_PUBLIC_WHOP_ACCOUNT_ID: "not-an-id" })).toBe("");
    delete process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID;
    expect(getWhopAccountId()).toBe("");
    process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID = ACCOUNT_ID;
    expect(getWhopAccountId()).toBe(ACCOUNT_ID);
  });

  it("builds the official snippet with setScope and a page event only", () => {
    expect(buildWhopPixelSnippet("")).toBe("");
    const snippet = buildWhopPixelSnippet(ACCOUNT_ID);
    expect(snippet.startsWith(WHOP_PIXEL_BOOTSTRAP)).toBe(true);
    expect(snippet).toContain(`whop.setScope("${ACCOUNT_ID}")`);
    expect(snippet).toContain('whop.track("page")');
    expect(snippet).not.toContain("purchase");
    expect(snippet).not.toContain("WHOP_API_KEY");
    expect(snippet).not.toContain("WHOP_WEBHOOK_SECRET");
  });

  it("reads the static NEXT_PUBLIC member so Next.js can inline it", () => {
    const lib = source("lib/analytics/whop-pixel.ts");
    expect(lib).toContain("process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID");
    expect(lib).not.toContain("process.env[");
    expect(lib).not.toContain("WHOP_API_KEY");
    expect(lib).not.toContain("WHOP_WEBHOOK_SECRET");
    expect(lib).not.toContain("PROPERTYIQ_SESSION_SECRET");
  });

  it("skips page tracking when the pixel is not installed", () => {
    expect(trackWhopPageView()).toBe(false);
  });

  it("fires track('page') through the queued pixel API", () => {
    const calls: unknown[][] = [];
    const previous = (globalThis as { window?: Window }).window;
    (globalThis as { window?: Window }).window = {
      whop: {
        track: (...args: unknown[]) => {
          calls.push(args);
        },
        setScope: () => undefined,
      },
    } as Window;
    expect(trackWhopPageView()).toBe(true);
    expect(calls).toEqual([["page"]]);
    if (previous) (globalThis as { window?: Window }).window = previous;
    else delete (globalThis as { window?: Window }).window;
  });
});

describe("Whop Ads pixel App Router install", () => {
  it("is mounted once from the root layout", () => {
    const layout = source("app/layout.tsx");
    const pixel = source("components/analytics/whop-pixel.tsx");
    const tracker = source("components/analytics/whop-pixel-route-tracker.tsx");
    expect(layout).toContain('import { WhopPixel } from "@/components/analytics/whop-pixel"');
    expect(layout).toContain("import { WhopPixelRouteTracker } from \"@/components/analytics/whop-pixel-route-tracker\"");
    expect(layout).toContain("<head>");
    expect(layout).toContain("<WhopPixel />");
    expect(layout.indexOf("<head>")).toBeLessThan(layout.indexOf("<WhopPixel />"));
    expect(layout.indexOf("<WhopPixel />")).toBeLessThan(layout.indexOf("</head>"));
    expect(layout).toContain("<WhopPixelRouteTracker />");
    expect(pixel).not.toContain('"use client"');
    expect(pixel).not.toContain("next/script");
    expect(pixel).not.toContain("afterInteractive");
    expect(pixel).toContain("dangerouslySetInnerHTML");
    expect(pixel).toContain("buildWhopPixelSnippet");
    expect(pixel).toContain("WHOP_PIXEL_SCRIPT_ID");
    expect(tracker).toContain('"use client"');
    expect(tracker).toContain("usePathname");
    expect(tracker).toContain("trackWhopPageView");
    expect(tracker).toContain("trackedPath.current === null");
    expect(tracker).not.toContain("next/script");
    expect(pixel).not.toContain('track("purchase")');
    expect(tracker).not.toContain('track("purchase")');
    expect(WHOP_PIXEL_SCRIPT_ID).toBe("whop-pixel");
  });

  it("does not change licence, underwriting, or protected-route modules", () => {
    const pixel = source("components/analytics/whop-pixel.tsx");
    const tracker = source("components/analytics/whop-pixel-route-tracker.tsx");
    const lib = source("lib/analytics/whop-pixel.ts");
    for (const contents of [pixel, tracker, lib]) {
      expect(contents).not.toContain("verifyAuthorisedLicence");
      expect(contents).not.toContain("SharedDealDraft");
      expect(contents).not.toContain("createAccessSession");
      expect(contents).not.toContain("gumroad");
      expect(contents).not.toContain("payhip");
      expect(contents).not.toContain("tester");
    }
  });

  it("documents the public account ID in .env.example", () => {
    const example = source(".env.example");
    expect(example).toContain(`NEXT_PUBLIC_WHOP_ACCOUNT_ID=${ACCOUNT_ID}`);
    expect(example).toContain("https://t.whop.tw/s.js");
  });
});
