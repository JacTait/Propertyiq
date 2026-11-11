import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { calculateMortgage } from "@/lib/calculations/mortgage";
import {
  DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE,
  acquisitionFees,
  allInCost,
  allInPercentOfArv,
  assumptionChecks,
  baseRehabCost,
  breakEvenMonthlyRent,
  breakEvenOccupancyPercent,
  evaluateDealDecision,
  classifyMarginForError,
  guidelineMaxOffer,
  includedGuidelineCosts,
  maxAnnualInsurance,
  maximumTotalRehabBudget,
  remainingRehabHeadroom,
  rehabContingencyAmount,
  resolveCurrentMonthlyRent,
  totalHoldingCost,
  totalRehabBudget,
} from "@/lib/calculations/deal-decision";
import { DEFAULT_GUIDELINE_ADDITIONAL_COSTS } from "@/lib/constants/deal-workspace";
import type { AnalysisInput } from "@/lib/types";

function fixture(patch?: (input: AnalysisInput) => void): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "brrrr";
  input.financing.purchasePrice = 200_000;
  input.financing.askingPrice = 195_000;
  input.financing.depositPercent = 25;
  input.financing.interestRate = 6;
  input.financing.termYears = 30;
  input.financing.closingCosts = 4_000;
  input.financing.legalFees = 1_500;
  input.financing.inspectionCosts = 500;
  input.financing.loanFees = 1_500;
  input.financing.otherAcquisitionCosts = 0;
  input.income.monthlyRent = 2_200;
  input.income.verifiedRent = 2_100;
  input.income.conservativeRent = 2_000;
  input.income.currentMonthlyRent = 1_900;
  input.income.otherMonthlyIncome = 0;
  input.income.rentEntryMode = "total";
  input.income.units = [];
  input.expenses.propertyTaxAnnual = 2_400;
  input.expenses.insuranceAnnual = 1_200;
  input.expenses.insuranceSource = "estimate";
  input.expenses.hoaMonthly = 100;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 5;
  input.expenses.maintenancePercent = 5;
  input.expenses.capexPercent = 0;
  input.expenses.waterMonthly = 0;
  input.expenses.sewerMonthly = 0;
  input.expenses.trashMonthly = 0;
  input.expenses.sharedUtilitiesMonthly = 200;
  input.expenses.utilitiesMonthly = 200;
  input.expenses.otherMonthly = 50;
  input.brrrr.rehabCost = 30_000;
  input.brrrr.afterRepairValue = 300_000;
  input.flip.holdingCostsMonthly = 2_000;
  input.flip.holdDurationMonths = 3;
  input.flip.renovationBudget = 0;
  input.decision.advertisedArv = 320_000;
  input.decision.conservativeArv = 300_000;
  input.decision.rehabContingencyPercent = 10;
  input.decision.targetArvPercent = 70;
  input.decision.includeAdditionalCostsInGuideline = false;
  input.decision.guidelineAdditionalCosts = { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS };
  patch?.(input);
  return input;
}

describe("all-in cost components", () => {
  it("computes rehab contingency, total rehab, holding, fees and all-in", () => {
    expect(rehabContingencyAmount(30_000, 10)).toBe(3_000);
    expect(totalRehabBudget(30_000, 10)).toBe(33_000);
    expect(totalHoldingCost(2_000, 3)).toBe(6_000);
    expect(
      acquisitionFees({
        closingCosts: 4_000,
        legalFees: 1_500,
        inspectionCosts: 500,
        loanFees: 1_500,
        otherAcquisitionCosts: 0,
      }),
    ).toBe(7_500);
    expect(
      allInCost({
        purchasePrice: 200_000,
        acquisitionFees: 7_500,
        totalRehabBudget: 33_000,
        totalHoldingCost: 6_000,
      }),
    ).toBe(246_500);
  });

  it("never treats closingCosts as already containing the itemised lines", () => {
    const fees = acquisitionFees({
      closingCosts: 4_000,
      legalFees: 1_500,
      inspectionCosts: 500,
      loanFees: 1_500,
      otherAcquisitionCosts: 0,
    });
    expect(fees).toBe(7_500);
    expect(fees).not.toBe(4_000);
  });

  it("does not inflate all-in when otherAcquisitionCosts is 0", () => {
    const without = evaluateDealDecision(fixture());
    const withOther = evaluateDealDecision(
      fixture((input) => {
        input.financing.otherAcquisitionCosts = 2_500;
      }),
    );
    expect(without.costs.otherAcquisitionCosts).toBe(0);
    expect(without.costs.allInCost).toBe(246_500);
    expect(withOther.costs.allInCost).toBe(249_000);
  });

  it("returns all-in percent of conservative ARV, or null when ARV is missing", () => {
    expect(allInPercentOfArv(246_500, 300_000)).toBeCloseTo((246_500 / 300_000) * 100);
    expect(allInPercentOfArv(246_500, 0)).toBeNull();
    const missing = evaluateDealDecision(
      fixture((input) => {
        input.decision.conservativeArv = 0;
      }),
    );
    expect(missing.costs.allInPctConservativeArv).toBeNull();
    expect(missing.costs.allInCost).toBe(246_500);
  });
});

describe("conservative operations", () => {
  it("uses conservative rent for EGI, opex, NOI and cash flow = NOI − P&I", () => {
    const result = evaluateDealDecision(fixture());
    const income = calculateIncome(2_000, 5);
    expect(result.conservative.monthlyRent).toBe(2_000);
    expect(result.conservative.annualGrossIncome).toBe(income.annualIncome);
    expect(result.conservative.effectiveGrossIncome).toBe(income.effectiveGrossIncome);
    expect(result.conservative.annualCashflow).toBeCloseTo(
      result.conservative.noi - result.conservative.annualDebtService,
    );
    expect(result.conservative.monthlyCashflow).toBeCloseTo(result.conservative.annualCashflow / 12);

    const tax = result.conservative.expenseBreakdown.find((item) => item.key === "propertyTax");
    const insurance = result.conservative.expenseBreakdown.find((item) => item.key === "insurance");
    const hoa = result.conservative.expenseBreakdown.find((item) => item.key === "hoa");
    expect(tax?.annual).toBe(2_400);
    expect(insurance?.annual).toBe(1_200);
    expect(hoa?.annual).toBe(1_200);

    const mortgage = calculateMortgage({
      purchasePrice: 200_000,
      depositPercent: 25,
      interestRate: 6,
      termYears: 30,
    });
    expect(result.conservative.annualDebtService).toBeCloseTo(mortgage.monthlyPayment * 12);
    const pitiExtra = 2_400 + 1_200 + 1_200;
    expect(result.conservative.annualCashflow).not.toBeCloseTo(
      result.conservative.noi - result.conservative.annualDebtService - pitiExtra,
    );
  });

  it("includes split utilities and CapEx in decision opex without adding utilitiesMonthly twice", () => {
    const split = evaluateDealDecision(
      fixture((input) => {
        input.expenses.waterMonthly = 50;
        input.expenses.sewerMonthly = 40;
        input.expenses.trashMonthly = 30;
        input.expenses.sharedUtilitiesMonthly = 80;
        input.expenses.utilitiesMonthly = 999;
        input.expenses.capexPercent = 5;
      }),
    );
    const utilities = split.conservative.expenseBreakdown.find((item) => item.key === "utilities");
    const capex = split.conservative.expenseBreakdown.find((item) => item.key === "capex");
    expect(utilities?.annual).toBe(2_400);
    expect(capex?.annual).toBe(2_000 * 12 * 0.05);

    const explicitZero = evaluateDealDecision(
      fixture((input) => {
        input.expenses.sharedUtilitiesMonthly = 0;
        input.expenses.utilitiesMonthly = 200;
      }),
    );
    expect(explicitZero.conservative.expenseBreakdown.find((item) => item.key === "utilities")).toBeUndefined();
  });

  it("does not use unit rows or listing rent for the conservative underwrite", () => {
    const input = fixture((next) => {
      next.income.rentEntryMode = "units";
      next.income.currentMonthlyRent = 1_900;
      next.income.units = [
        { id: "a", label: "A", monthlyRent: 900 },
        { id: "b", label: "B", monthlyRent: 950 },
      ];
    });
    expect(resolveCurrentMonthlyRent(input.income)).toBe(1_850);
    const result = evaluateDealDecision(input);
    expect(result.conservative.monthlyRent).toBe(2_000);
    expect(result.conservative.annualGrossIncome).toBe(24_000);
  });

  it("returns null for missing ARV or purchase price, not because the deal is unfinanced", () => {
    const empty = evaluateDealDecision(
      fixture((input) => {
        input.financing.purchasePrice = 0;
        input.financing.depositPercent = 0;
        input.decision.conservativeArv = 0;
        input.income.monthlyRent = 0;
        input.income.verifiedRent = 0;
        input.income.conservativeRent = 0;
        input.brrrr.expectedRent = 0;
      }),
    );
    expect(empty.conservative.capRate).toBeNull();
    expect(empty.conservative.dscr).toBeNull();
    expect(empty.costs.allInPctConservativeArv).toBeNull();
    expect(empty.guidelineMaxOffer).toBeNull();
    expect(Number.isNaN(empty.conservative.noi)).toBe(false);
    expect(Number.isFinite(empty.conservative.monthlyCashflow)).toBe(true);
  });
});

describe("all-cash deal", () => {
  it("calculates value, return and occupancy metrics with zero P&I, and leaves DSCR null", () => {
    const result = evaluateDealDecision(
      fixture((input) => {
        input.financing.depositPercent = 100;
      }),
    );

    expect(result.costs.loanAmount).toBe(0);
    expect(result.conservative.annualDebtService).toBe(0);
    expect(result.conservative.monthlyDebtService).toBe(0);

    expect(result.costs.allInPctConservativeArv).toBeCloseTo((246_500 / 300_000) * 100);
    expect(result.guidelineMaxOffer).toBe(177_000);
    expect(result.conservative.capRate).not.toBeNull();
    expect(result.conservative.capRate).toBeCloseTo((result.conservative.noi / 200_000) * 100);

    expect(result.costs.cashInvested).toBeGreaterThan(0);
    expect(result.costs.cashInvested).toBe(result.costs.allInCost);
    expect(result.conservative.cashOnCash).not.toBeNull();
    expect(result.conservative.cashOnCash).toBeCloseTo(
      (result.conservative.annualCashflow / result.costs.cashInvested) * 100,
    );

    expect(result.conservative.annualCashflow).toBeCloseTo(result.conservative.noi);
    expect(result.conservative.monthlyCashflow).toBeCloseTo(result.conservative.noi / 12);

    expect(result.breakEvens.occupancyPercent).not.toBeNull();
    expect(result.breakEvens.occupancyPercent).toBeCloseTo(
      (result.conservative.operatingExpensesAnnual / result.conservative.annualGrossIncome) * 100,
    );
    expect(result.breakEvens.monthlyRent).not.toBeNull();
    expect(result.breakEvens.maxAnnualInsurance).not.toBeNull();

    expect(result.conservative.dscr).toBeNull();
  });
});

describe("configurable ARV guideline and rehab headroom", () => {
  it("uses conservative ARV × target% − rehab − contingency, with extras off by default", () => {
    expect(
      guidelineMaxOffer({
        conservativeArv: 300_000,
        targetArvPercent: 70,
        baseRehabCost: 30_000,
        rehabContingencyAmount: 3_000,
      }),
    ).toBe(177_000);

    const result = evaluateDealDecision(fixture());
    expect(result.guidelineMaxOffer).toBe(177_000);
    expect(result.rehabHeadroom.maximumTotalRehabBudget).toBe(10_000);
    expect(result.rehabHeadroom.remainingRehabHeadroom).toBe(10_000 - 33_000);
    expect(result.rehabHeadroom.currentTotalRehabBudget).toBe(33_000);
  });

  it("deducts only checked extra costs when the guideline option is enabled", () => {
    const flags = {
      closingCosts: true,
      legalFees: true,
      inspectionCosts: true,
      loanFees: true,
      otherAcquisitionCosts: true,
      holdingCosts: true,
    };
    const extra = includedGuidelineCosts(
      flags,
      {
        purchasePrice: 200_000,
        askingPrice: 0,
        depositPercent: 25,
        interestRate: 6,
        termYears: 30,
        closingCosts: 4_000,
        legalFees: 1_500,
        inspectionCosts: 500,
        loanFees: 1_500,
        otherAcquisitionCosts: 0,
      },
      6_000,
    );
    expect(extra).toBe(13_500);

    const result = evaluateDealDecision(
      fixture((input) => {
        input.decision.includeAdditionalCostsInGuideline = true;
        input.decision.guidelineAdditionalCosts = flags;
      }),
    );
    expect(result.guidelineMaxOffer).toBe(177_000 - 13_500);
    expect(result.rehabHeadroom.maximumTotalRehabBudget).toBe(10_000 - 13_500);
  });

  it("returns null rehab headroom when conservative ARV is missing, including negatives as numbers otherwise", () => {
    expect(maximumTotalRehabBudget({ conservativeArv: 0, targetArvPercent: 70, purchasePrice: 200_000 })).toBeNull();
    expect(remainingRehabHeadroom(null, 33_000)).toBeNull();
    expect(remainingRehabHeadroom(10_000, 33_000)).toBe(-23_000);
    const missing = evaluateDealDecision(
      fixture((input) => {
        input.decision.conservativeArv = 0;
      }),
    );
    expect(missing.rehabHeadroom.maximumTotalRehabBudget).toBeNull();
    expect(missing.rehabHeadroom.remainingRehabHeadroom).toBeNull();
  });
});

describe("break-evens and insurance guard", () => {
  it("solves break-even monthly rent from opex and P&I", () => {
    const result = evaluateDealDecision(fixture());
    const rent = result.breakEvens.monthlyRent;
    expect(rent).not.toBeNull();
    if (rent === null) return;
    const atFloor = evaluateDealDecision(
      fixture((input) => {
        input.income.conservativeRent = rent;
      }),
    );
    expect(atFloor.conservative.annualCashflow).toBeCloseTo(0, 4);
  });

  it("returns occupancy as a percent, or null when gross income is missing", () => {
    const result = evaluateDealDecision(fixture());
    expect(result.breakEvens.occupancyPercent).not.toBeNull();
    expect(result.breakEvens.occupancyPercent).toBeCloseTo(
      ((result.conservative.operatingExpensesAnnual + result.conservative.annualDebtService) /
        result.conservative.annualGrossIncome) *
        100,
    );
    expect(breakEvenOccupancyPercent(10_000, 5_000, 0)).toBeNull();
    const empty = evaluateDealDecision(
      fixture((input) => {
        input.income.monthlyRent = 0;
        input.income.verifiedRent = 0;
        input.income.conservativeRent = 0;
        input.income.otherMonthlyIncome = 0;
        input.brrrr.expectedRent = 0;
      }),
    );
    expect(empty.conservative.annualGrossIncome).toBe(0);
    expect(empty.breakEvens.occupancyPercent).toBeNull();
  });

  it("returns max annual insurance only when remaining income after other opex and P&I is positive", () => {
    const result = evaluateDealDecision(fixture());
    const insurance = result.conservative.expenseBreakdown.find((item) => item.key === "insurance")?.annual ?? 0;
    const expected =
      result.conservative.effectiveGrossIncome -
      (result.conservative.operatingExpensesAnnual - insurance) -
      result.conservative.annualDebtService;
    expect(expected).toBeGreaterThan(0);
    expect(result.breakEvens.maxAnnualInsurance).toBeCloseTo(expected);
    expect(result.breakEvens.maxInsuranceMessage).toBeNull();

    expect(
      maxAnnualInsurance({
        effectiveGrossIncome: 10_000,
        operatingExpensesExcludingInsurance: 8_000,
        annualDebtService: 3_000,
      }),
    ).toBeNull();
    expect(
      maxAnnualInsurance({
        effectiveGrossIncome: 10_000,
        operatingExpensesExcludingInsurance: 8_000,
        annualDebtService: 2_000,
      }),
    ).toBeNull();
    expect(
      maxAnnualInsurance({
        effectiveGrossIncome: 10_000,
        operatingExpensesExcludingInsurance: 8_000,
        annualDebtService: 1_999,
      }),
    ).toBeCloseTo(1);

    const underwater = evaluateDealDecision(
      fixture((input) => {
        input.income.conservativeRent = 100;
        input.expenses.propertyTaxAnnual = 50_000;
      }),
    );
    expect(underwater.breakEvens.maxAnnualInsurance).toBeNull();
    expect(underwater.breakEvens.maxInsuranceMessage).toBe(DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE);
    expect(underwater.whatBreaks.find((item) => item.key === "insurance-cap")?.severity).toBe("critical");
  });

  it("returns null break-even rent when percentage expenses consume all income", () => {
    expect(
      breakEvenMonthlyRent({
        otherMonthlyIncome: 0,
        vacancyPercent: 50,
        managementPercent: 50,
        maintenancePercent: 20,
        capexPercent: 20,
        fixedAnnualExcludingPercentages: 1_000,
        annualDebtService: 1_000,
      }),
    ).toBeNull();
  });
});

describe("scenarios, what-breaks and assumption checks", () => {
  it("keeps the base scenario on the conservative underwrite and applies labelled adjustments", () => {
    const result = evaluateDealDecision(fixture());
    expect(result.scenarios.base.monthlyCashflow).toBeCloseTo(result.conservative.monthlyCashflow);
    expect(result.scenarios.base.allInCost).toBe(result.costs.allInCost);
    expect(result.scenarios.base.conservativeArv).toBe(300_000);
    expect(result.scenarios.conservative.conservativeArv).toBe(285_000);
    expect(result.scenarios.stress.conservativeArv).toBe(270_000);
    expect(result.scenarios.conservative.totalRehabBudget).toBe(totalRehabBudget(33_000, 10));
    expect(result.scenarios.stress.totalRehabBudget).toBe(totalRehabBudget(36_000, 10));
    expect(result.scenarios.conservative.monthlyCashflow).toBeLessThan(result.scenarios.base.monthlyCashflow);
    expect(result.scenarios.stress.monthlyCashflow).toBeLessThan(result.scenarios.conservative.monthlyCashflow);
    expect(result.scenarios.stress.monthlyRent).toBeCloseTo(2_000 * 0.85);
    expect(result.scenarios.base.vacancyPercent).toBe(5);
    expect(result.scenarios.base.allInPctConservativeArv).not.toBeNull();
  });

  it("inherits null scenario fields and honours explicit overrides", () => {
    const inherited = evaluateDealDecision(fixture());
    const overridden = evaluateDealDecision(
      fixture((input) => {
        input.decision.scenarios.conservative.vacancyPercent = 20;
        input.decision.scenarios.conservative.annualInsurance = 3_000;
        input.decision.scenarios.conservative.maintenancePercent = 10;
        input.decision.scenarios.conservative.capexPercent = 8;
      }),
    );
    expect(inherited.scenarios.conservative.noi).not.toBe(overridden.scenarios.conservative.noi);
    const income = calculateIncome(2_000 * 0.95, 20);
    expect(overridden.scenarios.conservative.noi).toBeLessThan(inherited.scenarios.conservative.noi);
    expect(income.effectiveGrossIncome).toBeLessThan(calculateIncome(2_000 * 0.95, 5).effectiveGrossIncome);
    expect(overridden.scenarios.conservative.vacancyPercent).toBe(20);
    expect(overridden.scenarios.conservative.annualInsurance).toBe(3_000);

    const zeroInsurance = evaluateDealDecision(
      fixture((input) => {
        input.decision.scenarios.stress.annualInsurance = 0;
      }),
    );
    expect(zeroInsurance.scenarios.stress.annualInsurance).toBe(0);
    expect(zeroInsurance.scenarios.stress.annualInsurance).not.toBe(inherited.scenarios.stress.annualInsurance);
  });

  it("flags asking above guideline, negative conservative cash flow, and missing ARV", () => {
    const asking = evaluateDealDecision(
      fixture((input) => {
        input.financing.askingPrice = 190_000;
      }),
    );
    expect(asking.whatBreaks.some((item) => item.key === "asking-vs-guideline")).toBe(true);
    expect(asking.whatBreaks.some((item) => item.key === "purchase-vs-guideline")).toBe(true);

    const negative = evaluateDealDecision(
      fixture((input) => {
        input.income.conservativeRent = 50;
      }),
    );
    expect(negative.whatBreaks.some((item) => item.key === "conservative-negative")).toBe(true);
    expect(negative.scenarios.base.status).toBe("negative");

    const checks = assumptionChecks(
      fixture((input) => {
        input.decision.conservativeArv = 0;
        input.income.conservativeRent = 0;
        input.expenses.insuranceSource = "estimate";
        input.expenses.vacancyPercent = 0;
        input.expenses.maintenancePercent = 0;
        input.expenses.capexPercent = 0;
        input.decision.rehabContingencyPercent = 0;
        input.flip.holdingCostsMonthly = 0;
      }),
    );
    expect(checks.find((item) => item.key === "conservative-arv")?.status).toBe("high-risk");
    expect(checks.find((item) => item.key === "conservative-rent")?.status).toBe("high-risk");
    expect(checks.find((item) => item.key === "insurance-source")?.status).toBe("review");
    expect(checks.find((item) => item.key === "vacancy")?.status).toBe("review");
    expect(checks.find((item) => item.key === "maintenance")?.status).toBe("review");
    expect(checks.find((item) => item.key === "capex")?.status).toBe("review");
    expect(checks.find((item) => item.key === "rehab-contingency")?.status).toBe("review");
    expect(checks.find((item) => item.key === "holding-costs")?.status).toBe("review");
  });

  it("treats an insurance quote, haircut ARV and reserves as confirmed", () => {
    const checks = assumptionChecks(
      fixture((input) => {
        input.expenses.insuranceSource = "quote";
        input.expenses.capexPercent = 5;
      }),
    );
    expect(checks.find((item) => item.key === "insurance-source")?.status).toBe("confirmed");
    expect(checks.find((item) => item.key === "conservative-vs-advertised")?.status).toBe("confirmed");
    expect(checks.find((item) => item.key === "capex")?.status).toBe("confirmed");
  });
});

describe("legacy analyzeProperty isolation", () => {
  it("does not change analyzeProperty cash flow when CapEx and split utilities are decision-only", () => {
    const input = fixture((next) => {
      next.expenses.capexPercent = 5;
      next.expenses.waterMonthly = 50;
      next.expenses.sewerMonthly = 40;
      next.expenses.trashMonthly = 30;
      next.expenses.sharedUtilitiesMonthly = 80;
      next.expenses.utilitiesMonthly = 200;
    });
    const analyzed = analyzeProperty(input);
    const opex = calculateOperatingExpenses(
      input.expenses,
      calculateIncome(input.brrrr.expectedRent + input.income.otherMonthlyIncome, input.expenses.vacancyPercent)
        .effectiveGrossIncome,
      (input.brrrr.expectedRent + input.income.otherMonthlyIncome) * 12,
    );
    const utilities = opex.breakdown.find((item) => item.key === "utilities");
    expect(utilities?.annual).toBe(2_400);
    expect(opex.breakdown.find((item) => item.key === "capex")).toBeUndefined();
    expect(analyzed.annualCashflow).toBeCloseTo(analyzed.noi - analyzed.annualDebtService);

    const decision = evaluateDealDecision(input);
    expect(decision.conservative.expenseBreakdown.find((item) => item.key === "capex")?.annual).toBeGreaterThan(0);
    expect(decision.conservative.expenseBreakdown.find((item) => item.key === "utilities")?.annual).toBe(2_400);
  });
});

describe("strategy rehab source", () => {
  it("uses flip renovation budget for fix-flip and BRRRR rehab otherwise", () => {
    const brrrr = fixture();
    expect(baseRehabCost(brrrr)).toBe(30_000);
    const flip = fixture((input) => {
      input.strategy = "fix-flip";
      input.flip.renovationBudget = 40_000;
    });
    expect(baseRehabCost(flip)).toBe(40_000);
    expect(evaluateDealDecision(flip).costs.baseRehabCost).toBe(40_000);
    expect(evaluateDealDecision(flip).costs.totalRehabBudget).toBe(44_000);
  });
});

describe("margin-for-error classification", () => {
  const base = {
    conservativeMonthlyCashflow: 400,
    stressMonthlyCashflow: 150,
    remainingRehabHeadroom: 20_000,
    currentTotalRehabBudget: 33_000,
    allInPctConservativeArv: 55,
    targetArvPercent: 70,
  };

  it("labels a negative conservative cash flow as a negative underwrite first", () => {
    expect(
      classifyMarginForError({
        ...base,
        conservativeMonthlyCashflow: -50,
        remainingRehabHeadroom: -5_000,
        allInPctConservativeArv: 95,
      }).label,
    ).toBe("Negative underwrite");
    expect(
      classifyMarginForError({
        ...base,
        conservativeMonthlyCashflow: -50,
      }).explanation,
    ).toMatch(/negative/i);
  });

  it("labels negative rehab headroom as a negative underwrite even when cash flow is positive", () => {
    const result = classifyMarginForError({
      ...base,
      remainingRehabHeadroom: -8_000,
    });
    expect(result.label).toBe("Negative underwrite");
    expect(result.explanation).toMatch(/rehab budget exceeds/i);
  });

  it("labels all-in above the selected ARV guideline as a negative underwrite", () => {
    const result = classifyMarginForError({
      ...base,
      allInPctConservativeArv: 82.2,
    });
    expect(result.label).toBe("Negative underwrite");
    expect(result.explanation).toMatch(/82\.2%.*70\.0%/);
  });

  it("labels a default stress case that turns cash flow negative as a thin margin", () => {
    const result = classifyMarginForError({
      ...base,
      stressMonthlyCashflow: -40,
    });
    expect(result.label).toBe("Thin margin");
    expect(result.explanation).toMatch(/stress case/i);
  });

  it("labels sub-$100 conservative cash flow as a thin margin", () => {
    expect(classifyMarginForError({ ...base, conservativeMonthlyCashflow: 40 }).label).toBe("Thin margin");
  });

  it("labels all-in close to the guideline as a thin margin", () => {
    const result = classifyMarginForError({ ...base, allInPctConservativeArv: 66 });
    expect(result.label).toBe("Thin margin");
    expect(result.explanation).toMatch(/close to/i);
  });

  it("labels thin remaining rehab headroom as a thin margin", () => {
    expect(
      classifyMarginForError({
        ...base,
        remainingRehabHeadroom: 2_000,
        currentTotalRehabBudget: 33_000,
        allInPctConservativeArv: 50,
      }).label,
    ).toBe("Thin margin");
  });

  it("labels healthy cash flow well below the guideline as a stronger margin", () => {
    const result = classifyMarginForError(base);
    expect(result.label).toBe("Stronger margin");
    expect(result.explanation).toMatch(/comfortably below/i);
  });

  it("uses moderate when cash flow is fine but conservative ARV is missing", () => {
    const result = classifyMarginForError({
      ...base,
      allInPctConservativeArv: null,
      remainingRehabHeadroom: null,
    });
    expect(result.label).toBe("Moderate margin");
    expect(result.explanation).toMatch(/conservative ARV/i);
  });

  it("attaches the classification to evaluateDealDecision", () => {
    const overGuideline = evaluateDealDecision(fixture());
    expect(overGuideline.marginForError.label).toBe("Negative underwrite");
    expect(overGuideline.stressUsesProductDefaults).toBe(true);

    const stronger = evaluateDealDecision(
      fixture((input) => {
        input.financing.purchasePrice = 100_000;
        input.financing.closingCosts = 2_000;
        input.financing.legalFees = 500;
        input.financing.inspectionCosts = 400;
        input.financing.loanFees = 600;
        input.brrrr.rehabCost = 10_000;
        input.flip.holdingCostsMonthly = 500;
        input.flip.holdDurationMonths = 2;
        input.decision.conservativeArv = 300_000;
        input.decision.targetArvPercent = 70;
      }),
    );
    expect(stronger.costs.allInPctConservativeArv).not.toBeNull();
    expect(stronger.costs.allInPctConservativeArv ?? 0).toBeLessThan(60);
    expect(stronger.marginForError.label).toBe("Stronger margin");
  });
});
