import type { FinancingInputs, FixFlipResults, FlipInputs } from "@/lib/types";
import { annualiseRoi, calculateSimpleRoi, safeDivide } from "@/lib/calculations/ratios";

export interface FlipParams {
  financing: FinancingInputs;
  flip: FlipInputs;
  loanAmount: number;
  monthlyMortgagePayment: number;
}

export function calculateFixFlip(p: FlipParams): FixFlipResults {
  const { financing, flip } = p;
  const acquisitionCosts =
    financing.closingCosts + financing.legalFees + financing.inspectionCosts + financing.loanFees;
  const holdingCosts =
    (flip.holdingCostsMonthly + p.monthlyMortgagePayment) * flip.holdDurationMonths;
  const sellingPercent = (flip.sellingCostsPercent + flip.realtorFeePercent) / 100;
  const sellingCosts = flip.expectedSalePrice * sellingPercent;

  const totalInvestment =
    financing.purchasePrice +
    acquisitionCosts +
    flip.renovationBudget +
    holdingCosts +
    flip.financingCosts;

  const cashInvested = Math.max(1, totalInvestment - p.loanAmount);
  const profit = flip.expectedSalePrice - sellingCosts - totalInvestment;
  const profitMargin = safeDivide(profit, flip.expectedSalePrice) * 100;
  const roi = calculateSimpleRoi(profit, cashInvested);
  const annualisedRoi = annualiseRoi(roi, flip.holdDurationMonths);
  const breakEvenSalePrice = sellingPercent < 1 ? totalInvestment / (1 - sellingPercent) : totalInvestment;

  return {
    acquisitionCosts,
    renovationBudget: flip.renovationBudget,
    holdingCosts,
    financingCosts: flip.financingCosts,
    sellingCosts,
    totalInvestment,
    cashInvested,
    profit,
    profitMargin,
    roi,
    annualisedRoi,
    breakEvenSalePrice,
    holdDurationMonths: flip.holdDurationMonths,
  };
}
