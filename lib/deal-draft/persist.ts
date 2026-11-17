import type { CountryCode, PortfolioProperty } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { readStorage, writeStorage, removeStorage } from "@/lib/utils/storage";
import { createBlankSharedDeal, dealContentHash } from "@/lib/deal-draft/blank";
import { writeJsonIfChanged } from "@/lib/deal-draft/equal";
import { sharedDealToMaxOffer } from "@/lib/deal-draft/mappers";
import {
  isLegacyAnalysisDraft,
  isLegacyMaxOfferDraft,
  isSharedDealDraft,
  mergeLegacyDrafts,
  migrateSharedDealSchema,
  sharedDealFromPortfolio,
} from "@/lib/deal-draft/migrate";
import type { AnalysisDraft, MaxOfferDraft, SharedDealDraft } from "@/lib/deal-draft/types";

export function markSavedToPortfolio(draft: SharedDealDraft, savedId: string, savedAt = new Date().toISOString()): SharedDealDraft {
  const next: SharedDealDraft = {
    ...draft,
    savedId,
    lastSavedAt: savedAt,
    updatedAt: savedAt,
  };
  return { ...next, lastSavedHash: dealContentHash(next) };
}

export function persistSharedDeal(draft: SharedDealDraft): { wroteShared: boolean; wroteMirrors: boolean } {
  const wroteShared = writeJsonIfChanged(STORAGE_KEYS.sharedDeal, draft, writeStorage);
  const analysisDraft: AnalysisDraft = { input: draft.input, savedId: draft.savedId };
  const maxOfferDraft: MaxOfferDraft = { input: sharedDealToMaxOffer(draft), savedId: draft.savedId };
  const wroteAnalysis = writeJsonIfChanged(STORAGE_KEYS.draft, analysisDraft, writeStorage);
  const wroteMaxOffer = writeJsonIfChanged(STORAGE_KEYS.maxOfferDraft, maxOfferDraft, writeStorage);
  return { wroteShared, wroteMirrors: wroteAnalysis || wroteMaxOffer };
}

export function clearPersistedSharedDeal(): void {
  removeStorage(STORAGE_KEYS.sharedDeal);
  writeStorage<AnalysisDraft | null>(STORAGE_KEYS.draft, null);
  writeStorage<MaxOfferDraft | null>(STORAGE_KEYS.maxOfferDraft, null);
}

export function readPersistedSharedDeal(): SharedDealDraft | null {
  const stored = readStorage<unknown>(STORAGE_KEYS.sharedDeal, null);
  if (isSharedDealDraft(stored)) return migrateSharedDealSchema(stored);
  return null;
}

export function hydrateSharedDeal(
  country: CountryCode,
  activeBuyBoxId: string | null = null,
): SharedDealDraft | null {
  const existing = readPersistedSharedDeal();
  if (existing) return existing;

  const analysis = readStorage<unknown>(STORAGE_KEYS.draft, null);
  const maxOffer = readStorage<unknown>(STORAGE_KEYS.maxOfferDraft, null);
  const merged = mergeLegacyDrafts(
    isLegacyAnalysisDraft(analysis) ? analysis : null,
    isLegacyMaxOfferDraft(maxOffer) ? maxOffer : null,
    country,
    activeBuyBoxId,
  );
  if (!merged) return null;
  persistSharedDeal(merged);
  return merged;
}

export function resolveInitialSharedDeal(options: {
  country: CountryCode;
  activeBuyBoxId: string | null;
  stored: SharedDealDraft | null;
}): SharedDealDraft {
  if (options.stored) return migrateSharedDealSchema(options.stored);
  const hydrated = hydrateSharedDeal(options.country, options.activeBuyBoxId);
  return hydrated ?? createBlankSharedDeal(options.country, options.activeBuyBoxId);
}

/**
 * Form hydration after SharedDealDraft exists.
 * Live shared draft wins over a stale portfolio snapshot of the same saved deal.
 * Opening a different saved deal uses that portfolio record.
 */
export function resolveWorkflowDraft(args: {
  draft: SharedDealDraft;
  propertyId: string | null;
  fromPortfolio: PortfolioProperty | undefined;
  country: CountryCode;
}): SharedDealDraft {
  if (!args.propertyId) return args.draft;
  if (args.draft.savedId === args.propertyId) return args.draft;
  if (args.fromPortfolio) return sharedDealFromPortfolio(args.fromPortfolio, args.country);
  return args.draft;
}
