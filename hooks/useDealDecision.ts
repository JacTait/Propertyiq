"use client";

import { useMemo } from "react";
import type { AnalysisInput } from "@/lib/types";
import { evaluateDealDecision, type DealDecisionResult } from "@/lib/calculations/deal-decision";

export function useDealDecision(input: AnalysisInput | null | undefined): DealDecisionResult | null {
  const serialized = input ? JSON.stringify(input) : null;
  return useMemo(() => {
    if (!serialized) return null;
    try {
      return evaluateDealDecision(JSON.parse(serialized) as AnalysisInput);
    } catch {
      return null;
    }
  }, [serialized]);
}
