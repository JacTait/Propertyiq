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
import { computeCashRecovery } from "@/lib/calculations/cash-recovery";
import { applyUnderwrittenPrice } from "@/lib/calculations/underwritten-price";

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
  const priced = applyUnderwrittenPrice(input);
  const arv = Math.max(0, resolveArv(priced) * arvFactor);
  const ltv = clamp(priced.brrrr.refinanceLtv || 75, 0, 100);
  const rate = priced.brrrr.refinanceRate || priced.financing.interestRate;
  const termYears = priced.brrrr.refinanceTermYears || priced.financing.termYears;
  const dscrRequirement =
    priced.brrrr.refinanceDscrMin > 0 ? priced.brrrr.refinanceDscrMin : DEFAULT_REFINANCE_DSCR;

  const rent = resolveRent(input).active * rentFactor;
  const income = calculateIncome(rent, input.expenses.vacancyPercent);
  const opex = calculateOperatingExpenses(input.expenses, income.effectiveGrossIncome, income.annualIncome);
  const noi = income.effectiveGrossIncome - opex.annual;
  const monthlyNoi = noi / 12;

  const sized = sizeSupportedRefinance({
    arv,
    refinanceLtv: ltv,
    interestRate: rate,
    termYears,
    requiredDscr: dscrRequirement,
    monthlyNoi,
  });

  const fullLtvLoan = sized.ltvBasedMaximumLoan;
  const fullLtvPayment = calculateMonthlyPayment(fullLtvLoan, rate, termYears);
  const fullLtvDscr = calculateDscr(noi, fullLtvPayment * 12);
  const fullLtvMonthlyCashflow = (noi - fullLtvPayment * 12) / 12;
  const fullLtvCompliant =
    fullLtvLoan > 0 && (fullLtvPayment <= 0 || (Number.isFinite(fullLtvDscr) && fullLtvDscr + 1e-6 >= dscrRequirement));

  const loanAmount = sized.supportedRefinanceLoan;
  const monthlyPayment = sized.monthlyPayment;
  const postRefiDscr = sized.postRefiDscr ?? calculateDscr(noi, monthlyPayment * 12);
  const postRefiMonthlyCashflow = (noi - monthlyPayment * 12) / 12;

  const rehab = priced.strategy === "fix-flip" ? priced.flip.renovationBudget : priced.brrrr.rehabCost;
  const closing = acquisitionClosingCosts(priced.financing);
  const holding = holdingCostsFromFlip(priced.flip);
  const originalLoan = resolveAcquisitionLoan(
    priced.financing.purchasePrice,
    priced.financing.depositPercent,
    results.mortgage?.loanAmount,
  );
  const project = computeBrrrrCapital({
    purchasePrice: priced.financing.purchasePrice,
    rehabCost: rehab,
    closingCosts: closing,
    holdingCosts: holding,
    originalLoan,
    refinanceProceeds: loanAmount,
  });
  const recovery = computeCashRecovery({
    totalCapitalInvested: project.totalCapitalInvested,
    grossRefinanceProceeds: loanAmount,
    refinanceClosingCosts: Math.max(0, priced.brrrr.refinanceClosingCosts),
    loanPayoffAmount: originalLoan,
  });

  const dscrOk = postRefiDscr === null || !Number.isFinite(postRefiDscr) ? loanAmount <= 0 : postRefiDscr + 1e-6 >= dscrRequirement;
  const loanOk = loanAmount > 0 && arv > 0;
  const cashflowOk = postRefiMonthlyCashflow >= 0;
  const recoveryRatio = safeDivide(recovery.cashRecovered, project.totalCapitalInvested);
  const viable = loanOk && dscrOk && cashflowOk;

  let headline: string;
  let detail: string;
  if (!loanOk) {
    headline = "Refinance Risk";
    detail = "ARV or refinance LTV is too low to size a refinance loan.";
  } else if (!dscrOk) {
    headline = "Refinance Risk";
    detail = `Supported post-refinance DSCR of ${formatDscr(postRefiDscr)} is below the ${formatDscr(dscrRequirement)} requirement.`;
  } else if (!cashflowOk) {
    headline = "Refinance Risk";
    detail = "The supported refinance payment would push the property into negative cashflow.";
  } else if (sized.limitingFactor === "dscr") {
    headline = "Refinance Viable — DSCR Limited";
    detail =
      recovery.netRefinanceProceeds < 0
        ? `Supported refinance meets ${formatDscr(dscrRequirement)} DSCR. Full ${ltv.toFixed(0)}% LTV refinance is not supported by rent. Net proceeds do not fully cover the acquisition payoff.`
        : `Supported refinance meets ${formatDscr(dscrRequirement)} DSCR. Full ${ltv.toFixed(0)}% LTV refinance is not supported by rent.`;
  } else {
    headline = "Refinance Appears Viable";
    detail =
      recovery.cashLeftInDeal <= 0
        ? "The supported refinance recycles all invested cash while covering debt service."
        : `The supported refinance covers debt service at ${formatDscr(postRefiDscr)} DSCR with ${Math.round(recoveryRatio * 100)}% cash recovered.`;
  }

  const fullLtvHeadline = fullLtvCompliant ? "Full-LTV Scenario — DSCR Compliant" : "Full-LTV Scenario — Not DSCR Compliant";
  const fullLtvDetail = fullLtvCompliant
    ? `A full ${ltv.toFixed(0)}% LTV loan of ${Math.round(fullLtvLoan).toLocaleString()} still meets the ${formatDscr(dscrRequirement)} DSCR gate.`
    : `A full ${ltv.toFixed(0)}% LTV loan of ${Math.round(fullLtvLoan).toLocaleString()} produces ${formatDscr(fullLtvDscr)} DSCR and is not DSCR compliant.`;

  return {
    arv,
    refinanceLtv: ltv,
    interestRate: rate,
    termYears,
    dscrRequirement,
    maximumRefinanceAmount: fullLtvLoan,
    loanAmount,
    monthlyPayment,
    totalProjectCost: project.totalProjectCost,
    totalCapitalInvested: project.totalCapitalInvested,
    originalLoanPayoff: originalLoan,
    cashPulledOut: recovery.cashRecovered,
    cashLeftInDeal: recovery.cashLeftInDeal,
    postRefiDscr: postRefiDscr ?? 0,
    postRefiMonthlyCashflow,
    viable,
    status: viable ? "viable" : "risk",
    headline,
    detail,
    ltvBasedLoan: sized.ltvBasedMaximumLoan,
    dscrSupportedLoan: sized.dscrSupportedMaximumLoan,
    supportedRefinanceLoan: sized.supportedRefinanceLoan,
    limitingFactor: sized.limitingFactor,
    limitingLabel: sized.limitingLabel,
    supportedPayment: sized.monthlyPayment,
    supportedDscr: sized.postRefiDscr,
    fullLtvLoan,
    fullLtvPayment,
    fullLtvDscr,
    fullLtvMonthlyCashflow,
    fullLtvCompliant,
    fullLtvHeadline,
    fullLtvDetail,
  };
}
