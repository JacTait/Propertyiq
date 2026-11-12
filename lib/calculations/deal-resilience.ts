import type {
  AnalysisInput,
  DealResilienceResults,
  RehabSensitivityPoint,
  ResilienceComponentScore,
  ResilienceGrade,
  ResilienceScenarioKey,
  ResilienceScenarioMetrics,
  ResilienceShocks,
  SensitivityPoint,
} from "@/lib/types";
import { RESILIENCE_SHOCKS, RESILIENCE_WEIGHTS } from "@/lib/constants";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent, normalizeAnalysisInput } from "@/lib/calculations/rent";
import { clamp } from "@/lib/calculations/ratios";
import { validateRefinance } from "@/lib/calculations/refinance";
import {
  acquisitionFees,
  maximumTotalRehabBudget,
  remainingRehabHeadroom,
  totalHoldingCost,
  totalRehabBudget,
} from "@/lib/calculations/deal-decision";

const SCENARIO_LABELS: Record<ResilienceScenarioKey, string> = {
  best: "Best Case",
  expected: "Expected Case",
  stress: "Stress Case",
  worst: "Worst Case",
};

function cloneInput(input: AnalysisInput): AnalysisInput {
  return JSON.parse(JSON.stringify(input)) as AnalysisInput;
}

export function applyResilienceShocks(input: AnalysisInput, shocks: ResilienceShocks): AnalysisInput {
  const next = cloneInput(normalizeAnalysisInput(input));
  next.income.monthlyRent = Math.max(0, next.income.monthlyRent * shocks.rentFactor);
  next.income.verifiedRent = Math.max(0, next.income.verifiedRent * shocks.rentFactor);
  next.income.conservativeRent = Math.max(0, next.income.conservativeRent * shocks.rentFactor);
  next.brrrr.expectedRent = Math.max(0, next.brrrr.expectedRent * shocks.rentFactor);
  next.income.nightlyRate = Math.max(0, next.income.nightlyRate * shocks.rentFactor);
  next.brrrr.rehabCost = Math.max(0, next.brrrr.rehabCost * shocks.rehabFactor);
  next.flip.renovationBudget = Math.max(0, next.flip.renovationBudget * shocks.rehabFactor);
  next.expenses.vacancyPercent = clamp(next.expenses.vacancyPercent + shocks.vacancyDelta, 0, 80);
  next.expenses.maintenancePercent = clamp(next.expenses.maintenancePercent + shocks.maintenanceDelta, 0, 50);
  next.brrrr.afterRepairValue = Math.max(0, next.brrrr.afterRepairValue * shocks.arvFactor);
  next.flip.expectedSalePrice = Math.max(0, next.flip.expectedSalePrice * shocks.arvFactor);
  return next;
}

export interface DealPhaseMetrics {
  /** Pre-refinance monthly cash flow (NOI − acquisition P&I) / 12. */
  monthlyCashflow: number;
  annualCashflow: number;
  roi: number;
  cashOnCash: number;
  /** Pre-refinance DSCR. Same debt service as `monthlyCashflow`. */
  dscr: number;
  capRate: number;
  refinanceViable: boolean;
  preRefiMonthlyCashflow: number;
  postRefiMonthlyCashflow: number;
  preRefiDscr: number;
  postRefiDscr: number;
  refinanceLoanAmount: number;
}

export function evaluateDealMetrics(input: AnalysisInput): DealPhaseMetrics {
  const results = analyzeProperty(applyActiveRent(input));
  const refinance = validateRefinance(input, results, {
    arvFactor: 1,
    rentFactor: 1,
  });
  const roi = results.roi === Infinity ? Infinity : Number.isFinite(results.roi) ? results.roi : 0;
  const preRefiMonthlyCashflow = results.monthlyCashflow;
  const preRefiDscr = results.dscr;
  return {
    monthlyCashflow: preRefiMonthlyCashflow,
    annualCashflow: results.annualCashflow,
    roi,
    cashOnCash: results.cashOnCash,
    dscr: preRefiDscr,
    capRate: results.capRate,
    refinanceViable: refinance.viable,
    preRefiMonthlyCashflow,
    postRefiMonthlyCashflow: refinance.postRefiMonthlyCashflow,
    preRefiDscr,
    postRefiDscr: refinance.postRefiDscr,
    refinanceLoanAmount: refinance.loanAmount,
  };
}

function scenarioMetrics(input: AnalysisInput, key: ResilienceScenarioKey): ResilienceScenarioMetrics {
  const shocks = RESILIENCE_SHOCKS[key];
  const shocked = applyResilienceShocks(input, shocks);
  const metrics = evaluateDealMetrics(shocked);
  return {
    key,
    label: SCENARIO_LABELS[key],
    shocks,
    monthlyCashflow: metrics.preRefiMonthlyCashflow,
    annualCashflow: metrics.annualCashflow,
    roi: Number.isFinite(metrics.roi) ? metrics.roi : 0,
    cashOnCash: metrics.cashOnCash,
    dscr: metrics.preRefiDscr,
    capRate: metrics.capRate,
    refinanceViable: metrics.refinanceViable,
    preRefiMonthlyCashflow: metrics.preRefiMonthlyCashflow,
    postRefiMonthlyCashflow: metrics.postRefiMonthlyCashflow,
    preRefiDscr: metrics.preRefiDscr,
    postRefiDscr: metrics.postRefiDscr,
  };
}

function scoreCashflow(stress: ResilienceScenarioMetrics, worst: ResilienceScenarioMetrics): { score: number; detail: string } {
  let score = 0;
  const stressCf = Math.round(stress.monthlyCashflow);
  const worstCf = Math.round(worst.monthlyCashflow);
  if (stressCf >= 200) score += 55;
  else if (stressCf >= 0) score += 40;
  else if (stressCf >= -200) score += 18;
  if (worstCf >= 0) score += 45;
  else if (worstCf >= -250) score += 20;
  const detail =
    stress.monthlyCashflow >= 0
      ? "Cashflow stays non-negative under the stress case."
      : "Cashflow turns negative under the stress case.";
  return { score: clamp(score, 0, 100), detail };
}

function scoreRoi(stress: ResilienceScenarioMetrics, worst: ResilienceScenarioMetrics): { score: number; detail: string } {
  let score = 0;
  if (stress.roi >= 10) score += 55;
  else if (stress.roi >= 6) score += 42;
  else if (stress.roi >= 0) score += 22;
  if (worst.roi >= 6) score += 45;
  else if (worst.roi >= 0) score += 22;
  const detail =
    stress.roi >= 6
      ? "ROI survives the stress haircut above a 6% floor."
      : "ROI falls below a 6% floor once assumptions are stressed.";
  return { score: clamp(score, 0, 100), detail };
}

function scoreDscr(stress: ResilienceScenarioMetrics, worst: ResilienceScenarioMetrics): { score: number; detail: string } {
  const stressDscr = Number.isFinite(stress.dscr) ? stress.dscr : Infinity;
  const worstDscr = Number.isFinite(worst.dscr) ? worst.dscr : Infinity;
  let score = 0;
  if (stressDscr >= 1.25) score += 55;
  else if (stressDscr >= 1) score += 38;
  else if (stressDscr >= 0.85) score += 16;
  if (worstDscr >= 1) score += 45;
  else if (worstDscr >= 0.85) score += 18;
  const detail =
    stressDscr >= 1.25
      ? "DSCR stays above 1.25x under stress."
      : stressDscr >= 1
        ? "DSCR covers debt under stress but sits below 1.25x."
        : "DSCR drops below 1.0x under stress conditions.";
  return { score: clamp(score, 0, 100), detail };
}

function scoreRefinance(stress: ResilienceScenarioMetrics, worst: ResilienceScenarioMetrics): { score: number; detail: string } {
  let score = 0;
  if (stress.refinanceViable) score += 60;
  if (worst.refinanceViable) score += 40;
  else if (stress.refinanceViable) score += 15;
  const detail = stress.refinanceViable
    ? "Refinance still appears viable after the stress haircut."
    : "Refinance viability weakens once ARV, rent and carry are stressed.";
  return { score: clamp(score, 0, 100), detail };
}

function gradeFor(score: number): { grade: ResilienceGrade; gradeLabel: string } {
  if (score >= 90) return { grade: "very-resilient", gradeLabel: "Very Resilient" };
  if (score >= 80) return { grade: "resilient", gradeLabel: "Resilient" };
  if (score >= 70) return { grade: "acceptable", gradeLabel: "Acceptable" };
  if (score >= 60) return { grade: "fragile", gradeLabel: "Fragile" };
  return { grade: "high-risk", gradeLabel: "High Risk" };
}

export function mapRehabCapitalSensitivity(input: AnalysisInput, steps: number[]): RehabSensitivityPoint[] {
  return steps.map((changePercent) => {
    const next = applyResilienceShocks(input, {
      rentFactor: 1,
      rehabFactor: 1 + changePercent / 100,
      vacancyDelta: 0,
      maintenanceDelta: 0,
      arvFactor: 1,
    });
    const rehab = next.strategy === "fix-flip" ? next.flip.renovationBudget : next.brrrr.rehabCost;
    const totalRehab = totalRehabBudget(rehab, next.decision.rehabContingencyPercent);
    const holding = totalHoldingCost(next.flip.holdingCostsMonthly, next.flip.holdDurationMonths);
    const fees = acquisitionFees(next.financing);
    const deposit = (next.financing.purchasePrice * next.financing.depositPercent) / 100;
    const totalCashInvested = Math.max(0, deposit + fees + totalRehab + holding);
    const maxBudget = maximumTotalRehabBudget({
      conservativeArv: next.decision.conservativeArv,
      targetArvPercent: next.decision.targetArvPercent,
      purchasePrice: next.financing.purchasePrice,
    });
    return {
      changePercent,
      rehabCost: totalRehab,
      totalCashInvested,
      remainingRehabHeadroom: remainingRehabHeadroom(maxBudget, totalRehab),
    };
  });
}

function sensitivity(
  input: AnalysisInput,
  apply: (base: AnalysisInput, factor: number) => AnalysisInput,
  steps: number[],
): SensitivityPoint[] {
  return steps.map((changePercent) => {
    const factor = 1 + changePercent / 100;
    const results = analyzeProperty(applyActiveRent(apply(input, factor)));
    return {
      changePercent,
      monthlyCashflow: results.monthlyCashflow,
      roi: Number.isFinite(results.roi) ? results.roi : 0,
      dscr: results.dscr,
    };
  });
}

export function calculateDealResilience(
  input: AnalysisInput,
  options: { includeSensitivity?: boolean } = {},
): DealResilienceResults {
  const includeSensitivity = options.includeSensitivity !== false;
  const base = normalizeAnalysisInput(input);
  const keys: ResilienceScenarioKey[] = ["best", "expected", "stress", "worst"];
  const scenarios = keys.map((key) => scenarioMetrics(base, key));
  const stress = scenarios.find((s) => s.key === "stress") ?? scenarios[2];
  const worst = scenarios.find((s) => s.key === "worst") ?? scenarios[3];

  const cashflow = scoreCashflow(stress, worst);
  const roi = scoreRoi(stress, worst);
  const dscr = scoreDscr(stress, worst);
  const refinance = scoreRefinance(stress, worst);

  const components: ResilienceComponentScore[] = [
    { key: "cashflow", label: "Cashflow survival", score: cashflow.score, weight: RESILIENCE_WEIGHTS.cashflow, detail: cashflow.detail },
    { key: "roi", label: "ROI survival", score: roi.score, weight: RESILIENCE_WEIGHTS.roi, detail: roi.detail },
    { key: "dscr", label: "DSCR survival", score: dscr.score, weight: RESILIENCE_WEIGHTS.dscr, detail: dscr.detail },
    { key: "refinance", label: "Refinance viability", score: refinance.score, weight: RESILIENCE_WEIGHTS.refinance, detail: refinance.detail },
  ];

  const score = Math.round(
    components.reduce((sum, c) => sum + c.score * c.weight, 0),
  );
  const { grade, gradeLabel } = gradeFor(score);

  const rentSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const rehabSteps = [-20, -10, 0, 10, 15, 20, 30];

  return {
    score: clamp(score, 0, 100),
    grade,
    gradeLabel,
    scenarios,
    components,
    rentSensitivity: includeSensitivity
      ? sensitivity(base, (src, factor) => applyResilienceShocks(src, {
          rentFactor: factor,
          rehabFactor: 1,
          vacancyDelta: 0,
          maintenanceDelta: 0,
          arvFactor: 1,
        }), rentSteps)
      : [],
    rehabSensitivity: includeSensitivity ? mapRehabCapitalSensitivity(base, rehabSteps) : [],
    generatedAt: new Date().toISOString(),
  };
}
