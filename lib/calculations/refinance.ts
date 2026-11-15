import type { AnalysisInput, AnalysisResults, RefinanceLimitFactor, RefinanceValidation } from "@/lib/types";
import { DEFAULT_REFINANCE_DSCR } from "@/lib/constants";
import { calculateMonthlyPayment, loanPrincipalFromPayment } from "@/lib/calculations/mortgage";
import { calculateDscr, clamp, formatDscr, nullableDivide, safeDivide } from "@/lib/calculations/ratios";
import { resolveRent } from "@/lib/calculations/rent";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import {
  acquisitionClosingCosts,
  computeBrrrrCapital,
  holdingCostsFromFlip,
  resolveAcquisitionLoan,
} from "@/lib/calculations/brrrr-capital";

export function resolveArv(input: AnalysisInput): number {
  if (input.brrrr.afterRepairValue > 0) return input.brrrr.afterRepairValue;
  if (input.flip.expectedSalePrice > 0) return input.flip.expectedSalePrice;
  return input.financing.purchasePrice;
}

export interface SupportedRefinanceInput {
  arv: number;
  refinanceLtv: number;
  interestRate: number;
  termYears: number;
  requiredDscr: number;
  monthlyNoi: number;
}

export interface SupportedRefinanceResult {
  ltvBasedMaximumLoan: number;
  dscrSupportedMaximumLoan: number | null;
  supportedRefinanceLoan: number;
  limitingFactor: RefinanceLimitFactor;
  limitingLabel: string;
  monthlyPayment: number;
  postRefiDscr: number | null;
}

export function formatDscrOrNA(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Not applicable";
  if (value <= 0) return `${(0).toFixed(2)}x`;
  return `${value.toFixed(2)}x`;
}

/**
 * Size the refinance loan to the lesser of LTV and DSCR capacity.
 * Does not claim the full LTV loan is viable when rent cannot support the payment.
 */
export function sizeSupportedRefinance(input: SupportedRefinanceInput): SupportedRefinanceResult {
  const arv = Number.isFinite(input.arv) && input.arv > 0 ? input.arv : 0;
  const ltv = clamp(input.refinanceLtv, 0, 100);
  const rate = Number.isFinite(input.interestRate) ? input.interestRate : 0;
  const termYears = Number.isFinite(input.termYears) && input.termYears > 0 ? input.termYears : 0;
  const requiredDscr = input.requiredDscr > 0 && Number.isFinite(input.requiredDscr) ? input.requiredDscr : 0;
  const monthlyNoi = Number.isFinite(input.monthlyNoi) ? input.monthlyNoi : 0;

  const ltvBasedMaximumLoan = arv * (ltv / 100);
  const maxMonthlyDebtService =
    requiredDscr > 0 && monthlyNoi > 0 ? monthlyNoi / requiredDscr : 0;
  const dscrSupportedMaximumLoan =
    maxMonthlyDebtService > 0 && termYears > 0
      ? loanPrincipalFromPayment(maxMonthlyDebtService, rate, termYears)
      : requiredDscr > 0
        ? 0
        : null;

  let supportedRefinanceLoan = 0;
  let limitingFactor: RefinanceLimitFactor = "none";
  let limitingLabel = "No refinance loan sized";

  const dscrCap = dscrSupportedMaximumLoan;
  if (ltvBasedMaximumLoan > 0 && dscrCap !== null) {
    if (dscrCap < ltvBasedMaximumLoan) {
      supportedRefinanceLoan = Math.max(0, dscrCap);
      limitingFactor = "dscr";
      limitingLabel = "DSCR-Limited";
    } else {
      supportedRefinanceLoan = ltvBasedMaximumLoan;
      limitingFactor = "ltv";
      limitingLabel = "LTV-Limited";
    }
  } else if (ltvBasedMaximumLoan > 0) {
    supportedRefinanceLoan = ltvBasedMaximumLoan;
    limitingFactor = "ltv";
    limitingLabel = "LTV-Limited";
  }

  const monthlyPayment = calculateMonthlyPayment(supportedRefinanceLoan, rate, termYears);
  const postRefiDscr =
    monthlyPayment <= 0 ? null : nullableDivide(monthlyNoi, monthlyPayment);

  return {
    ltvBasedMaximumLoan,
    dscrSupportedMaximumLoan: dscrCap,
    supportedRefinanceLoan,
    limitingFactor,
    limitingLabel,
    monthlyPayment,
    postRefiDscr,
  };
}

export function validateRefinance(
  input: AnalysisInput,
  results: AnalysisResults,
  overrides?: { arvFactor?: number; rentFactor?: number },
): RefinanceValidation {
  const arvFactor = overrides?.arvFactor ?? 1;
  const rentFactor = overrides?.rentFactor ?? 1;
  const arv = Math.max(0, resolveArv(input) * arvFactor);
  const ltv = clamp(input.brrrr.refinanceLtv || 75, 0, 100);
  const rate = input.brrrr.refinanceRate || input.financing.interestRate;
  const termYears = input.brrrr.refinanceTermYears || input.financing.termYears;
  const dscrRequirement =
    input.brrrr.refinanceDscrMin > 0 ? input.brrrr.refinanceDscrMin : DEFAULT_REFINANCE_DSCR;

  const maximumRefinanceAmount = arv * (ltv / 100);
  const loanAmount = maximumRefinanceAmount;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, termYears);

  const rehab = input.strategy === "fix-flip" ? input.flip.renovationBudget : input.brrrr.rehabCost;
  const capital = computeBrrrrCapital({
    purchasePrice: input.financing.purchasePrice,
    rehabCost: rehab,
    closingCosts: acquisitionClosingCosts(input.financing),
    holdingCosts: holdingCostsFromFlip(input.flip),
    originalLoan: resolveAcquisitionLoan(
      input.financing.purchasePrice,
      input.financing.depositPercent,
      results.mortgage?.loanAmount,
    ),
    refinanceProceeds: loanAmount,
  });

  const rent = resolveRent(input).active * rentFactor;
  const income = calculateIncome(rent, input.expenses.vacancyPercent);
  const opex = calculateOperatingExpenses(input.expenses, income.effectiveGrossIncome, income.annualIncome);
  const noi = income.effectiveGrossIncome - opex.annual;
  const annualDebtService = monthlyPayment * 12;
  const postRefiDscr = calculateDscr(noi, annualDebtService);
  const postRefiMonthlyCashflow = (noi - annualDebtService) / 12;

  const dscrOk = Number.isFinite(postRefiDscr) ? postRefiDscr >= dscrRequirement : loanAmount <= 0;
  const loanOk = loanAmount > 0 && arv > 0;
  const cashflowOk = postRefiMonthlyCashflow >= 0;
  const recovery = safeDivide(Math.max(0, capital.cashPulledOut), capital.totalCapitalInvested);
  const recoveryWeak = capital.totalCapitalInvested > 0 && recovery < 0.5;
  const viable = loanOk && dscrOk && cashflowOk && !recoveryWeak && capital.cashPulledOut >= 0;

  let headline: string;
  let detail: string;
  if (!loanOk) {
    headline = "Refinance Risk";
    detail = "ARV or refinance LTV is too low to size a refinance loan.";
  } else if (capital.cashPulledOut < 0) {
    headline = "Refinance Risk";
    detail = `The refinance loan of ${Math.round(loanAmount).toLocaleString()} does not cover the ${Math.round(capital.originalLoanPayoff).toLocaleString()} acquisition payoff.`;
  } else if (!dscrOk) {
    headline = "Refinance Risk";
    detail = `Post-refinance DSCR of ${formatDscr(postRefiDscr)} is below the ${formatDscr(dscrRequirement)} requirement.`;
  } else if (!cashflowOk) {
    headline = "Refinance Risk";
    detail = "The refinance payment would push the property into negative cashflow.";
  } else if (recoveryWeak) {
    headline = "Refinance Risk";
    detail = `Only ${Math.round(recovery * 100)}% of cash invested would come out on refinance.`;
  } else {
    headline = "Refinance Appears Viable";
    detail =
      capital.cashLeftInDeal <= 0
        ? "The refinance recycles all invested cash while covering debt service."
        : `The refinance covers debt service at ${formatDscr(postRefiDscr)} DSCR with ${Math.round(recovery * 100)}% cash recovered.`;
  }

  return {
    arv,
    refinanceLtv: ltv,
    interestRate: rate,
    termYears,
    dscrRequirement,
    maximumRefinanceAmount,
    loanAmount,
    monthlyPayment,
    totalProjectCost: capital.totalProjectCost,
    totalCapitalInvested: capital.totalCapitalInvested,
    originalLoanPayoff: capital.originalLoanPayoff,
    cashPulledOut: capital.cashPulledOut,
    cashLeftInDeal: capital.cashLeftInDeal,
    postRefiDscr,
    postRefiMonthlyCashflow,
    viable,
    status: viable ? "viable" : "risk",
    headline,
    detail,
  };
}
