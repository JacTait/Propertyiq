import type { DealGrade, DealScore, DealScoreComponent, Recommendation } from "@/lib/types";
import { DEAL_SCORE_WEIGHTS } from "@/lib/constants";
import { clamp } from "@/lib/calculations/ratios";

export interface DealScoreInputs {
  /** Return on invested cash, % */
  roi: number;
  /** Monthly cashflow in currency units */
  monthlyCashflow: number;
  /** Cap rate, % */
  capRate: number;
  /** Debt service coverage ratio (x) */
  dscr: number;
  /** Gross yield, % */
  grossYield: number;
  /** Hard risk flags that can cap the recommendation */
  negativeCashflow?: boolean;
  dscrBelowOne?: boolean;
}

/** Linear interpolation of a metric onto a 0–100 scale. */
function scale(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return value > 0 ? 100 : 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export function scoreRoi(roi: number): number {
  return scale(roi, 0, 15);
}

export function scoreCashflow(monthlyCashflow: number): number {
  return scale(monthlyCashflow, -500, 600);
}

export function scoreCapRate(capRate: number): number {
  return scale(capRate, 2, 10);
}

export function scoreDscr(dscr: number): number {
  return scale(dscr, 0.6, 1.6);
}

export function scoreYield(grossYield: number): number {
  return scale(grossYield, 3, 12);
}

export function gradeForScore(score: number): { grade: DealGrade; label: string } {
  if (score >= 90) return { grade: "elite", label: "Elite Deal" };
  if (score >= 80) return { grade: "excellent", label: "Excellent" };
  if (score >= 70) return { grade: "good", label: "Good" };
  if (score >= 60) return { grade: "average", label: "Average" };
  return { grade: "avoid", label: "Avoid" };
}

export function recommendationForScore(score: number, inputs: DealScoreInputs): Recommendation {
  let rec: Recommendation;
  if (score >= 90) rec = "Elite Opportunity";
  else if (score >= 80) rec = "Strong Buy";
  else if (score >= 70) rec = "Buy";
  else if (score >= 60) rec = "Neutral";
  else if (score >= 45) rec = "High Risk";
  else rec = "Avoid";

  if (inputs.dscrBelowOne && inputs.negativeCashflow) {
    const order: Recommendation[] = [
      "Elite Opportunity",
      "Strong Buy",
      "Buy",
      "Neutral",
      "High Risk",
      "Avoid",
    ];
    const capIndex = order.indexOf("High Risk");
    if (order.indexOf(rec) < capIndex) rec = "High Risk";
  }
  return rec;
}

export function calculateDealScore(inputs: DealScoreInputs): DealScore {
  const components: DealScoreComponent[] = [
    build("roi", "ROI", DEAL_SCORE_WEIGHTS.roi, inputs.roi, scoreRoi(inputs.roi), "Return on cash invested"),
    build(
      "cashflow",
      "Cash Flow",
      DEAL_SCORE_WEIGHTS.cashflow,
      inputs.monthlyCashflow,
      scoreCashflow(inputs.monthlyCashflow),
      "Monthly net cash position",
    ),
    build(
      "capRate",
      "Cap Rate",
      DEAL_SCORE_WEIGHTS.capRate,
      inputs.capRate,
      scoreCapRate(inputs.capRate),
      "Unlevered operating return",
    ),
    build("dscr", "DSCR", DEAL_SCORE_WEIGHTS.dscr, inputs.dscr, scoreDscr(inputs.dscr), "Debt coverage safety margin"),
    build("yield", "Yield", DEAL_SCORE_WEIGHTS.yield, inputs.grossYield, scoreYield(inputs.grossYield), "Gross rental yield"),
  ];

  const score = Math.round(clamp(components.reduce((sum, c) => sum + c.weighted, 0), 0, 100));
  const { grade, label } = gradeForScore(score);
  const recommendation = recommendationForScore(score, inputs);

  return {
    score,
    grade,
    gradeLabel: label,
    recommendation,
    components,
    headline: headlineFor(recommendation),
  };
}

function build(
  key: DealScoreComponent["key"],
  label: string,
  weight: number,
  rawValue: number,
  score: number,
  description: string,
): DealScoreComponent {
  return { key, label, weight, rawValue, score, weighted: score * weight, description };
}

function headlineFor(rec: Recommendation): string {
  switch (rec) {
    case "Elite Opportunity":
      return "Exceptional fundamentals across every metric. Move quickly.";
    case "Strong Buy":
      return "Strong returns with healthy coverage. A compelling acquisition.";
    case "Buy":
      return "Solid performance with manageable risk. Worth pursuing.";
    case "Neutral":
      return "Returns are acceptable but unremarkable. Negotiate harder.";
    case "High Risk":
      return "Thin margins and weak coverage. Proceed only with a clear edge.";
    case "Avoid":
      return "Fundamentals do not support the price. Pass on this deal.";
  }
}
