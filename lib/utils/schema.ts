import { z } from "zod";

const money = (label: string) =>
  z
    .number({ message: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .finite();

const percent = (label: string, max = 100) =>
  z
    .number({ message: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} cannot exceed ${max}%`);

const count = (label: string, max: number) =>
  z.number({ message: `${label} must be a number` }).min(0).max(max);

export const marketDataSchema = z.object({
  propertyTaxRate: percent("Property tax rate", 10),
  insuranceAnnual: money("Insurance"),
  appreciationRate: z.number().min(-20).max(30),
  rentalYield: percent("Rental yield", 30),
  populationGrowth: z.number().min(-10).max(20),
  medianPropertyValue: money("Median value"),
});

export const locationSchema = z.object({
  country: z.enum(["US", "GB", "CA", "AU"]),
  region: z.string().min(1, "Select a region"),
  market: marketDataSchema,
});

export const propertySchema = z.object({
  name: z.string().trim().min(1, "Give the property a name").max(80),
  address: z.string().trim().max(160),
  propertyType: z.enum([
    "single-family",
    "condo",
    "townhouse",
    "duplex",
    "triplex",
    "fourplex",
    "multi-family",
    "commercial",
    "mixed-use",
  ]),
  bedrooms: count("Bedrooms", 50),
  bathrooms: count("Bathrooms", 50),
  squareFootage: money("Square footage"),
  lotSize: money("Lot size"),
  yearBuilt: z.number().min(1700, "Enter a valid year").max(new Date().getFullYear() + 3),
  condition: z.enum(["new-build", "excellent", "good", "needs-repair", "full-renovation"]),
});

export const strategySchema = z.enum([
  "buy-hold",
  "short-term-rental",
  "brrrr",
  "fix-flip",
  "commercial-lease",
]);

export const financingSchema = z.object({
  purchasePrice: money("Purchase price").min(1, "Enter a purchase price"),
  depositPercent: percent("Deposit"),
  interestRate: percent("Interest rate", 30),
  termYears: z.number().min(1).max(40),
  closingCosts: money("Closing costs"),
  legalFees: money("Legal fees"),
  inspectionCosts: money("Inspection costs"),
  loanFees: money("Loan fees"),
});

export const incomeSchema = z.object({
  monthlyRent: money("Monthly rent"),
  otherMonthlyIncome: money("Other income"),
  rentGrowthRate: z.number().min(-10).max(20),
  nightlyRate: money("Nightly rate"),
  occupancyRate: percent("Occupancy"),
  cleaningCostsMonthly: money("Cleaning costs"),
  platformFeePercent: percent("Platform fees", 50),
});

export const expenseSchema = z.object({
  propertyTaxAnnual: money("Property tax"),
  insuranceAnnual: money("Insurance"),
  hoaMonthly: money("HOA"),
  managementPercent: percent("Management fee", 50),
  vacancyPercent: percent("Vacancy", 80),
  maintenancePercent: percent("Maintenance", 50),
  utilitiesMonthly: money("Utilities"),
  otherMonthly: money("Other expenses"),
  expenseGrowthRate: z.number().min(-10).max(20),
});

export const flipSchema = z.object({
  renovationBudget: money("Renovation budget"),
  holdingCostsMonthly: money("Holding costs"),
  financingCosts: money("Financing costs"),
  sellingCostsPercent: percent("Selling costs", 20),
  realtorFeePercent: percent("Realtor fee", 20),
  expectedSalePrice: money("Expected sale price"),
  holdDurationMonths: z.number().min(1).max(60),
});

export const brrrrSchema = z.object({
  rehabCost: money("Rehab cost"),
  afterRepairValue: money("After repair value"),
  refinanceLtv: percent("Refinance LTV"),
  refinanceRate: percent("Refinance rate", 30),
  refinanceTermYears: z.number().min(1).max(40),
  expectedRent: money("Expected rent"),
});

export const analysisSchema = z.object({
  location: locationSchema,
  property: propertySchema,
  strategy: strategySchema,
  financing: financingSchema,
  income: incomeSchema,
  expenses: expenseSchema,
  flip: flipSchema,
  brrrr: brrrrSchema,
});

export type AnalysisFormValues = z.infer<typeof analysisSchema>;

export const STEP_FIELDS: Record<number, (keyof AnalysisFormValues)[]> = {
  0: ["location"],
  1: ["property"],
  2: ["strategy"],
  3: ["financing"],
  4: ["income", "expenses", "flip", "brrrr"],
};
