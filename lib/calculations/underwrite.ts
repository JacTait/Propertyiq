import type { AnalysisInput, AnalysisResults, BuyBoxProfile, UnderwritingPack } from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent, normalizeAnalysisInput, resolveRent } from "@/lib/calculations/rent";
import { matchBuyBox, subjectFromAnalysis } from "@/lib/calculations/buy-box";
import { validateRefinance } from "@/lib/calculations/refinance";
import { calculateDealResilience } from "@/lib/calculations/deal-resilience";
import { calculateDownsideAnalysis } from "@/lib/calculations/downside-analysis";
import { marginFromAnalysis } from "@/lib/calculations/margin-of-safety";
import { collectDealKillers } from "@/lib/calculations/deal-killers";
import { generateUnderwritingSummary } from "@/lib/calculations/underwriting-summary";
import { sizeSupportedRefinance, resolveArv } from "@/lib/calculations/refinance";
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
  } = {},
): UnderwritingPack {
  const normalized = normalizeAnalysisInput(input);
  const rent = resolveRent(normalized);
  const buyBoxMatch = matchBuyBox(buyBox, subjectFromAnalysis(normalized));
  const refinance = validateRefinance(normalized, results);
  const resilience = calculateDealResilience(normalized, options);
  const margin = marginFromAnalysis(normalized, options.marginPrice, options.marginOffers);
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
  const downside = calculateDownsideAnalysis(normalized, {
    includeSensitivity: options.includeDownsideSensitivity !== false,
    desiredMonthlyCashflow: options.desiredMonthlyCashflow,
    maximumOffer: margin.maximumOffer,
    askingPrice: margin.ready ? margin.currentPrice : 0,
    postRefinanceDscr: sized.postRefiDscr ?? 0,
    refinanceLoanAmount: sized.supportedRefinanceLoan,
    refinanceLimitingFactor: sized.limitingFactor,
    requiredDscr,
  });
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
  return { rent, buyBox: buyBoxMatch, refinance, resilience, downside, margin, warnings, summary };
}
