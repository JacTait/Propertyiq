import type {
  AnalysisInput,
  DealSurvivalGrade,
  DealSurvivalTest,
  DealSurvivalVerdict,
  DownsideAnalysisResults,
  DownsideComponentScore,
  DownsideRiskCategory,
  DownsideShocks,
  SensitivityPoint,
} from "@/lib/types";
import { DEFAULT_INVESTOR_TARGETS, DOWNSIDE_SHOCKS, DOWNSIDE_WEIGHTS } from "@/lib/constants";
import { applyResilienceShocks, evaluateDealMetrics } from "@/lib/calculations/deal-resilience";
import { marginFromAnalysis } from "@/lib/calculations/margin-of-safety";
import { clamp } from "@/lib/calculations/ratios";
import { normalizeAnalysisInput } from "@/lib/calculations/rent";
import { validateRefinance } from "@/lib/calculations/refinance";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent } from "@/lib/calculations/rent";

const COMPONENT_LABELS: Record<DownsideRiskCategory, string> = {
  cashflow: "Cashflow Survival",
  dscr: "DSCR Survival",
  margin: "Margin of Safety",
  refinance: "Refinance Viability",
  roi: "ROI Durability",
};

function cloneInput(input: AnalysisInput): AnalysisInput {
  return JSON.parse(JSON.stringify(input)) as AnalysisInput;
}

function finitePrice(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Preserve Infinity (all-cash / infinite BRRRR ROI); map NaN and -Infinity to 0. */
function metricValue(value: number): number {
  if (value === Infinity) return Infinity;
  return Number.isFinite(value) ? value : 0;
}

function roundScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value), 0, 100);
}

export function applyDownsideShocks(input: AnalysisInput): AnalysisInput {
  const next = applyResilienceShocks(input, {
    rentFactor: DOWNSIDE_SHOCKS.rentFactor,
    rehabFactor: DOWNSIDE_SHOCKS.rehabFactor,
    vacancyDelta: DOWNSIDE_SHOCKS.vacancyDelta,
    maintenanceDelta: DOWNSIDE_SHOCKS.maintenanceDelta,
    arvFactor: 1,
  });
  next.expenses.propertyTaxAnnual = Math.max(0, next.expenses.propertyTaxAnnual * DOWNSIDE_SHOCKS.taxFactor);
  next.expenses.insuranceAnnual = Math.max(0, next.expenses.insuranceAnnual * DOWNSIDE_SHOCKS.insuranceFactor);
  return next;
}

export function downsideShocks(): DownsideShocks {
  return {
    rentFactor: DOWNSIDE_SHOCKS.rentFactor,
    rehabFactor: DOWNSIDE_SHOCKS.rehabFactor,
    vacancyDelta: DOWNSIDE_SHOCKS.vacancyDelta,
    maintenanceDelta: DOWNSIDE_SHOCKS.maintenanceDelta,
    taxFactor: DOWNSIDE_SHOCKS.taxFactor,
    insuranceFactor: DOWNSIDE_SHOCKS.insuranceFactor,
  };
}

/**
 * Cashflow Survival Score.
 * Stress cashflow vs desired monthly cashflow. Negative cashflow is always 0.
 */
export function scoreCashflowSurvival(stressCashflow: number, desiredMonthlyCashflow: number): number {
  const cashflow = Number.isFinite(stressCashflow) ? stressCashflow : 0;
  if (cashflow < 0) return 0;
  const target = Number.isFinite(desiredMonthlyCashflow) ? Math.max(0, desiredMonthlyCashflow) : 0;
  if (cashflow >= target) return 100;
  if (target <= 0) return 100;
  const pct = (cashflow / target) * 100;
  if (pct >= 75) return 80;
  if (pct >= 50) return 60;
  if (pct >= 25) return 40;
  if (pct >= 1) return 20;
  return 0;
}

/**
 * DSCR Survival Score from stress-case DSCR.
 * Infinity (no debt service) clears the 1.40x bucket.
 */
export function scoreDscrSurvival(stressDscr: number): number {
  if (stressDscr === Infinity) return 100;
  if (!Number.isFinite(stressDscr) || stressDscr < 1) return 0;
  if (stressDscr >= 1.4) return 100;
  if (stressDscr >= 1.3) return 90;
  if (stressDscr >= 1.25) return 80;
  if (stressDscr >= 1.1) return 50;
  return 25;
}

/**
 * Margin of Safety % = (Maximum Offer − Asking Price) / Maximum Offer × 100.
 * Asking price of 0 is not provided — score 0, no hidden fallback.
 * Maximum offer of 0 cannot be used as a divisor — score 0.
 */
export function marginOfSafetyPercent(maximumOffer: number, askingPrice: number): number | null {
  const max = Number.isFinite(maximumOffer) ? maximumOffer : 0;
  const asking = Number.isFinite(askingPrice) ? askingPrice : 0;
  if (asking <= 0 || max <= 0) return null;
  return ((max - asking) / max) * 100;
}

export function scoreMarginOfSafety(percent: number | null): number {
  if (percent === null || !Number.isFinite(percent) || percent < 0) return 0;
  if (percent >= 20) return 100;
  if (percent >= 15) return 90;
  if (percent >= 10) return 80;
  if (percent >= 5) return 50;
  return 25;
}

/**
 * Refinance Viability Score from post-refinance DSCR.
 * No refinance loan → 0 (do not treat a missing loan as infinite coverage).
 */
export function scoreRefinanceViability(postRefinanceDscr: number, refinanceLoanAmount: number): number {
  if (!Number.isFinite(refinanceLoanAmount) || refinanceLoanAmount <= 0) return 0;
  if (postRefinanceDscr === Infinity) return 100;
  if (!Number.isFinite(postRefinanceDscr) || postRefinanceDscr < 1) return 0;
  if (postRefinanceDscr >= 1.5) return 100;
  if (postRefinanceDscr >= 1.35) return 90;
  if (postRefinanceDscr >= 1.25) return 75;
  if (postRefinanceDscr >= 1.15) return 50;
  return 25;
}

/** ROI Durability Score from stress-case ROI. */
export function scoreRoiDurability(stressRoi: number): number {
  if (stressRoi === Infinity) return 100;
  if (!Number.isFinite(stressRoi) || stressRoi < 5) return 0;
  if (stressRoi >= 15) return 100;
  if (stressRoi >= 12) return 90;
  if (stressRoi >= 10) return 80;
  if (stressRoi >= 8) return 60;
  return 30;
}

export function gradeDealSurvival(score: number): { grade: DealSurvivalGrade; gradeLabel: string } {
  const s = roundScore(score);
  if (s >= 90) return { grade: "very-defensive", gradeLabel: "Very Defensive" };
  if (s >= 80) return { grade: "defensive", gradeLabel: "Defensive" };
  if (s >= 70) return { grade: "acceptable", gradeLabel: "Acceptable" };
  if (s >= 60) return { grade: "exposed", gradeLabel: "Exposed" };
  return { grade: "high-risk", gradeLabel: "High Risk" };
}

export function dealSurvivalTest(stressCashflow: number, stressDscr: number, stressRoi: number): DealSurvivalTest {
  const cashflowPass = Number.isFinite(stressCashflow) && stressCashflow > 0;
  const dscrPass = stressDscr === Infinity || (Number.isFinite(stressDscr) && stressDscr >= 1);
  const roiPass = stressRoi === Infinity || (Number.isFinite(stressRoi) && stressRoi >= 5);
  const failCount = Number(!cashflowPass) + Number(!dscrPass) + Number(!roiPass);
  let verdict: DealSurvivalVerdict;
  let verdictLabel: string;
  if (failCount === 0) {
    verdict = "likely";
    verdictLabel = "Likely To Survive";
  } else if (failCount === 1) {
    verdict = "significant-risk";
    verdictLabel = "Significant Risk";
  } else {
    verdict = "unlikely";
    verdictLabel = "Unlikely To Survive";
  }
  return { cashflowPass, dscrPass, roiPass, failCount, verdict, verdictLabel };
}

export function primaryRiskFromComponents(components: DownsideComponentScore[]): {
  primaryRisk: DownsideRiskCategory;
  primaryRiskLabel: string;
} {
  const lowest = components.reduce((min, component) => (component.score < min.score ? component : min));
  return { primaryRisk: lowest.key, primaryRiskLabel: lowest.label };
}

function cashflowDetail(score: number, cashflow: number, target: number): string {
  if (cashflow < 0) return "Stress-case cashflow is negative.";
  if (target <= 0) return "No cashflow target is set; non-negative stress cashflow scores 100.";
  if (score === 100) return "Stress-case cashflow meets or exceeds the monthly target.";
  if (score === 0) return "Stress-case cashflow is below 1% of the monthly target.";
  const pct = Math.round((cashflow / target) * 100);
  return `Stress-case cashflow is ${clamp(pct, 0, 99)}% of the $${Math.round(target).toLocaleString()}/month target.`;
}

function dscrDetail(score: number, dscr: number): string {
  if (dscr === Infinity) return "No debt service under stress, so DSCR coverage is unlimited.";
  if (score === 100) return "Stress-case DSCR stays at or above 1.40x.";
  if (score === 0) return "Stress-case DSCR falls below 1.00x.";
  return `Stress-case DSCR is ${dscr.toFixed(2)}x.`;
}

function marginDetail(score: number, percent: number | null): string {
  if (percent === null) return "Enter an asking price and a maximum offer to score margin of safety.";
  if (percent < 0) return "Asking price is above the maximum allowable offer.";
  if (score === 100) return "Asking price sits 20% or more below the maximum offer.";
  return `Margin of safety is ${percent.toFixed(1)}% of the maximum offer.`;
}

function refinanceDetail(score: number, dscr: number, loanAmount: number): string {
  if (loanAmount <= 0) return "No refinance loan can be sized from the current ARV and LTV.";
  if (dscr === Infinity) return "Post-refinance debt service is zero.";
  if (score === 100) return "Post-refinance DSCR stays at or above 1.50x.";
  if (score === 0) return "Post-refinance DSCR falls below 1.00x.";
  return `Post-refinance DSCR is ${dscr.toFixed(2)}x.`;
}

function roiDetail(score: number, roi: number): string {
  if (roi === Infinity) return "Stress-case ROI is unlimited on cash left in the deal.";
  if (score === 100) return "Stress-case ROI stays at or above 15%.";
  if (score === 0) return "Stress-case ROI falls below 5%.";
  return `Stress-case ROI is ${roi.toFixed(1)}%.`;
}

function buildAssessment(
  cashflow: number,
  primaryRiskLabel: string,
  primaryRisk: DownsideRiskCategory,
  survival: DealSurvivalTest,
): string {
  const cashflowLine =
    cashflow > 0
      ? "The property remains cashflow positive under stress assumptions."
      : cashflow === 0
        ? "The property breaks even under stress assumptions."
        : "The property turns cashflow negative under stress assumptions.";
  const riskLine = ` ${primaryRiskLabel} is the primary risk factor.`;
  if (survival.verdict === "likely") {
    const tail =
      primaryRisk === "refinance"
        ? " The investment survives a bad-year scenario but has limited refinance flexibility if rents decline."
        : " The investment survives a bad-year scenario.";
    return cashflowLine + riskLine + tail;
  }
  if (survival.verdict === "significant-risk") {
    return cashflowLine + riskLine + " One survival test failed, so a bad year creates significant risk.";
  }
  return cashflowLine + riskLine + " Two or more survival tests failed, so the deal is unlikely to survive a bad year.";
}

function mapSensitivity(
  input: AnalysisInput,
  steps: number[],
  apply: (base: AnalysisInput, step: number) => AnalysisInput,
): SensitivityPoint[] {
  return steps.map((changePercent) => {
    const metrics = evaluateDealMetrics(apply(input, changePercent));
    return {
      changePercent,
      monthlyCashflow: metrics.monthlyCashflow,
      roi: Number.isFinite(metrics.roi) ? metrics.roi : 0,
      dscr: metrics.dscr,
    };
  });
}

export interface DownsideAnalysisOptions {
  includeSensitivity?: boolean;
  desiredMonthlyCashflow?: number;
  maximumOffer?: number;
  askingPrice?: number | null;
  postRefinanceDscr?: number;
  refinanceLoanAmount?: number;
}

export function calculateDownsideAnalysis(
  input: AnalysisInput,
  options: DownsideAnalysisOptions = {},
): DownsideAnalysisResults {
  const includeSensitivity = options.includeSensitivity !== false;
  const base = normalizeAnalysisInput(input);
  const desiredMonthlyCashflow = Math.max(
    0,
    Number.isFinite(options.desiredMonthlyCashflow)
      ? (options.desiredMonthlyCashflow as number)
      : DEFAULT_INVESTOR_TARGETS.desiredMonthlyCashflow,
  );

  const askingPrice =
    options.askingPrice === null
      ? 0
      : finitePrice(options.askingPrice) > 0
        ? finitePrice(options.askingPrice)
        : finitePrice(base.financing.askingPrice);

  const maximumOffer =
    Number.isFinite(options.maximumOffer) && (options.maximumOffer as number) > 0
      ? (options.maximumOffer as number)
      : marginFromAnalysis(base).maximumOffer;

  const shocked = applyDownsideShocks(base);
  const worst = evaluateDealMetrics(shocked);

  const baseRefinance =
    Number.isFinite(options.postRefinanceDscr) && Number.isFinite(options.refinanceLoanAmount)
      ? {
          postRefiDscr: options.postRefinanceDscr as number,
          loanAmount: options.refinanceLoanAmount as number,
        }
      : (() => {
          const results = analyzeProperty(applyActiveRent(base));
          const refinance = validateRefinance(base, results);
          return { postRefiDscr: refinance.postRefiDscr, loanAmount: refinance.loanAmount };
        })();

  const stressCashflow = finiteOrZero(worst.monthlyCashflow);
  const stressDscr = metricValue(worst.dscr);
  const stressRoi = metricValue(worst.roi);
  const postRefinanceDscr = metricValue(baseRefinance.postRefiDscr);
  const refinanceLoanAmount = Math.max(0, finiteOrZero(baseRefinance.loanAmount));
  const mosPercent = marginOfSafetyPercent(maximumOffer, askingPrice);

  const cashflowScore = scoreCashflowSurvival(stressCashflow, desiredMonthlyCashflow);
  const dscrScore = scoreDscrSurvival(stressDscr);
  const marginScore = scoreMarginOfSafety(mosPercent);
  const refinanceScore = scoreRefinanceViability(postRefinanceDscr, refinanceLoanAmount);
  const roiScore = scoreRoiDurability(stressRoi);

  const components: DownsideComponentScore[] = [
    {
      key: "cashflow",
      label: COMPONENT_LABELS.cashflow,
      score: cashflowScore,
      weight: DOWNSIDE_WEIGHTS.cashflow,
      detail: cashflowDetail(cashflowScore, stressCashflow, desiredMonthlyCashflow),
    },
    {
      key: "dscr",
      label: COMPONENT_LABELS.dscr,
      score: dscrScore,
      weight: DOWNSIDE_WEIGHTS.dscr,
      detail: dscrDetail(dscrScore, stressDscr),
    },
    {
      key: "margin",
      label: COMPONENT_LABELS.margin,
      score: marginScore,
      weight: DOWNSIDE_WEIGHTS.margin,
      detail: marginDetail(marginScore, mosPercent),
    },
    {
      key: "refinance",
      label: COMPONENT_LABELS.refinance,
      score: refinanceScore,
      weight: DOWNSIDE_WEIGHTS.refinance,
      detail: refinanceDetail(refinanceScore, postRefinanceDscr, refinanceLoanAmount),
    },
    {
      key: "roi",
      label: COMPONENT_LABELS.roi,
      score: roiScore,
      weight: DOWNSIDE_WEIGHTS.roi,
      detail: roiDetail(roiScore, stressRoi),
    },
  ];

  const score = roundScore(
    cashflowScore * DOWNSIDE_WEIGHTS.cashflow +
      dscrScore * DOWNSIDE_WEIGHTS.dscr +
      marginScore * DOWNSIDE_WEIGHTS.margin +
      refinanceScore * DOWNSIDE_WEIGHTS.refinance +
      roiScore * DOWNSIDE_WEIGHTS.roi,
  );
  const { grade, gradeLabel } = gradeDealSurvival(score);
  const { primaryRisk, primaryRiskLabel } = primaryRiskFromComponents(components);
  const survival = dealSurvivalTest(stressCashflow, stressDscr, stressRoi);

  const rentSteps = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const vacancySteps = [0, 2, 5, 8, 10, 12, 15];
  const rehabSteps = [-10, 0, 10, 15, 20, 30];
  const refinanceSteps = [-10, -5, 0, 5, 10];

  return {
    score,
    grade,
    gradeLabel,
    primaryRisk,
    primaryRiskLabel,
    components,
    worstCase: {
      monthlyCashflow: stressCashflow,
      annualCashflow: finiteOrZero(worst.annualCashflow),
      roi: stressRoi === Infinity ? Infinity : finiteOrZero(stressRoi),
      cashOnCash: finiteOrZero(worst.cashOnCash),
      dscr: stressDscr,
    },
    survival,
    marginOfSafetyPercent: mosPercent ?? 0,
    marginReady: mosPercent !== null,
    desiredMonthlyCashflow,
    postRefinanceDscr,
    shocks: downsideShocks(),
    assessment: buildAssessment(stressCashflow, primaryRiskLabel, primaryRisk, survival),
    rentSensitivity: includeSensitivity
      ? mapSensitivity(base, rentSteps, (src, step) =>
          applyResilienceShocks(src, {
            rentFactor: 1 + step / 100,
            rehabFactor: 1,
            vacancyDelta: 0,
            maintenanceDelta: 0,
            arvFactor: 1,
          }),
        )
      : [],
    vacancySensitivity: includeSensitivity
      ? mapSensitivity(base, vacancySteps, (src, step) =>
          applyResilienceShocks(src, {
            rentFactor: 1,
            rehabFactor: 1,
            vacancyDelta: step,
            maintenanceDelta: 0,
            arvFactor: 1,
          }),
        )
      : [],
    rehabSensitivity: includeSensitivity
      ? mapSensitivity(base, rehabSteps, (src, step) =>
          applyResilienceShocks(src, {
            rentFactor: 1,
            rehabFactor: 1 + step / 100,
            vacancyDelta: 0,
            maintenanceDelta: 0,
            arvFactor: 1,
          }),
        )
      : [],
    refinanceSensitivity: includeSensitivity
      ? refinanceSteps.map((changePercent) => {
          const next = cloneInput(base);
          next.brrrr.refinanceLtv = clamp(next.brrrr.refinanceLtv + changePercent, 0, 100);
          const metrics = evaluateDealMetrics(next);
          return {
            changePercent,
            monthlyCashflow: metrics.monthlyCashflow,
            roi: Number.isFinite(metrics.roi) ? metrics.roi : 0,
            dscr: metrics.postRefiDscr,
          };
        })
      : [],
    generatedAt: new Date().toISOString(),
  };
}
