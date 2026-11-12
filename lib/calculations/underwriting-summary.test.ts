import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { createDefaultBuyBox } from "@/data/default-buy-box";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent } from "@/lib/calculations/rent";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { mapRehabCapitalSensitivity } from "@/lib/calculations/deal-resilience";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import type { AnalysisInput, MaxOfferInputs } from "@/lib/types";

function analysisFixture(): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "buy-hold";
  input.property.propertyType = "single-family";
  input.property.bedrooms = 3;
  input.financing.purchasePrice = 159_200;
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
  input.income.rentSource = "verified";
  input.expenses.propertyTaxAnnual = 4_800;
  input.expenses.insuranceAnnual = 4_200;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 8;
  input.expenses.maintenancePercent = 6;
  input.expenses.capexPercent = 5;
  input.expenses.otherMonthly = 250;
  input.expenses.hoaMonthly = 0;
  input.expenses.waterMonthly = 0;
  input.expenses.sewerMonthly = 0;
  input.expenses.trashMonthly = 0;
  input.expenses.sharedUtilitiesMonthly = 0;
  input.brrrr.rehabCost = 30_000;
  input.brrrr.afterRepairValue = 380_000;
  input.decision.conservativeArv = 380_000;
  input.decision.advertisedArv = 380_000;
  input.decision.targetArvPercent = 70;
  input.decision.rehabContingencyPercent = 10;
  return input;
}

function maxOfferFixture(): MaxOfferInputs {
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
    brrrr: { refinanceLtv: 75, refinanceRate: 7 },
  };
}

describe("underwriting summary labels", () => {
  it("names Resilience stress and bad-year Downside separately", () => {
    const input = analysisFixture();
    const results = analyzeProperty(applyActiveRent(input));
    const pack = underwriteDeal(input, results, createDefaultBuyBox(), {
      marginPrice: 260_000,
      marginOffers: { recommendedOffer: 159_200, maximumOffer: 169_350 },
    });
    const text = `${pack.summary.paragraphs.join(" ")} ${pack.summary.bullets?.join(" ") ?? ""}`;
    expect(text).toMatch(/Resilience stress case/i);
    expect(text).toMatch(/bad-year Downside case/i);
    expect(text).not.toMatch(/positive cashflow under both expected and stress-case assumptions/i);
    expect(pack.summary.paragraphs.filter((p) => /stress/i.test(p) && !/Resilience|Downside|bad-year/i.test(p))).toHaveLength(0);
  });

  it("labels leveraged first-year total return separately from bad-year total return", () => {
    const input = analysisFixture();
    const results = analyzeProperty(applyActiveRent(input));
    const pack = underwriteDeal(input, results, createDefaultBuyBox());
    const bullets = pack.summary.bullets ?? [];
    expect(bullets.some((b) => b.startsWith("Leveraged first-year total return:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Bad-year total return:"))).toBe(true);
    expect(bullets.some((b) => b.startsWith("Expected ROI:"))).toBe(false);
  });

  it("explains Buy Box fit when the listing is above the return-based maximum", () => {
    const input = analysisFixture();
    const results = analyzeProperty(applyActiveRent(input));
    const pack = underwriteDeal(input, results, createDefaultBuyBox(), {
      marginPrice: 260_000,
      marginOffers: { recommendedOffer: 159_200, maximumOffer: 169_350 },
    });
    expect(pack.buyBox.inside).toBe(true);
    expect(pack.summary.paragraphs.some((p) => p.includes("fits the active Buy Box characteristics") && p.includes("does not meet your return targets"))).toBe(true);
  });
});

describe("Max Offer first-year return labelling", () => {
  it("describes recommended-offer return as first-year return, not Expected ROI", () => {
    const results = calculateMaxOffer(maxOfferFixture());
    expect(results.atRecommended.roi).toBeCloseTo(13, 0);
    expect(results.summary.bullets.join(" ")).toMatch(/first-year return/i);
    expect(results.summary.bullets.join(" ")).not.toMatch(/Expected ROI/i);
  });
});

describe("rehab capital sensitivity", () => {
  it("moves cash required and headroom instead of claiming rental cash flow changes", () => {
    const points = mapRehabCapitalSensitivity(analysisFixture(), [-10, 0, 30]);
    const down = points.find((p) => p.changePercent === -10);
    const base = points.find((p) => p.changePercent === 0);
    const up = points.find((p) => p.changePercent === 30);
    expect(base).toBeDefined();
    expect(up).toBeDefined();
    expect(down).toBeDefined();
    expect(up!.totalCashInvested).toBeGreaterThan(base!.totalCashInvested);
    expect(down!.totalCashInvested).toBeLessThan(base!.totalCashInvested);
    expect(up!.remainingRehabHeadroom ?? 0).toBeLessThan(base!.remainingRehabHeadroom ?? 0);
    expect(points.every((p) => !("monthlyCashflow" in p) && !("roi" in p))).toBe(true);
  });
});
