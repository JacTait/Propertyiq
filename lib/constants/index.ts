import type {
  AppSettings,
  CapRateBasis,
  Country,
  CurrencyCode,
  InvestmentStrategy,
  PropertyCondition,
  PropertyType,
  RentSourceKind,
  RentVerificationStatus,
  ResilienceShocks,
} from "@/lib/types";

export const APP_NAME = "PropertyIQ";
export const APP_TAGLINE = "Know your number before you make the offer.";
export const APP_VERSION = "0.1.0";

export const STORAGE_KEYS = {
  portfolio: "propertyiq:portfolio:v1",
  settings: "propertyiq:settings:v1",
  draft: "propertyiq:draft:v1",
  compare: "propertyiq:compare:v1",
  maxOfferDraft: "propertyiq:max-offer-draft:v1",
  buyBoxes: "propertyiq:buy-boxes:v1",
  propertyIdentity: "propertyiq:property-identity:v1",
  /** Cross-workflow shared deal. Existing draft keys are not bumped. */
  sharedDeal: "propertyiq:shared-deal:v1",
} as const;

export const SHARED_DEAL_SCHEMA_VERSION = 1;

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", currency: "USD", regionLabel: "State" },
  { code: "GB", name: "United Kingdom", currency: "GBP", regionLabel: "Region" },
  { code: "CA", name: "Canada", currency: "CAD", regionLabel: "Province / Territory" },
  { code: "AU", name: "Australia", currency: "AUD", regionLabel: "State / Territory" },
];

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "EUR", label: "Euro", symbol: "€" },
];

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "single-family", label: "Single Family Home" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "fourplex", label: "Fourplex" },
  { value: "multi-family", label: "Multi Family" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed-use", label: "Mixed Use" },
];

export const PROPERTY_CONDITIONS: {
  value: PropertyCondition;
  label: string;
  description: string;
}[] = [
  { value: "new-build", label: "New Build", description: "Brand new, no deferred maintenance" },
  { value: "excellent", label: "Excellent", description: "Recently renovated, move-in ready" },
  { value: "good", label: "Good", description: "Well maintained, minor cosmetic work" },
  { value: "needs-repair", label: "Needs Repair", description: "Functional but requires updates" },
  { value: "full-renovation", label: "Full Renovation", description: "Major structural or system work" },
];

export const STRATEGIES: {
  value: InvestmentStrategy;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    value: "buy-hold",
    label: "Buy & Hold Rental",
    short: "Buy & Hold",
    description: "Long-term rental income with appreciation and equity growth.",
  },
  {
    value: "short-term-rental",
    label: "Short-Term Rental",
    short: "STR / Airbnb",
    description: "Nightly bookings via Airbnb, VRBO and direct channels.",
  },
  {
    value: "brrrr",
    label: "BRRRR",
    short: "BRRRR",
    description: "Buy, Rehab, Rent, Refinance, Repeat — recycle your capital.",
  },
  {
    value: "fix-flip",
    label: "Fix & Flip",
    short: "Fix & Flip",
    description: "Renovate and resell for a short-term profit.",
  },
  {
    value: "commercial-lease",
    label: "Commercial Lease",
    short: "Commercial",
    description: "Lease to business tenants on long-term agreements.",
  },
];

export const DEAL_SCORE_WEIGHTS = {
  roi: 0.3,
  cashflow: 0.25,
  capRate: 0.2,
  dscr: 0.15,
  yield: 0.1,
} as const;

export const CHART_COLORS = {
  primary: "#3B82F6",
  primaryLight: "#5594F8",
  secondary: "#3B82F6",
  success: "#35C987",
  warning: "#E9A23B",
  danger: "#EB5757",
  muted: "#747C85",
  violet: "#3B82F6",
  cyan: "#35C987",
  pink: "#E9A23B",
  teal: "#35C987",
  orange: "#E9A23B",
} as const;

export const EXPENSE_PALETTE: string[] = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.violet,
  CHART_COLORS.cyan,
  CHART_COLORS.warning,
  CHART_COLORS.pink,
  CHART_COLORS.teal,
  CHART_COLORS.orange,
  CHART_COLORS.muted,
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "USD",
  theme: "dark",
  defaultCountry: "US",
  exportPreferences: {
    includeCharts: true,
    includeSummary: true,
    includeAmortization: false,
    paperSize: "a4",
  },
  numberFormatting: {
    style: "standard",
    decimals: 0,
    locale: "en-US",
  },
  activeBuyBoxId: "box_default",
};

export const PROJECTION_YEARS = 10;
export const DAYS_PER_MONTH = 30.42;
export const MAX_COMPARE = 3;

export const MAX_OFFER_CASHFLOW_PRESETS = [100, 200, 300, 400, 500, 750, 1000] as const;
export const MAX_OFFER_ROI_PRESETS = [5, 8, 10, 12, 15, 20] as const;

export const DEFAULT_REFINANCE_DSCR = 1.25;

export const REFINANCE_LTV_PRESETS = [70, 75, 80] as const;

export const RENT_SOURCE_KINDS: { value: RentSourceKind; label: string }[] = [
  { value: "housing-authority", label: "Housing Authority" },
  { value: "property-manager", label: "Property Manager" },
  { value: "local-comparable", label: "Local Comparable" },
  { value: "lease", label: "Lease" },
  { value: "listing", label: "Listing" },
  { value: "appraisal", label: "Appraisal" },
  { value: "user-estimate", label: "User Estimate" },
  { value: "other", label: "Other" },
];

export const RENT_VERIFICATION_STATUSES: { value: RentVerificationStatus; label: string }[] = [
  { value: "unverified", label: "Unverified" },
  { value: "user-verified", label: "User Verified" },
  { value: "third-party-verified", label: "Third-Party Verified" },
];

export const CAP_RATE_BASIS_OPTIONS: { value: CapRateBasis; label: string }[] = [
  { value: "purchase", label: "Purchase Price" },
  { value: "proposed-offer", label: "Proposed Offer" },
  { value: "asking", label: "Current Asking Price" },
  { value: "all-in", label: "All-In Cost" },
  { value: "arv", label: "ARV" },
];

export const DEFAULT_INVESTOR_TARGETS = {
  desiredMonthlyCashflow: 200,
  desiredRoi: 8,
  desiredCashOnCash: 8,
  minimumDscr: DEFAULT_REFINANCE_DSCR,
  safetyBufferPercent: 8,
} as const;

export const RESILIENCE_SHOCKS: Record<"best" | "expected" | "stress" | "worst", ResilienceShocks> = {
  best: { rentFactor: 1.05, rehabFactor: 0.9, vacancyDelta: -2, maintenanceDelta: -2, arvFactor: 1.05 },
  expected: { rentFactor: 1, rehabFactor: 1, vacancyDelta: 0, maintenanceDelta: 0, arvFactor: 1 },
  stress: { rentFactor: 0.9, rehabFactor: 1.15, vacancyDelta: 5, maintenanceDelta: 10, arvFactor: 0.95 },
  worst: { rentFactor: 0.8, rehabFactor: 1.25, vacancyDelta: 8, maintenanceDelta: 15, arvFactor: 0.9 },
};

export const RESILIENCE_WEIGHTS = {
  cashflow: 0.3,
  roi: 0.25,
  dscr: 0.25,
  refinance: 0.2,
} as const;

/** Worst-case shocks for Downside Analysis. Rent −15%, vacancy +10, maintenance +20, rehab +20, tax +10, insurance +15. */
export const DOWNSIDE_SHOCKS = {
  rentFactor: 0.85,
  rehabFactor: 1.2,
  vacancyDelta: 10,
  maintenanceDelta: 20,
  taxFactor: 1.1,
  insuranceFactor: 1.15,
} as const;

export const DOWNSIDE_WEIGHTS = {
  cashflow: 0.3,
  dscr: 0.25,
  margin: 0.2,
  refinance: 0.15,
  roi: 0.1,
} as const;
