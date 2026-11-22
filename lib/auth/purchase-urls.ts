export const PROPERTYIQ_PRICE_LABEL = "£29.99";

let warnedGumroad = false;
let warnedPayhip = false;

type EnvSource = Record<string, string | undefined>;

function readValue(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sanitizePublicProductUrl(value: string | undefined | null): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function warnMissing(marketplace: "Gumroad" | "Payhip"): void {
  if (process.env.NODE_ENV === "production") return;
  if (marketplace === "Gumroad") {
    if (warnedGumroad) return;
    warnedGumroad = true;
  } else {
    if (warnedPayhip) return;
    warnedPayhip = true;
  }
  console.warn(`PropertyIQ ${marketplace} purchase option is not configured.`);
}

export function getGumroadProductUrl(source?: EnvSource): string | null {
  const raw = source
    ? readValue(source.NEXT_PUBLIC_GUMROAD_PRODUCT_URL)
    : readValue(process.env.NEXT_PUBLIC_GUMROAD_PRODUCT_URL);
  const url = sanitizePublicProductUrl(raw);
  if (!url) warnMissing("Gumroad");
  return url;
}

export function getPayhipProductUrl(source?: EnvSource): string | null {
  const raw = source
    ? readValue(source.NEXT_PUBLIC_PAYHIP_PRODUCT_URL)
    : readValue(process.env.NEXT_PUBLIC_PAYHIP_PRODUCT_URL);
  const url = sanitizePublicProductUrl(raw);
  if (!url) warnMissing("Payhip");
  return url;
}

export function getPurchaseUrls(source?: EnvSource): {
  gumroadUrl: string | null;
  payhipUrl: string | null;
} {
  return {
    gumroadUrl: getGumroadProductUrl(source),
    payhipUrl: getPayhipProductUrl(source),
  };
}

export function resetPurchaseUrlWarningsForTests(): void {
  warnedGumroad = false;
  warnedPayhip = false;
}
