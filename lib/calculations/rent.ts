import type { AnalysisInput, RentSource, ResolvedRent } from "@/lib/types";
import { clamp } from "@/lib/calculations/ratios";

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundRent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 25) * 25;
}

export function resolveRent(input: AnalysisInput): ResolvedRent {
  const listing = Math.max(0, finite(input.income.monthlyRent));
  const verifiedRaw = finite(input.income.verifiedRent);
  const conservativeRaw = finite(input.income.conservativeRent);
  const verified = verifiedRaw > 0 ? verifiedRaw : listing;
  const conservative = conservativeRaw > 0 ? conservativeRaw : roundRent(verified * 0.9);
  const source: RentSource =
    input.income.rentSource === "listing" || input.income.rentSource === "conservative"
      ? input.income.rentSource
      : "verified";
  const active = source === "listing" ? listing : source === "conservative" ? conservative : verified;
  return { listing, verified, conservative, source, active };
}

/** Clone the input with listing + BRRRR expected rent replaced by the active rent source. */
export function applyActiveRent(input: AnalysisInput): AnalysisInput {
  const rent = resolveRent(input);
  return {
    ...input,
    income: { ...input.income, monthlyRent: rent.active },
    brrrr: { ...input.brrrr, expectedRent: rent.active },
  };
}

function cleanObject<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "number") {
      out[key] = Number.isFinite(value) ? value : 0;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = cleanObject(value as object);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/** Fill fields added in v1.2 and replace NaN so legacy drafts keep working. */
export function normalizeAnalysisInput(input: AnalysisInput): AnalysisInput {
  const clean = cleanObject(input);
  const listing = Math.max(0, finite(clean.income.monthlyRent));
  const verifiedRaw = finite(clean.income.verifiedRent);
  const conservativeRaw = finite(clean.income.conservativeRent);
  const fallbackVerified =
    clean.strategy === "brrrr" && finite(clean.brrrr.expectedRent) > 0 ? finite(clean.brrrr.expectedRent) : listing;
  const verified = verifiedRaw > 0 ? verifiedRaw : fallbackVerified;
  const conservative = conservativeRaw > 0 ? conservativeRaw : roundRent(verified * 0.9);
  const source: RentSource =
    clean.income.rentSource === "listing" || clean.income.rentSource === "conservative"
      ? clean.income.rentSource
      : "verified";
  const dscrMin = finite(clean.brrrr.refinanceDscrMin);
  return {
    ...clean,
    property: {
      ...clean.property,
      zipCode: typeof clean.property.zipCode === "string" ? clean.property.zipCode : "",
    },
    income: {
      ...clean.income,
      monthlyRent: listing,
      verifiedRent: verified,
      conservativeRent: conservative,
      rentSource: source,
    },
    financing: {
      ...clean.financing,
      askingPrice: Math.max(0, finite(clean.financing.askingPrice)),
    },
    brrrr: {
      ...clean.brrrr,
      refinanceDscrMin: dscrMin > 0 ? clamp(dscrMin, 0, 5) : 1.25,
    },
  };
}
