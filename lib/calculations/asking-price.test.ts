import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { createDefaultMaxOffer } from "@/data/default-max-offer";
import { analysisSchema, coerceOptionalAskingPrice, maxOfferSchema } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent } from "@/lib/calculations/rent";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { resolveCurrentPrice } from "@/lib/calculations/margin-of-safety";
import type { AnalysisInput } from "@/lib/types";

describe("optional asking price", () => {
  it("coerces blank / NaN asking price to 0", () => {
    expect(coerceOptionalAskingPrice(Number.NaN)).toBe(0);
    expect(coerceOptionalAskingPrice("")).toBe(0);
    expect(coerceOptionalAskingPrice(undefined)).toBe(0);
    expect(coerceOptionalAskingPrice(null)).toBe(0);
  });

  it("accepts 0 and finite non-negative values on both schemas", () => {
    expect(analysisSchema.shape.financing.shape.askingPrice.parse(0)).toBe(0);
    expect(analysisSchema.shape.financing.shape.askingPrice.parse(Number.NaN)).toBe(0);
    expect(maxOfferSchema.shape.property.shape.askingPrice.parse(0)).toBe(0);
    expect(maxOfferSchema.shape.property.shape.askingPrice.parse(Number.NaN)).toBe(0);
    expect(analysisSchema.shape.financing.shape.askingPrice.parse(260_000)).toBe(260_000);
  });

  it("rejects a negative asking price", () => {
    expect(analysisSchema.shape.financing.shape.askingPrice.safeParse(-1).success).toBe(false);
    expect(maxOfferSchema.shape.property.shape.askingPrice.safeParse(-50).success).toBe(false);
  });

  it("keeps stored asking-price defaults at 0", () => {
    expect(createDefaultAnalysis("US").financing.askingPrice).toBe(0);
    expect(createDefaultMaxOffer("US").property.askingPrice).toBe(0);
  });

  it("does not change storage keys", () => {
    expect(STORAGE_KEYS.draft).toBe("propertyiq:draft:v1");
    expect(STORAGE_KEYS.maxOfferDraft).toBe("propertyiq:max-offer-draft:v1");
  });
});

describe("standalone Downside current price", () => {
  function base(): AnalysisInput {
    const input = createDefaultAnalysis("US");
    input.financing.purchasePrice = 260_000;
    input.financing.askingPrice = 0;
    input.financing.interestRate = 7;
    input.income.monthlyRent = 3_500;
    input.income.verifiedRent = 3_500;
    input.income.conservativeRent = 3_500;
    input.brrrr.afterRepairValue = 380_000;
    input.brrrr.rehabCost = 30_000;
    return input;
  }

  it("uses asking price when available", () => {
    const input = base();
    input.financing.askingPrice = 275_000;
    const resolved = resolveCurrentPrice(input);
    expect(resolved?.source).toBe("asking");
    expect(resolved?.price).toBe(275_000);
    const results = analyzeProperty(applyActiveRent(input));
    const pack = underwriteDeal(input, results, null);
    expect(pack.margin.ready).toBe(true);
    expect(pack.margin.currentPrice).toBe(275_000);
    expect(pack.margin.priceSource).toBe("asking");
    expect(pack.downside.marginReady).toBe(true);
    expect(pack.downside.marginOfSafetyPercent).toBeCloseTo(pack.margin.percent, 5);
  });

  it("falls back to purchase price when asking is absent", () => {
    const input = base();
    const resolved = resolveCurrentPrice(input);
    expect(resolved?.source).toBe("purchase");
    expect(resolved?.price).toBe(260_000);
    const results = analyzeProperty(applyActiveRent(input));
    const pack = underwriteDeal(input, results, null);
    expect(pack.margin.ready).toBe(true);
    expect(pack.margin.currentPrice).toBe(260_000);
    expect(pack.margin.priceSource).toBe("purchase");
    expect(pack.downside.marginReady).toBe(true);
    expect(pack.downside.marginOfSafetyPercent).toBeCloseTo(pack.margin.percent, 5);
    expect(pack.margin.offerCeilingSource).toBe("reconstructed-default-targets");
    expect(pack.margin.detail).toMatch(/default investor targets/i);
  });
});
