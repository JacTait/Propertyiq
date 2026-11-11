"use client";

import { useMemo } from "react";
import type { AnalysisInput, AnalysisResults, UnderwritingPack } from "@/lib/types";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";

export function useUnderwriting(
  input: AnalysisInput | null,
  results: AnalysisResults | null,
  options: {
    includeSensitivity?: boolean;
    includeDownsideSensitivity?: boolean;
    desiredMonthlyCashflow?: number;
    marginPrice?: number | null;
    marginOffers?: { recommendedOffer: number; maximumOffer: number } | null;
  } = {},
): UnderwritingPack | null {
  const { active } = useBuyBoxes();
  const serialized = input ? JSON.stringify(input) : null;
  const buyBoxSerialized = active ? JSON.stringify(active) : null;
  const includeSensitivity = options.includeSensitivity !== false;
  const includeDownsideSensitivity = options.includeDownsideSensitivity !== false;
  const desiredMonthlyCashflow = options.desiredMonthlyCashflow;
  const marginPrice = options.marginPrice;
  const hasMarginOverride = Object.prototype.hasOwnProperty.call(options, "marginPrice");
  const recommendedOffer = options.marginOffers?.recommendedOffer;
  const maximumOffer = options.marginOffers?.maximumOffer;

  return useMemo(() => {
    if (!serialized || !results) return null;
    const parsed = JSON.parse(serialized) as AnalysisInput;
    const box = buyBoxSerialized ? (JSON.parse(buyBoxSerialized) as typeof active) : null;
    const marginOffers =
      recommendedOffer !== undefined && maximumOffer !== undefined
        ? { recommendedOffer, maximumOffer }
        : undefined;
    return underwriteDeal(parsed, results, box, {
      includeSensitivity,
      includeDownsideSensitivity,
      ...(desiredMonthlyCashflow !== undefined ? { desiredMonthlyCashflow } : {}),
      ...(hasMarginOverride ? { marginPrice } : {}),
      ...(marginOffers ? { marginOffers } : {}),
    });
  }, [
    serialized,
    results,
    buyBoxSerialized,
    includeSensitivity,
    includeDownsideSensitivity,
    desiredMonthlyCashflow,
    hasMarginOverride,
    marginPrice,
    recommendedOffer,
    maximumOffer,
  ]);
}
