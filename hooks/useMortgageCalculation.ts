"use client";

import { useMemo } from "react";
import type { Mortgage } from "@/lib/types";
import { calculateMortgage } from "@/lib/calculations/mortgage";

export interface MortgageHookInput {
  purchasePrice: number;
  depositPercent: number;
  interestRate: number;
  termYears: number;
}

export function useMortgageCalculation(input: MortgageHookInput): Mortgage {
  return useMemo(
    () =>
      calculateMortgage({
        purchasePrice: Number.isFinite(input.purchasePrice) ? input.purchasePrice : 0,
        depositPercent: Number.isFinite(input.depositPercent) ? input.depositPercent : 0,
        interestRate: Number.isFinite(input.interestRate) ? input.interestRate : 0,
        termYears: Number.isFinite(input.termYears) && input.termYears > 0 ? input.termYears : 30,
      }),
    [input.purchasePrice, input.depositPercent, input.interestRate, input.termYears],
  );
}
