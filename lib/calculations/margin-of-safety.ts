import type {
  AnalysisInput,
  CurrentDealPrice,
  MarginOfSafety,
  MaxOfferInputs,
  MaxOfferResults,
  SafetyRating,
} from "@/lib/types";
import { DEFAULT_INVESTOR_TARGETS } from "@/lib/constants";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { resolveRent } from "@/lib/calculations/rent";
import { resolveArv } from "@/lib/calculations/refinance";

const AWAITING_DETAIL = "Enter a purchase price or asking price to calculate margin of safety.";

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

export function pendingMargin(recommendedOffer = 0, maximumOffer = 0): MarginOfSafety {
  return {
    ready: false,
    priceSource: null,
    priceSourceLabel: "Awaiting Price Input",
    currentPrice: 0,
    purchasePrice: 0,
    recommendedOffer,
    maximumOffer,
    dollarCushion: 0,
    percent: 0,
    rating: null,
    ratingLabel: "Awaiting Price Input",
    detail: AWAITING_DETAIL,
  };
}

/**
 * Visible comparable price only: asking if entered, else purchase if entered.
 * Never synthesizes a price from ARV, recommended offer, or sample defaults.
 */
export function resolveCurrentPrice(input: AnalysisInput): CurrentDealPrice | null {
  const asking = finitePrice(input.financing?.askingPrice);
  if (asking > 0) {
    return { price: asking, source: "asking", label: "Current Asking Price" };
  }
  const purchase = finitePrice(input.financing?.purchasePrice);
  if (purchase > 0) {
    return { price: purchase, source: "purchase", label: "Purchase Price" };
  }
  return null;
}

export function analysisToMaxOfferInputs(input: AnalysisInput): MaxOfferInputs {
  const rent = resolveRent(input).active;
  const arv = resolveArv(input);
  const rehab = input.strategy === "fix-flip" ? input.flip.renovationBudget : input.brrrr.rehabCost;
  const ltv = Math.max(0, 100 - input.financing.depositPercent);
  return {
    property: {
      name: input.property.name,
      arv,
      expectedMonthlyRent: rent,
      rehabBudget: rehab,
      closingCosts: input.financing.closingCosts + input.financing.legalFees + input.financing.inspectionCosts,
      holdingCosts: Math.max(0, input.flip.holdingCostsMonthly * 3),
      askingPrice: finitePrice(input.financing.askingPrice),
    },
    financing: {
      interestRate: input.financing.interestRate,
      termYears: input.financing.termYears,
      loanToValue: ltv,
      downPaymentPercent: input.financing.depositPercent,
      loanFees: input.financing.loanFees,
    },
    expenses: {
      propertyTaxAnnual: input.expenses.propertyTaxAnnual,
      insuranceAnnual: input.expenses.insuranceAnnual,
      managementPercent: input.expenses.managementPercent,
      vacancyPercent: input.expenses.vacancyPercent,
      maintenancePercent: input.expenses.maintenancePercent,
      capexPercent: 0,
      hoaMonthly: input.expenses.hoaMonthly,
      otherMonthly: input.expenses.otherMonthly,
    },
    targets: { ...DEFAULT_INVESTOR_TARGETS },
    brrrr: {
      refinanceLtv: input.brrrr.refinanceLtv || 75,
      refinanceRate: input.brrrr.refinanceRate || input.financing.interestRate,
    },
  };
}

export function calculateMarginOfSafety(
  current: CurrentDealPrice | null,
  recommendedOffer: number,
  maximumOffer: number,
): MarginOfSafety {
  const rec = Math.max(0, recommendedOffer);
  const max = Math.max(0, maximumOffer);
  if (!current || current.price <= 0) {
    return pendingMargin(rec, max);
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

  return {
    ready: true,
    priceSource: current.source,
    priceSourceLabel: current.label,
    currentPrice: price,
    purchasePrice: price,
    recommendedOffer: rec,
    maximumOffer: max,
    dollarCushion,
    percent,
    rating,
    ratingLabel,
    detail,
  };
}

export function marginFromMaxOffer(results: MaxOfferResults, askingPrice: number): MarginOfSafety {
  const asking = finitePrice(askingPrice);
  return calculateMarginOfSafety(
    asking > 0 ? { price: asking, source: "asking", label: "Current Asking Price" } : null,
    results.recommendedOffer,
    results.maximumOffer,
  );
}

export function marginFromAnalysis(
  input: AnalysisInput,
  currentPriceOverride?: number | null,
  offers?: { recommendedOffer: number; maximumOffer: number } | null,
): MarginOfSafety {
  const current =
    currentPriceOverride !== undefined
      ? finitePrice(currentPriceOverride) > 0
        ? { price: finitePrice(currentPriceOverride), source: "asking" as const, label: "Current Asking Price" }
        : null
      : resolveCurrentPrice(input);
  if (offers) {
    return calculateMarginOfSafety(current, offers.recommendedOffer, offers.maximumOffer);
  }
  const offerInput = analysisToMaxOfferInputs(input);
  const results = calculateMaxOffer(offerInput);
  return calculateMarginOfSafety(current, results.recommendedOffer, results.maximumOffer);
}
