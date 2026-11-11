import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { normalizeAnalysisInput } from "@/lib/calculations/normalize-input";
import { nullableDivide } from "@/lib/calculations/ratios";
import { effectiveSharedUtilities, monthlyUtilitiesTotal } from "@/lib/calculations/utilities";
import { isPortfolio } from "@/hooks/usePortfolio";
import type { AnalysisInput, PortfolioProperty } from "@/lib/types";

function omitFields<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): Record<string, unknown> {
  const next: Record<string, unknown> = { ...obj };
  for (const key of keys) delete next[key];
  return next;
}

function legacyDraft(): Record<string, unknown> {
  const fresh = createDefaultAnalysis("US");
  return {
    ...omitFields(fresh as unknown as Record<string, unknown>, ["decision"]),
    financing: omitFields(fresh.financing as unknown as Record<string, unknown>, ["otherAcquisitionCosts"]),
    income: omitFields(fresh.income as unknown as Record<string, unknown>, [
      "currentMonthlyRent",
      "rentEntryMode",
      "units",
    ]),
    expenses: {
      ...omitFields(fresh.expenses as unknown as Record<string, unknown>, [
        "insuranceSource",
        "capexPercent",
        "waterMonthly",
        "sewerMonthly",
        "trashMonthly",
        "sharedUtilitiesMonthly",
      ]),
      utilitiesMonthly: 200,
    },
  };
}

describe("normalizeAnalysisInput", () => {
  it("retains the previous ARV on a legacy draft", () => {
    const raw = legacyDraft() as unknown as AnalysisInput;
    const arv = raw.brrrr.afterRepairValue;
    const next = normalizeAnalysisInput(raw);
    expect(next.decision.advertisedArv).toBe(arv);
    expect(next.decision.conservativeArv).toBe(arv);
    expect(next.brrrr.afterRepairValue).toBe(arv);
  });

  it("retains the previous rent on a legacy draft", () => {
    const raw = legacyDraft() as unknown as AnalysisInput;
    const listing = raw.income.monthlyRent;
    const verified = raw.income.verifiedRent;
    const conservative = raw.income.conservativeRent;
    const next = normalizeAnalysisInput(raw);
    expect(next.income.monthlyRent).toBe(listing);
    expect(next.income.verifiedRent).toBe(verified);
    expect(next.income.conservativeRent).toBe(conservative);
    expect(next.income.currentMonthlyRent).toBe(verified);
    expect(next.income.rentEntryMode).toBe("total");
    expect(next.income.units).toEqual([]);
  });

  it("does not overwrite currentMonthlyRent when unit rows are present", () => {
    const base = createDefaultAnalysis("US");
    const withUnits: AnalysisInput = {
      ...base,
      income: {
        ...base.income,
        currentMonthlyRent: 1800,
        rentEntryMode: "units",
        units: [
          { id: "a", label: "Unit A", monthlyRent: 900 },
          { id: "b", label: "Unit B", monthlyRent: 950 },
        ],
      },
    };
    const next = normalizeAnalysisInput(withUnits);
    expect(next.income.currentMonthlyRent).toBe(1800);
    expect(next.income.rentEntryMode).toBe("units");
    expect(next.income.units).toHaveLength(2);
    expect(next.income.units[0].monthlyRent).toBe(900);
  });

  it("migrates utilitiesMonthly to sharedUtilitiesMonthly exactly once", () => {
    const raw = legacyDraft() as unknown as AnalysisInput;
    const first = normalizeAnalysisInput(raw);
    expect(first.expenses.sharedUtilitiesMonthly).toBe(200);
    expect(first.expenses.utilitiesMonthly).toBe(200);
    const second = normalizeAnalysisInput(first);
    expect(second.expenses.sharedUtilitiesMonthly).toBe(200);
    expect(second.expenses.utilitiesMonthly).toBe(200);
  });

  it("defaults legacy rehab contingency to 0 and new analyses to 10%", () => {
    const legacy = normalizeAnalysisInput(legacyDraft() as unknown as AnalysisInput);
    expect(legacy.decision.rehabContingencyPercent).toBe(0);
    expect(createDefaultAnalysis("US").decision.rehabContingencyPercent).toBe(10);
  });

  it("sets legacy insurance source to estimate", () => {
    const next = normalizeAnalysisInput(legacyDraft() as unknown as AnalysisInput);
    expect(next.expenses.insuranceSource).toBe("estimate");
  });

  it("is idempotent", () => {
    const first = normalizeAnalysisInput(legacyDraft() as unknown as AnalysisInput);
    const second = normalizeAnalysisInput(first);
    expect(second).toEqual(first);
  });

  it("keeps previous cash flow and DSCR until new assumptions change", () => {
    const raw = legacyDraft() as unknown as AnalysisInput;
    const before = analyzeProperty(raw);
    const after = analyzeProperty(normalizeAnalysisInput(raw));
    expect(after.monthlyCashflow).toBe(before.monthlyCashflow);
    expect(after.annualCashflow).toBe(before.annualCashflow);
    expect(after.noi).toBe(before.noi);
    expect(after.capRate).toBe(before.capRate);
    expect(after.dscr).toBe(before.dscr);
  });
});

describe("utilities fallback", () => {
  it("treats a legacy £200 utilitiesMonthly as £200, not £400", () => {
    const raw = { utilitiesMonthly: 200 };
    expect(effectiveSharedUtilities(raw)).toBe(200);
    expect(monthlyUtilitiesTotal(raw)).toBe(200);

    const normalized = normalizeAnalysisInput(legacyDraft() as unknown as AnalysisInput);
    expect(normalized.expenses.utilitiesMonthly).toBe(200);
    expect(normalized.expenses.sharedUtilitiesMonthly).toBe(200);
    expect(monthlyUtilitiesTotal(normalized.expenses)).toBe(200);
  });

  it("does not duplicate utilities on repeated normalisation", () => {
    const first = normalizeAnalysisInput(legacyDraft() as unknown as AnalysisInput);
    const second = normalizeAnalysisInput(first);
    expect(monthlyUtilitiesTotal(second.expenses)).toBe(200);
    expect(second.expenses.sharedUtilitiesMonthly).toBe(first.expenses.sharedUtilitiesMonthly);
  });

  it("sums water, sewer, trash and shared utilities to £200", () => {
    expect(
      monthlyUtilitiesTotal({
        waterMonthly: 50,
        sewerMonthly: 40,
        trashMonthly: 30,
        sharedUtilitiesMonthly: 80,
        utilitiesMonthly: 999,
      }),
    ).toBe(200);
  });

  it("does not fall back to utilitiesMonthly when sharedUtilitiesMonthly is explicitly 0", () => {
    expect(
      effectiveSharedUtilities({
        sharedUtilitiesMonthly: 0,
        utilitiesMonthly: 200,
      }),
    ).toBe(0);
    expect(
      monthlyUtilitiesTotal({
        waterMonthly: 0,
        sewerMonthly: 0,
        trashMonthly: 0,
        sharedUtilitiesMonthly: 0,
        utilitiesMonthly: 200,
      }),
    ).toBe(0);
  });
});

describe("cash flow source of truth", () => {
  it("does not deduct taxes, insurance or HOA twice", () => {
    const input = createDefaultAnalysis("US");
    input.expenses.propertyTaxAnnual = 2400;
    input.expenses.insuranceAnnual = 1200;
    input.expenses.hoaMonthly = 100;
    const results = analyzeProperty(input);
    const tax = results.expenseBreakdown.find((item) => item.key === "propertyTax")?.annual ?? 0;
    const insurance = results.expenseBreakdown.find((item) => item.key === "insurance")?.annual ?? 0;
    const hoa = results.expenseBreakdown.find((item) => item.key === "hoa")?.annual ?? 0;
    expect(tax).toBe(2400);
    expect(insurance).toBe(1200);
    expect(hoa).toBe(1200);
    expect(results.annualDebtService).toBeCloseTo(results.mortgage.monthlyPayment * 12);
    expect(results.annualCashflow).toBeCloseTo(results.noi - results.annualDebtService);
    const pitiExtra = tax + insurance + hoa;
    expect(pitiExtra).toBeGreaterThan(0);
    expect(results.annualCashflow).not.toBeCloseTo(results.noi - results.annualDebtService - pitiExtra);
  });
});

describe("nullable metrics", () => {
  it("returns null for zero ARV, zero income and missing financing rather than NaN or Infinity", () => {
    expect(nullableDivide(100_000, 0)).toBeNull();
    expect(nullableDivide(0, 0)).toBeNull();
    expect(nullableDivide(Number.NaN, 250_000)).toBeNull();
    expect(nullableDivide(100_000, Number.POSITIVE_INFINITY)).toBeNull();
    expect(nullableDivide(100_000, 200_000)).toBe(0.5);
  });
});

describe("persisted workspace fields", () => {
  it("keeps explicit zero scenario overrides, unit rows, insurance source and guideline settings", () => {
    const input = createDefaultAnalysis("US");
    input.income.rentEntryMode = "units";
    input.income.currentMonthlyRent = 1_800;
    input.income.units = [{ id: "a", label: "Unit A", monthlyRent: 900 }];
    input.expenses.insuranceSource = "quote";
    input.decision.targetArvPercent = 65;
    input.decision.includeAdditionalCostsInGuideline = true;
    input.decision.scenarios.stress.rentAdjustmentPercent = 0;
    input.decision.scenarios.stress.vacancyPercent = 0;
    const next = normalizeAnalysisInput(input);
    expect(next.income.rentEntryMode).toBe("units");
    expect(next.income.currentMonthlyRent).toBe(1_800);
    expect(next.income.units).toEqual([{ id: "a", label: "Unit A", monthlyRent: 900 }]);
    expect(next.expenses.insuranceSource).toBe("quote");
    expect(next.decision.targetArvPercent).toBe(65);
    expect(next.decision.includeAdditionalCostsInGuideline).toBe(true);
    expect(next.decision.scenarios.stress.rentAdjustmentPercent).toBe(0);
    expect(next.decision.scenarios.stress.vacancyPercent).toBe(0);
    expect(normalizeAnalysisInput(next)).toEqual(next);
  });
});

describe("portfolio compatibility", () => {
  it("accepts existing portfolio records that omit new snapshot fields", () => {
    const legacy: PortfolioProperty[] = [
      {
        id: "prop_legacy",
        name: "Legacy deal",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        country: "US",
        region: "FL",
        regionName: "Florida",
        strategy: "buy-hold",
        input: createDefaultAnalysis("US"),
        snapshot: {
          purchasePrice: 250000,
          roi: 8,
          cashOnCash: 6,
          capRate: 5,
          grossYield: 7,
          netYield: 5,
          monthlyCashflow: 200,
          annualCashflow: 2400,
          dscr: 1.2,
          appreciationRate: 4,
          dealScore: 70,
          grade: "good",
          recommendation: "Buy",
        },
      },
    ];
    expect(isPortfolio(legacy)).toBe(true);
    expect(legacy[0].snapshot.allInCost).toBeUndefined();
    expect(legacy[0].snapshot.guidelineMaxOffer).toBeUndefined();
  });
});
