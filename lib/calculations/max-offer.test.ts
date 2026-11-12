import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { evaluateDealMetrics } from "@/lib/calculations/deal-resilience";
import { validateRefinance } from "@/lib/calculations/refinance";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent } from "@/lib/calculations/rent";
import { calculateDscr } from "@/lib/calculations/ratios";
import type { AnalysisInput, MaxOfferInputs } from "@/lib/types";

function auditedMaxOffer(): MaxOfferInputs {
  return {
    property: {
      name: "Audit Fixture",
      arv: 380_000,
      expectedMonthlyRent: 3_500,
      rehabBudget: 30_000,
      closingCosts: 5_200,
      holdingCosts: 4_500,
      askingPrice: 260_000,
      propertyType: "single-family",
      bedrooms: 3,
      bathrooms: 2,
      zipCode: "",
    },
    location: { country: "US", region: "FL" },
    strategy: "brrrr",
    financing: {
      interestRate: 7,
      termYears: 30,
      loanToValue: 75,
      downPaymentPercent: 25,
      loanFees: 1_950,
    },
    expenses: {
      propertyTaxAnnual: 4_800,
      insuranceAnnual: 4_200,
      managementPercent: 8,
      vacancyPercent: 8,
      maintenancePercent: 6,
      capexPercent: 5,
      hoaMonthly: 0,
      otherMonthly: 250,
    },
    targets: {
      desiredMonthlyCashflow: 250,
      desiredRoi: 12,
      desiredCashOnCash: 8,
      minimumDscr: 1.25,
      safetyBufferPercent: 6,
    },
    brrrr: {
      refinanceLtv: 75,
      refinanceRate: 7,
    },
  };
}

function auditedAnalysis(purchasePrice: number): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "buy-hold";
  input.location.region = "FL";
  input.financing.purchasePrice = purchasePrice;
  input.financing.askingPrice = 260_000;
  input.financing.depositPercent = 25;
  input.financing.interestRate = 7;
  input.financing.termYears = 30;
  input.financing.closingCosts = 5_200;
  input.financing.legalFees = 0;
  input.financing.inspectionCosts = 0;
  input.financing.loanFees = 1_950;
  input.income.monthlyRent = 3_500;
  input.income.verifiedRent = 3_500;
  input.income.conservativeRent = 3_500;
  input.income.currentMonthlyRent = 3_500;
  input.income.rentSource = "verified";
  input.income.otherMonthlyIncome = 0;
  input.expenses.propertyTaxAnnual = 4_800;
  input.expenses.insuranceAnnual = 4_200;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 8;
  input.expenses.maintenancePercent = 6;
  input.expenses.capexPercent = 5;
  input.expenses.hoaMonthly = 0;
  input.expenses.otherMonthly = 250;
  input.expenses.waterMonthly = 0;
  input.expenses.sewerMonthly = 0;
  input.expenses.trashMonthly = 0;
  input.expenses.sharedUtilitiesMonthly = 0;
  input.expenses.utilitiesMonthly = 0;
  input.brrrr.rehabCost = 30_000;
  input.brrrr.afterRepairValue = 380_000;
  input.brrrr.refinanceLtv = 75;
  input.brrrr.refinanceRate = 7;
  input.brrrr.refinanceTermYears = 30;
  input.flip.holdingCostsMonthly = 0;
  input.flip.holdDurationMonths = 0;
  return input;
}

describe("Max Offer post-refinance cash flow", () => {
  it("keeps recommended-offer pre-refi cash flow near +$783", () => {
    const results = calculateMaxOffer(auditedMaxOffer());
    expect(results.recommendedOffer).toBe(159_200);
    expect(results.atRecommended.monthlyCashflow).toBeCloseTo(783, 0);
    expect(Number.isFinite(results.atRecommended.monthlyCashflow)).toBe(true);
  });

  it("recalculates post-refi cash flow from refinance debt service, not acquisition cash flow", () => {
    const results = calculateMaxOffer(auditedMaxOffer());
    const rec = results.atRecommended;
    const brrrr = results.brrrr;

    expect(brrrr.refinanceAmount).toBeCloseTo(380_000 * 0.75, 0);
    expect(brrrr.monthlyCashflow).not.toBeCloseTo(rec.monthlyCashflow, 0);
    expect(brrrr.monthlyCashflow).toBeCloseTo(-319, 0);
    expect(brrrr.postRefiDscr).toBeCloseTo(0.83, 2);
    expect(Number.isFinite(brrrr.monthlyCashflow)).toBe(true);
    expect(Number.isFinite(brrrr.postRefiDscr)).toBe(true);
    expect(brrrr.postRefiDscr).not.toBe(Infinity);
  });

  it("uses the same NOI and refinance debt service for post-refi cash flow and DSCR", () => {
    const results = calculateMaxOffer(auditedMaxOffer());
    const noi = results.atRecommended.noi;
    const ads = results.brrrr.annualRefinanceDebtService;
    expect(noi).toBeCloseTo(18_929, -1);
    expect(ads).toBeGreaterThan(0);
    expect(results.brrrr.monthlyCashflow).toBeCloseTo((noi - ads) / 12, 5);
    expect(results.brrrr.postRefiDscr).toBeCloseTo(calculateDscr(noi, ads), 8);
  });

  it("does not allow DSCR below 1.00 with positive post-refi cash flow on the same positive NOI and debt service", () => {
    const results = calculateMaxOffer(auditedMaxOffer());
    const noi = results.atRecommended.noi;
    const ads = results.brrrr.annualRefinanceDebtService;
    expect(noi).toBeGreaterThan(0);
    expect(ads).toBeGreaterThan(0);
    if (results.brrrr.postRefiDscr < 1) {
      expect(results.brrrr.monthlyCashflow).toBeLessThan(0);
    }
  });
});

describe("evaluateDealMetrics phase split", () => {
  it("keeps pre-refi cash flow and DSCR on the same acquisition debt service", () => {
    const input = auditedAnalysis(159_200);
    const metrics = evaluateDealMetrics(input);
    const results = analyzeProperty(applyActiveRent(input));
    expect(metrics.preRefiMonthlyCashflow).toBeCloseTo(results.monthlyCashflow, 8);
    expect(metrics.preRefiDscr).toBeCloseTo(results.dscr, 8);
    expect(metrics.monthlyCashflow).toBe(metrics.preRefiMonthlyCashflow);
    expect(metrics.dscr).toBe(metrics.preRefiDscr);
    expect(metrics.dscr).not.toBe(metrics.postRefiDscr);
  });

  it("computes post-refi cash flow from the same refinance debt service as post-refi DSCR", () => {
    const input = auditedAnalysis(159_200);
    const metrics = evaluateDealMetrics(input);
    const refinance = validateRefinance(input, analyzeProperty(applyActiveRent(input)));
    expect(metrics.postRefiMonthlyCashflow).toBeCloseTo(refinance.postRefiMonthlyCashflow, 8);
    expect(metrics.postRefiDscr).toBeCloseTo(refinance.postRefiDscr, 8);
    expect(metrics.postRefiMonthlyCashflow).toBeCloseTo(-319, 0);
    expect(metrics.postRefiDscr).toBeCloseTo(0.83, 2);
    expect(Number.isFinite(metrics.postRefiMonthlyCashflow)).toBe(true);
    expect(Number.isFinite(metrics.postRefiDscr)).toBe(true);
    if (metrics.postRefiDscr < 1) {
      expect(metrics.postRefiMonthlyCashflow).toBeLessThan(0);
    }
  });
});
