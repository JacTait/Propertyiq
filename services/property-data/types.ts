export interface PropertyDetailsLookup {
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  zipCode?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export interface NeighbourhoodSummary {
  name: string;
  zipCode: string;
  userEnteredMarketRent: number | null;
  typicalRentLow: number | null;
  typicalRentHigh: number | null;
  propertyTaxEstimate: number | null;
  insuranceEstimate: number | null;
  vacancyAssumption: number | null;
  investorNotes: string;
  dataSourceLabel: string;
  lastUpdated: string | null;
  live: boolean;
  unavailableReason: string | null;
}

export interface MarketRentEstimate {
  monthlyRent: number | null;
  sourceLabel: string;
  live: boolean;
  unavailableReason: string | null;
}

export interface RentComparable {
  label: string;
  monthlyRent: number;
  notes: string;
}

export interface PropertyTaxEstimate {
  annual: number | null;
  sourceLabel: string;
  live: boolean;
  unavailableReason: string | null;
}

export interface InsuranceEstimate {
  annual: number | null;
  sourceLabel: string;
  live: boolean;
  unavailableReason: string | null;
}

export interface NeighbourhoodDataProvider {
  getNeighbourhoodSummary(zipCode: string): Promise<NeighbourhoodSummary>;
}

export interface RentEstimateProvider {
  getMarketRentEstimate(args: { zipCode: string; bedrooms: number }): Promise<MarketRentEstimate>;
  getRentComparables(args: { zipCode: string; bedrooms: number }): Promise<RentComparable[]>;
}

export interface PropertyDataProvider extends NeighbourhoodDataProvider, RentEstimateProvider {
  getPropertyDetails(query: string): Promise<PropertyDetailsLookup | null>;
  getPropertyTaxEstimate(args: { zipCode: string }): Promise<PropertyTaxEstimate>;
  getInsuranceEstimate(args: { zipCode: string }): Promise<InsuranceEstimate>;
}
