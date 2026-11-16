import type { CountryCode, MaxOfferTargetInputs } from "@/lib/types";
import { createBlankAnalysis } from "@/data/default-analysis";
import { createId } from "@/lib/utils/storage";
import { SHARED_DEAL_SCHEMA_VERSION, type SharedDealDraft, type SharedDealMaxOfferExtras } from "@/lib/deal-draft/types";

export function defaultInvestorTargets(): MaxOfferTargetInputs {
  return {
    desiredMonthlyCashflow: 200,
    desiredRoi: 12,
    desiredCashOnCash: 8,
    minimumDscr: 1.25,
    safetyBufferPercent: 8,
  };
}

export function defaultMaxOfferExtras(): SharedDealMaxOfferExtras {
  return { loanToValue: 75 };
}

const SSR_PLACEHOLDER_TIME = "1970-01-01T00:00:00.000Z";

export function nowIso(): string {
  if (typeof window === "undefined") return SSR_PLACEHOLDER_TIME;
  return new Date().toISOString();
}

export function createBlankSharedDeal(
  country: CountryCode = "US",
  activeBuyBoxId: string | null = null,
): SharedDealDraft {
  const createdAt = nowIso();
  const draftId = typeof window === "undefined" ? "deal_ssr" : createId("deal");
  return {
    schemaVersion: SHARED_DEAL_SCHEMA_VERSION,
    draftId,
    savedId: null,
    originWorkflow: null,
    createdAt,
    updatedAt: createdAt,
    lastSavedAt: null,
    lastSavedHash: null,
    input: createBlankAnalysis(country),
    targets: defaultInvestorTargets(),
    maxOffer: defaultMaxOfferExtras(),
    activeBuyBoxId,
  };
}

export function isSampleAnalysisName(name: string): boolean {
  return name.trim() === "Sample Investment Property";
}

export function isDealPopulated(draft: SharedDealDraft): boolean {
  const { input, targets } = draft;
  if (input.property.name.trim()) return true;
  if (input.property.address.trim()) return true;
  if (input.property.city.trim()) return true;
  if (input.property.zipCode.trim()) return true;
  if (input.financing.purchasePrice > 0) return true;
  if (input.financing.askingPrice > 0) return true;
  if (input.financing.proposedOffer > 0) return true;
  if (input.income.monthlyRent > 0) return true;
  if (input.income.verifiedRent > 0) return true;
  if (input.income.conservativeRent > 0) return true;
  if (input.brrrr.afterRepairValue > 0) return true;
  if (input.brrrr.rehabCost > 0) return true;
  if (input.decision.advertisedArv > 0) return true;
  if (input.neighbourhood.name.trim()) return true;
  if (input.neighbourhood.userEnteredMarketRent > 0) return true;
  if (targets.desiredMonthlyCashflow !== 200) return true;
  return false;
}

export function dealContentHash(draft: SharedDealDraft): string {
  return JSON.stringify({
    input: draft.input,
    targets: draft.targets,
    maxOffer: draft.maxOffer,
    activeBuyBoxId: draft.activeBuyBoxId,
  });
}

export function isDraftDirty(draft: SharedDealDraft): boolean {
  if (!draft.savedId) return isDealPopulated(draft);
  if (!draft.lastSavedHash) return true;
  return dealContentHash(draft) !== draft.lastSavedHash;
}
