import type { AnalysisInput, MarginOfSafety, MaxOfferInputs, MaxOfferResults, SafetyRating } from "@/lib/types";
import { DEFAULT_INVESTOR_TARGETS } from "@/lib/constants";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { resolveRent } from "@/lib/calculations/rent";
import { resolveArv } from "@/lib/calculations/refinance";

function ratingFor(percent: number): { rating: SafetyRating; ratingLabel: string } {
  if (percent >= 20) return { rating: "excellent", ratingLabel: "Excellent" };
  if (percent >= 15) return { rating: "strong", ratingLabel: "Strong" };
  if (percent >= 10) return { rating: "good", ratingLabel: "Good" };
  if (percent >= 5) return { rating: "weak", ratingLabel: "Weak" };
  return { rating: "danger", ratingLabel: "Danger" };
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
      askingPrice: input.financing.purchasePrice,
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
  purchasePrice: number,
  recommendedOffer: number,
  maximumOffer: number,
): MarginOfSafety {
  const max = Math.max(0, maximumOffer);
  const rec = Math.max(0, recommendedOffer);
  const price = Math.max(0, purchasePrice);
  const dollarCushion = max - price;
  const percent = max > 0 ? (dollarCushion / max) * 100 : 0;
  const { rating, ratingLabel } = ratingFor(percent);

  let detail: string;
  if (max <= 0) {
    detail = "No allowable purchase price clears your return requirements at the current assumptions.";
  } else if (price > max) {
    detail = `The current purchase price sits ${Math.abs(Math.round(percent))}% above the maximum allowable offer.`;
  } else if (price <= rec) {
    detail = "The current price is at or below the recommended offer, leaving extra room under the ceiling.";
  } else {
    detail = "The current price is between the recommended offer and the maximum allowable offer.";
  }

  return {
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

export function marginFromMaxOffer(results: MaxOfferResults, purchasePrice: number): MarginOfSafety {
  return calculateMarginOfSafety(purchasePrice, results.recommendedOffer, results.maximumOffer);
}

export function marginFromAnalysis(input: AnalysisInput): MarginOfSafety {
  const offerInput = analysisToMaxOfferInputs(input);
  const results = calculateMaxOffer(offerInput);
  return calculateMarginOfSafety(input.financing.purchasePrice, results.recommendedOffer, results.maximumOffer);
}
