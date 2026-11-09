"use client";

import { useMemo } from "react";
import type { AnalysisInput, AnalysisResults, InvestmentSummary } from "@/lib/types";
import { getRegionName } from "@/data/market-data";
import { buildLocalSummary } from "@/services/ai";
import { useFormatters } from "@/hooks/useSettings";

export function useInvestmentSummary(
  input: AnalysisInput | null,
  results: AnalysisResults | null,
): InvestmentSummary | null {
  const formatters = useFormatters();
  return useMemo(() => {
    if (!input || !results) return null;
    return buildLocalSummary({
      input,
      results,
      regionName: getRegionName(input.location.country, input.location.region),
      formatCurrency: (v) => formatters.currency(v),
      formatPercent: (v, d) => formatters.percent(v, d),
    });
  }, [input, results, formatters]);
}
