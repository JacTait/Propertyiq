import { STORAGE_KEYS } from "@/lib/constants";

/**
 * PropertyIQ currently stores deal data in this browser. That is a device
 * cache, not a secure identity boundary. A Payhip licence session proves
 * access; it does not own these records yet.
 *
 * When a hosted database (Supabase or similar) is introduced, persist each
 * customer's data against `CustomerIdentity.accessId` (and optionally email)
 * instead of anonymous localStorage keys. Do not bump the existing keys below
 * until that migration lands.
 */
export type DataPersistenceTarget = "browser-device" | "customer-account";

export const CURRENT_DATA_PERSISTENCE: DataPersistenceTarget = "browser-device";

export interface CustomerIdentity {
  accessId: string;
  email: string;
}

/** Local records that must survive sign-out / deactivate-this-browser. */
export const BROWSER_OWNED_STORAGE_KEYS = {
  sharedDeal: STORAGE_KEYS.sharedDeal,
  portfolio: STORAGE_KEYS.portfolio,
  buyBoxes: STORAGE_KEYS.buyBoxes,
  settings: STORAGE_KEYS.settings,
  draft: STORAGE_KEYS.draft,
  maxOfferDraft: STORAGE_KEYS.maxOfferDraft,
  propertyIdentity: STORAGE_KEYS.propertyIdentity,
  compare: STORAGE_KEYS.compare,
} as const;

export function customerRecordKey(identity: CustomerIdentity, collection: string): string {
  return `customer:${identity.accessId}:${collection}`;
}
