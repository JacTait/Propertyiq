import type { AnalysisInput, CountryCode, MaxOfferInputs, MaxOfferResults } from "@/lib/types";
import { getMarketProfile, toMarketData, DEFAULT_MARKET_DATA } from "@/data/market-data";
import { createDefaultAnalysis } from "@/data/default-analysis";

export function createDefaultMaxOffer(country: CountryCode = "US"): MaxOfferInputs {
  const regionCode = country === "US" ? "FL" : country === "GB" ? "NW" : country === "CA" ? "AB" : "QLD";
  const profile = getMarketProfile(country, regionCode);
  const market = profile ? toMarketData(profile) : DEFAULT_MARKET_DATA;
  const arv = Math.round((market.medianPropertyValue * 0.45) / 5000) * 5000;
  const rent = Math.round((arv * (Math.max(market.rentalYield, 8) / 100)) / 12 / 25) * 25;

  return {
    property: {
      name: "Max Offer Deal",
      arv,
      expectedMonthlyRent: Math.max(rent, 1500),
      rehabBudget: Math.round(arv * 0.12 / 1000) * 1000,
      closingCosts: Math.round(arv * 0.02),
      holdingCosts: 2500,
      askingPrice: 0,
      propertyType: "single-family",
      bedrooms: 3,
      bathrooms: 2,
      zipCode: "",
    },
    location: {
      country,
      region: regionCode,
    },
    strategy: "brrrr",
    financing: {
      interestRate: 7,
      termYears: 30,
      loanToValue: 75,
      downPaymentPercent: 25,
      loanFees: Math.round(arv * 0.0075),
    },
    expenses: {
      propertyTaxAnnual: Math.round(arv * (market.propertyTaxRate / 100)),
      insuranceAnnual: market.insuranceAnnual,
      managementPercent: 8,
      vacancyPercent: 5,
      maintenancePercent: 5,
      capexPercent: 5,
      hoaMonthly: 0,
      otherMonthly: 50,
    },
    targets: {
      desiredMonthlyCashflow: 200,
      desiredRoi: 12,
      desiredCashOnCash: 8,
      minimumDscr: 1.25,
      safetyBufferPercent: 8,
    },
    brrrr: {
      refinanceLtv: 75,
      refinanceRate: 7,
    },
  };
}

/** Map a max-offer run onto the shared analysis shape so Portfolio / Compare can store it. */
export function maxOfferToAnalysisInput(
  input: MaxOfferInputs,
  results: MaxOfferResults,
  country: CountryCode,
): AnalysisInput {
  const resolvedCountry = input.location?.country || country;
  const resolvedRegion = input.location?.region;
  const base = createDefaultAnalysis(resolvedCountry);
  const profile = resolvedRegion ? getMarketProfile(resolvedCountry, resolvedRegion) : null;
  const price = results.recommendedOffer || results.maximumOffer || input.property.askingPrice || input.property.arv;
  return {
    ...base,
    location: {
      country: resolvedCountry,
      region: resolvedRegion || base.location.region,
      market: profile ? toMarketData(profile) : base.location.market,
    },
    property: {
      ...base.property,
      name: input.property.name,
      propertyType: input.property.propertyType || base.property.propertyType,
      bedrooms: Number.isFinite(input.property.bedrooms) ? input.property.bedrooms : base.property.bedrooms,
      bathrooms: Number.isFinite(input.property.bathrooms) ? input.property.bathrooms : base.property.bathrooms,
      zipCode: typeof input.property.zipCode === "string" ? input.property.zipCode : "",
      condition: "needs-repair",
    },
    strategy: input.strategy || "brrrr",
    financing: {
      ...base.financing,
      purchasePrice: price,
      askingPrice: Math.max(0, Number.isFinite(input.property.askingPrice) ? input.property.askingPrice : 0),
      depositPercent: input.financing.downPaymentPercent,
      interestRate: input.financing.interestRate,
      termYears: input.financing.termYears,
      closingCosts: input.property.closingCosts,
      loanFees: input.financing.loanFees,
      legalFees: 0,
      inspectionCosts: 0,
    },
    income: {
      ...base.income,
      monthlyRent: input.property.expectedMonthlyRent,
      verifiedRent: input.property.expectedMonthlyRent,
      conservativeRent: Math.round((input.property.expectedMonthlyRent * 0.9) / 25) * 25,
      rentSource: "verified",
    },
    expenses: {
      ...base.expenses,
      propertyTaxAnnual: input.expenses.propertyTaxAnnual,
      insuranceAnnual: input.expenses.insuranceAnnual,
      hoaMonthly: input.expenses.hoaMonthly,
      managementPercent: input.expenses.managementPercent,
      vacancyPercent: input.expenses.vacancyPercent,
      maintenancePercent: input.expenses.maintenancePercent + input.expenses.capexPercent,
      otherMonthly: input.expenses.otherMonthly,
    },
    brrrr: {
      rehabCost: input.property.rehabBudget,
      afterRepairValue: input.property.arv,
      refinanceLtv: input.brrrr.refinanceLtv,
      refinanceRate: input.brrrr.refinanceRate,
      refinanceTermYears: input.financing.termYears,
      expectedRent: input.property.expectedMonthlyRent,
      refinanceDscrMin: input.targets.minimumDscr || 1.25,
    },
  };
}
