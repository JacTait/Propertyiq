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

export interface LocationInputs {
  country: CountryCode;
  region: string;
  market: MarketData;
}

export interface Property {
  name: string;
  address: string;
  zipCode: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize: number;
  yearBuilt: number;
  condition: PropertyCondition;
}

/* ------------------------------------------------------------------ */
/*  Financing                                                          */
/* ------------------------------------------------------------------ */

export interface FinancingInputs {
  purchasePrice: number;
  /** Seller asking price. 0 means not provided — never inferred from defaults. */
  askingPrice: number;
  depositPercent: number;
  interestRate: number;
  termYears: number;
  closingCosts: number;
  legalFees: number;
  inspectionCosts: number;
  loanFees: number;
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

export interface IncomeInputs {
  /** Listing / advertised monthly rent. */
  monthlyRent: number;
  /** Rent supported by comps or confirmation. Used for analysis by default. */
  verifiedRent: number;
  /** Haircut rent used as a conservative underwrite. */
  conservativeRent: number;
  rentSource: RentSource;
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
  hoaMonthly: number;
  managementPercent: number;
  vacancyPercent: number;
  maintenancePercent: number;
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
}

export interface BrrrrInputs {
  rehabCost: number;
  afterRepairValue: number;
  refinanceLtv: number;
  refinanceRate: number;
  refinanceTermYears: number;
  expectedRent: number;
  refinanceDscrMin: number;
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
}

export type PortfolioKind = "analysis" | "max-offer";

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
  monthlyCashflow: number;
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
  monthlyCashflow: number;
  annualCashflow: number;
  roi: number;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  refinanceViable: boolean;
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

export interface DealResilienceResults {
  score: number;
  grade: ResilienceGrade;
  gradeLabel: string;
  scenarios: ResilienceScenarioMetrics[];
  components: ResilienceComponentScore[];
  rentSensitivity: SensitivityPoint[];
  rehabSensitivity: SensitivityPoint[];
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

export type MarginPriceSource = "asking" | "purchase";

export interface CurrentDealPrice {
  price: number;
  source: MarginPriceSource;
  label: string;
}

export interface MarginOfSafety {
  ready: boolean;
  priceSource: MarginPriceSource | null;
  priceSourceLabel: string;
  /** Current asking or purchase price used in the comparison. 0 when awaiting input. */
  currentPrice: number;
  purchasePrice: number;
  recommendedOffer: number;
  maximumOffer: number;
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
}

export interface UnderwritingPack {
  rent: ResolvedRent;
  buyBox: BuyBoxMatch;
  refinance: RefinanceValidation;
  resilience: DealResilienceResults;
  margin: MarginOfSafety;
  warnings: DealKillerWarning[];
  summary: UnderwritingSummary;
}
