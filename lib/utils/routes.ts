import type { PortfolioProperty } from "@/lib/types";

/** App routes. Saved analyses always open via `/dashboard?id={propertyId}`. */
export function dashboardPath(propertyId?: string | null): string {
  if (!propertyId) return "/dashboard";
  return `/dashboard?id=${encodeURIComponent(propertyId)}`;
}

export function maxOfferPath(propertyId?: string | null): string {
  if (!propertyId) return "/max-offer";
  return `/max-offer?id=${encodeURIComponent(propertyId)}`;
}

export function isMaxOfferProperty(property: Pick<PortfolioProperty, "kind">): boolean {
  return property.kind === "max-offer";
}

export function analysisOpenPath(property: Pick<PortfolioProperty, "id" | "kind">): string {
  return isMaxOfferProperty(property) ? maxOfferPath(property.id) : dashboardPath(property.id);
}
