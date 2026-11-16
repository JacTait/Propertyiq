import { describe, expect, it } from "vitest";
import {
  DEAL_SURVIVAL_CATEGORY_COPY,
  DEAL_SURVIVAL_CATEGORY_ORDER,
  DEAL_SURVIVAL_GRADE_BANDS,
  DOWNSIDE_SHOCKS,
  DOWNSIDE_WEIGHTS,
} from "@/lib/constants";
import { gradeDealSurvival } from "@/lib/calculations/downside-analysis";
import {
  dealSurvivalCategories,
  describeDownsideShocks,
  formatWeightedContribution,
  liveBreakdownTotal,
  primaryRiskExplanation,
  resolveDealSurvivalCategory,
} from "@/lib/calculations/deal-survival-explain";

describe("Deal Survival explanation config", () => {
  it("keeps category copy, order and weights aligned with the scoring engine", () => {
    expect([...DEAL_SURVIVAL_CATEGORY_ORDER]).toEqual(Object.keys(DOWNSIDE_WEIGHTS));
    const categories = dealSurvivalCategories();
    expect(categories.map((item) => item.key)).toEqual([...DEAL_SURVIVAL_CATEGORY_ORDER]);
    expect(categories.reduce((sum, item) => sum + item.weight, 0)).toBeCloseTo(1, 10);
    categories.forEach((item) => {
      expect(item.weight).toBe(DOWNSIDE_WEIGHTS[item.key]);
      expect(item.weightPercent).toBe(Math.round(DOWNSIDE_WEIGHTS[item.key] * 100));
      expect(item.label).toBe(DEAL_SURVIVAL_CATEGORY_COPY[item.key].label);
    });
  });

  it("uses the same grade bands as gradeDealSurvival", () => {
    expect(gradeDealSurvival(100)).toEqual({ grade: "very-defensive", gradeLabel: "Very Defensive" });
    expect(gradeDealSurvival(90)).toEqual({ grade: "very-defensive", gradeLabel: "Very Defensive" });
    expect(gradeDealSurvival(89)).toEqual({ grade: "defensive", gradeLabel: "Defensive" });
    expect(gradeDealSurvival(80)).toEqual({ grade: "defensive", gradeLabel: "Defensive" });
    expect(gradeDealSurvival(79)).toEqual({ grade: "acceptable", gradeLabel: "Acceptable" });
    expect(gradeDealSurvival(70)).toEqual({ grade: "acceptable", gradeLabel: "Acceptable" });
    expect(gradeDealSurvival(69)).toEqual({ grade: "exposed", gradeLabel: "Exposed" });
    expect(gradeDealSurvival(60)).toEqual({ grade: "exposed", gradeLabel: "Exposed" });
    expect(gradeDealSurvival(59)).toEqual({ grade: "high-risk", gradeLabel: "High Risk" });
    expect(gradeDealSurvival(0)).toEqual({ grade: "high-risk", gradeLabel: "High Risk" });
    DEAL_SURVIVAL_GRADE_BANDS.forEach((band) => {
      expect(gradeDealSurvival(band.min).grade).toBe(band.grade);
      expect(gradeDealSurvival(band.max).grade).toBe(band.grade);
    });
  });

  it("lists only shocks the Downside engine actually applies", () => {
    const items = describeDownsideShocks(DOWNSIDE_SHOCKS);
    expect(items.map((item) => item.key).sort()).toEqual(
      (Object.keys(DOWNSIDE_SHOCKS) as (keyof typeof DOWNSIDE_SHOCKS)[]).sort(),
    );
    expect(items.map((item) => item.label)).toEqual([
      "Lower rent",
      "Higher vacancy",
      "Higher maintenance",
      "Rehab overruns",
      "Higher insurance",
      "Higher property tax",
    ]);
    expect(describeDownsideShocks({
      rentFactor: 1,
      rehabFactor: 1,
      vacancyDelta: 0,
      maintenanceDelta: 0,
      taxFactor: 1,
      insuranceFactor: 1,
    })).toEqual([]);
  });

  it("explains primary risk from the lowest-scoring category key or label", () => {
    expect(resolveDealSurvivalCategory("Cashflow Survival")).toBe("cashflow");
    expect(primaryRiskExplanation("cashflow")).toBe(
      "Cashflow is the weakest part of this deal under stress assumptions.",
    );
    expect(primaryRiskExplanation("Cashflow Survival")).toBe(
      "Cashflow is the weakest part of this deal under stress assumptions.",
    );
    expect(liveBreakdownTotal([
      { contribution: 6 },
      { contribution: 6.25 },
      { contribution: 20 },
      { contribution: 11.25 },
      { contribution: 10 },
    ])).toBeCloseTo(53.5, 10);
    expect(formatWeightedContribution(6)).toBe("6");
    expect(formatWeightedContribution(6.25)).toBe("6.25");
    expect(formatWeightedContribution(11.25)).toBe("11.25");
  });
});
