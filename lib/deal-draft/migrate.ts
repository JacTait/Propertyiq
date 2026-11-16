import type { AnalysisInput, CountryCode, MaxOfferInputs, OriginWorkflow, PortfolioProperty } from "@/lib/types";
import { createDefaultMaxOffer } from "@/data/default-max-offer";
import { STORAGE_KEYS } from "@/lib/constants";
import { normalizeAnalysisInput } from "@/lib/calculations/rent";
import { sanitizeMaxOffer } from "@/lib/calculations/max-offer";
import {
  createBlankSharedDeal,
  dealContentHash,
  defaultInvestorTargets,
  isSampleAnalysisName,
  nowIso,
} from "@/lib/deal-draft/blank";
import { maxOfferToSharedDeal } from "@/lib/deal-draft/mappers";
import {
  SHARED_DEAL_SCHEMA_VERSION,
  type AnalysisDraft,
  type LegacyAnalysisDraft,
  type MaxOfferDraft,
  type SharedDealDraft,
} from "@/lib/deal-draft/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAnalysisInput(value: unknown): value is AnalysisInput {
  return isRecord(value) && isRecord(value.property) && isRecord(value.financing) && isRecord(value.income);
}

function isMaxOfferInputs(value: unknown): value is MaxOfferInputs {
  return isRecord(value) && isRecord(value.property) && isRecord(value.financing) && isRecord(value.targets);
}

export function isSharedDealDraft(value: unknown): value is SharedDealDraft {
  if (!isRecord(value)) return false;
  return (
    typeof value.schemaVersion === "number" &&
    typeof value.draftId === "string" &&
    isAnalysisInput(value.input) &&
    isRecord(value.targets) &&
    isRecord(value.maxOffer)
  );
}

export function isLegacyAnalysisDraft(value: unknown): value is AnalysisDraft {
  return isRecord(value) && isAnalysisInput(value.input) && "savedId" in value;
}

export function isLegacyMaxOfferDraft(value: unknown): value is MaxOfferDraft {
  return isRecord(value) && isMaxOfferInputs(value.input) && "savedId" in value;
}

function savedIdOf(value: LegacyAnalysisDraft | AnalysisDraft | MaxOfferDraft | null | undefined): string | null {
  if (!value || typeof value.savedId !== "string" || !value.savedId) return null;
  return value.savedId;
}

/**
 * Older records often stored a single rent figure on `monthlyRent` / `expectedMonthlyRent`.
 * Preserve that number as Verified Local Rent and mark it unverified unless a status already exists.
 * Listing is left unchanged so we never replace verified with listing or vice versa.
 */
export function migrateLegacyRent(input: AnalysisInput): AnalysisInput {
  const clean = normalizeAnalysisInput(input);
  const listing = Math.max(0, clean.income.monthlyRent);
  const verified = Math.max(0, clean.income.verifiedRent);
  const hadVerifiedField =
    isRecord(input.income) && Object.prototype.hasOwnProperty.call(input.income, "verifiedRent");
  if (hadVerifiedField && verified > 0) return clean;
  if (listing <= 0) return clean;
  return {
    ...clean,
    income: {
      ...clean.income,
      verifiedRent: verified > 0 ? verified : listing,
      verificationStatus: clean.income.verificationStatus || "unverified",
      rentSource: clean.income.rentSource || "verified",
    },
  };
}

function isUneditedDefaultMaxOffer(input: MaxOfferInputs, country: CountryCode): boolean {
  if (input.property.name.trim() !== "Max Offer Deal") return false;
  const sample = createDefaultMaxOffer(country);
  return (
    input.property.askingPrice === 0 &&
    input.property.arv === sample.property.arv &&
    input.property.expectedMonthlyRent === sample.property.expectedMonthlyRent &&
    input.property.rehabBudget === sample.property.rehabBudget
  );
}

export function migrateSharedDealSchema(draft: SharedDealDraft): SharedDealDraft {
  if (draft.schemaVersion >= SHARED_DEAL_SCHEMA_VERSION) {
    return {
      ...draft,
      input: migrateLegacyRent(draft.input),
      targets: { ...defaultInvestorTargets(), ...draft.targets },
      maxOffer: { loanToValue: draft.maxOffer?.loanToValue ?? 75 },
    };
  }
  // Future schema bumps land here. v0/missing version is treated as v1 with blank new fields.
  return {
    ...draft,
    schemaVersion: SHARED_DEAL_SCHEMA_VERSION,
    input: migrateLegacyRent(draft.input),
    targets: { ...defaultInvestorTargets(), ...draft.targets },
    maxOffer: { loanToValue: draft.maxOffer?.loanToValue ?? 75 },
    activeBuyBoxId: draft.activeBuyBoxId ?? null,
  };
}

export function sharedDealFromAnalysisDraft(
  draft: AnalysisDraft,
  country: CountryCode,
  activeBuyBoxId: string | null = null,
): SharedDealDraft | null {
  if (isSampleAnalysisName(draft.input.property.name)) return null;
  const base = createBlankSharedDeal(country, activeBuyBoxId);
  return {
    ...base,
    savedId: savedIdOf(draft),
    originWorkflow: "standard-analysis",
    input: migrateLegacyRent(draft.input),
    updatedAt: nowIso(),
  };
}

export function sharedDealFromMaxOfferDraft(
  draft: MaxOfferDraft,
  country: CountryCode,
  activeBuyBoxId: string | null = null,
): SharedDealDraft | null {
  const input = sanitizeMaxOffer(draft.input);
  if (isUneditedDefaultMaxOffer(input, country)) return null;
  const base = createBlankSharedDeal(country, activeBuyBoxId);
  return {
    ...maxOfferToSharedDeal(base, input),
    savedId: savedIdOf(draft),
    originWorkflow: "max-offer",
  };
}

/**
 * Merge leftover workflow drafts into one shared deal.
 * Conflict rule: prefer the analysis draft for overlapping fields (it is the richer schema and
 * was the shared QU/Standard/Resilience/Downside store). Overlay Max Offer-only fields
 * (targets, acquisition LTV) from the Max Offer draft. Sample/default records are ignored.
 */
export function mergeLegacyDrafts(
  analysis: AnalysisDraft | null,
  maxOffer: MaxOfferDraft | null,
  country: CountryCode,
  activeBuyBoxId: string | null = null,
): SharedDealDraft | null {
  const fromAnalysis = analysis ? sharedDealFromAnalysisDraft(analysis, country, activeBuyBoxId) : null;
  const fromMax = maxOffer ? sharedDealFromMaxOfferDraft(maxOffer, country, activeBuyBoxId) : null;
  if (fromAnalysis && fromMax) {
    return {
      ...fromAnalysis,
      savedId: fromAnalysis.savedId ?? fromMax.savedId,
      targets: fromMax.targets,
      maxOffer: fromMax.maxOffer,
      input: {
        ...fromAnalysis.input,
        brrrr: {
          ...fromAnalysis.input.brrrr,
          refinanceLtv: fromMax.input.brrrr.refinanceLtv || fromAnalysis.input.brrrr.refinanceLtv,
          refinanceRate: fromMax.input.brrrr.refinanceRate || fromAnalysis.input.brrrr.refinanceRate,
        },
      },
    };
  }
  return fromAnalysis ?? fromMax;
}

export function kindToOrigin(kind: PortfolioProperty["kind"]): OriginWorkflow {
  if (kind === "quick-underwrite") return "quick-underwrite";
  if (kind === "max-offer") return "max-offer";
  return "standard-analysis";
}

export function originToKind(origin: OriginWorkflow | null): PortfolioProperty["kind"] {
  if (origin === "quick-underwrite") return "quick-underwrite";
  if (origin === "max-offer") return "max-offer";
  return "analysis";
}

export function sharedDealFromPortfolio(
  property: PortfolioProperty,
  country: CountryCode,
): SharedDealDraft {
  const base = createBlankSharedDeal(property.country || country, property.activeBuyBoxId ?? null);
  const input = migrateLegacyRent(property.input);
  let draft: SharedDealDraft = {
    ...base,
    savedId: property.id,
    originWorkflow: property.originWorkflow ?? kindToOrigin(property.kind),
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    lastSavedAt: property.updatedAt,
    input,
    activeBuyBoxId: property.activeBuyBoxId ?? null,
    schemaVersion: property.schemaVersion ?? SHARED_DEAL_SCHEMA_VERSION,
  };
  if (property.maxOfferInput) {
    const overlay = maxOfferToSharedDeal(draft, property.maxOfferInput);
    draft = {
      ...overlay,
      savedId: property.id,
      input: {
        ...overlay.input,
        // Prefer the stored analysis rent split when listing and verified already differ.
        income:
          input.income.monthlyRent !== input.income.verifiedRent &&
          input.income.monthlyRent > 0 &&
          input.income.verifiedRent > 0
            ? input.income
            : overlay.input.income,
        neighbourhood: input.neighbourhood,
        flip: {
          ...overlay.input.flip,
          holdingCostsMonthly: input.flip.holdingCostsMonthly,
          holdDurationMonths: input.flip.holdDurationMonths,
        },
        financing: {
          ...overlay.input.financing,
          purchasePrice: input.financing.purchasePrice,
          proposedOffer: input.financing.proposedOffer,
          legalFees: input.financing.legalFees,
          inspectionCosts: input.financing.inspectionCosts,
          otherAcquisitionCosts: input.financing.otherAcquisitionCosts,
        },
      },
      createdAt: property.createdAt,
      lastSavedAt: property.updatedAt,
    };
  }
  return { ...draft, lastSavedHash: dealContentHash(draft) };
}

export const LEGACY_DRAFT_KEYS = {
  analysis: STORAGE_KEYS.draft,
  maxOffer: STORAGE_KEYS.maxOfferDraft,
  identity: STORAGE_KEYS.propertyIdentity,
  portfolio: STORAGE_KEYS.portfolio,
  buyBoxes: STORAGE_KEYS.buyBoxes,
} as const;
