export { SHARED_DEAL_SCHEMA_VERSION, type AnalysisDraft, type DraftPersistStatus, type MaxOfferDraft, type OriginWorkflow, type SharedDealDraft, type SharedDealMaxOfferExtras } from "@/lib/deal-draft/types";
export {
  createBlankSharedDeal,
  dealContentHash,
  defaultInvestorTargets,
  defaultMaxOfferExtras,
  isDealPopulated,
  isDraftDirty,
  isSampleAnalysisName,
  nowIso,
} from "@/lib/deal-draft/blank";
export { stableEqual } from "@/lib/deal-draft/equal";
export {
  adjustedRehabBudget,
  analysisWorkflowToSharedDeal,
  derivedAcquisitionLoanAmount,
  downsideToSharedDeal,
  holdingCostUsed,
  maxOfferToSharedDeal,
  quickUnderwriteToSharedDeal,
  rehabContingencyAmount,
  resilienceToSharedDeal,
  sharedDealToDownside,
  sharedDealToMaxOffer,
  sharedDealToQuickUnderwrite,
  sharedDealToResilience,
  sharedDealToStandardAnalysis,
  standardAnalysisToSharedDeal,
} from "@/lib/deal-draft/mappers";
export {
  isLegacyAnalysisDraft,
  isLegacyMaxOfferDraft,
  isSharedDealDraft,
  kindToOrigin,
  mergeLegacyDrafts,
  migrateLegacyRent,
  migrateSharedDealSchema,
  originToKind,
  sharedDealFromAnalysisDraft,
  sharedDealFromMaxOfferDraft,
  sharedDealFromPortfolio,
} from "@/lib/deal-draft/migrate";
export {
  clearPersistedSharedDeal,
  hydrateSharedDeal,
  markSavedToPortfolio,
  persistSharedDeal,
  readPersistedSharedDeal,
  resolveInitialSharedDeal,
  resolveWorkflowDraft,
} from "@/lib/deal-draft/persist";
