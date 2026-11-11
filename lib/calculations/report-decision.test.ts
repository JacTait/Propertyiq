import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { evaluateDealDecision } from "@/lib/calculations/deal-decision";
import {
  reportAssumptionIssues,
  reportHasInvalidNumber,
  reportPrimaryMetrics,
  reportWhatBreaks,
} from "@/lib/calculations/report-decision";
import { DEFAULT_GUIDELINE_ADDITIONAL_COSTS } from "@/lib/constants/deal-workspace";
import { defaultFormatters } from "@/lib/utils/format";
import type { AnalysisInput } from "@/lib/types";

function fixture(patch?: (input: AnalysisInput) => void): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "brrrr";
  input.financing.purchasePrice = 200_000;
  input.financing.depositPercent = 25;
  input.income.conservativeRent = 2_000;
  input.income.monthlyRent = 2_200;
  input.expenses.vacancyPercent = 5;
  input.expenses.insuranceAnnual = 1_200;
  input.brrrr.rehabCost = 30_000;
  input.decision.conservativeArv = 300_000;
  input.decision.advertisedArv = 320_000;
  input.decision.rehabContingencyPercent = 10;
  input.decision.targetArvPercent = 70;
  input.decision.guidelineAdditionalCosts = { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS };
  patch?.(input);
  return input;
}

function assertClean(metrics: ReturnType<typeof reportPrimaryMetrics>, breaks: ReturnType<typeof reportWhatBreaks>) {
  expect(reportHasInvalidNumber(metrics)).toBe(false);
  expect(breaks.every((item) => !item.detail.includes("NaN") && !item.detail.includes("Infinity"))).toBe(true);
  expect(breaks.every((item) => item.value === null || !item.value.includes("NaN"))).toBe(true);
}

describe("report decision summary", () => {
  it("uses conservative and stress outputs from evaluateDealDecision for a financed deal", () => {
    const input = fixture();
    const decision = evaluateDealDecision(input);
    const metrics = reportPrimaryMetrics(decision);
    expect(metrics.conservativeMonthlyCashflow).toBe(decision.conservative.monthlyCashflow);
    expect(metrics.stressMonthlyCashflow).toBe(decision.scenarios.stress.monthlyCashflow);
    expect(metrics.stressMonthlyCashflow).not.toBe(metrics.conservativeMonthlyCashflow);
    expect(metrics.allInCost).toBe(decision.costs.allInCost);
    expect(metrics.guidelineMaxOffer).toBe(decision.guidelineMaxOffer);
    expect(metrics.allCash).toBe(false);
    assertClean(metrics, reportWhatBreaks(decision, defaultFormatters));
    const issues = reportAssumptionIssues(decision);
    expect(issues.every((item) => item.status === "high-risk" || item.status === "review")).toBe(true);
    expect(issues.some((item) => item.key === "insurance-source")).toBe(true);
  });

  it("keeps all-cash cash flow visible and does not treat DSCR as missing financing", () => {
    const decision = evaluateDealDecision(
      fixture((input) => {
        input.financing.depositPercent = 100;
      }),
    );
    const metrics = reportPrimaryMetrics(decision);
    expect(metrics.allCash).toBe(true);
    expect(metrics.dscr).toBeNull();
    expect(metrics.conservativeMonthlyCashflow).toBe(decision.conservative.monthlyCashflow);
    expect(Number.isFinite(metrics.conservativeMonthlyCashflow ?? NaN)).toBe(true);
    assertClean(metrics, reportWhatBreaks(decision, defaultFormatters));
  });

  it("keeps negative cash flow visible on a negative underwrite", () => {
    const decision = evaluateDealDecision(
      fixture((input) => {
        input.income.conservativeRent = 50;
      }),
    );
    const metrics = reportPrimaryMetrics(decision);
    expect(metrics.conservativeMonthlyCashflow ?? 0).toBeLessThan(0);
    expect(metrics.stressMonthlyCashflow ?? 0).toBeLessThan(metrics.conservativeMonthlyCashflow ?? 0);
    expect(metrics.marginLabel).toBe("Negative underwrite");
    const breaks = reportWhatBreaks(decision, defaultFormatters);
    expect(breaks.some((item) => item.key === "conservative-negative")).toBe(true);
    expect(breaks.some((item) => item.detail.includes("investor-guideline maximum") || item.key === "purchase-vs-guideline" || item.key === "rent-floor")).toBe(true);
    expect(breaks.some((item) => /max offer engine/i.test(item.detail))).toBe(false);
    assertClean(metrics, breaks);
  });

  it("does not invent thresholds outside the engine", () => {
    const decision = evaluateDealDecision(fixture());
    const keys = reportWhatBreaks(decision, defaultFormatters).map((item) => item.key);
    const engineKeys = decision.whatBreaks.map((item) => item.key);
    expect(keys.every((key) => engineKeys.includes(key))).toBe(true);
  });
});
