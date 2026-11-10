"use client";

import { useMemo } from "react";
import type { MaxOfferInputs, MaxOfferResults } from "@/lib/types";
import { calculateMaxOffer, sanitizeMaxOffer } from "@/lib/calculations/max-offer";

export function useMaxOfferAnalysis(input: MaxOfferInputs | null): MaxOfferResults | null {
  const serialized = input ? JSON.stringify(input) : null;
  return useMemo(() => {
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized) as MaxOfferInputs;
      return calculateMaxOffer(sanitizeMaxOffer(parsed));
    } catch {
      return null;
    }
  }, [serialized]);
}
