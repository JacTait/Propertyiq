import type {
  AnalysisInput,
  CurrentDealPrice,
  MarginOfSafety,
  MaxOfferInputs,
  MaxOfferResults,
  MaxOfferTargetInputs,
  SafetyRating,
} from "@/lib/types";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { canonicalInvestorTargets, toMaxOfferInputs } from "@/lib/calculations/offer-inputs";
import { resolveUnderwrittenPrice, toCurrentDealPrice } from "@/lib/calculations/underwritten-price";

const AWAITING_DETAIL =
  "Enter an asking price, proposed offer, or purchase price to calculate margin of safety.";
const RECONSTRUCTED_CEILING = "Indicative Maximum Offer — based on default investor targets.";
const SHARED_CEILING = "Maximum offer uses the shared investor targets.";
const SUPPLIED_CEILING = "Maximum offer comes from the supplied Max Offer run.";

function finitePrice(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function ratingFor(percent: number): { rating: SafetyRating; ratingLabel: string } {
  if (percent >= 20) return { rating: "excellent", ratingLabel: "Excellent" };
  if (percent >= 15) return { rating: "strong", ratingLabel: "Strong" };
  if (percent >= 10) return { rating: "good", ratingLabel: "Good" };
  if (percent >= 5) return { rating: "weak", ratingLabel: "Weak" };
  return { rating: "danger", ratingLabel: "Danger" };
}

export function pendingMargin(
  recommendedOffer = 0,
  maximumOffer = 0,
  offerCeilingSource: MarginOfSafety["offerCeilingSource"] = "reconstructed-default-targets",
): MarginOfSafety {
  return {
    ready: false,
    priceSource: null,
    priceSourceLabel: "Awaiting Price Input",
    currentPrice: 0,
    purchasePrice: 0,
    recommendedOffer,
    maximumOffer,
    offerCeilingSource,
    dollarCushion: 0,
    percent: 0,
    rating: null,
    ratingLabel: "Awaiting Price Input",
    detail: AWAITING_DETAIL,
  };
}

/**
 * Visible comparable price: Purchase → Proposed Offer → Asking, skipping zeros.
 * Never synthesizes a price from ARV, recommended offer, or sample defaults.
 */
export function resolveCurrentPrice(input: AnalysisInput): CurrentDealPrice | null {
  return toCurrentDealPrice(resolveUnderwrittenPrice(input));
}

export function analysisToMaxOfferInputs(
  input: AnalysisInput,
  targets?: MaxOfferTargetInputs | null,
): MaxOfferInputs {
  return toMaxOfferInputs(input, targets);
}

export function calculateMarginOfSafety(
  current: CurrentDealPrice | null,
  recommendedOffer: number,
  maximumOffer: number,
  offerCeilingSource: MarginOfSafety["offerCeilingSource"] = "reconstructed-default-targets",
): MarginOfSafety {
  const rec = Math.max(0, recommendedOffer);
  const max = Math.max(0, maximumOffer);
  if (!current || current.price <= 0) {
    return pendingMargin(rec, max, offerCeilingSource);
  }

  const price = current.price;
  const dollarCushion = max - price;
  const percent = max > 0 ? (dollarCushion / max) * 100 : 0;
  const { rating, ratingLabel } = ratingFor(percent);

  let detail: string;
  if (max <= 0) {
    detail = "No allowable purchase price clears your return requirements at the current assumptions.";
  } else if (price > max) {
    detail = `The current price sits ${Math.abs(Math.round(percent))}% above the maximum allowable offer.`;
  } else if (price <= rec) {
    detail = "The current price is at or below the recommended offer, leaving extra room under the ceiling.";
  } else {
    detail = "The current price is between the recommended offer and the maximum allowable offer.";
  }

  const ceilingNote =
    offerCeilingSource === "supplied"
      ? SUPPLIED_CEILING
      : offerCeilingSource === "shared-targets"
        ? SHARED_CEILING
        : RECONSTRUCTED_CEILING;

  return {
    ready: true,
    priceSource: current.source,
    priceSourceLabel: current.label,
    currentPrice: price,
    purchasePrice: price,
    recommendedOffer: rec,
    maximumOffer: max,
    offerCeilingSource,
    dollarCushion,
    percent,
    rating,
    ratingLabel,
    detail: `${detail} ${ceilingNote}`,
  };
}

export function marginFromMaxOffer(results: MaxOfferResults, askingPrice: number): MarginOfSafety {
  const asking = finitePrice(askingPrice);
  return calculateMarginOfSafety(
    asking > 0 ? { price: asking, source: "asking", label: "Current Asking Price" } : null,
    results.recommendedOffer,
    results.maximumOffer,
    "supplied",
  );
}

export function marginFromAnalysis(
  input: AnalysisInput,
  currentPriceOverride?: number | null,
  offers?: { recommendedOffer: number; maximumOffer: number } | null,
  targets?: MaxOfferTargetInputs | null,
): MarginOfSafety {
  const resolved = resolveCurrentPrice(input);
  const override = finitePrice(currentPriceOverride);
  const current =
    resolved ??
    (currentPriceOverride !== undefined && override > 0
      ? { price: override, source: "asking" as const, label: "Current Asking Price" }
      : null);
  if (offers) {
    return calculateMarginOfSafety(current, offers.recommendedOffer, offers.maximumOffer, "supplied");
  }
  const canonical = canonicalInvestorTargets(targets);
  const results = calculateMaxOffer(toMaxOfferInputs(input, canonical.targets));
  return calculateMarginOfSafety(
    current,
    results.recommendedOffer,
    results.maximumOffer,
    canonical.usingDefaultTargets ? "reconstructed-default-targets" : "shared-targets",
  );
}
