import type {
  AnalysisInput,
  CalculationProvenance,
  MaxOfferTargetInputs,
  OfferAnalysisResult,
  OfferConstraintKey,
  OfferTier,
} from "@/lib/types";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { calculateMarginOfSafety, pendingMargin } from "@/lib/calculations/margin-of-safety";
import { canonicalInvestorTargets, toMaxOfferInputs } from "@/lib/calculations/offer-inputs";
import { resolveUnderwrittenPrice } from "@/lib/calculations/underwritten-price";

export { canonicalArv, canonicalInvestorTargets, toMaxOfferInputs } from "@/lib/calculations/offer-inputs";

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function difference(price: number, maximumOffer: number): number | null {
  if (!(price > 0) || !(maximumOffer > 0)) return null;
  return maximumOffer - price;
}

function warningSeverity(args: {
  asking: number;
  proposed: number;
  purchase: number;
  maximumOffer: number;
  feasible: boolean;
}): OfferAnalysisResult["warningSeverity"] {
  if (!args.feasible || args.maximumOffer <= 0) return "critical";
  const over =
    (args.purchase > 0 && args.purchase > args.maximumOffer) ||
    (args.proposed > 0 && args.proposed > args.maximumOffer);
  if (over) return "warning";
  if (args.asking > 0 && args.asking > args.maximumOffer) return "info";
  return "none";
}

export function analyzeOffer(
  input: AnalysisInput,
  targets?: MaxOfferTargetInputs | null,
  extras?: { loanToValue?: number },
): OfferAnalysisResult {
  const resolved = canonicalInvestorTargets(targets);
  const offerInput = toMaxOfferInputs(input, resolved.targets, {
    loanToValue: extras?.loanToValue,
    usingDefaultTargets: resolved.usingDefaultTargets,
  });
  const maxOffer = calculateMaxOffer(offerInput);
  const underwritten = resolveUnderwrittenPrice(input);
  const asking = money(input.financing.askingPrice);
  const proposed = money(input.financing.proposedOffer);
  const purchase = money(input.financing.purchasePrice);
  const current =
    underwritten.value && underwritten.value > 0 && underwritten.source
      ? { price: underwritten.value, source: underwritten.source, label: underwritten.label }
      : null;
  const ceilingSource = resolved.usingDefaultTargets ? "reconstructed-default-targets" : "shared-targets";
  const margin = current
    ? calculateMarginOfSafety(current, maxOffer.recommendedOffer, maxOffer.maximumOffer, ceilingSource)
    : pendingMargin(maxOffer.recommendedOffer, maxOffer.maximumOffer, ceilingSource);

  const provenance: CalculationProvenance = {
    engine: "max-offer",
    underwrittenPriceSource: underwritten.source,
    targetSet: resolved.targets,
    usingDefaultTargets: resolved.usingDefaultTargets,
    generatedAt: maxOffer.generatedAt,
  };

  const dealStatus: OfferTier | "infeasible" = maxOffer.feasible
    ? maxOffer.recommendation.tier
    : "infeasible";

  return {
    excellentOffer: maxOffer.excellentOffer,
    recommendedOffer: maxOffer.recommendedOffer,
    maximumOffer: maxOffer.maximumOffer,
    underwrittenPrice: underwritten.value,
    underwrittenPriceSource: underwritten.source,
    underwrittenPriceLabel: underwritten.label,
    askingPrice: asking,
    proposedOffer: proposed,
    purchasePrice: purchase,
    marginOfSafety: margin,
    askingPriceDifference: difference(asking, maxOffer.maximumOffer),
    proposedOfferDifference: difference(proposed, maxOffer.maximumOffer),
    purchasePriceDifference: difference(purchase, maxOffer.maximumOffer),
    limitingConstraint: maxOffer.limitingConstraint,
    constraints: maxOffer.constraints,
    dealStatus,
    warningSeverity: warningSeverity({
      asking,
      proposed,
      purchase,
      maximumOffer: maxOffer.maximumOffer,
      feasible: maxOffer.feasible,
    }),
    usingDefaultTargets: resolved.usingDefaultTargets,
    provenance,
    maxOffer,
  };
}

export function limitingConstraintLabel(key: OfferConstraintKey | null): string {
  if (key === "cashflow") return "Cashflow";
  if (key === "roi") return "ROI";
  if (key === "cashOnCash") return "Cash-on-Cash";
  if (key === "dscr") return "DSCR";
  return "None";
}
