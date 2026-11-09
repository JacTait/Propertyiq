import type { CountryCode, MarketData, Region, RegionMarketProfile } from "@/lib/types";

/**
 * Compact tuple: [regionCode, regionName, propertyTaxRate %, insuranceAnnual,
 * appreciationRate %, rentalYield %, populationGrowth %, medianPropertyValue]
 */
type MarketTuple = [string, string, number, number, number, number, number, number];

const US_STATES: MarketTuple[] = [
  ["AL", "Alabama", 0.41, 1900, 4.1, 7.8, 0.4, 221000],
  ["AK", "Alaska", 1.19, 1400, 2.1, 6.9, -0.3, 362000],
  ["AZ", "Arizona", 0.62, 1650, 5.4, 5.6, 1.4, 428000],
  ["AR", "Arkansas", 0.62, 2100, 4.0, 8.1, 0.5, 199000],
  ["CA", "California", 0.75, 1500, 4.6, 3.9, -0.2, 765000],
  ["CO", "Colorado", 0.51, 2600, 4.4, 4.5, 0.9, 548000],
  ["CT", "Connecticut", 2.14, 1700, 4.9, 5.4, 0.1, 403000],
  ["DE", "Delaware", 0.57, 1000, 4.3, 5.9, 1.0, 362000],
  ["FL", "Florida", 0.91, 1800, 5.2, 6.1, 1.6, 405000],
  ["GA", "Georgia", 0.92, 1950, 5.1, 6.6, 1.1, 365000],
  ["HI", "Hawaii", 0.29, 1200, 3.6, 3.7, -0.4, 845000],
  ["ID", "Idaho", 0.63, 1250, 5.0, 4.8, 1.8, 455000],
  ["IL", "Illinois", 2.27, 1600, 3.1, 7.2, -0.3, 272000],
  ["IN", "Indiana", 0.85, 1500, 4.3, 8.0, 0.4, 242000],
  ["IA", "Iowa", 1.57, 1600, 3.3, 7.6, 0.2, 215000],
  ["KS", "Kansas", 1.41, 2900, 3.8, 7.9, 0.1, 229000],
  ["KY", "Kentucky", 0.86, 2300, 4.2, 7.9, 0.3, 216000],
  ["LA", "Louisiana", 0.55, 3200, 2.4, 7.5, -0.5, 215000],
  ["ME", "Maine", 1.36, 1200, 5.3, 5.7, 0.6, 392000],
  ["MD", "Maryland", 1.09, 1500, 3.7, 5.6, 0.2, 420000],
  ["MA", "Massachusetts", 1.23, 1700, 4.9, 4.2, 0.3, 611000],
  ["MI", "Michigan", 1.54, 1600, 4.4, 7.7, 0.0, 248000],
  ["MN", "Minnesota", 1.12, 2200, 3.5, 5.9, 0.3, 342000],
  ["MS", "Mississippi", 0.81, 2500, 3.4, 8.4, -0.3, 184000],
  ["MO", "Missouri", 0.97, 2200, 4.1, 7.6, 0.3, 248000],
  ["MT", "Montana", 0.84, 2300, 5.2, 4.9, 1.1, 465000],
  ["NE", "Nebraska", 1.73, 3000, 3.9, 7.1, 0.4, 265000],
  ["NV", "Nevada", 0.60, 1100, 5.0, 5.2, 1.5, 435000],
  ["NH", "New Hampshire", 2.18, 1200, 5.5, 5.3, 0.5, 465000],
  ["NJ", "New Jersey", 2.49, 1500, 5.6, 5.2, 0.2, 515000],
  ["NM", "New Mexico", 0.80, 1700, 4.4, 6.4, 0.2, 300000],
  ["NY", "New York", 1.72, 1800, 3.4, 4.6, -0.6, 465000],
  ["NC", "North Carolina", 0.84, 1700, 5.5, 6.2, 1.3, 335000],
  ["ND", "North Dakota", 0.98, 2000, 3.0, 7.4, 0.5, 255000],
  ["OH", "Ohio", 1.56, 1300, 4.5, 8.3, 0.1, 225000],
  ["OK", "Oklahoma", 0.90, 3500, 3.9, 8.0, 0.6, 205000],
  ["OR", "Oregon", 0.97, 1000, 3.9, 4.7, 0.3, 500000],
  ["PA", "Pennsylvania", 1.58, 1200, 4.6, 7.0, 0.0, 265000],
  ["RI", "Rhode Island", 1.63, 1700, 5.8, 5.3, 0.1, 440000],
  ["SC", "South Carolina", 0.57, 2000, 5.6, 6.4, 1.7, 300000],
  ["SD", "South Dakota", 1.31, 2500, 4.2, 6.8, 0.9, 300000],
  ["TN", "Tennessee", 0.71, 2000, 5.3, 6.5, 1.2, 320000],
  ["TX", "Texas", 1.80, 2700, 3.8, 6.8, 1.6, 305000],
  ["UT", "Utah", 0.63, 1100, 4.8, 4.6, 1.6, 520000],
  ["VT", "Vermont", 1.90, 1100, 5.1, 5.6, 0.1, 385000],
  ["VA", "Virginia", 0.82, 1400, 4.3, 5.5, 0.6, 390000],
  ["WA", "Washington", 0.98, 1300, 4.1, 4.4, 0.9, 595000],
  ["WV", "West Virginia", 0.58, 1300, 4.0, 8.6, -0.4, 165000],
  ["WI", "Wisconsin", 1.85, 1200, 4.6, 6.9, 0.2, 290000],
  ["WY", "Wyoming", 0.61, 1500, 4.2, 6.3, 0.3, 335000],
];

const UK_REGIONS: MarketTuple[] = [
  ["LDN", "London", 0.55, 420, 2.1, 4.2, 0.8, 525000],
  ["SE", "South East", 0.60, 380, 2.6, 4.6, 0.6, 390000],
  ["SW", "South West", 0.62, 360, 3.1, 4.9, 0.7, 325000],
  ["EE", "East of England", 0.60, 370, 2.8, 4.7, 0.8, 350000],
  ["EM", "East Midlands", 0.68, 320, 3.6, 5.8, 0.6, 245000],
  ["WM", "West Midlands", 0.70, 330, 3.7, 6.0, 0.6, 250000],
  ["YH", "Yorkshire and the Humber", 0.72, 310, 3.9, 6.4, 0.4, 215000],
  ["NW", "North West", 0.72, 320, 4.2, 6.6, 0.5, 220000],
  ["NE", "North East", 0.78, 300, 3.5, 7.2, 0.1, 165000],
  ["WAL", "Wales", 0.70, 310, 3.4, 6.1, 0.3, 215000],
  ["SCO", "Scotland", 0.75, 330, 3.3, 6.3, 0.3, 195000],
  ["NI", "Northern Ireland", 0.80, 300, 4.1, 6.5, 0.4, 180000],
];

const CA_PROVINCES: MarketTuple[] = [
  ["AB", "Alberta", 0.66, 1900, 4.8, 5.9, 3.0, 460000],
  ["BC", "British Columbia", 0.28, 1500, 3.2, 3.6, 2.4, 975000],
  ["MB", "Manitoba", 1.25, 1500, 3.9, 6.4, 2.0, 360000],
  ["NB", "New Brunswick", 1.45, 1200, 4.6, 6.9, 2.6, 300000],
  ["NL", "Newfoundland and Labrador", 0.85, 1300, 3.2, 6.8, 1.0, 290000],
  ["NS", "Nova Scotia", 1.10, 1300, 4.5, 6.2, 2.7, 400000],
  ["NT", "Northwest Territories", 1.20, 1900, 2.0, 7.0, 0.2, 415000],
  ["NU", "Nunavut", 1.00, 2200, 1.8, 7.5, 1.5, 380000],
  ["ON", "Ontario", 0.88, 1600, 3.1, 4.1, 2.7, 860000],
  ["PE", "Prince Edward Island", 1.30, 1100, 4.9, 6.0, 3.3, 380000],
  ["QC", "Quebec", 0.95, 1200, 4.2, 5.2, 1.9, 480000],
  ["SK", "Saskatchewan", 1.15, 1700, 3.6, 7.0, 1.9, 320000],
  ["YT", "Yukon", 0.80, 1500, 3.0, 6.1, 1.8, 520000],
];

const AU_STATES: MarketTuple[] = [
  ["NSW", "New South Wales", 0.45, 1900, 4.8, 3.4, 1.7, 1050000],
  ["VIC", "Victoria", 0.50, 1700, 3.2, 3.6, 2.1, 780000],
  ["QLD", "Queensland", 0.42, 2100, 6.1, 4.3, 2.3, 720000],
  ["WA", "Western Australia", 0.48, 1800, 6.8, 4.9, 2.4, 650000],
  ["SA", "South Australia", 0.52, 1600, 6.3, 4.4, 1.3, 620000],
  ["TAS", "Tasmania", 0.55, 1500, 3.0, 4.6, 0.6, 560000],
  ["ACT", "Australian Capital Territory", 0.60, 1700, 2.6, 4.2, 1.4, 850000],
  ["NT", "Northern Territory", 0.40, 2600, 2.2, 6.3, 0.5, 480000],
];

const toProfile =
  (country: CountryCode) =>
  (t: MarketTuple): RegionMarketProfile => ({
    country,
    regionCode: t[0],
    regionName: t[1],
    propertyTaxRate: t[2],
    insuranceAnnual: t[3],
    appreciationRate: t[4],
    rentalYield: t[5],
    populationGrowth: t[6],
    medianPropertyValue: t[7],
  });

export const MARKET_PROFILES: Record<CountryCode, RegionMarketProfile[]> = {
  US: US_STATES.map(toProfile("US")),
  GB: UK_REGIONS.map(toProfile("GB")),
  CA: CA_PROVINCES.map(toProfile("CA")),
  AU: AU_STATES.map(toProfile("AU")),
};

export function getRegions(country: CountryCode): Region[] {
  return MARKET_PROFILES[country].map((p) => ({ code: p.regionCode, name: p.regionName }));
}

export function getMarketProfile(
  country: CountryCode,
  regionCode: string,
): RegionMarketProfile | undefined {
  return MARKET_PROFILES[country].find((p) => p.regionCode === regionCode);
}

export function getRegionName(country: CountryCode, regionCode: string): string {
  return getMarketProfile(country, regionCode)?.regionName ?? regionCode;
}

export function toMarketData(profile: RegionMarketProfile): MarketData {
  return {
    propertyTaxRate: profile.propertyTaxRate,
    insuranceAnnual: profile.insuranceAnnual,
    appreciationRate: profile.appreciationRate,
    rentalYield: profile.rentalYield,
    populationGrowth: profile.populationGrowth,
    medianPropertyValue: profile.medianPropertyValue,
  };
}

export const DEFAULT_MARKET_DATA: MarketData = {
  propertyTaxRate: 1.0,
  insuranceAnnual: 1500,
  appreciationRate: 3.5,
  rentalYield: 6.0,
  populationGrowth: 0.5,
  medianPropertyValue: 350000,
};
