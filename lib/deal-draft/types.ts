import type {
  AnalysisInput,
  MaxOfferInputs,
  MaxOfferTargetInputs,
  OriginWorkflow,
} from "@/lib/types";
import { SHARED_DEAL_SCHEMA_VERSION as SCHEMA_VERSION } from "@/lib/constants";

export type { OriginWorkflow };

export const SHARED_DEAL_SCHEMA_VERSION = SCHEMA_VERSION;

export type DraftPersistStatus = "saving" | "saved-locally" | "unsaved" | "saved-portfolio";

export interface SharedDealMaxOfferExtras {
  /** Acquisition LTV used by Max Offer. Independent of refinance LTV. */
  loanToValue: number;
}

export interface SharedDealDraft {
  schemaVersion: number;
  draftId: string;
  savedId: string | null;
  originWorkflow: OriginWorkflow | null;
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string | null;
  lastSavedHash: string | null;
  input: AnalysisInput;
  targets: MaxOfferTargetInputs;
  maxOffer: SharedDealMaxOfferExtras;
  activeBuyBoxId: string | null;
}

export interface AnalysisDraft {
  input: AnalysisInput;
  savedId: string | null;
}

export interface MaxOfferDraft {
  input: MaxOfferInputs;
  savedId: string | null;
}

export interface LegacyAnalysisDraft {
  input?: unknown;
  savedId?: unknown;
}
