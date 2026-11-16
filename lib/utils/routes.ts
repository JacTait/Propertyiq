import type { PortfolioProperty } from "@/lib/types";

/** App routes. Saved analyses always open via `/dashboard?id={propertyId}`. */
export function dashboardPath(propertyId?: string | null): string {
  if (!propertyId) return "/dashboard";
  return `/dashboard?id=${encodeURIComponent(propertyId)}`;
}

export function quickUnderwritePath(propertyId?: string | null): string {
  if (!propertyId) return "/quick-underwrite";
  return `/quick-underwrite?id=${encodeURIComponent(propertyId)}`;
}

export function maxOfferPath(propertyId?: string | null): string {
  if (!propertyId) return "/max-offer";
  return `/max-offer?id=${encodeURIComponent(propertyId)}`;
}

export function resiliencePath(propertyId?: string | null): string {
  if (!propertyId) return "/resilience";
  return `/resilience?id=${encodeURIComponent(propertyId)}`;
}

export function downsidePath(propertyId?: string | null): string {
  if (!propertyId) return "/downside";
  return `/downside?id=${encodeURIComponent(propertyId)}`;
}

export function isMaxOfferProperty(property: Pick<PortfolioProperty, "kind">): boolean {
  return property.kind === "max-offer";
}

export function isQuickUnderwriteProperty(property: Pick<PortfolioProperty, "kind">): boolean {
  return property.kind === "quick-underwrite";
}

export function analysisOpenPath(property: Pick<PortfolioProperty, "id" | "kind" | "originWorkflow">): string {
  if (property.originWorkflow === "quick-underwrite") return quickUnderwritePath(property.id);
  if (property.originWorkflow === "max-offer") return maxOfferPath(property.id);
  if (property.originWorkflow === "deal-resilience") return resiliencePath(property.id);
  if (property.originWorkflow === "downside-analysis") return downsidePath(property.id);
  if (property.originWorkflow === "standard-analysis") return dashboardPath(property.id);
  if (isMaxOfferProperty(property)) return maxOfferPath(property.id);
  if (isQuickUnderwriteProperty(property)) return quickUnderwritePath(property.id);
  return dashboardPath(property.id);
}
