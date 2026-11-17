import type { AnalysisInput, AnalysisResults, BuyBoxProfile, MaxOfferTargetInputs, UnderwritingPack } from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent, normalizeAnalysisInput, resolveRent } from "@/lib/calculations/rent";
import { matchBuyBox, subjectFromAnalysis } from "@/lib/calculations/buy-box";
import { validateRefinance } from "@/lib/calculations/refinance";
import { collectDealKillers } from "@/lib/calculations/deal-killers";
import { generateUnderwritingSummary } from "@/lib/calculations/underwriting-summary";
import { sizeSupportedRefinance, resolveArv } from "@/lib/calculations/refinance";
import { analyzeOffer } from "@/lib/calculations/offer-analysis";
import { calculateSharedScenarios } from "@/lib/calculations/deal-scenarios";
import { calculateMarginOfSafety } from "@/lib/calculations/margin-of-safety";
import { resolveUnderwrittenPrice, toCurrentDealPrice } from "@/lib/calculations/underwritten-price";
import { clamp } from "@/lib/calculations/ratios";
import { DEFAULT_REFINANCE_DSCR } from "@/lib/constants";

export function analyzeWithRent(input: AnalysisInput): AnalysisResults {
  return analyzeProperty(applyActiveRent(normalizeAnalysisInput(input)));
}

export function underwriteDeal(
  input: AnalysisInput,
  results: AnalysisResults,
  buyBox: BuyBoxProfile | null | undefined,
  options: {
    includeSensitivity?: boolean;
    includeDownsideSensitivity?: boolean;
    desiredMonthlyCashflow?: number;
    marginPrice?: number | null;
    marginOffers?: { recommendedOffer: number; maximumOffer: number } | null;
    targets?: MaxOfferTargetInputs | null;
  } = {},
): UnderwritingPack {
  const normalized = normalizeAnalysisInput(input);
  const rent = resolveRent(normalized);
  const buyBoxMatch = matchBuyBox(buyBox, subjectFromAnalysis(normalized));
  const refinance = validateRefinance(normalized, results);
  const offer = analyzeOffer(normalized, options.targets);
  const resolvedPrice = toCurrentDealPrice(resolveUnderwrittenPrice(normalized));
  const overridePrice =
    typeof options.marginPrice === "number" && Number.isFinite(options.marginPrice) && options.marginPrice > 0
      ? options.marginPrice
      : 0;
  const current =
    overridePrice > 0 ? { price: overridePrice, source: "asking" as const, label: "Current Asking Price" } : resolvedPrice;
  const recommended = options.marginOffers?.recommendedOffer ?? offer.recommendedOffer;
  const maximum = options.marginOffers?.maximumOffer ?? offer.maximumOffer;
  const margin = calculateMarginOfSafety(
    current,
    recommended,
    maximum,
    options.marginOffers ? "supplied" : offer.usingDefaultTargets ? "reconstructed-default-targets" : "shared-targets",
  );
  const requiredDscr =
    normalized.brrrr.refinanceDscrMin > 0 ? normalized.brrrr.refinanceDscrMin : DEFAULT_REFINANCE_DSCR;
  const sized = sizeSupportedRefinance({
    arv: resolveArv(normalized),
    refinanceLtv: clamp(normalized.brrrr.refinanceLtv || 75, 0, 100),
    interestRate: normalized.brrrr.refinanceRate || normalized.financing.interestRate,
    termYears: normalized.brrrr.refinanceTermYears || normalized.financing.termYears,
    requiredDscr,
    monthlyNoi: results.noi / 12,
  });
  const scenarios = calculateSharedScenarios(normalized, {
    includeSensitivity: options.includeSensitivity,
    includeDownsideSensitivity: options.includeDownsideSensitivity,
    targets: options.targets,
    maximumOffer: maximum,
    askingPrice: margin.ready ? margin.currentPrice : 0,
    postRefinanceDscr: sized.postRefiDscr ?? 0,
    refinanceLoanAmount: sized.supportedRefinanceLoan,
    refinanceLimitingFactor: sized.limitingFactor,
    requiredDscr,
  });
  const resilience = scenarios.resilience;
  const downside = scenarios.downside;
  const warnings = collectDealKillers({
    input: normalized,
    results,
    rent,
    buyBox: buyBoxMatch,
    refinance,
    resilience,
    margin,
  });
  const summary = generateUnderwritingSummary({
    input: normalized,
    results,
    buyBox: buyBoxMatch,
    refinance,
    resilience,
    downside,
    maximumOffer: margin.maximumOffer,
  });
  return { rent, buyBox: buyBoxMatch, refinance, resilience, downside, margin, offer, warnings, summary };
}
