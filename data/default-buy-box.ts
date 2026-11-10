import type { BuyBoxProfile } from "@/lib/types";

export const DEFAULT_BUY_BOX_ID = "box_default";

const DEFAULT_TIMESTAMP = "2026-01-01T00:00:00.000Z";

export function createDefaultBuyBox(): BuyBoxProfile {
  return {
    id: DEFAULT_BUY_BOX_ID,
    name: "Primary Buy Box",
    propertyTypes: ["single-family", "townhouse", "duplex"],
    minBedrooms: 2,
    maxPurchasePrice: 400_000,
    minRent: 1_200,
    minArv: 0,
    maxArv: 550_000,
    zipCodes: [],
    targetZipCodes: [],
    strategies: ["brrrr", "buy-hold"],
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

export const DEFAULT_BUY_BOXES: BuyBoxProfile[] = [createDefaultBuyBox()];

export function emptyBuyBoxDraft(): Omit<BuyBoxProfile, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "New Buy Box",
    propertyTypes: ["single-family"],
    minBedrooms: 2,
    maxPurchasePrice: 350_000,
    minRent: 1_200,
    minArv: 0,
    maxArv: 450_000,
    zipCodes: [],
    targetZipCodes: [],
    strategies: ["brrrr"],
  };
}
