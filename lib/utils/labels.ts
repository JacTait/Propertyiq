import type {
  CountryCode,
  DealGrade,
  InvestmentStrategy,
  Property,
  PropertyCondition,
  PropertyType,
  Recommendation,
} from "@/lib/types";
import { COUNTRIES, PROPERTY_CONDITIONS, PROPERTY_TYPES, STRATEGIES } from "@/lib/constants";

export function strategyLabel(strategy: InvestmentStrategy, short = false): string {
  const s = STRATEGIES.find((x) => x.value === strategy);
  if (!s) return strategy;
  return short ? s.short : s.label;
}

export function propertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPES.find((x) => x.value === type)?.label ?? type;
}

export function conditionLabel(condition: PropertyCondition): string {
  return PROPERTY_CONDITIONS.find((x) => x.value === condition)?.label ?? condition;
}

export function countryName(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function regionLabel(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.regionLabel ?? "Region";
}

export function formatPropertySpecs(
  property: Pick<Property, "propertyType" | "bedrooms" | "bathrooms" | "zipCode">,
): string {
  const parts = [
    propertyTypeLabel(property.propertyType),
    `${property.bedrooms} bd / ${property.bathrooms} ba`,
  ];
  if (property.zipCode) parts.push(property.zipCode);
  return parts.join(" · ");
}

export type Tone = "success" | "warning" | "danger" | "primary" | "muted";

export function gradeTone(grade: DealGrade): Tone {
  switch (grade) {
    case "elite":
    case "excellent":
      return "success";
    case "good":
      return "primary";
    case "average":
      return "warning";
    case "avoid":
      return "danger";
  }
}

export function recommendationTone(rec: Recommendation): Tone {
  switch (rec) {
    case "Elite Opportunity":
    case "Strong Buy":
      return "success";
    case "Buy":
      return "primary";
    case "Neutral":
      return "warning";
    case "High Risk":
    case "Avoid":
      return "danger";
  }
}

export function metricTone(value: number, thresholds: { good: number; ok: number }, invert = false): Tone {
  const v = invert ? -value : value;
  const good = invert ? -thresholds.good : thresholds.good;
  const ok = invert ? -thresholds.ok : thresholds.ok;
  if (v >= good) return "success";
  if (v >= ok) return "warning";
  return "danger";
}
