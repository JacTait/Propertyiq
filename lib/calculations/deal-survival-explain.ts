import type { DownsideComponentScore, DownsideRiskCategory, DownsideShocks } from "@/lib/types";
import {
  DEAL_SURVIVAL_CATEGORY_COPY,
  DEAL_SURVIVAL_CATEGORY_ORDER,
  DEAL_SURVIVAL_GRADE_BANDS,
  DOWNSIDE_SHOCKS,
  DOWNSIDE_WEIGHTS,
} from "@/lib/constants";

export interface DealSurvivalShockItem {
  key: keyof DownsideShocks;
  label: string;
  detail: string;
}

export interface DealSurvivalCategoryExplain {
  key: DownsideRiskCategory;
  label: string;
  description: string;
  weight: number;
  weightPercent: number;
}

function signedPercent(factor: number): string {
  const pct = Math.round((factor - 1) * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function signedPoints(delta: number): string {
  if (delta > 0) return `+${delta} percentage points`;
  return `${delta} percentage points`;
}

/** Labels the shocks the Downside / Deal Survival engine actually applies. */
export function describeDownsideShocks(shocks: DownsideShocks = DOWNSIDE_SHOCKS): DealSurvivalShockItem[] {
  const items: DealSurvivalShockItem[] = [];
  if (shocks.rentFactor !== 1) {
    items.push({
      key: "rentFactor",
      label: shocks.rentFactor < 1 ? "Lower rent" : "Higher rent",
      detail: signedPercent(shocks.rentFactor),
    });
  }
  if (shocks.vacancyDelta !== 0) {
    items.push({
      key: "vacancyDelta",
      label: shocks.vacancyDelta > 0 ? "Higher vacancy" : "Lower vacancy",
      detail: signedPoints(shocks.vacancyDelta),
    });
  }
  if (shocks.maintenanceDelta !== 0) {
    items.push({
      key: "maintenanceDelta",
      label: shocks.maintenanceDelta > 0 ? "Higher maintenance" : "Lower maintenance",
      detail: signedPoints(shocks.maintenanceDelta),
    });
  }
  if (shocks.rehabFactor !== 1) {
    items.push({
      key: "rehabFactor",
      label: shocks.rehabFactor > 1 ? "Rehab overruns" : "Lower rehab",
      detail: signedPercent(shocks.rehabFactor),
    });
  }
  if (shocks.insuranceFactor !== 1) {
    items.push({
      key: "insuranceFactor",
      label: shocks.insuranceFactor > 1 ? "Higher insurance" : "Lower insurance",
      detail: signedPercent(shocks.insuranceFactor),
    });
  }
  if (shocks.taxFactor !== 1) {
    items.push({
      key: "taxFactor",
      label: shocks.taxFactor > 1 ? "Higher property tax" : "Lower property tax",
      detail: signedPercent(shocks.taxFactor),
    });
  }
  return items;
}

export function dealSurvivalCategories(): DealSurvivalCategoryExplain[] {
  return DEAL_SURVIVAL_CATEGORY_ORDER.map((key) => ({
    key,
    label: DEAL_SURVIVAL_CATEGORY_COPY[key].label,
    description: DEAL_SURVIVAL_CATEGORY_COPY[key].description,
    weight: DOWNSIDE_WEIGHTS[key],
    weightPercent: Math.round(DOWNSIDE_WEIGHTS[key] * 100),
  }));
}

export function resolveDealSurvivalCategory(
  value: DownsideRiskCategory | string | null | undefined,
): DownsideRiskCategory | null {
  if (!value) return null;
  if (value in DEAL_SURVIVAL_CATEGORY_COPY) return value as DownsideRiskCategory;
  const normalized = value.trim().toLowerCase();
  return (
    DEAL_SURVIVAL_CATEGORY_ORDER.find((key) => DEAL_SURVIVAL_CATEGORY_COPY[key].label.toLowerCase() === normalized) ??
    null
  );
}

export function primaryRiskExplanation(key: DownsideRiskCategory | string | null | undefined): string {
  const resolved = resolveDealSurvivalCategory(key);
  if (!resolved) {
    return "Primary Risk is the lowest-scoring component of the Deal Survival calculation.";
  }
  return DEAL_SURVIVAL_CATEGORY_COPY[resolved].primaryRiskDetail;
}

export function primaryRiskLabel(key: DownsideRiskCategory | string | null | undefined, fallback?: string): string {
  const resolved = resolveDealSurvivalCategory(key);
  if (resolved) return DEAL_SURVIVAL_CATEGORY_COPY[resolved].label;
  return fallback?.trim() || "Not scored yet";
}

export function liveBreakdownTotal(components: Pick<DownsideComponentScore, "contribution">[]): number {
  return components.reduce((sum, component) => sum + component.contribution, 0);
}

export function formatWeightedContribution(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (!Number.isFinite(rounded)) return "0";
  if (Number.isInteger(rounded)) return String(rounded);
  const tenths = Math.round(rounded * 10) / 10;
  if (Math.abs(tenths - rounded) < 1e-9) return tenths.toFixed(1);
  return rounded.toFixed(2);
}

export function lowestScoringComponent<T extends { score: number }>(components: readonly T[]): T | undefined {
  return components.reduce<T | undefined>((lowest, component) => {
    if (!lowest || component.score < lowest.score) return component;
    return lowest;
  }, undefined);
}

export { DEAL_SURVIVAL_GRADE_BANDS, DOWNSIDE_SHOCKS, DOWNSIDE_WEIGHTS };
