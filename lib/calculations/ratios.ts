/**
 * Yield, cap rate, ROI and DSCR calculations.
 * All percentage outputs are expressed as whole percentages (6.1 = 6.1%).
 */

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/* ---------------------------- Yield ---------------------------- */

export function calculateGrossYield(annualIncome: number, purchasePrice: number): number {
  return safeDivide(annualIncome, purchasePrice) * 100;
}

export function calculateNetYield(noi: number, purchasePrice: number): number {
  return safeDivide(noi, purchasePrice) * 100;
}

/* --------------------------- Cap rate -------------------------- */

export function calculateCapRate(noi: number, purchasePrice: number): number {
  return safeDivide(noi, purchasePrice) * 100;
}

/* ----------------------------- ROI ----------------------------- */

export function calculateCashOnCash(annualCashflow: number, totalCashInvested: number): number {
  return safeDivide(annualCashflow, totalCashInvested) * 100;
}

/**
 * Total first-year return including cashflow, principal paydown and appreciation.
 */
export function calculateTotalRoi(
  annualCashflow: number,
  principalPaid: number,
  appreciationGain: number,
  totalCashInvested: number,
): number {
  return safeDivide(annualCashflow + principalPaid + appreciationGain, totalCashInvested) * 100;
}

export function calculateSimpleRoi(profit: number, invested: number): number {
  return safeDivide(profit, invested) * 100;
}

export function annualiseRoi(roiPercent: number, months: number): number {
  if (months <= 0) return 0;
  return roiPercent * (12 / months);
}

/* ----------------------------- DSCR ---------------------------- */

export const DSCR_CAP = 99;

export function calculateDscr(noi: number, annualDebtService: number): number {
  if (annualDebtService <= 0) return noi > 0 ? DSCR_CAP : 0;
  return Math.min(DSCR_CAP, safeDivide(noi, annualDebtService));
}

/* --------------------------- Cash needed ----------------------- */

export interface ClosingCostInputs {
  depositAmount: number;
  closingCosts: number;
  legalFees: number;
  inspectionCosts: number;
  loanFees: number;
}

export function calculateCashToClose(c: ClosingCostInputs): number {
  return c.depositAmount + c.closingCosts + c.legalFees + c.inspectionCosts + c.loanFees;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
