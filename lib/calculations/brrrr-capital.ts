/**
 * Shared BRRRR capital stack.
 *
 * All-in cost     = purchase + rehab + closing + holding
 * Cash invested   = all-in cost − acquisition loan
 * Refinance loan  = ARV × refinance LTV
 * Cash pulled out = refinance loan − acquisition loan payoff
 * Cash left in    = cash invested − cash pulled out
 *                 = all-in cost − refinance loan  (when the refi pays off the old loan)
 */

export interface BrrrrCapitalInput {
  purchasePrice: number;
  rehabCost: number;
  closingCosts: number;
  holdingCosts: number;
  originalLoan: number;
  refinanceProceeds: number;
}

export interface BrrrrCapitalResult {
  totalProjectCost: number;
  totalCapitalInvested: number;
  originalLoanPayoff: number;
  refinanceProceeds: number;
  cashPulledOut: number;
  cashLeftInDeal: number;
}

function money(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeBrrrrCapital(input: BrrrrCapitalInput): BrrrrCapitalResult {
  const purchasePrice = money(input.purchasePrice);
  const rehabCost = money(input.rehabCost);
  const closingCosts = money(input.closingCosts);
  const holdingCosts = money(input.holdingCosts);
  const originalLoanPayoff = money(input.originalLoan);
  const refinanceProceeds = money(input.refinanceProceeds);

  const totalProjectCost = purchasePrice + rehabCost + closingCosts + holdingCosts;
  const totalCapitalInvested = Math.max(0, totalProjectCost - originalLoanPayoff);
  const cashPulledOut = refinanceProceeds - originalLoanPayoff;
  const cashLeftInDeal = totalProjectCost - refinanceProceeds;

  return {
    totalProjectCost,
    totalCapitalInvested,
    originalLoanPayoff,
    refinanceProceeds,
    cashPulledOut,
    cashLeftInDeal,
  };
}

export function acquisitionClosingCosts(financing: {
  closingCosts: number;
  legalFees: number;
  inspectionCosts: number;
  loanFees: number;
}): number {
  return money(financing.closingCosts) + money(financing.legalFees) + money(financing.inspectionCosts) + money(financing.loanFees);
}

export function holdingCostsFromFlip(flip: { holdingCostsMonthly: number; holdDurationMonths: number }): number {
  return money(flip.holdingCostsMonthly) * money(flip.holdDurationMonths);
}

/** Reconstruct the acquisition loan if a result snapshot omitted it. */
export function resolveAcquisitionLoan(
  purchasePrice: number,
  depositPercent: number,
  reportedLoan?: number,
): number {
  if (typeof reportedLoan === "number" && Number.isFinite(reportedLoan) && reportedLoan > 0) {
    return reportedLoan;
  }
  const price = money(purchasePrice);
  const deposit = Number.isFinite(depositPercent) ? Math.min(100, Math.max(0, depositPercent)) : 0;
  if (price <= 0 || deposit >= 100) return 0;
  return price * (1 - deposit / 100);
}
