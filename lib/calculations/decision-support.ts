import type { Formatters } from "@/lib/utils/format";
import type { ScenarioAssumptions } from "@/lib/types";
import type {
  AssumptionCheckItem,
  AssumptionCheckStatus,
  BreakSeverity,
  DealDecisionResult,
  DealScenarioResult,
  ScenarioStatus,
} from "@/lib/calculations/deal-decision";
import { DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE } from "@/lib/calculations/deal-decision";

export const SCENARIO_STATUS_LABEL: Record<ScenarioStatus, "Positive" | "Marginal" | "Negative"> = {
  positive: "Positive",
  marginal: "Marginal",
  negative: "Negative",
};

const SEVERITY_RANK: Record<BreakSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const CHECK_RANK: Record<AssumptionCheckStatus, number> = {
  "high-risk": 0,
  review: 1,
  confirmed: 2,
};

/** Null means inherit the main deal. Explicit 0 is an override. */
export function isInheritedAssumption(value: number | null | undefined): boolean {
  return value === null || value === undefined;
}

export function groupAssumptionChecks(checks: AssumptionCheckItem[]): {
  highRisk: AssumptionCheckItem[];
  review: AssumptionCheckItem[];
  confirmed: AssumptionCheckItem[];
} {
  const sorted = [...checks].sort((a, b) => CHECK_RANK[a.status] - CHECK_RANK[b.status]);
  return {
    highRisk: sorted.filter((item) => item.status === "high-risk"),
    review: sorted.filter((item) => item.status === "review"),
    confirmed: sorted.filter((item) => item.status === "confirmed"),
  };
}

export function assumptionChecksForDisplay(result: DealDecisionResult): AssumptionCheckItem[] {
  const checks = [...result.assumptionChecks];
  const occupancy = result.breakEvens.occupancyPercent;
  if (occupancy !== null && Number.isFinite(occupancy) && occupancy >= 95) {
    checks.push({
      key: "occupancy-tight",
      status: occupancy > 100 ? "high-risk" : "review",
      title: occupancy > 100 ? "Break-even occupancy is above 100%" : "Break-even occupancy is high",
      detail: `This deal requires approximately ${occupancy.toFixed(0)}% occupancy to break even.`,
    });
  }
  return checks;
}

export interface WhatBreaksDisplayItem {
  key: string;
  title: string;
  value: string | null;
  detail: string;
  severity: BreakSeverity;
}

function money(fmt: Formatters, value: number): string {
  return fmt.currency(value, { decimals: 0 });
}

export function presentWhatBreaks(result: DealDecisionResult, fmt: Formatters): WhatBreaksDisplayItem[] {
  const items = result.whatBreaks.map((item) => presentObservation(item.key, result, fmt, item.detail, item.title, item.severity));
  return items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

function presentObservation(
  key: string,
  result: DealDecisionResult,
  fmt: Formatters,
  fallbackDetail: string,
  title: string,
  severity: BreakSeverity,
): WhatBreaksDisplayItem {
  const rent = result.breakEvens.monthlyRent;
  const occupancy = result.breakEvens.occupancyPercent;
  const insurance = result.breakEvens.maxAnnualInsurance;
  const headroom = result.rehabHeadroom.remainingRehabHeadroom;
  const guideline = result.guidelineMaxOffer;
  const stress = result.scenarios.stress.monthlyCashflow;
  const conservative = result.conservative.monthlyCashflow;

  switch (key) {
    case "rent-floor":
      return {
        key,
        title,
        value: rent === null ? null : `${money(fmt, rent)} / mo`,
        detail:
          rent === null
            ? fallbackDetail
            : `Monthly rent below ${money(fmt, rent)} reaches break-even. Conservative rent is ${money(fmt, result.conservative.monthlyRent)}.`,
        severity,
      };
    case "occupancy":
      return {
        key,
        title,
        value: occupancy === null ? null : fmt.percent(occupancy, 1),
        detail:
          occupancy === null
            ? fallbackDetail
            : `The property needs approximately ${fmt.percent(occupancy, 1)} occupancy to break even.`,
        severity,
      };
    case "insurance-cap":
      return {
        key,
        title,
        value: insurance === null ? null : money(fmt, insurance),
        detail:
          insurance === null
            ? DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE
            : `Annual insurance above ${money(fmt, insurance)} pushes cash flow below break-even.`,
        severity,
      };
    case "rehab-overrun":
      return {
        key,
        title,
        value: headroom === null ? null : money(fmt, headroom),
        detail:
          headroom === null
            ? fallbackDetail
            : headroom < 0
              ? `Your current rehab budget exceeds the selected ARV-guideline threshold by ${money(fmt, Math.abs(headroom))}.`
              : fallbackDetail,
        severity,
      };
    case "purchase-vs-guideline":
      return {
        key,
        title,
        value: guideline === null ? null : money(fmt, result.purchasePrice - guideline),
        detail:
          guideline === null
            ? fallbackDetail
            : `Purchase price is ${money(fmt, result.purchasePrice - guideline)} above your configured investor-guideline maximum.`,
        severity,
      };
    case "conservative-negative":
      return {
        key,
        title,
        value: `${conservative < 0 ? "-" : ""}${money(fmt, Math.abs(conservative))} / mo`,
        detail: fallbackDetail,
        severity,
      };
    case "stress-negative":
      return {
        key,
        title,
        value: `-${money(fmt, Math.abs(stress))} / mo`,
        detail: `Stress-case cash flow is negative by ${money(fmt, Math.abs(stress))} per month.`,
        severity,
      };
    default:
      return { key, title, value: null, detail: fallbackDetail, severity };
  }
}

export function scenarioHasMeaningfulAllInPct(scenario: DealScenarioResult): boolean {
  return scenario.allInPctConservativeArv !== null && Number.isFinite(scenario.allInPctConservativeArv);
}

function signedPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Compact inspectable line so Stress vs Conservative differences are visible without opening the editor. */
export function summarizeScenarioAssumptions(assumptions: ScenarioAssumptions): string {
  const parts = [
    `Rent ${signedPercent(assumptions.rentAdjustmentPercent)} vs main`,
    `Rehab ${signedPercent(assumptions.rehabOverrunPercent)} vs main`,
    `ARV ${signedPercent(assumptions.arvAdjustmentPercent)} vs main`,
    isInheritedAssumption(assumptions.vacancyPercent)
      ? "Vacancy inherited"
      : `Vacancy ${assumptions.vacancyPercent}% override`,
    isInheritedAssumption(assumptions.annualInsurance)
      ? "Insurance inherited"
      : `Insurance ${assumptions.annualInsurance} override`,
    isInheritedAssumption(assumptions.maintenancePercent)
      ? "Maintenance inherited"
      : `Maintenance ${assumptions.maintenancePercent}% override`,
    isInheritedAssumption(assumptions.capexPercent) ? "CapEx inherited" : `CapEx ${assumptions.capexPercent}% override`,
  ];
  return parts.join(" · ");
}
