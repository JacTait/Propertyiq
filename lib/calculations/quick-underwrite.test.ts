import { describe, expect, it } from "vitest";
import { createBlankAnalysis, createDefaultAnalysis } from "@/data/default-analysis";
import { createDefaultBuyBox } from "@/data/default-buy-box";
import { calculateMonthlyPayment, loanPrincipalFromPayment } from "@/lib/calculations/mortgage";
import { computeCashRecovery } from "@/lib/calculations/cash-recovery";
import { sizeSupportedRefinance } from "@/lib/calculations/refinance";
import { calculateQuickUnderwrite } from "@/lib/calculations/quick-underwrite";
import { matchBuyBox } from "@/lib/calculations/buy-box";
import type { AnalysisInput, BuyBoxProfile } from "@/lib/types";

function dscrFixture(): AnalysisInput {
  const input = createBlankAnalysis("US");
  input.property.name = "DSCR Limited";
  input.property.zipCode = "33602";
  input.financing.purchasePrice = 140_000;
  input.financing.proposedOffer = 140_000;
  input.financing.depositPercent = 25;
  input.financing.interestRate = 7;
  input.financing.termYears = 30;
  input.income.monthlyRent = 2_200;
  input.income.verifiedRent = 1_650;
  input.income.conservativeRent = 1_500;
  input.income.rentSource = "verified";
  input.brrrr.afterRepairValue = 220_000;
  input.brrrr.refinanceLtv = 75;
  input.brrrr.refinanceRate = 7;
  input.brrrr.refinanceTermYears = 30;
  input.brrrr.refinanceDscrMin = 1.25;
  input.brrrr.rehabCost = 20_000;
  input.expenses.propertyTaxAnnual = 4_800;
  input.expenses.insuranceAnnual = 2_400;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 8;
  input.expenses.maintenancePercent = 6;
  input.expenses.capexPercent = 5;
  input.strategy = "brrrr";
  return input;
}

describe("Quick Underwrite refinance sizing", () => {
  it("uses the lower of LTV and DSCR-supported loans (TEST 1)", () => {
    const ltvLoan = 220_000 * 0.75;
    expect(ltvLoan).toBe(165_000);

    const sized = sizeSupportedRefinance({
      arv: 220_000,
      refinanceLtv: 75,
      interestRate: 7,
      termYears: 30,
      requiredDscr: 1.25,
      monthlyNoi: 900,
    });
    expect(sized.ltvBasedMaximumLoan).toBe(165_000);
    expect(sized.dscrSupportedMaximumLoan).not.toBeNull();
    expect(sized.dscrSupportedMaximumLoan ?? 0).toBeLessThan(165_000);
    expect(sized.supportedRefinanceLoan).toBeCloseTo(Math.min(165_000, sized.dscrSupportedMaximumLoan ?? 0), 5);
    expect(sized.limitingFactor).toBe("dscr");
    expect(sized.postRefiDscr).not.toBeNull();
    expect(Number.isFinite(sized.postRefiDscr ?? NaN)).toBe(true);
    expect(sized.postRefiDscr).not.toBe(Infinity);

    const results = calculateQuickUnderwrite(dscrFixture(), null);
    expect(results.refinance.ltvBasedMaximumLoan).toBe(165_000);
    expect(results.refinance.dscrSupportedMaximumLoan).not.toBeNull();
    expect(results.refinance.supportedRefinanceLoan).toBeLessThanOrEqual(
      results.refinance.dscrSupportedMaximumLoan ?? 0,
    );
    expect(results.refinance.supportedRefinanceLoan).toBeLessThanOrEqual(165_000);
    expect(results.refinance.postRefiDscrLabel).not.toMatch(/∞|Infinity|99\.00/);
  });
});

describe("Quick Underwrite cash recovery", () => {
  it("leaves cash in the deal when net proceeds are below capital (TEST 2)", () => {
    const result = computeCashRecovery({
      totalCapitalInvested: 126_000,
      grossRefinanceProceeds: 110_000,
      refinanceClosingCosts: 0,
      loanPayoffAmount: 0,
    });
    expect(result.cashRecovered).toBe(110_000);
    expect(result.cashLeftInDeal).toBe(16_000);
    expect(result.excessCashOut).toBe(0);
  });

  it("caps recovered cash at capital invested and reports excess cash out (TEST 3)", () => {
    const result = computeCashRecovery({
      totalCapitalInvested: 126_000,
      grossRefinanceProceeds: 140_000,
      refinanceClosingCosts: 0,
      loanPayoffAmount: 0,
    });
    expect(result.cashRecovered).toBe(126_000);
    expect(result.cashLeftInDeal).toBe(0);
    expect(result.excessCashOut).toBe(14_000);
  });
});

describe("Quick Underwrite rent basis", () => {
  it("changes cashflow, NOI, DSCR, supported loan and verdict when switching rent (TEST 4)", () => {
    const listing = dscrFixture();
    listing.income.monthlyRent = 3_500;
    listing.income.rentSource = "listing";
    const verified = dscrFixture();
    verified.income.rentSource = "verified";
    const listingRun = calculateQuickUnderwrite(listing, null);
    const verifiedRun = calculateQuickUnderwrite(verified, null);
    expect(listingRun.operating.monthlyNoi).not.toBeCloseTo(verifiedRun.operating.monthlyNoi, 0);
    expect(listingRun.monthlyCashflow).not.toBeCloseTo(verifiedRun.monthlyCashflow ?? 0, 0);
    expect(listingRun.refinance.postRefiDscr).not.toBeCloseTo(verifiedRun.refinance.postRefiDscr ?? 0, 2);
    expect(listingRun.refinance.supportedRefinanceLoan).not.toBeCloseTo(verifiedRun.refinance.supportedRefinanceLoan, 0);
    expect(listingRun.rent.label).toMatch(/Listing Rent/);
    expect(verifiedRun.rent.label).toMatch(/Verified Local Rent/);
    expect(listingRun.verdict.verdict !== verifiedRun.verdict.verdict || listingRun.verdict.rules.some((rule, index) => rule.passed !== verifiedRun.verdict.rules[index]?.passed)).toBe(true);
  });
});

describe("Quick Underwrite Buy Box", () => {
  it("fails a property outside the saved ZIP codes with a specific reason (TEST 5)", () => {
    const profile: BuyBoxProfile = {
      ...createDefaultBuyBox(),
      zipCodes: ["33602"],
      targetZipCodes: ["33602"],
    };
    const match = matchBuyBox(profile, {
      propertyType: "single-family",
      bedrooms: 3,
      purchasePrice: 140_000,
      monthlyRent: 1_650,
      arv: 220_000,
      zipCode: "90210",
      strategy: "brrrr",
    });
    expect(match.status).toBe("outside");
    expect(match.reasons.some((reason) => reason.key === "zip" && reason.tone === "fail")).toBe(true);
    expect(match.reasons.find((reason) => reason.key === "zip")?.message).toMatch(/90210/);
  });
});

describe("Quick Underwrite blank analysis", () => {
  it("does not inherit the sample property price, rent, ARV or location (TEST 6)", () => {
    const sample = createDefaultAnalysis("US");
    const blank = createBlankAnalysis("US");
    expect(blank.financing.purchasePrice).toBe(0);
    expect(blank.income.monthlyRent).toBe(0);
    expect(blank.income.verifiedRent).toBe(0);
    expect(blank.brrrr.afterRepairValue).toBe(0);
    expect(blank.property.zipCode).toBe("");
    expect(blank.property.address).toBe("");
    expect(blank.property.city).toBe("");
    expect(blank.property.name).not.toBe(sample.property.name);
    expect(blank.financing.purchasePrice).not.toBe(sample.financing.purchasePrice);
    expect(blank.income.monthlyRent).not.toBe(sample.income.monthlyRent);
    expect(blank.brrrr.afterRepairValue).not.toBe(sample.brrrr.afterRepairValue);
  });
});

describe("loan principal inversion", () => {
  it("round-trips an amortising payment to principal", () => {
    const principal = 165_000;
    const payment = calculateMonthlyPayment(principal, 7, 30);
    expect(loanPrincipalFromPayment(payment, 7, 30)).toBeCloseTo(principal, 0);
  });
});
