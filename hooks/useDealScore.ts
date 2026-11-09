"use client";

import { useMemo } from "react";
import type { DealScore } from "@/lib/types";
import { calculateDealScore, type DealScoreInputs } from "@/lib/calculations/deal-score";

export function useDealScore(inputs: DealScoreInputs | null): DealScore | null {
  const key = inputs ? JSON.stringify(inputs) : null;
  return useMemo(() => {
    if (!key) return null;
    return calculateDealScore(JSON.parse(key) as DealScoreInputs);
  }, [key]);
}
