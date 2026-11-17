import type {
  AnalysisInput,
  CalculationProvenance,
  DealResilienceResults,
  DownsideAnalysisResults,
  MaxOfferTargetInputs,
  RefinanceLimitFactor,
  ResilienceScenarioMetrics,
} from "@/lib/types";
import { calculateDealResilience } from "@/lib/calculations/deal-resilience";
import { calculateDownsideAnalysis } from "@/lib/calculations/downside-analysis";
import { canonicalInvestorTargets } from "@/lib/calculations/offer-inputs";
import { resolveUnderwrittenPrice } from "@/lib/calculations/underwritten-price";

export type SharedScenarioId = "best" | "expected" | "stress" | "worst";
export type SharedScenarioEngine = "resilience" | "downside";

export interface SharedScenarioResult {
  id: SharedScenarioId;
  engine: SharedScenarioEngine;
  label: string;
  monthlyCashflow: number;
  annualCashflow: number;
  dscr: number;
  roi: number;
  cashOnCash: number;
  refinanceViable: boolean;
  provenance: CalculationProvenance;
}

export interface SharedScenarioPack {
  best: SharedScenarioResult;
  expected: SharedScenarioResult;
  stress: SharedScenarioResult;
  /** Downside Analysis bad-year case. Not the Resilience worst shock. */
  worst: SharedScenarioResult;
  /** Resilience-only worst shock. Keep for Resilience scoring display. */
  resilienceWorst: SharedScenarioResult;
  resilience: DealResilienceResults;
  downside: DownsideAnalysisResults;
}

function fromResilience(
  scenario: ResilienceScenarioMetrics,
  id: SharedScenarioId,
  label: string,
  provenance: CalculationProvenance,
): SharedScenarioResult {
  return {
    id,
    engine: "resilience",
    label,
    monthlyCashflow: scenario.monthlyCashflow,
    annualCashflow: scenario.annualCashflow,
    dscr: scenario.dscr,
    roi: scenario.roi,
    cashOnCash: scenario.cashOnCash,
    refinanceViable: scenario.refinanceViable,
    provenance: { ...provenance, scenarioId: id, engine: "deal-resilience" },
  };
}

export function calculateSharedScenarios(
  input: AnalysisInput,
  options: {
    includeSensitivity?: boolean;
    includeDownsideSensitivity?: boolean;
    targets?: MaxOfferTargetInputs | null;
    maximumOffer?: number;
    askingPrice?: number;
    postRefinanceDscr?: number;
    refinanceLoanAmount?: number;
    refinanceLimitingFactor?: RefinanceLimitFactor;
    requiredDscr?: number;
  } = {},
): SharedScenarioPack {
  const underwritten = resolveUnderwrittenPrice(input);
  const canonical = canonicalInvestorTargets(options.targets);
  const resilience = calculateDealResilience(input, { includeSensitivity: options.includeSensitivity });
  const downside = calculateDownsideAnalysis(input, {
    includeSensitivity: options.includeDownsideSensitivity !== false,
    desiredMonthlyCashflow: canonical.targets.desiredMonthlyCashflow,
    maximumOffer: options.maximumOffer,
    askingPrice: options.askingPrice,
    postRefinanceDscr: options.postRefinanceDscr,
    refinanceLoanAmount: options.refinanceLoanAmount,
    refinanceLimitingFactor: options.refinanceLimitingFactor,
    requiredDscr: options.requiredDscr,
  });
  const generatedAt = resilience.generatedAt;
  const provenance: CalculationProvenance = {
    engine: "deal-scenarios",
    underwrittenPriceSource: underwritten.source,
    targetSet: canonical.targets,
    usingDefaultTargets: canonical.usingDefaultTargets,
    generatedAt,
  };

  const pick = (key: ResilienceScenarioMetrics["key"]) =>
    resilience.scenarios.find((item) => item.key === key) ?? resilience.scenarios[0];

  const expected = pick("expected");
  const stress = pick("stress");
  const best = pick("best");
  const resilienceWorst = pick("worst");

  return {
    best: fromResilience(best, "best", "Best Case", provenance),
    expected: fromResilience(expected, "expected", "Expected Case", provenance),
    stress: fromResilience(stress, "stress", "Resilience Stress Case", provenance),
    worst: {
      id: "worst",
      engine: "downside",
      label: "Downside Bad-Year Case",
      monthlyCashflow: downside.worstCase.monthlyCashflow,
      annualCashflow: downside.worstCase.annualCashflow,
      dscr: downside.worstCase.dscr,
      roi: downside.worstCase.roi,
      cashOnCash: downside.worstCase.cashOnCash,
      refinanceViable: (downside.components.find((item) => item.key === "refinance")?.score ?? 0) >= 70,
      provenance: { ...provenance, scenarioId: "worst", engine: "downside-analysis", refinanceScenario: "supported" },
    },
    resilienceWorst: fromResilience(resilienceWorst, "worst", "Resilience Worst Case", provenance),
    resilience,
    downside,
  };
}
