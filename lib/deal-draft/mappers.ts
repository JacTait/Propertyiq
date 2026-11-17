import type {
  AnalysisInput,
  IncomeInputs,
  MaxOfferInputs,
  OriginWorkflow,
  RentSource,
} from "@/lib/types";
import { createBlankAnalysis } from "@/data/default-analysis";
import { holdingCostsFromFlip } from "@/lib/calculations/brrrr-capital";
import { sanitizeMaxOffer } from "@/lib/calculations/max-offer";
import { toMaxOfferInputs } from "@/lib/calculations/offer-inputs";
import { normalizeAnalysisInput } from "@/lib/calculations/rent";
import { nowIso } from "@/lib/deal-draft/blank";
import type { SharedDealDraft } from "@/lib/deal-draft/types";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function holdingCostUsed(input: AnalysisInput): number {
  return holdingCostsFromFlip(input.flip);
}

export function rehabContingencyAmount(input: AnalysisInput): number {
  const rehab = Math.max(0, finiteNumber(input.brrrr.rehabCost));
  const percent = Math.max(0, finiteNumber(input.decision.rehabContingencyPercent));
  return rehab * (percent / 100);
}

export function adjustedRehabBudget(input: AnalysisInput): number {
  return (
    Math.max(0, finiteNumber(input.brrrr.rehabCost)) +
    rehabContingencyAmount(input) +
    Math.max(0, finiteNumber(input.brrrr.otherRehabCosts))
  );
}

export function derivedAcquisitionLoanAmount(input: AnalysisInput): number {
  const price = Math.max(0, finiteNumber(input.financing.purchasePrice));
  const deposit = clampPercent(finiteNumber(input.financing.depositPercent));
  return Math.max(0, price * (1 - deposit / 100));
}

function ltvFromDeposit(depositPercent: number): number {
  return clampPercent(100 - clampPercent(depositPercent));
}

function stampDraft(draft: SharedDealDraft, origin: OriginWorkflow | null): SharedDealDraft {
  return {
    ...draft,
    originWorkflow: origin ?? draft.originWorkflow,
    updatedAt: nowIso(),
  };
}

function applyActiveRentField(income: IncomeInputs, expectedMonthlyRent: number): IncomeInputs {
  const source: RentSource =
    income.rentSource === "listing" || income.rentSource === "conservative" ? income.rentSource : "verified";
  const rent = Math.max(0, finiteNumber(expectedMonthlyRent));
  if (source === "listing") {
    return { ...income, monthlyRent: rent };
  }
  if (source === "conservative") {
    return { ...income, conservativeRent: rent };
  }
  return { ...income, verifiedRent: rent };
}

export function sharedDealToQuickUnderwrite(draft: SharedDealDraft): AnalysisInput {
  return draft.input;
}

export function quickUnderwriteToSharedDeal(draft: SharedDealDraft, input: AnalysisInput): SharedDealDraft {
  return analysisWorkflowToSharedDeal(draft, input, "quick-underwrite");
}

export function sharedDealToStandardAnalysis(draft: SharedDealDraft): AnalysisInput {
  return draft.input;
}

export function standardAnalysisToSharedDeal(draft: SharedDealDraft, input: AnalysisInput): SharedDealDraft {
  return analysisWorkflowToSharedDeal(draft, input, "standard-analysis");
}

export function sharedDealToResilience(draft: SharedDealDraft): AnalysisInput {
  return draft.input;
}

export function resilienceToSharedDeal(draft: SharedDealDraft, input: AnalysisInput): SharedDealDraft {
  return analysisWorkflowToSharedDeal(draft, input, "deal-resilience");
}

export function sharedDealToDownside(draft: SharedDealDraft): AnalysisInput {
  return draft.input;
}

export function downsideToSharedDeal(draft: SharedDealDraft, input: AnalysisInput): SharedDealDraft {
  return analysisWorkflowToSharedDeal(draft, input, "downside-analysis");
}

export function analysisWorkflowToSharedDeal(
  draft: SharedDealDraft,
  input: AnalysisInput,
  origin: OriginWorkflow,
): SharedDealDraft {
  const clean = normalizeAnalysisInput(input);
  const arv = Math.max(0, finiteNumber(clean.brrrr.afterRepairValue));
  return stampDraft(
    {
      ...draft,
      input: {
        ...clean,
        decision: {
          ...clean.decision,
          advertisedArv: arv,
        },
      },
      maxOffer: {
        ...draft.maxOffer,
        loanToValue: ltvFromDeposit(clean.financing.depositPercent),
      },
    },
    origin,
  );
}

/**
 * Max Offer `expectedMonthlyRent` is the active rent basis, not a fourth rent copy.
 * Listing / verified / conservative stay independent in the shared draft.
 */
export function sharedDealToMaxOffer(draft: SharedDealDraft): MaxOfferInputs {
  const deposit = clampPercent(finiteNumber(draft.input.financing.depositPercent, 25));
  const ltv = draft.maxOffer.loanToValue > 0 ? clampPercent(draft.maxOffer.loanToValue) : ltvFromDeposit(deposit);
  return toMaxOfferInputs(draft.input, draft.targets, { loanToValue: ltv, usingDefaultTargets: false });
}

/**
 * Overlay Max Offer edits onto the shared draft.
 * Does not copy sample defaults, does not replace unused analysis fields,
 * and does not write asking into purchase or listing into verified.
 */
export function maxOfferToSharedDeal(draft: SharedDealDraft, raw: MaxOfferInputs): SharedDealDraft {
  const input = sanitizeMaxOffer(raw);
  const prev = draft.input;
  const nextIncome = applyActiveRentField(prev.income, input.property.expectedMonthlyRent);
  const arv = Math.max(0, finiteNumber(input.property.arv));
  const holding = Math.max(0, finiteNumber(input.property.holdingCosts));
  const previousHolding = holdingCostUsed(prev);
  const holdingCostOverride =
    holding !== previousHolding ? holding : Math.max(0, finiteNumber(prev.flip.holdingCostOverride));
  const deposit = clampPercent(finiteNumber(input.financing.downPaymentPercent, prev.financing.depositPercent));
  const conservativeArv = Math.max(0, finiteNumber(prev.decision.conservativeArv));

  const nextInput: AnalysisInput = {
    ...prev,
    strategy: input.strategy || prev.strategy,
    location: {
      ...prev.location,
      country: input.location.country,
      region: input.location.region,
    },
    property: {
      ...prev.property,
      name: input.property.name,
      propertyType: input.property.propertyType || prev.property.propertyType,
      bedrooms: Number.isFinite(input.property.bedrooms) ? input.property.bedrooms : prev.property.bedrooms,
      bathrooms: Number.isFinite(input.property.bathrooms) ? input.property.bathrooms : prev.property.bathrooms,
      zipCode: typeof input.property.zipCode === "string" ? input.property.zipCode : prev.property.zipCode,
    },
    financing: {
      ...prev.financing,
      askingPrice: Math.max(0, finiteNumber(input.property.askingPrice)),
      depositPercent: deposit,
      interestRate: input.financing.interestRate,
      termYears: input.financing.termYears,
      closingCosts: Math.max(0, finiteNumber(input.property.closingCosts)),
      loanFees: Math.max(0, finiteNumber(input.financing.loanFees)),
    },
    income: nextIncome,
    expenses: {
      ...prev.expenses,
      propertyTaxAnnual: input.expenses.propertyTaxAnnual,
      insuranceAnnual: input.expenses.insuranceAnnual,
      managementPercent: input.expenses.managementPercent,
      vacancyPercent: input.expenses.vacancyPercent,
      maintenancePercent: input.expenses.maintenancePercent,
      capexPercent: input.expenses.capexPercent,
      hoaMonthly: input.expenses.hoaMonthly,
      otherMonthly: input.expenses.otherMonthly,
    },
    flip: {
      ...prev.flip,
      renovationBudget: Math.max(0, finiteNumber(input.property.rehabBudget)),
      holdingCostOverride,
    },
    brrrr: {
      ...prev.brrrr,
      rehabCost: Math.max(0, finiteNumber(input.property.rehabBudget)),
      afterRepairValue: arv,
      refinanceLtv: input.brrrr.refinanceLtv,
      refinanceRate: input.brrrr.refinanceRate,
    },
    decision: {
      ...prev.decision,
      advertisedArv: arv,
      conservativeArv: conservativeArv > 0 ? conservativeArv : arv,
    },
  };

  return stampDraft(
    {
      ...draft,
      input: nextInput,
      targets: { ...input.targets },
      maxOffer: {
        loanToValue: clampPercent(finiteNumber(input.financing.loanToValue, ltvFromDeposit(deposit))),
      },
    },
    "max-offer",
  );
}

export function blankAnalysisForCountry(country: AnalysisInput["location"]["country"]): AnalysisInput {
  return createBlankAnalysis(country);
}
