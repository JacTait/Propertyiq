"use client";

import { useMemo } from "react";
import type { AnalysisInput, AnalysisResults, UnderwritingPack } from "@/lib/types";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";

export function useUnderwriting(
  input: AnalysisInput | null,
  results: AnalysisResults | null,
  options: { includeSensitivity?: boolean } = {},
): UnderwritingPack | null {
  const { active } = useBuyBoxes();
  const serialized = input ? JSON.stringify(input) : null;
  const buyBoxSerialized = active ? JSON.stringify(active) : null;
  const includeSensitivity = options.includeSensitivity !== false;

  return useMemo(() => {
    if (!serialized || !results) return null;
    const parsed = JSON.parse(serialized) as AnalysisInput;
    const box = buyBoxSerialized ? (JSON.parse(buyBoxSerialized) as typeof active) : null;
    return underwriteDeal(parsed, results, box, { includeSensitivity });
  }, [serialized, results, buyBoxSerialized, includeSensitivity]);
}
