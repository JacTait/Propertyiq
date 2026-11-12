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
  const downside = calculateDownsideAnalysis(normalized, {
    includeSensitivity: options.includeDownsideSensitivity !== false,
    desiredMonthlyCashflow: options.desiredMonthlyCashflow,
    maximumOffer: margin.maximumOffer,
    askingPrice: margin.ready ? margin.currentPrice : 0,
    postRefinanceDscr: refinance.postRefiDscr,
    refinanceLoanAmount: refinance.loanAmount,
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
  });
  return { rent, buyBox: buyBoxMatch, refinance, resilience, downside, margin, warnings, summary };
}
