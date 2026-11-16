import { describe, expect, it } from "vitest";
import { createBlankAnalysis } from "@/data/default-analysis";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { calculateDownsideAnalysis, scoreRefinanceViability } from "@/lib/calculations/downside-analysis";
import { calculateMarginOfSafety, marginFromAnalysis } from "@/lib/calculations/margin-of-safety";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { analysisToMaxOfferInputs } from "@/lib/calculations/margin-of-safety";
import { calculateQuickUnderwrite } from "@/lib/calculations/quick-underwrite";
import { sizeSupportedRefinance } from "@/lib/calculations/refinance";
import {
  applyUnderwrittenPrice,
  buildPriceComparisons,
  resolveUnderwrittenPrice,
} from "@/lib/calculations/underwritten-price";
import type { AnalysisInput } from "@/lib/types";

function priced(patch: (input: AnalysisInput) => void): AnalysisInput {
  const input = createBlankAnalysis("US");
  input.property.name = "Price Audit";
  input.strategy = "brrrr";
  input.financing.depositPercent = 25;
  input.financing.interestRate = 7;
  input.financing.termYears = 30;
  input.income.monthlyRent = 1_800;
  input.income.verifiedRent = 1_650;
  input.income.conservativeRent = 1_500;
  input.income.rentSource = "verified";
  input.brrrr.afterRepairValue = 310_000;
  input.brrrr.rehabCost = 25_000;
  input.brrrr.refinanceLtv = 75;
  input.brrrr.refinanceRate = 7;
  input.brrrr.refinanceTermYears = 30;
  input.brrrr.refinanceDscrMin = 1.25;
  input.expenses.propertyTaxAnnual = 4_800;
  input.expenses.insuranceAnnual = 2_400;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 8;
  input.expenses.maintenancePercent = 6;
  input.expenses.capexPercent = 5;
  patch(input);
  return input;
}

describe("resolveUnderwrittenPrice", () => {
  it("TEST A — purchase price exists and wins over proposed and asking", () => {
    const resolved = resolveUnderwrittenPrice(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 207_500;
        input.financing.purchasePrice = 205_000;
      }),
    );
    expect(resolved.value).toBe(205_000);
    expect(resolved.source).toBe("purchase");
    expect(resolved.label).toBe("Purchase Price");
  });

  it("TEST B — purchase of 0 is not purchased; proposed offer is used", () => {
    const resolved = resolveUnderwrittenPrice(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 207_500;
        input.financing.purchasePrice = 0;
      }),
    );
    expect(resolved.value).toBe(207_500);
    expect(resolved.source).toBe("proposed");
    expect(resolved.label).toBe("Proposed Offer");
  });

  it("TEST C — no offer yet uses current asking price", () => {
    const resolved = resolveUnderwrittenPrice(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 0;
        input.financing.purchasePrice = 0;
      }),
    );
    expect(resolved.value).toBe(219_000);
    expect(resolved.source).toBe("asking");
    expect(resolved.label).toBe("Current Asking Price");
  });

  it("TEST D — max-offer discovery has no underwritten price", () => {
    const resolved = resolveUnderwrittenPrice(
      priced((input) => {
        input.financing.askingPrice = 0;
        input.financing.proposedOffer = 0;
        input.financing.purchasePrice = 0;
      }),
    );
    expect(resolved.value).toBeNull();
    expect(resolved.source).toBeNull();
  });

  it("does not migrate a stored purchase price of 0 into a fake purchase", () => {
    const input = priced((next) => {
      next.financing.purchasePrice = 0;
      next.financing.proposedOffer = 207_500;
    });
    expect(input.financing.purchasePrice).toBe(0);
    expect(applyUnderwrittenPrice(input).financing.purchasePrice).toBe(207_500);
    expect(input.financing.purchasePrice).toBe(0);
  });
});

describe("Quick Underwrite price selection", () => {
  it("uses purchase when it is greater than zero", () => {
    const results = calculateQuickUnderwrite(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 207_500;
        input.financing.purchasePrice = 205_000;
      }),
      null,
    );
    expect(results.underwrittenPrice).toBe(205_000);
    expect(results.underwrittenPriceSource).toBe("purchase");
    expect(results.acquisitionPrice.label).toBe("Purchase Price");
  });

  it("uses proposed offer when purchase is 0", () => {
    const results = calculateQuickUnderwrite(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 207_500;
        input.financing.purchasePrice = 0;
      }),
      null,
    );
    expect(results.underwrittenPrice).toBe(207_500);
    expect(results.underwrittenPriceSource).toBe("proposed");
    expect(results.allIn.acquisitionPriceUsed).toBe(207_500);
  });

  it("uses asking when purchase and proposed are 0", () => {
    const results = calculateQuickUnderwrite(
      priced((input) => {
        input.financing.askingPrice = 219_000;
        input.financing.proposedOffer = 0;
        input.financing.purchasePrice = 0;
      }),
      null,
    );
    expect(results.underwrittenPrice).toBe(219_000);
    expect(results.underwrittenPriceSource).toBe("asking");
  });

  it("TEST D — calculates max offer with no purchase price and does not fake a $0 analysis", () => {
    const results = calculateQuickUnderwrite(
      priced((input) => {
        input.financing.askingPrice = 0;
        input.financing.proposedOffer = 0;
        input.financing.purchasePrice = 0;
      }),
      null,
    );
    expect(results.underwrittenPrice).toBeNull();
    expect(results.underwrittenPriceSource).toBeNull();
    expect(results.maximumOffer).not.toBeNull();
    expect(results.maximumOffer ?? 0).toBeGreaterThan(0);
    expect(results.marginOfSafetyPercent).toBeNull();
    expect(results.allIn.total).toBeNull();
    expect(results.allIn.message).toMatch(/asking price, proposed offer, or purchase price/i);
    expect(results.monthlyCashflow).toBeNull();
    expect(results.cashRecovery).toBeNull();
    expect(results.verdict.verdict).toBe("insufficient-data");
  });

  it("does not treat asking-above-max as a critical failure when the underwritten price is below max", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 219_000;
      next.financing.proposedOffer = 207_500;
      next.financing.purchasePrice = 207_500;
    });
    const results = calculateQuickUnderwrite(input, null);
    expect(results.underwrittenPrice).toBe(207_500);
    expect(results.underwrittenPriceSource).toBe("purchase");
    const max = results.maximumOffer ?? 0;
    expect(max).toBeGreaterThan(0);
    const askingWarning = results.warnings.find((warning) => warning.key === "asking-above-max");
    const criticalPrice = results.warnings.find((warning) => warning.key === "underwritten-above-max");
    if (219_000 > max && 207_500 <= max) {
      expect(askingWarning?.severity).toBe("warning");
      expect(criticalPrice).toBeUndefined();
      expect(results.marginOfSafetyPercent).toBeCloseTo(((max - 207_500) / max) * 100, 5);
    }
  });

  it("raises a critical price failure when the underwritten price is above maximum offer", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 219_000;
      next.financing.proposedOffer = 400_000;
      next.financing.purchasePrice = 0;
    });
    const results = calculateQuickUnderwrite(input, null);
    expect(results.underwrittenPrice).toBe(400_000);
    expect(results.underwrittenPriceSource).toBe("proposed");
    expect(results.warnings.some((warning) => warning.key === "underwritten-above-max" && warning.severity === "critical")).toBe(
      true,
    );
    expect(results.warnings.find((warning) => warning.key === "asking-above-max")?.severity).not.toBe("critical");
  });
});

describe("observed margin of safety and price comparisons", () => {
  it("compares maximum offer to underwritten price, not asking, and keeps the three prices separate", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 219_000;
      next.financing.proposedOffer = 207_500;
      next.financing.purchasePrice = 207_500;
    });
    const margin = marginFromAnalysis(input, null, { recommendedOffer: 199_000, maximumOffer: 208_350 });
    expect(margin.ready).toBe(true);
    expect(margin.currentPrice).toBe(207_500);
    expect(margin.priceSource).toBe("purchase");
    expect(margin.percent).toBeCloseTo(((208_350 - 207_500) / 208_350) * 100, 5);

    const comparisons = buildPriceComparisons(input, 208_350);
    const asking = comparisons.find((item) => item.key === "asking");
    const proposed = comparisons.find((item) => item.key === "proposed");
    const purchase = comparisons.find((item) => item.key === "purchase");
    expect(asking?.difference).toBeCloseTo(208_350 - 219_000, 5);
    expect(asking?.status).toBe("above-maximum");
    expect(proposed?.difference).toBeCloseTo(208_350 - 207_500, 5);
    expect(proposed?.status).toBe("below-maximum");
    expect(purchase?.status).toBe("below-maximum");
  });

  it("marks a zero purchase as not purchased", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 219_000;
      next.financing.proposedOffer = 207_500;
      next.financing.purchasePrice = 0;
    });
    const purchase = buildPriceComparisons(input, 208_350).find((item) => item.key === "purchase");
    expect(purchase?.status).toBe("not-entered");
    expect(purchase?.statusLabel).toBe("Not Purchased / Not Entered");
  });
});

describe("acquisition financing and cash invested", () => {
  it("sizes the acquisition loan from proposed offer when purchase is 0", () => {
    const input = priced((next) => {
      next.financing.purchasePrice = 0;
      next.financing.proposedOffer = 207_500;
      next.financing.depositPercent = 25;
    });
    const analyzed = analyzeProperty(input);
    expect(analyzed.mortgage.loanAmount).toBeCloseTo(207_500 * 0.75, 0);
    const results = calculateQuickUnderwrite(input, null);
    expect(results.cashRecovery?.totalProjectCost).toBe(results.allIn.total);
    expect(results.cashRecovery?.investorCashInvested).toBeCloseTo((results.allIn.total ?? 0) - 207_500 * 0.75, 0);
    expect(results.cashRecovery?.investorCashInvested).toBeLessThan(results.cashRecovery?.totalProjectCost ?? 0);
  });
});

describe("refinance viability uses the supported loan", () => {
  it("scores a DSCR-limited supported loan that meets required DSCR instead of 0", () => {
    const sized = sizeSupportedRefinance({
      arv: 220_000,
      refinanceLtv: 75,
      interestRate: 7,
      termYears: 30,
      requiredDscr: 1.25,
      monthlyNoi: 900,
    });
    expect(sized.limitingFactor).toBe("dscr");
    expect(sized.postRefiDscr).toBeGreaterThanOrEqual(1.25 - 1e-6);
    expect(scoreRefinanceViability(sized.postRefiDscr ?? 0, sized.supportedRefinanceLoan)).toBe(75);

    const input = priced((next) => {
      next.financing.purchasePrice = 140_000;
      next.financing.proposedOffer = 140_000;
      next.brrrr.afterRepairValue = 220_000;
      next.brrrr.rehabCost = 20_000;
    });
    const quick = calculateQuickUnderwrite(input, null);
    expect(quick.refinance.limitingFactor).toBe("dscr");
    const refinance = quick.downside?.components.find((component) => component.key === "refinance");
    expect(refinance).toBeDefined();
    expect(refinance?.score).toBeGreaterThan(0);
    expect(refinance?.detail).toBe("Refinance Viable — DSCR Limited");
  });

  it("keeps Deal Survival Score equal to the sum of weighted contributions", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 219_000;
      next.financing.proposedOffer = 207_500;
      next.financing.purchasePrice = 207_500;
    });
    const down = calculateDownsideAnalysis(input);
    const summed = down.components.reduce((sum, component) => sum + component.contribution, 0);
    expect(down.score).toBe(Math.round(summed));
    down.components.forEach((component) => {
      expect(component.rawInput.length).toBeGreaterThan(0);
      expect(component.threshold.length).toBeGreaterThan(0);
      expect(component.contribution).toBeCloseTo(component.score * component.weight, 8);
    });
  });
});

describe("max offer discovery still runs without a purchase price", () => {
  it("returns a recommended and maximum offer from ARV, rent and rehab", () => {
    const input = priced((next) => {
      next.financing.askingPrice = 0;
      next.financing.proposedOffer = 0;
      next.financing.purchasePrice = 0;
    });
    const offerInput = analysisToMaxOfferInputs(input);
    const results = calculateMaxOffer(offerInput);
    expect(results.feasible).toBe(true);
    expect(results.recommendedOffer).toBeGreaterThan(0);
    expect(results.maximumOffer).toBeGreaterThan(0);
    const pending = calculateMarginOfSafety(null, results.recommendedOffer, results.maximumOffer, "supplied");
    expect(pending.ready).toBe(false);
  });
});
