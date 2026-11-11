import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { evaluateDealDecision } from "@/lib/calculations/deal-decision";
import {
  assumptionChecksForDisplay,
  groupAssumptionChecks,
  isInheritedAssumption,
  presentWhatBreaks,
  summarizeScenarioAssumptions,
} from "@/lib/calculations/decision-support";
import { DEFAULT_SCENARIO_ASSUMPTIONS } from "@/lib/constants/deal-workspace";
import { DEFAULT_GUIDELINE_ADDITIONAL_COSTS } from "@/lib/constants/deal-workspace";
import { defaultFormatters } from "@/lib/utils/format";
import type { AnalysisInput } from "@/lib/types";

function fixture(patch?: (input: AnalysisInput) => void): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "brrrr";
  input.financing.purchasePrice = 200_000;
  input.financing.depositPercent = 25;
  input.income.conservativeRent = 2_000;
  input.expenses.vacancyPercent = 5;
  input.expenses.insuranceAnnual = 1_200;
  input.expenses.insuranceSource = "estimate";
  input.brrrr.rehabCost = 30_000;
  input.decision.conservativeArv = 300_000;
  input.decision.advertisedArv = 320_000;
  input.decision.rehabContingencyPercent = 10;
  input.decision.targetArvPercent = 70;
  input.decision.guidelineAdditionalCosts = { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS };
  patch?.(input);
  return input;
}

describe("inherited vs override", () => {
  it("treats only null/undefined as inherit, never 0", () => {
    expect(isInheritedAssumption(null)).toBe(true);
    expect(isInheritedAssumption(undefined)).toBe(true);
    expect(isInheritedAssumption(0)).toBe(false);
    expect(isInheritedAssumption(5)).toBe(false);
  });
});

describe("assumption check grouping", () => {
  it("puts high-risk before review before confirmed", () => {
    const grouped = groupAssumptionChecks(evaluateDealDecision(fixture()).assumptionChecks);
    expect(grouped.highRisk.every((item) => item.status === "high-risk")).toBe(true);
    expect(grouped.review.every((item) => item.status === "review")).toBe(true);
    expect(grouped.confirmed.every((item) => item.status === "confirmed")).toBe(true);
  });

  it("adds a high occupancy finding without inventing a score", () => {
    const tight = assumptionChecksForDisplay(
      evaluateDealDecision(
        fixture((input) => {
          input.income.conservativeRent = 200;
          input.expenses.propertyTaxAnnual = 8_000;
        }),
      ),
    );
    const occupancy = tight.find((item) => item.key === "occupancy-tight");
    expect(occupancy).toBeDefined();
    expect(occupancy?.detail).toMatch(/occupancy to break even/);
    expect(["review", "high-risk"]).toContain(occupancy?.status);
  });
});

describe("scenario assumption summary", () => {
  it("makes default stress haircuts inspectable and never treats 0 as inherit", () => {
    expect(summarizeScenarioAssumptions(DEFAULT_SCENARIO_ASSUMPTIONS.stress)).toMatch(/Rent -15% vs main/);
    expect(summarizeScenarioAssumptions(DEFAULT_SCENARIO_ASSUMPTIONS.stress)).toMatch(/Vacancy inherited/);
    expect(
      summarizeScenarioAssumptions({
        ...DEFAULT_SCENARIO_ASSUMPTIONS.stress,
        annualInsurance: 0,
        vacancyPercent: 0,
      }),
    ).toMatch(/Insurance 0 override/);
    expect(
      summarizeScenarioAssumptions({
        ...DEFAULT_SCENARIO_ASSUMPTIONS.stress,
        annualInsurance: 0,
        vacancyPercent: 0,
      }),
    ).toMatch(/Vacancy 0% override/);
  });
});

describe("what-breaks presentation", () => {
  it("surfaces formatted thresholds from the engine, including stress and purchase vs guideline", () => {
    const result = evaluateDealDecision(
      fixture((input) => {
        input.income.conservativeRent = 50;
        input.financing.purchasePrice = 250_000;
      }),
    );
    const items = presentWhatBreaks(result, defaultFormatters);
    expect(items.find((item) => item.key === "conservative-negative")).toBeDefined();
    expect(items.find((item) => item.key === "stress-negative")?.detail).toMatch(/negative by/);
    expect(items.find((item) => item.key === "purchase-vs-guideline")?.detail).toMatch(/above your configured investor-guideline maximum/);
    expect(items.every((item) => !item.detail.includes("NaN") && item.value !== "NaN")).toBe(true);
    expect(items.some((item) => item.detail.includes("Infinity"))).toBe(false);
  });
});
