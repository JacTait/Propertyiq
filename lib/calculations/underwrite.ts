import type { AnalysisInput, AnalysisResults, BuyBoxProfile, UnderwritingPack } from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent, normalizeAnalysisInput, resolveRent } from "@/lib/calculations/rent";
import { matchBuyBox, subjectFromAnalysis } from "@/lib/calculations/buy-box";
import { validateRefinance } from "@/lib/calculations/refinance";
import { calculateDealResilience } from "@/lib/calculations/deal-resilience";
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
  options: { includeSensitivity?: boolean } = {},
): UnderwritingPack {
  const normalized = normalizeAnalysisInput(input);
  const rent = resolveRent(normalized);
  const buyBoxMatch = matchBuyBox(buyBox, subjectFromAnalysis(normalized));
  const refinance = validateRefinance(normalized, results);
  const resilience = calculateDealResilience(normalized, options);
  const margin = marginFromAnalysis(normalized);
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
  });
  return { rent, buyBox: buyBoxMatch, refinance, resilience, margin, warnings, summary };
}
