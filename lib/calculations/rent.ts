import type { AnalysisInput, RentSource, ResolvedRent } from "@/lib/types";

export { normalizeAnalysisInput } from "@/lib/calculations/normalize-input";

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
