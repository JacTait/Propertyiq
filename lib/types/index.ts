/* ------------------------------------------------------------------ */
/*  Location & market                                                  */
/* ------------------------------------------------------------------ */

export type CountryCode = "US" | "GB" | "CA" | "AU";

export interface Country {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  regionLabel: string;
}

export interface Region {
  code: string;
  name: string;
}

export interface MarketData {
  /** Annual property tax as a percentage of property value (e.g. 0.91). */
  propertyTaxRate: number;
  /** Estimated annual insurance premium in local currency. */
  insuranceAnnual: number;
  /** Expected annual appreciation percentage (e.g. 5.2). */
  appreciationRate: number;
  /** Typical gross rental yield percentage (e.g. 6.1). */
  rentalYield: number;
  /** Annual population growth percentage (e.g. 1.4). */
  populationGrowth: number;
  /** Median property value in local currency. */
  medianPropertyValue: number;
}

export interface RegionMarketProfile extends MarketData {
  country: CountryCode;
  regionCode: string;
  regionName: string;
}

/* ------------------------------------------------------------------ */
/*  Property                                                           */
/* ------------------------------------------------------------------ */

export type PropertyType =
  | "single-family"
  | "condo"
  | "townhouse"
  | "duplex"
  | "triplex"
  | "fourplex"
  | "multi-family"
  | "commercial"
  | "mixed-use";

export type PropertyCondition =
  | "new-build"
  | "excellent"
  | "good"
  | "needs-repair"
  | "full-renovation";

export type InvestmentStrategy =
  | "buy-hold"
  | "short-term-rental"
  | "brrrr"
  | "fix-flip"
  | "commercial-lease";

export type RentSource = "listing" | "verified" | "conservative";

export type RentSourceKind =
  | "housing-authority"
  | "property-manager"
  | "local-comparable"
  | "lease"
  | "listing"
  | "appraisal"
  | "user-estimate"
  | "other";

export type RentVerificationStatus = "unverified" | "user-verified" | "third-party-verified";

export type CapRateBasis = "purchase" | "proposed-offer" | "asking" | "all-in" | "arv";

export type RefinanceLimitFactor = "ltv" | "dscr" | "none";

export type QuickUnderwriteVerdict = "worth-pursuing" | "investigate" | "walk-away" | "insufficient-data";

export interface LocationInputs {
  country: CountryCode;
  region: string;
  market: MarketData;
}

export interface Property {
  name: string;
  address: string;
  city: string;
  zipCode: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  condition: PropertyCondition;
}

/** Identity fields shared across Deal Workspace, Max Offer, Quick Underwrite and Deal Resilience. */
export interface PropertyIdentity {
  name: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  country: CountryCode;
  region: string;
  zipCode: string;
  city: string;
  address: string;
  strategy: InvestmentStrategy;
}

/* ------------------------------------------------------------------ */
/*  Financing                                                          */
/* ------------------------------------------------------------------ */

export type InsuranceSource = "quote" | "estimate" | "previous";
export type RentEntryMode = "total" | "units";
/** Historical and current: closingCosts is exclusive of legal, inspection and loan fees. */
export type AcquisitionCostMode = "itemised";

export interface FinancingInputs {
  purchasePrice: number;
  /** Seller asking price. 0 means not provided — never inferred from defaults. */
  askingPrice: number;
  /** Optional bid the investor is considering. 0 means not provided. */
  proposedOffer: number;
  depositPercent: number;
  interestRate: number;
  termYears: number;
  closingCosts: number;
  legalFees: number;
  inspectionCosts: number;
  loanFees: number;
  /** Extra acquisition line. Defaults to 0 so legacy all-in is unchanged. */
  otherAcquisitionCosts: number;
}

export interface AmortizationEntry {
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationYear {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface Mortgage {
  loanAmount: number;
  depositAmount: number;
  interestRate: number;
  termYears: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  schedule: AmortizationEntry[];
  yearly: AmortizationYear[];
}

/* ------------------------------------------------------------------ */
/*  Income & expenses                                                  */
/* ------------------------------------------------------------------ */

export interface RentUnit {
  id: string;
  label: string;
  monthlyRent: number;
}

export interface IncomeInputs {
  /** Listing / advertised / projected monthly rent. */
  monthlyRent: number;
  /** Rent supported by comps or confirmation. */
  verifiedRent: number;
  /** Haircut rent used as the conservative underwrite. */
  conservativeRent: number;
  /** In-place / current gross monthly rent. Separate from advertised and conservative. */
  currentMonthlyRent: number;
  rentEntryMode: RentEntryMode;
  units: RentUnit[];
  rentSource: RentSource;
  rentSourceKind: RentSourceKind;
  rentSourceNotes: string;
  dateVerified: string;
  verificationStatus: RentVerificationStatus;
  otherMonthlyIncome: number;
  rentGrowthRate: number;
  /* Short-term rental */
  nightlyRate: number;
  occupancyRate: number;
  cleaningCostsMonthly: number;
  platformFeePercent: number;
}

export interface ExpenseInputs {
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  insuranceSource: InsuranceSource;
  hoaMonthly: number;
  managementPercent: number;
  vacancyPercent: number;
  maintenancePercent: number;
  capexPercent: number;
  waterMonthly: number;
  sewerMonthly: number;
  trashMonthly: number;
  sharedUtilitiesMonthly: number;
  /** Legacy combined utilities. Kept after migration so existing opex is unchanged. */
  utilitiesMonthly: number;
  otherMonthly: number;
  expenseGrowthRate: number;
}

export interface FlipInputs {
  renovationBudget: number;
  holdingCostsMonthly: number;
  financingCosts: number;
  sellingCostsPercent: number;
  realtorFeePercent: number;
  expectedSalePrice: number;
  holdDurationMonths: number;
  /** 0 means use duration × monthly holding cost. */
  holdingCostOverride: number;
}

export interface BrrrrInputs {
  rehabCost: number;
  afterRepairValue: number;
  refinanceLtv: number;
  refinanceRate: number;
  refinanceTermYears: number;
  expectedRent: number;
  refinanceDscrMin: number;
  otherRehabCosts: number;
  refinanceClosingCosts: number;
  refinanceNotes: string;
  /** 0 means derive from the acquisition loan. */
  loanPayoffAmount: number;
}

export interface GuidelineAdditionalCosts {
  closingCosts: boolean;
  legalFees: boolean;
  inspectionCosts: boolean;
  loanFees: boolean;
  otherAcquisitionCosts: boolean;
  holdingCosts: boolean;
}

/**
 * Scenario pack. `null` on vacancy / insurance / maintenance / capex inherits the main assumption.
 * Adjustment percents are labelled changes vs the main case (0 = no change).
 */
export interface ScenarioAssumptions {
  rentAdjustmentPercent: number;
  vacancyPercent: number | null;
  annualInsurance: number | null;
  maintenancePercent: number | null;
  capexPercent: number | null;
  rehabOverrunPercent: number;
  arvAdjustmentPercent: number;
}

export type DealScenarioKey = "base" | "conservative" | "stress";

export interface DealDecisionInputs {
  advertisedArv: number;
  conservativeArv: number;
  rehabContingencyPercent: number;
  targetArvPercent: number;
  includeAdditionalCostsInGuideline: boolean;
  guidelineAdditionalCosts: GuidelineAdditionalCosts;
  acquisitionCostMode: AcquisitionCostMode;
  scenarios: Record<DealScenarioKey, ScenarioAssumptions>;
  capRateBasis: CapRateBasis;
  /** 0 means no cash-left-in-deal target is configured. */
  targetCashLeftInDeal: number;
}

export interface NeighbourhoodInputs {
  name: string;
  zipCode: string;
  userEnteredMarketRent: number;
  typicalRentLow: number;
  typicalRentHigh: number;
  propertyTaxEstimate: number;
  insuranceEstimate: number;
  vacancyAssumption: number;
  investorNotes: string;
  dataSourceLabel: string;
  lastUpdated: string;
}

export interface AnalysisInput {
  location: LocationInputs;
  property: Property;
  strategy: InvestmentStrategy;
  financing: FinancingInputs;
  income: IncomeInputs;
  expenses: ExpenseInputs;
  flip: FlipInputs;
  brrrr: BrrrrInputs;
  decision: DealDecisionInputs;
  neighbourhood: NeighbourhoodInputs;
}

/* ------------------------------------------------------------------ */
/*  Results                                                            */
/* ------------------------------------------------------------------ */

export interface ExpenseBreakdownItem {
  key: string;
  label: string;
  annual: number;
  monthly: number;
}

export interface ProjectionData {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualIncome: number;
  annualExpenses: number;
  annualDebtService: number;
  annualCashflow: number;
  cumulativeCashflow: number;
  principalPaid: number;
  appreciationGain: number;
  totalReturn: number;
  roi: number;
}

export interface ProjectionSummary {
  years: number;
  propertyValue: number;
  equity: number;
  equityGain: number;
  cumulativeCashflow: number;
  totalReturn: number;
  roi: number;
  annualisedRoi: number;
}

export interface ShortTermRentalResults {
  monthlyRevenue: number;
  annualRevenue: number;
  platformFeesAnnual: number;
  cleaningCostsAnnual: number;
  operatingExpensesAnnual: number;
  noi: number;
  annualProfit: number;
  monthlyCashflow: number;
  annualCashflow: number;
  capRate: number;
  roi: number;
  occupiedNightsPerYear: number;
}

export interface FixFlipResults {
  acquisitionCosts: number;
  renovationBudget: number;
  holdingCosts: number;
  financingCosts: number;
  sellingCosts: number;
  totalInvestment: number;
  cashInvested: number;
  profit: number;
  profitMargin: number;
  roi: number;
  annualisedRoi: number;
  breakEvenSalePrice: number;
  holdDurationMonths: number;
}

export interface BrrrrResults {
  totalProjectCost: number;
  initialCashInvested: number;
  refinanceAmount: number;
  cashPulledOut: number;
  cashLeftInDeal: number;
  newMonthlyPayment: number;
  monthlyCashflow: number;
  annualCashflow: number;
  roi: number;
  equityAfterRefinance: number;
  efficiencyScore: number;
  infiniteReturn: boolean;
}

export type DealGrade = "elite" | "excellent" | "good" | "average" | "avoid";

export type Recommendation =
  | "Elite Opportunity"
  | "Strong Buy"
  | "Buy"
  | "Neutral"
  | "High Risk"
  | "Avoid";

export interface DealScoreComponent {
  key: "roi" | "cashflow" | "capRate" | "dscr" | "yield";
  label: string;
  weight: number;
  rawValue: number;
  score: number;
  weighted: number;
  description: string;
}

export interface DealScore {
  score: number;
  grade: DealGrade;
  gradeLabel: string;
  recommendation: Recommendation;
  components: DealScoreComponent[];
  headline: string;
}

export interface AnalysisResults {
  strategy: InvestmentStrategy;
  mortgage: Mortgage;
  cashToClose: number;
  totalCashInvested: number;
  monthlyIncome: number;
  annualIncome: number;
  effectiveGrossIncome: number;
  vacancyLoss: number;
  operatingExpensesMonthly: number;
  operatingExpensesAnnual: number;
  expenseBreakdown: ExpenseBreakdownItem[];
  noi: number;
  annualDebtService: number;
  monthlyCashflow: number;
  annualCashflow: number;
  grossYield: number;
  netYield: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  breakEvenOccupancy: number;
  roi: number;
  projections: ProjectionData[];
  fiveYear: ProjectionSummary;
  tenYear: ProjectionSummary;
  shortTermRental: ShortTermRentalResults | null;
  fixFlip: FixFlipResults | null;
  brrrr: BrrrrResults | null;
  dealScore: DealScore;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Portfolio                                                          */
/* ------------------------------------------------------------------ */

export type RefinanceStatus = "viable" | "risk" | "n/a";
export type BuyBoxStatus = "inside" | "outside" | "no-profile";

export interface PortfolioSnapshot {
  purchasePrice: number;
  roi: number;
  cashOnCash: number;
  capRate: number;
  grossYield: number;
  netYield: number;
  monthlyCashflow: number;
  annualCashflow: number;
  dscr: number;
  appreciationRate: number;
  dealScore: number;
  grade: DealGrade;
  recommendation: Recommendation;
  resilienceScore?: number;
  marginOfSafetyPercent?: number;
  refinanceStatus?: RefinanceStatus;
  buyBoxStatus?: BuyBoxStatus;
  allInCost?: number | null;
  conservativeMonthlyCashflow?: number | null;
  stressMonthlyCashflow?: number | null;
  guidelineMaxOffer?: number | null;
  /** Descriptive Deal Workspace margin status. Absent on legacy records. */
  marginForErrorLabel?: string;
  quickVerdict?: QuickUnderwriteVerdict;
  verifiedRent?: number;
  supportedRefinanceLoan?: number;
  postRefinanceDscr?: number | null;
  cashLeftInDeal?: number;
  proposedOffer?: number;
  dealSurvivalScore?: number;
  primaryRisk?: string;
  worstCaseCashflow?: number;
  worstCaseDscr?: number;
  worstCaseRoi?: number;
}

export type PortfolioKind = "analysis" | "max-offer" | "quick-underwrite";

export type OriginWorkflow =
  | "quick-underwrite"
  | "standard-analysis"
  | "max-offer"
  | "deal-resilience"
  | "downside-analysis";

export interface PortfolioProperty {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  country: CountryCode;
  region: string;
  regionName: string;
  strategy: InvestmentStrategy;
  input: AnalysisInput;
  snapshot: PortfolioSnapshot;
  /** Absent on legacy records — treated as `"analysis"`. */
  kind?: PortfolioKind;
  /** Present when `kind` is `"max-offer"` so the analyser can round-trip. */
  maxOfferInput?: MaxOfferInputs;
  /** Shared-deal schema version persisted with the property. Absent on legacy records. */
  schemaVersion?: number;
  /** Workflow the user last edited before saving. Absent on legacy records. */
  originWorkflow?: OriginWorkflow;
  /** Buy Box selected while this deal was underwritten. Absent on legacy records. */
  activeBuyBoxId?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Charts                                                             */
/* ------------------------------------------------------------------ */

export interface ChartDatum {
  name: string;
  value: number;
  color?: string;
}

export interface IncomeExpenseChartDatum {
  name: string;
  income: number;
  expenses: number;
  debtService: number;
  cashflow: number;
}

export interface EquityChartDatum {
  year: string;
  equity: number;
  propertyValue: number;
  loanBalance: number;
}

export interface CashflowChartDatum {
  year: string;
  cashflow: number;
  cumulative: number;
}

export interface AmortizationChartDatum {
  year: string;
  principal: number;
  interest: number;
  balance: number;
}

export type ChartData =
  | ChartDatum[]
  | IncomeExpenseChartDatum[]
  | EquityChartDatum[]
  | CashflowChartDatum[]
  | AmortizationChartDatum[];

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

export type CurrencyCode = "USD" | "GBP" | "CAD" | "AUD" | "EUR";

export type ThemePreference = "dark" | "light" | "system";

export type NumberFormatStyle = "standard" | "compact";

export type PaperSize = "a4" | "letter";

export interface ExportPreferences {
  includeCharts: boolean;
  includeSummary: boolean;
  includeAmortization: boolean;
  paperSize: PaperSize;
}

export interface NumberFormatting {
  style: NumberFormatStyle;
  decimals: number;
  locale: string;
}

export interface AppSettings {
  currency: CurrencyCode;
  theme: ThemePreference;
  defaultCountry: CountryCode;
  exportPreferences: ExportPreferences;
  numberFormatting: NumberFormatting;
  activeBuyBoxId: string | null;
}

/* ------------------------------------------------------------------ */
/*  AI summary                                                         */
/* ------------------------------------------------------------------ */

export interface SummarySection {
  key: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  tone: "positive" | "neutral" | "negative";
}

export interface InvestmentSummary {
  headline: string;
  recommendation: Recommendation;
  sections: SummarySection[];
  strengths: string[];
  weaknesses: string[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Max Offer Analyser                                                 */
/* ------------------------------------------------------------------ */

export interface MaxOfferPropertyInputs {
  name: string;
  arv: number;
  expectedMonthlyRent: number;
  rehabBudget: number;
  closingCosts: number;
  holdingCosts: number;
  askingPrice: number;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  zipCode: string;
}

export interface MaxOfferFinancingInputs {
  interestRate: number;
  termYears: number;
  loanToValue: number;
  downPaymentPercent: number;
  loanFees: number;
}

export interface MaxOfferExpenseInputs {
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  managementPercent: number;
  vacancyPercent: number;
  maintenancePercent: number;
  capexPercent: number;
  hoaMonthly: number;
  otherMonthly: number;
}

export interface MaxOfferTargetInputs {
  desiredMonthlyCashflow: number;
  desiredRoi: number;
  desiredCashOnCash: number;
  minimumDscr: number;
  safetyBufferPercent: number;
}

export interface MaxOfferBrrrrInputs {
  refinanceLtv: number;
  refinanceRate: number;
}

export interface MaxOfferInputs {
  property: MaxOfferPropertyInputs;
  location: Pick<LocationInputs, "country" | "region">;
  strategy: InvestmentStrategy;
  financing: MaxOfferFinancingInputs;
  expenses: MaxOfferExpenseInputs;
  targets: MaxOfferTargetInputs;
  brrrr: MaxOfferBrrrrInputs;
}

export type OfferConstraintKey = "cashflow" | "roi" | "cashOnCash" | "dscr";

export type OfferTier = "excellent" | "good" | "maximum" | "too-expensive";

export interface OfferDealMetrics {
  purchasePrice: number;
  loanAmount: number;
  downPayment: number;
  monthlyPayment: number;
  annualDebtService: number;
  monthlyIncome: number;
  annualIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpensesAnnual: number;
  noi: number;
  monthlyCashflow: number;
  annualCashflow: number;
  cashInvested: number;
  roi: number;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  grossYield: number;
  principalYearOne: number;
}

export interface OfferScenario {
  key: "excellent" | "recommended" | "maximum" | "asking";
  label: string;
  purchasePrice: number;
  monthlyCashflow: number;
  roi: number;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  recommendation: string;
}

export interface OfferRecommendation {
  tier: OfferTier;
  title: string;
  headline: string;
  body: string;
}

export interface OfferConstraint {
  key: OfferConstraintKey;
  label: string;
  maxPurchasePrice: number;
  isLimiting: boolean;
}

export interface MaxOfferBrrrrResults {
  totalProjectCost: number;
  initialCashInvested: number;
  refinanceAmount: number;
  cashPulledOut: number;
  cashLeftInDeal: number;
  cashRecoveryPercent: number;
  /** Post-refinance monthly cash flow: (NOI − refinance ADS) / 12. Not acquisition cash flow. */
  monthlyCashflow: number;
  postRefiDscr: number;
  annualRefinanceDebtService: number;
  efficiencyScore: number;
  infiniteReturn: boolean;
}

export interface MaxOfferSummary {
  headline: string;
  bullets: string[];
  closing: string;
  generatedAt: string;
}

export interface PriceMetricPoint {
  purchasePrice: number;
  monthlyCashflow: number;
  roi: number;
  dscr: number;
  capRate: number;
}

export interface MaxOfferResults {
  feasible: boolean;
  maximumOffer: number;
  recommendedOffer: number;
  excellentOffer: number;
  goodOffer: number;
  safetyMargin: number;
  safetyMarginPercent: number;
  limitingConstraint: OfferConstraintKey | null;
  constraints: OfferConstraint[];
  atMaximum: OfferDealMetrics;
  atRecommended: OfferDealMetrics;
  recommendation: OfferRecommendation;
  scenarios: OfferScenario[];
  curve: PriceMetricPoint[];
  brrrr: MaxOfferBrrrrResults;
  summary: MaxOfferSummary;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Buy Box                                                            */
/* ------------------------------------------------------------------ */

export interface BuyBoxProfile {
  id: string;
  name: string;
  propertyTypes: PropertyType[];
  minBedrooms: number;
  maxPurchasePrice: number;
  minRent: number;
  minArv: number;
  maxArv: number;
  zipCodes: string[];
  targetZipCodes: string[];
  strategies: InvestmentStrategy[];
  createdAt: string;
  updatedAt: string;
}

export type BuyBoxReasonTone = "fail" | "warn" | "pass";

export interface BuyBoxReason {
  key: string;
  tone: BuyBoxReasonTone;
  message: string;
}

export interface BuyBoxSubject {
  propertyType?: PropertyType;
  bedrooms?: number;
  purchasePrice: number;
  askingPrice?: number;
  monthlyRent: number;
  arv: number;
  zipCode?: string;
  strategy: InvestmentStrategy;
}

export interface BuyBoxMatch {
  status: BuyBoxStatus;
  inside: boolean;
  profileId: string | null;
  profileName: string | null;
  reasons: BuyBoxReason[];
}

/* ------------------------------------------------------------------ */
/*  Rent resolution                                                    */
/* ------------------------------------------------------------------ */

export interface ResolvedRent {
  listing: number;
  verified: number;
  conservative: number;
  source: RentSource;
  active: number;
}

/* ------------------------------------------------------------------ */
/*  Deal resilience                                                    */
/* ------------------------------------------------------------------ */

export type ResilienceScenarioKey = "best" | "expected" | "stress" | "worst";

export type ResilienceGrade = "very-resilient" | "resilient" | "acceptable" | "fragile" | "high-risk";

export interface ResilienceShocks {
  rentFactor: number;
  rehabFactor: number;
  vacancyDelta: number;
  maintenanceDelta: number;
  arvFactor: number;
}

export interface ResilienceScenarioMetrics {
  key: ResilienceScenarioKey;
  label: string;
  shocks: ResilienceShocks;
  /** Pre-refinance monthly cash flow. Same phase as `dscr`. */
  monthlyCashflow: number;
  annualCashflow: number;
  roi: number;
  cashOnCash: number;
  /** Pre-refinance DSCR. Same phase as `monthlyCashflow`. */
  dscr: number;
  capRate: number;
  refinanceViable: boolean;
  preRefiMonthlyCashflow: number;
  postRefiMonthlyCashflow: number;
  preRefiDscr: number;
  postRefiDscr: number;
}

export interface ResilienceComponentScore {
  key: "cashflow" | "roi" | "dscr" | "refinance";
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface SensitivityPoint {
  changePercent: number;
  monthlyCashflow: number;
  roi: number;
  dscr: number;
}

/** Rehab overruns change capital, not rental cash flow. */
export interface RehabSensitivityPoint {
  changePercent: number;
  rehabCost: number;
  totalCashInvested: number;
  remainingRehabHeadroom: number | null;
}

export interface DealResilienceResults {
  score: number;
  grade: ResilienceGrade;
  gradeLabel: string;
  scenarios: ResilienceScenarioMetrics[];
  components: ResilienceComponentScore[];
  rentSensitivity: SensitivityPoint[];
  rehabSensitivity: RehabSensitivityPoint[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Downside analysis / deal survival                                  */
/* ------------------------------------------------------------------ */

export type DealSurvivalGrade = "very-defensive" | "defensive" | "acceptable" | "exposed" | "high-risk";

export type DealSurvivalVerdict = "likely" | "significant-risk" | "unlikely";

export type DownsideRiskCategory = "cashflow" | "dscr" | "margin" | "refinance" | "roi";

export interface DownsideShocks {
  rentFactor: number;
  rehabFactor: number;
  vacancyDelta: number;
  maintenanceDelta: number;
  taxFactor: number;
  insuranceFactor: number;
}

export interface DownsideComponentScore {
  key: DownsideRiskCategory;
  label: string;
  score: number;
  weight: number;
  detail: string;
  rawInput: string;
  threshold: string;
  contribution: number;
}

export interface DownsideWorstCase {
  monthlyCashflow: number;
  annualCashflow: number;
  roi: number;
  cashOnCash: number;
  dscr: number;
}

export interface DealSurvivalTest {
  cashflowPass: boolean;
  dscrPass: boolean;
  roiPass: boolean;
  failCount: number;
  verdict: DealSurvivalVerdict;
  verdictLabel: string;
}

export interface DownsideAnalysisResults {
  score: number;
  grade: DealSurvivalGrade;
  gradeLabel: string;
  primaryRisk: DownsideRiskCategory;
  primaryRiskLabel: string;
  components: DownsideComponentScore[];
  worstCase: DownsideWorstCase;
  survival: DealSurvivalTest;
  marginOfSafetyPercent: number;
  marginReady: boolean;
  desiredMonthlyCashflow: number;
  postRefinanceDscr: number;
  shocks: DownsideShocks;
  assessment: string;
  rentSensitivity: SensitivityPoint[];
  vacancySensitivity: SensitivityPoint[];
  rehabSensitivity: RehabSensitivityPoint[];
  refinanceSensitivity: SensitivityPoint[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Refinance validator                                                */
/* ------------------------------------------------------------------ */

export interface RefinanceValidation {
  arv: number;
  refinanceLtv: number;
  interestRate: number;
  termYears: number;
  dscrRequirement: number;
  maximumRefinanceAmount: number;
  loanAmount: number;
  monthlyPayment: number;
  totalProjectCost: number;
  totalCapitalInvested: number;
  originalLoanPayoff: number;
  cashPulledOut: number;
  cashLeftInDeal: number;
  postRefiDscr: number;
  postRefiMonthlyCashflow: number;
  viable: boolean;
  status: RefinanceStatus;
  headline: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/*  Margin of safety                                                   */
/* ------------------------------------------------------------------ */

export type SafetyRating = "excellent" | "strong" | "good" | "weak" | "danger";

export type UnderwrittenPriceSource = "purchase" | "proposed" | "asking";

export type MarginPriceSource = UnderwrittenPriceSource;

export interface UnderwrittenPrice {
  value: number | null;
  source: UnderwrittenPriceSource | null;
  label: string;
}

export interface CurrentDealPrice {
  price: number;
  source: MarginPriceSource;
  label: string;
}

export type PriceVsMaximumStatus = "above-maximum" | "below-maximum" | "at-maximum" | "not-entered";

export interface PriceVsMaximumOffer {
  key: "asking" | "proposed" | "purchase";
  label: string;
  differenceLabel: string;
  price: number;
  entered: boolean;
  maximumOffer: number | null;
  difference: number | null;
  status: PriceVsMaximumStatus;
  statusLabel: string;
}

export type OfferCeilingSource = "supplied" | "reconstructed-default-targets";

export interface MarginOfSafety {
  ready: boolean;
  priceSource: MarginPriceSource | null;
  priceSourceLabel: string;
  /** Current asking or purchase price used in the comparison. 0 when awaiting input. */
  currentPrice: number;
  purchasePrice: number;
  recommendedOffer: number;
  maximumOffer: number;
  offerCeilingSource: OfferCeilingSource;
  dollarCushion: number;
  percent: number;
  rating: SafetyRating | null;
  ratingLabel: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/*  Deal killers & underwriting summary                                */
/* ------------------------------------------------------------------ */

export type DealKillerSeverity = "critical" | "warning" | "info";

export interface DealKillerWarning {
  key: string;
  severity: DealKillerSeverity;
  title: string;
  detail: string;
}

export interface UnderwritingSummary {
  headline: string;
  paragraphs: string[];
  bullets: string[];
  resilienceScore: number;
  assessment: string;
  generatedAt: string;
  dealSurvivalScore: number;
  primaryRisk: string;
  worstCaseCashflow: number;
  worstCaseDscr: number;
  worstCaseRoi: number;
  dealSurvivalVerdict: string;
}

export interface UnderwritingPack {
  rent: ResolvedRent;
  buyBox: BuyBoxMatch;
  refinance: RefinanceValidation;
  resilience: DealResilienceResults;
  downside: DownsideAnalysisResults;
  margin: MarginOfSafety;
  warnings: DealKillerWarning[];
  summary: UnderwritingSummary;
}

/* ------------------------------------------------------------------ */
/*  Quick Underwrite                                                   */
/* ------------------------------------------------------------------ */

export interface QuickRentResolution {
  listing: number;
  verified: number;
  conservative: number;
  source: RentSource;
  active: number;
  label: string;
  basisLabel: string;
}

export interface PriceSource {
  value: number | null;
  source: "purchase" | "proposed-offer" | "asking" | "none";
  label: string;
}

export interface AllInCostBreakdown {
  ready: boolean;
  acquisitionPriceUsed: number | null;
  acquisitionPriceSource: PriceSource;
  estimatedRehab: number;
  rehabContingencyAmount: number;
  adjustedRehabBudget: number;
  otherRehabCosts: number;
  closingCosts: number;
  inspectionCosts: number;
  legalFees: number;
  loanFees: number;
  calculatedHoldingCost: number;
  holdingCostOverride: number;
  holdingCostsUsed: number;
  holdingCostSource: "calculated" | "override";
  otherAcquisitionCosts: number;
  total: number | null;
  message: string | null;
}

export interface QuickOperatingStatement {
  activeMonthlyRent: number;
  vacancyAllowance: number;
  effectiveMonthlyIncome: number;
  managementCost: number;
  maintenanceReserve: number;
  capexReserve: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyUtilities: number;
  otherMonthlyExpenses: number;
  totalMonthlyOperatingExpenses: number;
  monthlyNoi: number;
  annualNoi: number;
}

export interface QuickRefinanceResults {
  arv: number;
  refinanceLtv: number;
  interestRate: number;
  termYears: number;
  requiredDscr: number;
  refinanceClosingCosts: number;
  ltvBasedMaximumLoan: number;
  dscrSupportedMaximumLoan: number | null;
  supportedRefinanceLoan: number;
  limitingFactor: RefinanceLimitFactor;
  limitingLabel: string;
  monthlyPayment: number;
  postRefiDscr: number | null;
  postRefiDscrLabel: string;
  loanPayoffAmount: number;
  loanPayoffDerived: boolean;
}

export interface CashRecoveryResults {
  totalProjectCost: number;
  investorCashInvested: number;
  totalCapitalInvested: number;
  grossRefinanceProceeds: number;
  netRefinanceProceeds: number;
  cashRecovered: number;
  excessCashOut: number;
  cashLeftInDeal: number;
  cashRecoveryPercent: number | null;
}

export interface QuickVerdictRule {
  key: string;
  label: string;
  passed: boolean;
  applicable: boolean;
  detail: string;
}

export interface QuickUnderwriteVerdictResult {
  verdict: QuickUnderwriteVerdict;
  label: string;
  summary: string;
  rules: QuickVerdictRule[];
}

export interface UnderwritingWarning {
  key: string;
  severity: DealKillerSeverity;
  title: string;
  detail: string;
}

export interface QuickDownsideSnapshot {
  expectedCashflow: number;
  stressCashflow: number;
  expectedDscr: number;
  stressDscr: number;
  expectedRoi: number;
  stressRoi: number;
  dealSurvivalScore: number;
  primaryRisk: string;
  components: DownsideComponentScore[];
}

export interface QuickUnderwriteResults {
  rent: QuickRentResolution;
  acquisitionPrice: PriceSource;
  underwrittenPrice: number | null;
  underwrittenPriceSource: UnderwrittenPriceSource | null;
  priceComparisons: PriceVsMaximumOffer[];
  allIn: AllInCostBreakdown;
  operating: QuickOperatingStatement;
  acquisitionMonthlyPayment: number;
  monthlyCashflow: number | null;
  annualCashflow: number | null;
  capRate: number | null;
  capRateBasis: CapRateBasis;
  capRateBasisLabel: string;
  cashOnCash: number | null;
  refinance: QuickRefinanceResults;
  cashRecovery: CashRecoveryResults | null;
  buyBox: BuyBoxMatch;
  marginOfSafetyPercent: number | null;
  maximumOffer: number | null;
  downside: QuickDownsideSnapshot | null;
  verdict: QuickUnderwriteVerdictResult;
  warnings: UnderwritingWarning[];
  missing: string[];
  generatedAt: string;
}
