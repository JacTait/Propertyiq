/**
 * Yield, cap rate, ROI and DSCR calculations.
 * All percentage outputs are expressed as whole percentages (6.1 = 6.1%).
 */

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/** Same guards as safeDivide, but returns null instead of a numeric fallback. */
export function nullableDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
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

export function calculateDscr(noi: number, annualDebtService: number): number {
  if (!Number.isFinite(noi)) return 0;
  if (!Number.isFinite(annualDebtService) || annualDebtService <= 0) {
    return noi > 0 ? Infinity : 0;
  }
  return safeDivide(noi, annualDebtService);
}

/** User-facing DSCR. No-debt coverage is ∞, never a fake 99.00x. */
export function formatDscr(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "∞";
  if (value <= 0) return `${(0).toFixed(decimals)}x`;
  return `${value.toFixed(decimals)}x`;
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
