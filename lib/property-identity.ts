import type {
  AnalysisInput,
  CountryCode,
  InvestmentStrategy,
  MaxOfferInputs,
  PropertyIdentity,
  PropertyType,
} from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { getMarketProfile, getRegions, toMarketData } from "@/data/market-data";
import { readStorage } from "@/lib/utils/storage";

const PROPERTY_TYPES: PropertyType[] = [
  "single-family",
  "condo",
  "townhouse",
  "duplex",
  "triplex",
  "fourplex",
  "multi-family",
  "commercial",
  "mixed-use",
];

const STRATEGIES: InvestmentStrategy[] = [
  "buy-hold",
  "short-term-rental",
  "brrrr",
  "fix-flip",
  "commercial-lease",
];

const COUNTRIES: CountryCode[] = ["US", "GB", "CA", "AU"];

function finiteCount(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function defaultRegion(country: CountryCode): string {
  return country === "US" ? "FL" : country === "GB" ? "NW" : country === "CA" ? "AB" : "QLD";
}

export function defaultPropertyIdentity(country: CountryCode = "US"): PropertyIdentity {
  return {
    name: "",
    propertyType: "single-family",
    bedrooms: 3,
    bathrooms: 2,
    country,
    region: defaultRegion(country),
    zipCode: "",
    strategy: "buy-hold",
  };
}

export function isPropertyIdentity(value: unknown): value is PropertyIdentity {
  if (!value || typeof value !== "object") return false;
  const v = value as PropertyIdentity;
  return (
    typeof v.name === "string" &&
    PROPERTY_TYPES.includes(v.propertyType) &&
    typeof v.bedrooms === "number" &&
    Number.isFinite(v.bedrooms) &&
    typeof v.bathrooms === "number" &&
    Number.isFinite(v.bathrooms) &&
    COUNTRIES.includes(v.country) &&
    typeof v.region === "string" &&
    v.region.length > 0 &&
    typeof v.zipCode === "string" &&
    STRATEGIES.includes(v.strategy)
  );
}

export function identityFromAnalysis(input: AnalysisInput): PropertyIdentity {
  return {
    name: input.property.name ?? "",
    propertyType: PROPERTY_TYPES.includes(input.property.propertyType) ? input.property.propertyType : "single-family",
    bedrooms: finiteCount(input.property.bedrooms, 3),
    bathrooms: finiteCount(input.property.bathrooms, 2),
    country: COUNTRIES.includes(input.location.country) ? input.location.country : "US",
    region: input.location.region || defaultRegion(input.location.country),
    zipCode: typeof input.property.zipCode === "string" ? input.property.zipCode : "",
    strategy: STRATEGIES.includes(input.strategy) ? input.strategy : "buy-hold",
  };
}

export function identityFromMaxOffer(input: MaxOfferInputs, fallbackCountry: CountryCode = "US"): PropertyIdentity {
  const country = COUNTRIES.includes(input.location?.country) ? input.location.country : fallbackCountry;
  return {
    name: input.property.name ?? "",
    propertyType: PROPERTY_TYPES.includes(input.property.propertyType) ? input.property.propertyType : "single-family",
    bedrooms: finiteCount(input.property.bedrooms, 3),
    bathrooms: finiteCount(input.property.bathrooms, 2),
    country,
    region: input.location?.region || defaultRegion(country),
    zipCode: typeof input.property.zipCode === "string" ? input.property.zipCode : "",
    strategy: STRATEGIES.includes(input.strategy) ? input.strategy : "brrrr",
  };
}

export function applyIdentityToAnalysis(input: AnalysisInput, identity: PropertyIdentity): AnalysisInput {
  const regionChanged = input.location.country !== identity.country || input.location.region !== identity.region;
  const profile = regionChanged ? getMarketProfile(identity.country, identity.region) : null;
  return {
    ...input,
    strategy: identity.strategy,
    location: {
      ...input.location,
      country: identity.country,
      region: identity.region,
      market: profile ? toMarketData(profile) : input.location.market,
    },
    property: {
      ...input.property,
      name: identity.name.trim() || input.property.name,
      propertyType: identity.propertyType,
      bedrooms: identity.bedrooms,
      bathrooms: identity.bathrooms,
      zipCode: identity.zipCode,
    },
  };
}

export function applyIdentityToMaxOffer(input: MaxOfferInputs, identity: PropertyIdentity): MaxOfferInputs {
  const regionChanged =
    input.location?.country !== identity.country || input.location?.region !== identity.region;
  const profile = regionChanged ? getMarketProfile(identity.country, identity.region) : null;
  const arv = typeof input.property.arv === "number" && input.property.arv > 0 ? input.property.arv : 0;
  return {
    ...input,
    strategy: identity.strategy,
    location: { country: identity.country, region: identity.region },
    property: {
      ...input.property,
      name: identity.name.trim() || input.property.name,
      propertyType: identity.propertyType,
      bedrooms: identity.bedrooms,
      bathrooms: identity.bathrooms,
      zipCode: identity.zipCode,
    },
    expenses: profile
      ? {
          ...input.expenses,
          propertyTaxAnnual:
            arv > 0 ? Math.round(arv * (profile.propertyTaxRate / 100)) : input.expenses.propertyTaxAnnual,
          insuranceAnnual: profile.insuranceAnnual,
        }
      : input.expenses,
  };
}

export function ensureRegionForCountry(country: CountryCode, region: string): string {
  const regions = getRegions(country);
  if (regions.some((r) => r.code === region)) return region;
  return regions[0]?.code ?? defaultRegion(country);
}

interface DraftShape {
  input?: unknown;
  savedId?: unknown;
}

function readUnsavedAnalysis(): AnalysisInput | null {
  const draft = readStorage<DraftShape | null>(STORAGE_KEYS.draft, null);
  if (!draft || draft.savedId !== null || !draft.input || typeof draft.input !== "object") return null;
  return draft.input as AnalysisInput;
}

function readUnsavedMaxOffer(): MaxOfferInputs | null {
  const draft = readStorage<DraftShape | null>(STORAGE_KEYS.maxOfferDraft, null);
  if (!draft || draft.savedId !== null || !draft.input || typeof draft.input !== "object") return null;
  return draft.input as MaxOfferInputs;
}

export function seedUnsavedAnalysis(input: AnalysisInput, fallbackCountry: CountryCode): AnalysisInput {
  return applyIdentityToAnalysis(input, resolvePropertyIdentity(fallbackCountry));
}

export function seedUnsavedMaxOffer(input: MaxOfferInputs, fallbackCountry: CountryCode): MaxOfferInputs {
  return applyIdentityToMaxOffer(input, resolvePropertyIdentity(fallbackCountry));
}

/** Prefer stored identity, then unsaved analysis, then unsaved max-offer. */
export function resolvePropertyIdentity(fallbackCountry: CountryCode): PropertyIdentity {
  const stored = readStorage<PropertyIdentity | null>(STORAGE_KEYS.propertyIdentity, null, (v): v is PropertyIdentity =>
    v === null ? false : isPropertyIdentity(v),
  );
  if (stored) return stored;
  const analysis = readUnsavedAnalysis();
  if (analysis?.property && analysis.location) return identityFromAnalysis(analysis);
  const maxOffer = readUnsavedMaxOffer();
  if (maxOffer?.property) return identityFromMaxOffer(maxOffer, fallbackCountry);
  return defaultPropertyIdentity(fallbackCountry);
}
