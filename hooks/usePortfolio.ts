"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  AnalysisInput,
  AnalysisResults,
  CountryCode,
  DealGrade,
  InvestmentStrategy,
  MaxOfferInputs,
  MaxOfferResults,
  PortfolioProperty,
  PortfolioSnapshot,
  Recommendation,
  UnderwritingPack,
} from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { createId, readStorage } from "@/lib/utils/storage";
import { getRegionName } from "@/data/market-data";
import { maxOfferToAnalysisInput } from "@/data/default-max-offer";
import { calculateDealScore } from "@/lib/calculations/deal-score";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export type PortfolioSortKey = "date" | "name" | "roi" | "cashflow" | "score" | "price";
export type SortDirection = "asc" | "desc";

export interface PortfolioFilters {
  search: string;
  strategy: InvestmentStrategy | "all";
  minScore: number;
  sortKey: PortfolioSortKey;
  sortDirection: SortDirection;
}

export const DEFAULT_FILTERS: PortfolioFilters = {
  search: "",
  strategy: "all",
  minScore: 0,
  sortKey: "date",
  sortDirection: "desc",
};

function ratingFromOffer(
  results: MaxOfferResults,
  fallbackGrade: DealGrade,
  fallbackRecommendation: Recommendation,
  fallbackScore: number,
): { grade: DealGrade; recommendation: Recommendation; dealScore: number } {
  switch (results.recommendation.tier) {
    case "excellent":
      return { grade: "excellent", recommendation: "Strong Buy", dealScore: Math.max(fallbackScore, 86) };
    case "good":
      return { grade: "good", recommendation: "Buy", dealScore: Math.max(fallbackScore, 74) };
    case "maximum":
      return { grade: "average", recommendation: "Neutral", dealScore: Math.min(fallbackScore, 66) };
    case "too-expensive":
      return { grade: "avoid", recommendation: "Avoid", dealScore: Math.min(fallbackScore, 48) };
    default:
      return { grade: fallbackGrade, recommendation: fallbackRecommendation, dealScore: fallbackScore };
  }
}

function isPortfolio(value: unknown): value is PortfolioProperty[] {
  return Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && "id" in v && "input" in v);
}

/** Read the portfolio directly from localStorage (same key as Compare / Portfolio). */
export function readPortfolio(): PortfolioProperty[] {
  return readStorage<PortfolioProperty[]>(STORAGE_KEYS.portfolio, [], isPortfolio);
}

export function findPortfolioProperty(id: string): PortfolioProperty | undefined {
  if (!id) return undefined;
  return readPortfolio().find((p) => p.id === id);
}

export function buildSnapshot(
  input: AnalysisInput,
  results: AnalysisResults,
  underwriting?: UnderwritingPack | null,
): PortfolioSnapshot {
  return {
    purchasePrice: input.financing.purchasePrice,
    roi: results.roi,
    cashOnCash: results.cashOnCash,
    capRate: results.capRate,
    grossYield: results.grossYield,
    netYield: results.netYield,
    monthlyCashflow: results.monthlyCashflow,
    annualCashflow: results.annualCashflow,
    dscr: results.dscr,
    appreciationRate: input.location.market.appreciationRate,
    dealScore: results.dealScore.score,
    grade: results.dealScore.grade,
    recommendation: results.dealScore.recommendation,
    resilienceScore: underwriting?.resilience.score,
    marginOfSafetyPercent: underwriting?.margin.ready ? underwriting.margin.percent : undefined,
    refinanceStatus: underwriting?.refinance.status,
    buyBoxStatus: underwriting?.buyBox.status,
    dealSurvivalScore: underwriting?.downside.score,
    primaryRisk: underwriting?.downside.primaryRiskLabel,
    worstCaseCashflow: underwriting?.downside.worstCase.monthlyCashflow,
    worstCaseDscr: underwriting?.downside.worstCase.dscr,
    worstCaseRoi: underwriting?.downside.worstCase.roi,
  };
}

export function usePortfolio() {
  const [properties, setProperties, hydrated] = useLocalStorage<PortfolioProperty[]>(
    STORAGE_KEYS.portfolio,
    [],
    isPortfolio,
  );
  const [filters, setFilters] = useState<PortfolioFilters>(DEFAULT_FILTERS);

  const saveProperty = useCallback(
    (
      input: AnalysisInput,
      results: AnalysisResults,
      name?: string,
      existingId?: string,
      underwriting?: UnderwritingPack | null,
    ): PortfolioProperty => {
      const now = new Date().toISOString();
      const regionName = getRegionName(input.location.country, input.location.region);
      const snapshot = buildSnapshot(input, results, underwriting);
      const existing = existingId ? properties.find((p) => p.id === existingId) : undefined;

      const saved: PortfolioProperty = {
        id: existing?.id ?? createId(),
        name: name?.trim() || input.property.name,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        country: input.location.country,
        region: input.location.region,
        regionName,
        strategy: input.strategy,
        input,
        snapshot,
      };

      setProperties((prev) =>
        prev.some((p) => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev],
      );

      return saved;
    },
    [properties, setProperties],
  );

  const saveMaxOffer = useCallback(
    (
      maxOfferInput: MaxOfferInputs,
      results: MaxOfferResults,
      country: CountryCode,
      name?: string,
      existingId?: string,
      underwriting?: UnderwritingPack | null,
    ): PortfolioProperty => {
      const now = new Date().toISOString();
      const analysisInput = maxOfferToAnalysisInput(maxOfferInput, results, country);
      const regionName = getRegionName(analysisInput.location.country, analysisInput.location.region);
      const metrics = results.atRecommended.purchasePrice > 0 ? results.atRecommended : results.atMaximum;
      const score = calculateDealScore({
        roi: metrics.roi,
        monthlyCashflow: metrics.monthlyCashflow,
        capRate: metrics.capRate,
        dscr: metrics.dscr,
        grossYield: metrics.grossYield,
        negativeCashflow: metrics.monthlyCashflow < 0,
        dscrBelowOne: metrics.dscr < 1,
      });
      const { grade, recommendation, dealScore } = ratingFromOffer(results, score.grade, score.recommendation, score.score);
      const snapshot: PortfolioSnapshot = {
        purchasePrice: results.maximumOffer || metrics.purchasePrice,
        roi: metrics.roi,
        cashOnCash: metrics.cashOnCash,
        capRate: metrics.capRate,
        grossYield: metrics.grossYield,
        netYield: metrics.capRate,
        monthlyCashflow: metrics.monthlyCashflow,
        annualCashflow: metrics.annualCashflow,
        dscr: metrics.dscr,
        appreciationRate: analysisInput.location.market.appreciationRate,
        dealScore,
        grade,
        recommendation,
        resilienceScore: underwriting?.resilience.score,
        marginOfSafetyPercent: underwriting?.margin.ready ? underwriting.margin.percent : undefined,
        refinanceStatus: underwriting?.refinance.status ?? (results.brrrr.infiniteReturn || results.brrrr.cashPulledOut > 0 ? "viable" : "risk"),
        buyBoxStatus: underwriting?.buyBox.status,
        dealSurvivalScore: underwriting?.downside.score,
        primaryRisk: underwriting?.downside.primaryRiskLabel,
        worstCaseCashflow: underwriting?.downside.worstCase.monthlyCashflow,
        worstCaseDscr: underwriting?.downside.worstCase.dscr,
        worstCaseRoi: underwriting?.downside.worstCase.roi,
      };
      const existing = existingId ? properties.find((p) => p.id === existingId) : undefined;
      const saved: PortfolioProperty = {
        id: existing?.id ?? createId(),
        name: name?.trim() || maxOfferInput.property.name,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        country: analysisInput.location.country,
        region: analysisInput.location.region,
        regionName,
        strategy: maxOfferInput.strategy || analysisInput.strategy || "brrrr",
        input: { ...analysisInput, property: { ...analysisInput.property, name: name?.trim() || maxOfferInput.property.name } },
        snapshot,
        kind: "max-offer",
        maxOfferInput: {
          ...maxOfferInput,
          property: { ...maxOfferInput.property, name: name?.trim() || maxOfferInput.property.name },
        },
      };

      setProperties((prev) =>
        prev.some((p) => p.id === saved.id)
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev],
      );

      return saved;
    },
    [properties, setProperties],
  );

  const deleteProperty = useCallback(
    (id: string) => setProperties((prev) => prev.filter((p) => p.id !== id)),
    [setProperties],
  );

  const renameProperty = useCallback(
    (id: string, name: string) =>
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)),
      ),
    [setProperties],
  );

  const clearPortfolio = useCallback(() => setProperties([]), [setProperties]);

  const getById = useCallback((id: string) => properties.find((p) => p.id === id), [properties]);

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const list = properties.filter((p) => {
      if (filters.strategy !== "all" && p.strategy !== filters.strategy) return false;
      if (p.snapshot.dealScore < filters.minScore) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.regionName.toLowerCase().includes(term) ||
        p.input.property.address.toLowerCase().includes(term)
      );
    });

    const dir = filters.sortDirection === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (filters.sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "roi":
          return (a.snapshot.roi - b.snapshot.roi) * dir;
        case "cashflow":
          return (a.snapshot.monthlyCashflow - b.snapshot.monthlyCashflow) * dir;
        case "score":
          return (a.snapshot.dealScore - b.snapshot.dealScore) * dir;
        case "price":
          return (a.snapshot.purchasePrice - b.snapshot.purchasePrice) * dir;
        case "date":
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
  }, [properties, filters]);

  const stats = useMemo(() => {
    if (properties.length === 0) {
      return { count: 0, totalValue: 0, totalMonthlyCashflow: 0, averageScore: 0, averageRoi: 0 };
    }
    const totalValue = properties.reduce((s, p) => s + p.snapshot.purchasePrice, 0);
    const totalMonthlyCashflow = properties.reduce((s, p) => s + p.snapshot.monthlyCashflow, 0);
    const averageScore = properties.reduce((s, p) => s + p.snapshot.dealScore, 0) / properties.length;
    const finiteRois = properties.map((p) => p.snapshot.roi).filter((r) => Number.isFinite(r) && r < 500);
    const averageRoi = finiteRois.length ? finiteRois.reduce((s, r) => s + r, 0) / finiteRois.length : 0;
    return { count: properties.length, totalValue, totalMonthlyCashflow, averageScore, averageRoi };
  }, [properties]);

  return {
    properties,
    filtered,
    filters,
    setFilters,
    hydrated,
    stats,
    saveProperty,
    saveMaxOffer,
    deleteProperty,
    renameProperty,
    clearPortfolio,
    getById,
  };
}
