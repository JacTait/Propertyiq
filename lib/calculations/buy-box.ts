import type {
  AnalysisInput,
  BuyBoxMatch,
  BuyBoxProfile,
  BuyBoxReason,
  BuyBoxSubject,
  MaxOfferInputs,
} from "@/lib/types";
import { propertyTypeLabel, strategyLabel } from "@/lib/utils/labels";
import { resolveRent } from "@/lib/calculations/rent";

export function normalizeZip(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function parseZipList(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]+/)) {
    const zip = normalizeZip(part);
    if (zip) seen.add(zip);
  }
  return [...seen];
}

export function formatZipList(zips: string[]): string {
  return zips.join(", ");
}

function zipInList(zip: string, list: string[]): boolean {
  if (!zip || list.length === 0) return false;
  return list.some((item) => item === zip || zip.startsWith(item) || item.startsWith(zip));
}

export function subjectFromAnalysis(input: AnalysisInput): BuyBoxSubject {
  const rent = resolveRent(input);
  const arv =
    input.brrrr.afterRepairValue > 0
      ? input.brrrr.afterRepairValue
      : input.flip.expectedSalePrice > 0
        ? input.flip.expectedSalePrice
        : input.financing.purchasePrice;
  return {
    propertyType: input.property.propertyType,
    bedrooms: input.property.bedrooms,
    purchasePrice: input.financing.purchasePrice,
    monthlyRent: rent.active,
    arv,
    zipCode: input.property.zipCode,
    strategy: input.strategy,
  };
}

export function subjectFromMaxOffer(input: MaxOfferInputs, purchasePrice: number): BuyBoxSubject {
  return {
    purchasePrice,
    monthlyRent: input.property.expectedMonthlyRent,
    arv: input.property.arv,
    strategy: "brrrr",
  };
}

export function matchBuyBox(profile: BuyBoxProfile | null | undefined, subject: BuyBoxSubject): BuyBoxMatch {
  if (!profile) {
    return {
      status: "no-profile",
      inside: false,
      profileId: null,
      profileName: null,
      reasons: [
        {
          key: "none",
          tone: "warn",
          message: "No active Buy Box. Create one under Settings → Buy Box Profiles.",
        },
      ],
    };
  }

  const reasons: BuyBoxReason[] = [];
  const zip = normalizeZip(subject.zipCode);

  if (profile.propertyTypes.length > 0 && subject.propertyType) {
    if (!profile.propertyTypes.includes(subject.propertyType)) {
      reasons.push({
        key: "type",
        tone: "fail",
        message: `Property type mismatch — ${propertyTypeLabel(subject.propertyType)} is not in this Buy Box.`,
      });
    } else {
      reasons.push({
        key: "type",
        tone: "pass",
        message: `${propertyTypeLabel(subject.propertyType)} matches the Buy Box.`,
      });
    }
  }

  if (profile.minBedrooms > 0 && typeof subject.bedrooms === "number") {
    if (subject.bedrooms < profile.minBedrooms) {
      reasons.push({
        key: "beds",
        tone: "fail",
        message: `Bedrooms below target — ${subject.bedrooms} vs minimum ${profile.minBedrooms}.`,
      });
    } else {
      reasons.push({
        key: "beds",
        tone: "pass",
        message: `${subject.bedrooms} bedrooms meet the ${profile.minBedrooms}+ target.`,
      });
    }
  }

  if (profile.maxPurchasePrice > 0) {
    if (subject.purchasePrice > profile.maxPurchasePrice) {
      reasons.push({
        key: "price",
        tone: "fail",
        message: "Purchase price exceeds limit.",
      });
    } else {
      reasons.push({
        key: "price",
        tone: "pass",
        message: "Purchase price is within the Buy Box ceiling.",
      });
    }
  }

  if (profile.minRent > 0) {
    if (subject.monthlyRent < profile.minRent) {
      reasons.push({
        key: "rent",
        tone: "fail",
        message: "Rent is below the Buy Box minimum.",
      });
    } else {
      reasons.push({
        key: "rent",
        tone: "pass",
        message: "Rent clears the Buy Box minimum.",
      });
    }
  }

  if (profile.minArv > 0 && subject.arv < profile.minArv) {
    reasons.push({
      key: "min-arv",
      tone: "fail",
      message: "ARV is below the Buy Box minimum.",
    });
  } else if (profile.minArv > 0) {
    reasons.push({ key: "min-arv", tone: "pass", message: "ARV meets the Buy Box minimum." });
  }

  if (profile.maxArv > 0 && subject.arv > profile.maxArv) {
    reasons.push({
      key: "max-arv",
      tone: "fail",
      message: "ARV exceeds the Buy Box maximum.",
    });
  } else if (profile.maxArv > 0) {
    reasons.push({ key: "max-arv", tone: "pass", message: "ARV is within the Buy Box range." });
  }

  const hardZips = profile.zipCodes.map(normalizeZip).filter(Boolean);
  const targetZips = profile.targetZipCodes.map(normalizeZip).filter(Boolean);
  const filterZips = hardZips.length > 0 ? hardZips : targetZips;

  if (filterZips.length > 0) {
    if (!zip) {
      reasons.push({
        key: "zip",
        tone: "fail",
        message: "ZIP code not provided — cannot confirm the property is in a target ZIP.",
      });
    } else if (!zipInList(zip, filterZips)) {
      reasons.push({
        key: "zip",
        tone: "fail",
        message: `ZIP ${zip} is outside the Buy Box ZIP list.`,
      });
    } else {
      reasons.push({ key: "zip", tone: "pass", message: `ZIP ${zip} is inside the Buy Box.` });
    }
  }

  if (hardZips.length > 0 && targetZips.length > 0 && zip && zipInList(zip, hardZips) && !zipInList(zip, targetZips)) {
    reasons.push({
      key: "target-zip",
      tone: "warn",
      message: `ZIP ${zip} is allowed but is not a target ZIP.`,
    });
  }

  if (profile.strategies.length > 0) {
    if (!profile.strategies.includes(subject.strategy)) {
      reasons.push({
        key: "strategy",
        tone: "fail",
        message: `Strategy mismatch — ${strategyLabel(subject.strategy, true)} is not in this Buy Box.`,
      });
    } else {
      reasons.push({
        key: "strategy",
        tone: "pass",
        message: `${strategyLabel(subject.strategy, true)} matches the Buy Box.`,
      });
    }
  }

  const failed = reasons.some((r) => r.tone === "fail");
  return {
    status: failed ? "outside" : "inside",
    inside: !failed,
    profileId: profile.id,
    profileName: profile.name,
    reasons,
  };
}
