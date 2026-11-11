import { describe, expect, it } from "vitest";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { evaluateDealDecision } from "@/lib/calculations/deal-decision";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { DEFAULT_GUIDELINE_ADDITIONAL_COSTS } from "@/lib/constants/deal-workspace";
import { buildSnapshot, isPortfolio } from "@/hooks/usePortfolio";
import { analysisOpenPath, dashboardPath } from "@/lib/utils/routes";
import type { AnalysisInput, PortfolioProperty, PortfolioSnapshot } from "@/lib/types";
import {
  decisionSnapshotFields,
  finiteOrNull,
  readDecisionSnapshot,
} from "@/lib/calculations/portfolio-snapshot";

function fixture(patch?: (input: AnalysisInput) => void): AnalysisInput {
  const input = createDefaultAnalysis("US");
  input.strategy = "brrrr";
  input.financing.purchasePrice = 200_000;
  input.financing.depositPercent = 25;
  input.income.conservativeRent = 2_000;
  input.expenses.vacancyPercent = 5;
  input.brrrr.rehabCost = 30_000;
  input.decision.conservativeArv = 300_000;
  input.decision.advertisedArv = 320_000;
  input.decision.rehabContingencyPercent = 10;
  input.decision.targetArvPercent = 70;
  input.decision.guidelineAdditionalCosts = { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS };
  patch?.(input);
  return input;
}

function legacySnapshot(): PortfolioSnapshot {
  return {
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
  };
}

describe("legacy portfolio snapshot", () => {
  it("parses, displays, and can open a record that omits optional decision fields", () => {
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
        snapshot: legacySnapshot(),
      },
    ];
    expect(isPortfolio(legacy)).toBe(true);
    const read = readDecisionSnapshot(legacy[0].snapshot);
    expect(read.allInCost).toBeNull();
    expect(read.conservativeMonthlyCashflow).toBeNull();
    expect(read.stressMonthlyCashflow).toBeNull();
    expect(read.guidelineMaxOffer).toBeNull();
    expect(read.marginForErrorLabel).toBeNull();
    expect(Object.values(read).every((value) => value === null || (typeof value === "number" && Number.isFinite(value)))).toBe(
      true,
    );
    expect(analysisOpenPath(legacy[0])).toBe(dashboardPath("prop_legacy"));
  });
});

describe("saved decision snapshot", () => {
  it("attaches decision fields when a deal is saved or resaved", () => {
    const input = fixture();
    const decision = evaluateDealDecision(input);
    const snapshot = buildSnapshot(input, analyzeProperty(input));
    expect(snapshot.allInCost).toBe(decision.costs.allInCost);
    expect(snapshot.conservativeMonthlyCashflow).toBe(decision.conservative.monthlyCashflow);
    expect(snapshot.stressMonthlyCashflow).toBe(decision.scenarios.stress.monthlyCashflow);
    expect(snapshot.guidelineMaxOffer).toBe(decision.guidelineMaxOffer);
    expect(snapshot.marginForErrorLabel).toBe(decision.marginForError.label);
  });

  it("captures evaluateDealDecision outputs, including the same stress cash flow as Deal Workspace", () => {
    const input = fixture();
    const decision = evaluateDealDecision(input);
    const fields = decisionSnapshotFields(input);
    expect(fields.allInCost).toBe(decision.costs.allInCost);
    expect(fields.conservativeMonthlyCashflow).toBe(decision.conservative.monthlyCashflow);
    expect(fields.stressMonthlyCashflow).toBe(decision.scenarios.stress.monthlyCashflow);
    expect(fields.guidelineMaxOffer).toBe(decision.guidelineMaxOffer);
    expect(fields.marginForErrorLabel).toBe(decision.marginForError.label);
    expect(fields.stressMonthlyCashflow).not.toBe(fields.conservativeMonthlyCashflow);
  });

  it("stores null guideline when conservative ARV is missing, without NaN or Infinity", () => {
    const fields = decisionSnapshotFields(
      fixture((input) => {
        input.decision.conservativeArv = 0;
        input.decision.advertisedArv = 0;
      }),
    );
    expect(fields.guidelineMaxOffer).toBeNull();
    expect(fields.allInCost).not.toBeNull();
    expect(Number.isFinite(fields.allInCost ?? NaN)).toBe(true);
    expect(Number.isFinite(fields.conservativeMonthlyCashflow ?? NaN)).toBe(true);
    expect(Number.isFinite(fields.stressMonthlyCashflow ?? NaN)).toBe(true);
  });

  it("captures all-cash conservative cash flow while DSCR stays unavailable", () => {
    const input = fixture((next) => {
      next.financing.depositPercent = 100;
    });
    const decision = evaluateDealDecision(input);
    const fields = decisionSnapshotFields(input);
    expect(decision.costs.loanAmount).toBe(0);
    expect(decision.conservative.dscr).toBeNull();
    expect(fields.conservativeMonthlyCashflow).toBe(decision.conservative.monthlyCashflow);
    expect(Number.isFinite(fields.conservativeMonthlyCashflow ?? NaN)).toBe(true);
    const results = analyzeProperty(input);
    expect(Number.isFinite(results.monthlyCashflow) || results.monthlyCashflow === 0).toBe(true);
  });
});

describe("finiteOrNull", () => {
  it("never returns NaN or Infinity", () => {
    expect(finiteOrNull(Number.NaN)).toBeNull();
    expect(finiteOrNull(Number.POSITIVE_INFINITY)).toBeNull();
    expect(finiteOrNull(undefined)).toBeNull();
    expect(finiteOrNull(0)).toBe(0);
  });
});
