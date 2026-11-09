import type { CountryCode, MarketData, PropertyType } from "@/lib/types";
import { getMarketProfile, toMarketData, DEFAULT_MARKET_DATA } from "@/data/market-data";

/**
 * Property-data service contract.
 *
 * Future adapters (MLS, Zillow, Rightmove, Domain, etc.) implement
 * `PropertyDataProvider`. The default provider serves the bundled regional
 * market intelligence dataset.
 */

export interface PropertyListing {
  id: string;
  address: string;
  price: number;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt: number;
  estimatedRent: number | null;
  source: string;
}

export interface MarketLookupRequest {
  country: CountryCode;
  region: string;
  postalCode?: string;
}

export interface PropertyDataProvider {
  readonly id: string;
  getMarketData(request: MarketLookupRequest): Promise<MarketData>;
  searchListings(query: string, country: CountryCode): Promise<PropertyListing[]>;
  estimateRent(request: MarketLookupRequest & { purchasePrice: number }): Promise<number>;
}

export class LocalMarketDataProvider implements PropertyDataProvider {
  readonly id = "local-market-dataset";

  async getMarketData(request: MarketLookupRequest): Promise<MarketData> {
    const profile = getMarketProfile(request.country, request.region);
    return profile ? toMarketData(profile) : DEFAULT_MARKET_DATA;
  }

  async searchListings(): Promise<PropertyListing[]> {
    return [];
  }

  async estimateRent(request: MarketLookupRequest & { purchasePrice: number }): Promise<number> {
    const market = await this.getMarketData(request);
    return (request.purchasePrice * (market.rentalYield / 100)) / 12;
  }
}

export function getPropertyDataProvider(): PropertyDataProvider {
  return new LocalMarketDataProvider();
}
