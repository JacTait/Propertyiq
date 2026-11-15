export interface CashRecoveryInput {
  totalCapitalInvested: number;
  grossRefinanceProceeds: number;
  refinanceClosingCosts: number;
  loanPayoffAmount: number;
}

export interface CashRecoveryBreakdown {
  totalCapitalInvested: number;
  grossRefinanceProceeds: number;
  netRefinanceProceeds: number;
  cashRecovered: number;
  excessCashOut: number;
  cashLeftInDeal: number;
  cashRecoveryPercent: number | null;
}

function money(value: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * BRRRR cash recovery using total capital invested = all-in cost.
 * Cash recovered is the lesser of net refinance proceeds and capital invested.
 * This is distinct from labelling the entire refinance loan as cash pulled out.
 */
export function computeCashRecovery(input: CashRecoveryInput): CashRecoveryBreakdown {
  const totalCapitalInvested = money(input.totalCapitalInvested);
  const grossRefinanceProceeds = money(input.grossRefinanceProceeds);
  const refinanceClosingCosts = money(input.refinanceClosingCosts);
  const loanPayoffAmount = money(input.loanPayoffAmount);
  const netRefinanceProceeds = grossRefinanceProceeds - refinanceClosingCosts - loanPayoffAmount;
  const cashRecovered = Math.min(Math.max(0, netRefinanceProceeds), totalCapitalInvested);
  const excessCashOut = Math.max(netRefinanceProceeds - totalCapitalInvested, 0);
  const cashLeftInDeal = Math.max(totalCapitalInvested - netRefinanceProceeds, 0);
  const cashRecoveryPercent =
    totalCapitalInvested > 0 && Number.isFinite(cashRecovered / totalCapitalInvested)
      ? (cashRecovered / totalCapitalInvested) * 100
      : null;

  return {
    totalCapitalInvested,
    grossRefinanceProceeds,
    netRefinanceProceeds,
    cashRecovered,
    excessCashOut,
    cashLeftInDeal,
    cashRecoveryPercent,
  };
}
