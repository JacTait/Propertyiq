import type { AnalysisInput, PortfolioSnapshot } from "@/lib/types";
import { evaluateDealDecision, type DealDecisionResult } from "@/lib/calculations/deal-decision";

export type DecisionSnapshotFields = Pick<
  PortfolioSnapshot,
  "allInCost" | "conservativeMonthlyCashflow" | "stressMonthlyCashflow" | "guidelineMaxOffer" | "marginForErrorLabel"
>;

export function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function snapshotFieldsFromDecision(decision: DealDecisionResult): DecisionSnapshotFields {
  return {
    allInCost: finiteOrNull(decision.costs.allInCost),
    conservativeMonthlyCashflow: finiteOrNull(decision.conservative.monthlyCashflow),
    stressMonthlyCashflow: finiteOrNull(decision.scenarios.stress.monthlyCashflow),
    guidelineMaxOffer: finiteOrNull(decision.guidelineMaxOffer),
    marginForErrorLabel: decision.marginForError.label,
  };
}

/** Decision fields for a newly saved or resaved portfolio item. Always derived from evaluateDealDecision. */
export function decisionSnapshotFields(input: AnalysisInput): DecisionSnapshotFields {
  return snapshotFieldsFromDecision(evaluateDealDecision(input));
}

export function readDecisionSnapshot(snapshot: PortfolioSnapshot): {
  allInCost: number | null;
  conservativeMonthlyCashflow: number | null;
  stressMonthlyCashflow: number | null;
  guidelineMaxOffer: number | null;
  marginForErrorLabel: string | null;
} {
  return {
    allInCost: finiteOrNull(snapshot.allInCost),
    conservativeMonthlyCashflow: finiteOrNull(snapshot.conservativeMonthlyCashflow),
    stressMonthlyCashflow: finiteOrNull(snapshot.stressMonthlyCashflow),
    guidelineMaxOffer: finiteOrNull(snapshot.guidelineMaxOffer),
    marginForErrorLabel: snapshot.marginForErrorLabel?.trim() ? snapshot.marginForErrorLabel : null,
  };
}
