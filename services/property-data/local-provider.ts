import type {
  InsuranceEstimate,
  MarketRentEstimate,
  NeighbourhoodSummary,
  PropertyDataProvider,
  PropertyDetailsLookup,
  PropertyTaxEstimate,
  RentComparable,
} from "@/services/property-data/types";
import type { NeighbourhoodInputs } from "@/lib/types";

const NO_LIVE = "No live neighbourhood data connected.";

function emptySummary(zipCode: string, stored?: NeighbourhoodInputs): NeighbourhoodSummary {
  return {
    name: stored?.name ?? "",
    zipCode: stored?.zipCode || zipCode,
    userEnteredMarketRent: stored && stored.userEnteredMarketRent > 0 ? stored.userEnteredMarketRent : null,
    typicalRentLow: stored && stored.typicalRentLow > 0 ? stored.typicalRentLow : null,
    typicalRentHigh: stored && stored.typicalRentHigh > 0 ? stored.typicalRentHigh : null,
    propertyTaxEstimate: stored && stored.propertyTaxEstimate > 0 ? stored.propertyTaxEstimate : null,
    insuranceEstimate: stored && stored.insuranceEstimate > 0 ? stored.insuranceEstimate : null,
    vacancyAssumption: stored && stored.vacancyAssumption > 0 ? stored.vacancyAssumption : null,
    investorNotes: stored?.investorNotes ?? "",
    dataSourceLabel: stored?.dataSourceLabel || "Manual entry",
    lastUpdated: stored?.lastUpdated || null,
    live: false,
    unavailableReason: NO_LIVE,
  };
}

/** Local/manual provider. Does not invent, scrape, or simulate live market values. */
export function createLocalPropertyDataProvider(stored?: NeighbourhoodInputs): PropertyDataProvider {
  return {
    async getPropertyDetails(query: string): Promise<PropertyDetailsLookup | null> {
      void query;
      return null;
    },
    async getNeighbourhoodSummary(zipCode: string): Promise<NeighbourhoodSummary> {
      return emptySummary(zipCode, stored);
    },
    async getMarketRentEstimate(): Promise<MarketRentEstimate> {
      const entered = stored && stored.userEnteredMarketRent > 0 ? stored.userEnteredMarketRent : null;
      return {
        monthlyRent: entered,
        sourceLabel: entered ? stored?.dataSourceLabel || "User-entered market rent" : "Manual entry",
        live: false,
        unavailableReason: NO_LIVE,
      };
    },
    async getRentComparables(): Promise<RentComparable[]> {
      return [];
    },
    async getPropertyTaxEstimate(): Promise<PropertyTaxEstimate> {
      const annual = stored && stored.propertyTaxEstimate > 0 ? stored.propertyTaxEstimate : null;
      return {
        annual,
        sourceLabel: annual ? "User-entered estimate" : "Manual entry",
        live: false,
        unavailableReason: NO_LIVE,
      };
    },
    async getInsuranceEstimate(): Promise<InsuranceEstimate> {
      const annual = stored && stored.insuranceEstimate > 0 ? stored.insuranceEstimate : null;
      return {
        annual,
        sourceLabel: annual ? "User-entered estimate" : "Manual entry",
        live: false,
        unavailableReason: NO_LIVE,
      };
    },
  };
}

export const NO_LIVE_NEIGHBOURHOOD_DATA = NO_LIVE;
