import type {
  AnalysisInput,
  DealSurvivalGrade,
  DealSurvivalTest,
  DealSurvivalVerdict,
  DownsideAnalysisResults,
  DownsideComponentScore,
  DownsideRiskCategory,
  DownsideShocks,
  RefinanceLimitFactor,
  SensitivityPoint,
} from "@/lib/types";
import {
  DEAL_SURVIVAL_CATEGORY_COPY,
  DEAL_SURVIVAL_GRADE_BANDS,
  DEFAULT_INVESTOR_TARGETS,
  DEFAULT_REFINANCE_DSCR,
  DOWNSIDE_SHOCKS,
  DOWNSIDE_WEIGHTS,
} from "@/lib/constants";
import { applyResilienceShocks, evaluateDealMetrics, mapRehabCapitalSensitivity } from "@/lib/calculations/deal-resilience";
import { marginFromAnalysis } from "@/lib/calculations/margin-of-safety";
import { clamp } from "@/lib/calculations/ratios";
import { applyActiveRent, normalizeAnalysisInput } from "@/lib/calculations/rent";
import { resolveArv, sizeSupportedRefinance } from "@/lib/calculations/refinance";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { resolveUnderwrittenPrice } from "@/lib/calculations/underwritten-price";

const COMPONENT_LABELS: Record<DownsideRiskCategory, string> = {
  cashflow: DEAL_SURVIVAL_CATEGORY_COPY.cashflow.label,
  dscr: DEAL_SURVIVAL_CATEGORY_COPY.dscr.label,
  margin: DEAL_SURVIVAL_CATEGORY_COPY.margin.label,
  refinance: DEAL_SURVIVAL_CATEGORY_COPY.refinance.label,
  roi: DEAL_SURVIVAL_CATEGORY_COPY.roi.label,
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
 * Margin of Safety % = (Maximum Offer − UnderwrittenPrice) / Maximum Offer × 100.
 * A price of 0 is not provided — score 0, no hidden fallback.
 * Maximum offer of 0 cannot be used as a divisor — score 0.
 */
export function marginOfSafetyPercent(maximumOffer: number, underwrittenPrice: number): number | null {
  const max = Number.isFinite(maximumOffer) ? maximumOffer : 0;
  const price = Number.isFinite(underwrittenPrice) ? underwrittenPrice : 0;
  if (price <= 0 || max <= 0) return null;
  return ((max - price) / max) * 100;
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
  const band = DEAL_SURVIVAL_GRADE_BANDS.find((item) => s >= item.min) ?? DEAL_SURVIVAL_GRADE_BANDS[DEAL_SURVIVAL_GRADE_BANDS.length - 1];
  return { grade: band.grade, gradeLabel: band.gradeLabel };
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
  if (percent === null) {
    return "Enter an asking price, proposed offer, or purchase price to calculate margin of safety.";
  }
  if (percent < 0) return "The price currently being underwritten is above the maximum allowable offer.";
  if (score === 100) return "Underwritten price sits 20% or more below the maximum offer.";
  return `Margin of safety is ${percent.toFixed(1)}% of the maximum offer.`;
}

function refinanceDetail(
  score: number,
  dscr: number,
  loanAmount: number,
  limitingFactor: RefinanceLimitFactor,
  requiredDscr: number,
): string {
  if (loanAmount <= 0) return "No refinance loan can be sized from the current ARV and LTV.";
  const meetsRequired = dscr === Infinity || (Number.isFinite(dscr) && dscr + 1e-6 >= requiredDscr);
  if (limitingFactor === "dscr" && meetsRequired && score > 0) {
    return "Refinance Viable — DSCR Limited";
  }
  if (dscr === Infinity) return "Post-refinance debt service is zero.";
  if (score === 100) return "Post-refinance DSCR stays at or above 1.50x.";
  if (score === 0) return "Post-refinance DSCR falls below 1.00x.";
  return `Post-refinance DSCR is ${dscr.toFixed(2)}x.`;
}

function supportedRefinanceFromInput(input: AnalysisInput): {
  postRefiDscr: number;
  loanAmount: number;
  limitingFactor: RefinanceLimitFactor;
  requiredDscr: number;
} {
  const requiredDscr = input.brrrr.refinanceDscrMin > 0 ? input.brrrr.refinanceDscrMin : DEFAULT_REFINANCE_DSCR;
  const results = analyzeProperty(applyActiveRent(input));
  const sized = sizeSupportedRefinance({
    arv: resolveArv(input),
    refinanceLtv: clamp(input.brrrr.refinanceLtv || 75, 0, 100),
    interestRate: input.brrrr.refinanceRate || input.financing.interestRate,
    termYears: input.brrrr.refinanceTermYears || input.financing.termYears,
    requiredDscr,
    monthlyNoi: results.noi / 12,
  });
  return {
    postRefiDscr: sized.postRefiDscr === null ? 0 : sized.postRefiDscr,
    loanAmount: sized.supportedRefinanceLoan,
    limitingFactor: sized.limitingFactor,
    requiredDscr,
  };
}

function roiDetail(score: number, roi: number): string {
  if (roi === Infinity) return "Stress-case ROI is unlimited on cash left in the deal.";
  if (score === 100) return "Stress-case ROI stays at or above 15%.";
  if (score === 0) return "Stress-case ROI falls below 5%.";
  return `Stress-case ROI is ${roi.toFixed(1)}%.`;
}

function signedAssessmentCashflow(value: number): string {
  const amount = Math.round(Math.abs(value)).toLocaleString("en-US");
  return `${value >= 0 ? "+" : "-"}$${amount}`;
}

function buildAssessment(
  cashflow: number,
  primaryRiskLabel: string,
  primaryRisk: DownsideRiskCategory,
  survival: DealSurvivalTest,
): string {
  const cashflowLine =
    cashflow > 0
      ? `The deal remains cash-flow positive under the more severe bad-year Downside case (${signedAssessmentCashflow(cashflow)}/month).`
      : cashflow === 0
        ? "The deal breaks even under the more severe bad-year Downside case."
        : `The deal becomes cash-flow negative under the more severe bad-year Downside case (${signedAssessmentCashflow(cashflow)}/month).`;
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
      monthlyCashflow: metrics.preRefiMonthlyCashflow,
      roi: Number.isFinite(metrics.roi) ? metrics.roi : 0,
      dscr: metrics.preRefiDscr,
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
  refinanceLimitingFactor?: RefinanceLimitFactor;
  requiredDscr?: number;
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

  const underwritten = resolveUnderwrittenPrice(base);
  const comparisonPrice =
    options.askingPrice === null
      ? 0
      : finitePrice(options.askingPrice) > 0
        ? finitePrice(options.askingPrice)
        : underwritten.value ?? 0;

  const maximumOffer =
    Number.isFinite(options.maximumOffer) && (options.maximumOffer as number) > 0
      ? (options.maximumOffer as number)
      : marginFromAnalysis(base).maximumOffer;

  const shocked = applyDownsideShocks(base);
  const worst = evaluateDealMetrics(shocked);

  const sizedRefinance = supportedRefinanceFromInput(base);
  const baseRefinance =
    Number.isFinite(options.postRefinanceDscr) && Number.isFinite(options.refinanceLoanAmount)
      ? {
          postRefiDscr: options.postRefinanceDscr as number,
          loanAmount: options.refinanceLoanAmount as number,
          limitingFactor: options.refinanceLimitingFactor ?? sizedRefinance.limitingFactor,
          requiredDscr: options.requiredDscr ?? sizedRefinance.requiredDscr,
        }
      : sizedRefinance;

  const stressCashflow = finiteOrZero(worst.preRefiMonthlyCashflow);
  const stressDscr = metricValue(worst.preRefiDscr);
  const stressRoi = metricValue(worst.roi);
  const postRefinanceDscr = metricValue(baseRefinance.postRefiDscr);
  const refinanceLoanAmount = Math.max(0, finiteOrZero(baseRefinance.loanAmount));
  const mosPercent = marginOfSafetyPercent(maximumOffer, comparisonPrice);

  const cashflowScore = scoreCashflowSurvival(stressCashflow, desiredMonthlyCashflow);
  const dscrScore = scoreDscrSurvival(stressDscr);
  const marginScore = scoreMarginOfSafety(mosPercent);
  const limitingFactor = baseRefinance.limitingFactor;
  const requiredDscr = baseRefinance.requiredDscr;
  const scoredRefinanceDscr =
    limitingFactor === "dscr" &&
    Number.isFinite(postRefinanceDscr) &&
    postRefinanceDscr + 1e-6 >= requiredDscr
      ? Math.max(postRefinanceDscr, requiredDscr)
      : postRefinanceDscr;
  const refinanceScore = scoreRefinanceViability(scoredRefinanceDscr, refinanceLoanAmount);
  const roiScore = scoreRoiDurability(stressRoi);

  const components: DownsideComponentScore[] = [
    {
      key: "cashflow",
      label: COMPONENT_LABELS.cashflow,
      score: cashflowScore,
      weight: DOWNSIDE_WEIGHTS.cashflow,
      detail: cashflowDetail(cashflowScore, stressCashflow, desiredMonthlyCashflow),
      rawInput: `${Math.round(stressCashflow)}/mo stress cashflow`,
      threshold: `${Math.round(desiredMonthlyCashflow)}/mo target`,
      contribution: cashflowScore * DOWNSIDE_WEIGHTS.cashflow,
    },
    {
      key: "dscr",
      label: COMPONENT_LABELS.dscr,
      score: dscrScore,
      weight: DOWNSIDE_WEIGHTS.dscr,
      detail: dscrDetail(dscrScore, stressDscr),
      rawInput: stressDscr === Infinity ? "Unlimited DSCR" : `${stressDscr.toFixed(2)}x stress DSCR`,
      threshold: "1.00x pass / 1.40x full score",
      contribution: dscrScore * DOWNSIDE_WEIGHTS.dscr,
    },
    {
      key: "margin",
      label: COMPONENT_LABELS.margin,
      score: marginScore,
      weight: DOWNSIDE_WEIGHTS.margin,
      detail: marginDetail(marginScore, mosPercent),
      rawInput: mosPercent === null ? "No underwritten price" : `${mosPercent.toFixed(1)}% margin of safety`,
      threshold: "20% for full score",
      contribution: marginScore * DOWNSIDE_WEIGHTS.margin,
    },
    {
      key: "refinance",
      label: COMPONENT_LABELS.refinance,
      score: refinanceScore,
      weight: DOWNSIDE_WEIGHTS.refinance,
      detail: refinanceDetail(refinanceScore, scoredRefinanceDscr, refinanceLoanAmount, limitingFactor, requiredDscr),
      rawInput: `${Number.isFinite(scoredRefinanceDscr) ? scoredRefinanceDscr.toFixed(2) : "n/a"}x DSCR, $${Math.round(refinanceLoanAmount).toLocaleString("en-US")} supported loan`,
      threshold: `${requiredDscr.toFixed(2)}x required DSCR`,
      contribution: refinanceScore * DOWNSIDE_WEIGHTS.refinance,
    },
    {
      key: "roi",
      label: COMPONENT_LABELS.roi,
      score: roiScore,
      weight: DOWNSIDE_WEIGHTS.roi,
      detail: roiDetail(roiScore, stressRoi),
      rawInput: stressRoi === Infinity ? "Unlimited stress ROI" : `${stressRoi.toFixed(1)}% stress ROI`,
      threshold: "5% pass / 15% full score",
      contribution: roiScore * DOWNSIDE_WEIGHTS.roi,
    },
  ];

  const score = roundScore(components.reduce((sum, component) => sum + component.contribution, 0));
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
    rehabSensitivity: includeSensitivity ? mapRehabCapitalSensitivity(base, rehabSteps) : [],
    refinanceSensitivity: includeSensitivity
      ? refinanceSteps.map((changePercent) => {
          const next = cloneInput(base);
          next.brrrr.refinanceLtv = clamp(next.brrrr.refinanceLtv + changePercent, 0, 100);
          const metrics = evaluateDealMetrics(next);
          return {
            changePercent,
            monthlyCashflow: metrics.postRefiMonthlyCashflow,
            roi: Number.isFinite(metrics.roi) ? metrics.roi : 0,
            dscr: metrics.postRefiDscr,
          };
        })
      : [],
    generatedAt: new Date().toISOString(),
  };
}
