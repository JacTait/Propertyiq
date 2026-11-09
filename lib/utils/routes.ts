/** App routes. Saved analyses always open via `/dashboard?id={propertyId}`. */
export function dashboardPath(propertyId?: string | null): string {
  if (!propertyId) return "/dashboard";
  return `/dashboard?id=${encodeURIComponent(propertyId)}`;
}
