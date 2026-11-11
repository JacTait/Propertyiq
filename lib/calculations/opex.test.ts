import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { evaluateDealDecision } from "@/lib/calculations/deal-decision";
import { normalizeAnalysisInput } from "@/lib/calculations/normalize-input";
import { monthlyUtilitiesTotal } from "@/lib/calculations/utilities";
import type { AnalysisInput } from "@/lib/types";

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

function cloneInput(input: AnalysisInput): AnalysisInput {
  return JSON.parse(JSON.stringify(input)) as AnalysisInput;
}

function alignedRent(input: AnalysisInput): AnalysisInput {
  const next = cloneInput(input);
  next.strategy = "buy-hold";
  next.income.monthlyRent = 2_000;
  next.income.verifiedRent = 2_000;
  next.income.conservativeRent = 2_000;
  next.income.otherMonthlyIncome = 0;
  next.income.rentSource = "verified";
  next.brrrr.expectedRent = 2_000;
  return next;
}

describe("legacy operating expenses", () => {
  it("keeps a normalised £200 utilities deal at £200/month with unchanged NOI, cash flow and DSCR", () => {
    const raw = legacyDraft() as unknown as AnalysisInput;
    const normalized = normalizeAnalysisInput(raw);
    expect(normalized.expenses.utilitiesMonthly).toBe(200);
    expect(normalized.expenses.sharedUtilitiesMonthly).toBe(200);
    expect(normalized.expenses.waterMonthly).toBe(0);
    expect(normalized.expenses.sewerMonthly).toBe(0);
    expect(normalized.expenses.trashMonthly).toBe(0);
    expect(normalized.expenses.capexPercent).toBe(0);
    expect(monthlyUtilitiesTotal(normalized.expenses)).toBe(200);

    const before = analyzeProperty(raw);
    const after = analyzeProperty(normalized);
    const utilities = after.expenseBreakdown.find((item) => item.key === "utilities");
    expect(utilities?.annual).toBe(2_400);
    expect(utilities?.monthly).toBe(200);
    expect(after.expenseBreakdown.find((item) => item.key === "capex")).toBeUndefined();
    expect(after.noi).toBe(before.noi);
    expect(after.monthlyCashflow).toBe(before.monthlyCashflow);
    expect(after.annualCashflow).toBe(before.annualCashflow);
    expect(after.dscr).toBe(before.dscr);
  });
});

describe("split utilities and CapEx source of truth", () => {
  it("counts water, sewer, trash and shared utilities once and ignores the leftover combined line", () => {
    const input = alignedRent(createDefaultAnalysis("US"));
    input.expenses.waterMonthly = 50;
    input.expenses.sewerMonthly = 40;
    input.expenses.trashMonthly = 30;
    input.expenses.sharedUtilitiesMonthly = 80;
    input.expenses.utilitiesMonthly = 999;
    input.expenses.capexPercent = 0;
    const opex = calculateOperatingExpenses(input.expenses, 24_000 * 0.95, 24_000);
    expect(opex.breakdown.find((item) => item.key === "utilities")?.annual).toBe(2_400);
    expect(opex.breakdown.filter((item) => item.key === "utilities")).toHaveLength(1);
    expect(analyzeProperty(input).expenseBreakdown.find((item) => item.key === "utilities")?.annual).toBe(2_400);
  });

  it("does not fall back when shared utilities are an explicit 0", () => {
    const input = alignedRent(createDefaultAnalysis("US"));
    input.expenses.waterMonthly = 0;
    input.expenses.sewerMonthly = 0;
    input.expenses.trashMonthly = 0;
    input.expenses.sharedUtilitiesMonthly = 0;
    input.expenses.utilitiesMonthly = 200;
    const opex = calculateOperatingExpenses(input.expenses, 24_000 * 0.95, 24_000);
    expect(opex.breakdown.find((item) => item.key === "utilities")).toBeUndefined();
    expect(analyzeProperty(input).expenseBreakdown.find((item) => item.key === "utilities")).toBeUndefined();
  });

  it("changes NOI by CapEx exactly once", () => {
    const base = alignedRent(createDefaultAnalysis("US"));
    base.expenses.capexPercent = 0;
    const withCapex = alignedRent(createDefaultAnalysis("US"));
    withCapex.expenses.capexPercent = 5;
    const without = analyzeProperty(base);
    const withReserves = analyzeProperty(withCapex);
    const income = calculateIncome(2_000, base.expenses.vacancyPercent);
    const expectedCapex = income.annualIncome * 0.05;
    expect(withReserves.expenseBreakdown.filter((item) => item.key === "capex")).toHaveLength(1);
    expect(withReserves.expenseBreakdown.find((item) => item.key === "capex")?.annual).toBeCloseTo(expectedCapex);
    expect(without.noi - withReserves.noi).toBeCloseTo(expectedCapex);
    expect(evaluateDealDecision(withCapex).conservative.expenseBreakdown.find((item) => item.key === "capex")?.annual).toBeCloseTo(
      expectedCapex,
    );
  });

  it("changes opex by water, sewer or trash exactly once", () => {
    const base = alignedRent(createDefaultAnalysis("US"));
    base.expenses.waterMonthly = 0;
    base.expenses.sewerMonthly = 0;
    base.expenses.trashMonthly = 0;
    base.expenses.sharedUtilitiesMonthly = 80;
    const bumped = cloneInput(base);
    bumped.expenses.waterMonthly = 10;
    const before = analyzeProperty(base);
    const after = analyzeProperty(bumped);
    expect(after.operatingExpensesAnnual - before.operatingExpensesAnnual).toBeCloseTo(120);
    expect(before.noi - after.noi).toBeCloseTo(120);
  });

  it("still counts tax, insurance and HOA once and deducts only P&I from NOI", () => {
    const input = alignedRent(createDefaultAnalysis("US"));
    input.expenses.propertyTaxAnnual = 2_400;
    input.expenses.insuranceAnnual = 1_200;
    input.expenses.hoaMonthly = 100;
    const results = analyzeProperty(input);
    expect(results.expenseBreakdown.filter((item) => item.key === "propertyTax")).toHaveLength(1);
    expect(results.expenseBreakdown.filter((item) => item.key === "insurance")).toHaveLength(1);
    expect(results.expenseBreakdown.filter((item) => item.key === "hoa")).toHaveLength(1);
    expect(results.expenseBreakdown.find((item) => item.key === "propertyTax")?.annual).toBe(2_400);
    expect(results.expenseBreakdown.find((item) => item.key === "insurance")?.annual).toBe(1_200);
    expect(results.expenseBreakdown.find((item) => item.key === "hoa")?.annual).toBe(1_200);
    expect(results.annualDebtService).toBeCloseTo(results.mortgage.monthlyPayment * 12);
    expect(results.annualCashflow).toBeCloseTo(results.noi - results.annualDebtService);
  });

  it("does not emit NaN or Infinity for zero price, missing ARV, zero rent or 100% vacancy", () => {
    const input = alignedRent(createDefaultAnalysis("US"));
    input.financing.purchasePrice = 0;
    input.decision.conservativeArv = 0;
    input.income.conservativeRent = 0;
    input.income.monthlyRent = 0;
    input.income.verifiedRent = 0;
    input.expenses.vacancyPercent = 100;
    const results = analyzeProperty(input);
    const decision = evaluateDealDecision(input);
    for (const value of [results.monthlyCashflow, results.noi, results.operatingExpensesAnnual, decision.conservative.monthlyCashflow]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(Number.isNaN(value)).toBe(false);
    }
    expect(decision.costs.allInPctConservativeArv).toBeNull();
    expect(decision.guidelineMaxOffer).toBeNull();
  });
});
