import type { AssumptionCheckItem, DealDecisionResult } from "@/lib/calculations/deal-decision";
import {
  assumptionChecksForDisplay,
  groupAssumptionChecks,
  presentWhatBreaks,
  type WhatBreaksDisplayItem,
} from "@/lib/calculations/decision-support";
import { finiteOrNull } from "@/lib/calculations/portfolio-snapshot";
import type { Formatters } from "@/lib/utils/format";

export interface ReportPrimaryMetrics {
  allInCost: number | null;
  allInPctConservativeArv: number | null;
  conservativeMonthlyCashflow: number | null;
  stressMonthlyCashflow: number | null;
  guidelineMaxOffer: number | null;
  marginLabel: string;
  marginExplanation: string;
  allCash: boolean;
  dscr: number | null;
  conservativeArv: number | null;
}

export function reportPrimaryMetrics(decision: DealDecisionResult): ReportPrimaryMetrics {
  const purchase = finiteOrNull(decision.costs.purchasePrice) ?? 0;
  const loan = finiteOrNull(decision.costs.loanAmount) ?? 0;
  return {
    allInCost: finiteOrNull(decision.costs.allInCost),
    allInPctConservativeArv: finiteOrNull(decision.costs.allInPctConservativeArv),
    conservativeMonthlyCashflow: finiteOrNull(decision.conservative.monthlyCashflow),
    stressMonthlyCashflow: finiteOrNull(decision.scenarios.stress.monthlyCashflow),
    guidelineMaxOffer: finiteOrNull(decision.guidelineMaxOffer),
    marginLabel: decision.marginForError.label,
    marginExplanation: decision.marginForError.explanation,
    allCash: loan === 0 && purchase > 0,
    dscr: finiteOrNull(decision.conservative.dscr),
    conservativeArv: decision.conservativeArv > 0 ? decision.conservativeArv : null,
  };
}

export function reportAssumptionIssues(decision: DealDecisionResult): AssumptionCheckItem[] {
  const grouped = groupAssumptionChecks(assumptionChecksForDisplay(decision));
  return [...grouped.highRisk, ...grouped.review];
}

export function reportWhatBreaks(decision: DealDecisionResult, fmt: Formatters): WhatBreaksDisplayItem[] {
  return presentWhatBreaks(decision, fmt).filter((item) => item.severity !== "info");
}

export function reportHasInvalidNumber(metrics: ReportPrimaryMetrics): boolean {
  const values = [
    metrics.allInCost,
    metrics.allInPctConservativeArv,
    metrics.conservativeMonthlyCashflow,
    metrics.stressMonthlyCashflow,
    metrics.guidelineMaxOffer,
    metrics.dscr,
  ];
  return values.some((value) => value !== null && (!Number.isFinite(value) || Number.isNaN(value)));
}
