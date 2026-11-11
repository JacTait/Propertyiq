import type { AnalysisInput, AnalysisResults, RefinanceValidation } from "@/lib/types";
import { DEFAULT_REFINANCE_DSCR } from "@/lib/constants";
import { calculateMonthlyPayment } from "@/lib/calculations/mortgage";
import { calculateDscr, clamp, formatDscr, safeDivide } from "@/lib/calculations/ratios";
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
