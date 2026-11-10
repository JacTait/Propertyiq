import type {
  AppSettings,
  Country,
  CurrencyCode,
  InvestmentStrategy,
  PropertyCondition,
  PropertyType,
} from "@/lib/types";

export const APP_NAME = "PropertyIQ";
export const APP_TAGLINE = "AI-powered property investment analysis";

export const STORAGE_KEYS = {
  portfolio: "propertyiq:portfolio:v1",
  settings: "propertyiq:settings:v1",
  draft: "propertyiq:draft:v1",
  compare: "propertyiq:compare:v1",
  maxOfferDraft: "propertyiq:max-offer-draft:v1",
} as const;

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
  primary: "#6366f1",
  primaryLight: "#818cf8",
  secondary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#64748b",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  teal: "#14b8a6",
  orange: "#f97316",
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
};

export const PROJECTION_YEARS = 10;
export const DAYS_PER_MONTH = 30.42;
export const MAX_COMPARE = 3;

export const MAX_OFFER_CASHFLOW_PRESETS = [100, 200, 300, 400, 500, 750, 1000] as const;
export const MAX_OFFER_ROI_PRESETS = [5, 8, 10, 12, 15, 20] as const;
