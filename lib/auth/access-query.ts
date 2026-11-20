export function licenceKeyFromAccessQuery(search: { get(name: string): string | null }): string {
  const raw = search.get("key") ?? search.get("license") ?? search.get("license_key") ?? "";
  return raw.trim();
}

export function accessQueryWithoutLicenceKey(search: {
  toString(): string;
  has(name: string): boolean;
}): string | null {
  const params = new URLSearchParams(search.toString());
  const hadPrefill = params.has("key") || params.has("license") || params.has("license_key");
  if (!hadPrefill) return null;
  params.delete("key");
  params.delete("license");
  params.delete("license_key");
  const qs = params.toString();
  return qs ? `/access?${qs}` : "/access";
}
