"use client";

import { useMemo } from "react";
import type { AnalysisInput, AnalysisResults } from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";

/** Replace NaN / undefined numbers (from in-progress form edits) with 0. */
export function sanitizeInput(input: AnalysisInput): AnalysisInput {
  const clean = <T extends object>(obj: T): T => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "number") {
        out[key] = Number.isFinite(value) ? value : 0;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = clean(value as object);
      } else {
        out[key] = value;
      }
    }
    return out as T;
  };
  return clean(input);
}

export function usePropertyAnalysis(input: AnalysisInput | null): AnalysisResults | null {
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
