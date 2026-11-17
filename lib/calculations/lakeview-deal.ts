import { createBlankAnalysis } from "@/data/default-analysis";
import { createBlankSharedDeal } from "@/lib/deal-draft/blank";
import type { SharedDealDraft } from "@/lib/deal-draft/types";
import type { AnalysisInput, MaxOfferTargetInputs } from "@/lib/types";

export const LAKEVIEW_TARGETS: MaxOfferTargetInputs = {
  desiredMonthlyCashflow: 200,
  desiredRoi: 10,
  desiredCashOnCash: 9,
  minimumDscr: 1.25,
  safetyBufferPercent: 10,
};

export function lakeviewAnalysis(): AnalysisInput {
  const input = createBlankAnalysis("US");
  input.property.name = "Lakeview Rental Demo";
  input.property.city = "Jacksonville";
  input.location.region = "FL";
  input.property.zipCode = "32210";
  input.property.propertyType = "single-family";
  input.property.bedrooms = 3;
  input.property.bathrooms = 2;
  input.strategy = "buy-hold";
  input.financing.askingPrice = 194_000;
  input.financing.proposedOffer = 181_500;
  input.financing.purchasePrice = 0;
  input.financing.depositPercent = 25;
  input.financing.interestRate = 6.75;
  input.financing.termYears = 30;
  input.financing.closingCosts = 4_750;
  input.financing.loanFees = 1_850;
  input.income.monthlyRent = 2_250;
  input.income.verifiedRent = 2_050;
  input.income.conservativeRent = 1_850;
  input.income.rentSource = "verified";
  input.brrrr.rehabCost = 21_000;
  input.flip.renovationBudget = 21_000;
  input.flip.holdingCostOverride = 2_700;
  input.flip.holdingCostsMonthly = 900;
  input.flip.holdDurationMonths = 3;
  input.brrrr.afterRepairValue = 275_000;
  input.decision.advertisedArv = 275_000;
  input.brrrr.refinanceLtv = 75;
  input.brrrr.refinanceRate = 7;
  input.brrrr.refinanceTermYears = 30;
  input.brrrr.refinanceDscrMin = 1.25;
  input.expenses.propertyTaxAnnual = 2_400;
  input.expenses.insuranceAnnual = 2_100;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 6;
  input.expenses.maintenancePercent = 6;
  input.expenses.capexPercent = 5;
  input.expenses.otherMonthly = 35;
  return input;
}

export function lakeviewDraft(): SharedDealDraft {
  const draft = createBlankSharedDeal("US");
  return {
    ...draft,
    input: lakeviewAnalysis(),
    targets: { ...LAKEVIEW_TARGETS },
    originWorkflow: "quick-underwrite",
  };
}
