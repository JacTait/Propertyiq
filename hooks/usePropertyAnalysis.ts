"use client";

import { useMemo } from "react";
import type { AnalysisInput, AnalysisResults } from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { normalizeAnalysisInput } from "@/lib/calculations/rent";

/** Replace NaN / undefined numbers and fill v1.2 fields so legacy drafts keep working. */
export function sanitizeInput(input: AnalysisInput): AnalysisInput {
  return normalizeAnalysisInput(input);
}

export function usePropertyAnalysis(input: AnalysisInput | null | undefined): AnalysisResults | null {
  const serialized = input ? JSON.stringify(input) : null;
  return useMemo(() => {
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized) as AnalysisInput;
      return analyzeProperty(sanitizeInput(parsed));
    } catch {
      return null;
    }
  }, [serialized]);
}
