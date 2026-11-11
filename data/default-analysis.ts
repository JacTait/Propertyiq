import type { AnalysisInput, CountryCode } from "@/lib/types";
import { getMarketProfile, toMarketData, DEFAULT_MARKET_DATA } from "@/data/market-data";
import {
  DEFAULT_GUIDELINE_ADDITIONAL_COSTS,
  DEFAULT_SCENARIO_ASSUMPTIONS,
  DEFAULT_TARGET_ARV_PERCENT,
} from "@/lib/constants/deal-workspace";

export function createDefaultAnalysis(country: CountryCode = "US"): AnalysisInput {
  const regionCode = country === "US" ? "FL" : country === "GB" ? "NW" : country === "CA" ? "AB" : "QLD";
  const profile = getMarketProfile(country, regionCode);
  const market = profile ? toMarketData(profile) : DEFAULT_MARKET_DATA;
  // Sample deal: bought ~15% under the regional median, rented at median-market yield.
  const purchasePrice = Math.round((market.medianPropertyValue * 0.85) / 5000) * 5000;
  const monthlyRent = Math.round((market.medianPropertyValue * (market.rentalYield / 100)) / 12 / 25) * 25;

  return {
    location: {
      country,
      region: regionCode,
      market,
    },
    property: {
      name: "Sample Investment Property",
      address: "",
      zipCode: "",
      propertyType: "single-family",
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1650,
      lotSize: 6500,
      yearBuilt: 2005,
      condition: "good",
    },
    strategy: "buy-hold",
    financing: {
      purchasePrice,
      askingPrice: 0,
      depositPercent: 25,
      interestRate: 6.5,
      termYears: 30,
      closingCosts: Math.round(purchasePrice * 0.02),
      legalFees: 1500,
      inspectionCosts: 500,
      loanFees: Math.round(purchasePrice * 0.0075),
      otherAcquisitionCosts: 0,
    },
    income: {
      monthlyRent,
      verifiedRent: monthlyRent,
      conservativeRent: Math.round((monthlyRent * 0.9) / 25) * 25,
      currentMonthlyRent: monthlyRent,
      rentEntryMode: "total",
      units: [],
      rentSource: "verified",
      otherMonthlyIncome: 0,
      rentGrowthRate: 3,
      nightlyRate: Math.round(monthlyRent / 12),
      occupancyRate: 65,
      cleaningCostsMonthly: 350,
      platformFeePercent: 3,
    },
    expenses: {
      propertyTaxAnnual: Math.round(purchasePrice * (market.propertyTaxRate / 100)),
      insuranceAnnual: market.insuranceAnnual,
      insuranceSource: "estimate",
      hoaMonthly: 0,
      managementPercent: 8,
      vacancyPercent: 5,
      maintenancePercent: 5,
      capexPercent: 0,
      waterMonthly: 0,
      sewerMonthly: 0,
      trashMonthly: 0,
      sharedUtilitiesMonthly: 0,
      utilitiesMonthly: 0,
      otherMonthly: 50,
      expenseGrowthRate: 2.5,
    },
    flip: {
      renovationBudget: Math.round(purchasePrice * 0.12),
      holdingCostsMonthly: 1200,
      financingCosts: Math.round(purchasePrice * 0.03),
      sellingCostsPercent: 2,
      realtorFeePercent: 5,
      expectedSalePrice: Math.round(purchasePrice * 1.3),
      holdDurationMonths: 6,
    },
    brrrr: {
      rehabCost: Math.round(purchasePrice * 0.15),
      afterRepairValue: Math.round(purchasePrice * 1.35),
      refinanceLtv: 75,
      refinanceRate: 6.75,
      refinanceTermYears: 30,
      expectedRent: Math.round(monthlyRent * 1.15),
      refinanceDscrMin: 1.25,
    },
    decision: {
      advertisedArv: Math.round(purchasePrice * 1.35),
      conservativeArv: Math.round(purchasePrice * 1.35),
      rehabContingencyPercent: 10,
      targetArvPercent: DEFAULT_TARGET_ARV_PERCENT,
      includeAdditionalCostsInGuideline: false,
      guidelineAdditionalCosts: { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS },
      acquisitionCostMode: "itemised",
      scenarios: {
        base: { ...DEFAULT_SCENARIO_ASSUMPTIONS.base },
        conservative: { ...DEFAULT_SCENARIO_ASSUMPTIONS.conservative },
        stress: { ...DEFAULT_SCENARIO_ASSUMPTIONS.stress },
      },
    },
  };
}
