import type { AnalysisInput, AnalysisResults, RefinanceValidation } from "@/lib/types";
import { DEFAULT_REFINANCE_DSCR } from "@/lib/constants";
import { calculateMonthlyPayment } from "@/lib/calculations/mortgage";
import { calculateDscr, clamp, safeDivide } from "@/lib/calculations/ratios";
import { resolveRent } from "@/lib/calculations/rent";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";

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

  const acquisitionCosts =
    input.financing.closingCosts +
    input.financing.legalFees +
    input.financing.inspectionCosts +
    input.financing.loanFees;
  const rehab = input.strategy === "fix-flip" ? input.flip.renovationBudget : input.brrrr.rehabCost;
  const totalProjectCost = input.financing.purchasePrice + acquisitionCosts + rehab;
  const initialLoan = results.mortgage.loanAmount;
  const initialCashInvested = Math.max(0, totalProjectCost - initialLoan);
  const cashPulledOut = Math.max(0, loanAmount - initialLoan);
  const cashLeftInDeal = Math.max(0, initialCashInvested - cashPulledOut);

  const rent = resolveRent(input).active * rentFactor;
  const income = calculateIncome(rent, input.expenses.vacancyPercent);
  const opex = calculateOperatingExpenses(input.expenses, income.effectiveGrossIncome, income.annualIncome);
  const noi = income.effectiveGrossIncome - opex.annual;
  const postRefiDscr = calculateDscr(noi, monthlyPayment * 12);
  const postRefiMonthlyCashflow = (noi - monthlyPayment * 12) / 12;

  const dscrOk = postRefiDscr >= dscrRequirement;
  const loanOk = loanAmount > 0 && arv > 0;
  const cashflowOk = postRefiMonthlyCashflow >= 0;
  const recovery = safeDivide(cashPulledOut, initialCashInvested);
  const recoveryWeak = initialCashInvested > 0 && recovery < 0.5;
  const viable = loanOk && dscrOk && cashflowOk && !recoveryWeak;

  let headline: string;
  let detail: string;
  if (!loanOk) {
    headline = "Refinance Risk";
    detail = "ARV or refinance LTV is too low to size a refinance loan.";
  } else if (!dscrOk) {
    headline = "Refinance Risk";
    detail = `Post-refinance DSCR of ${postRefiDscr.toFixed(2)}x is below the ${dscrRequirement.toFixed(2)}x requirement.`;
  } else if (!cashflowOk) {
    headline = "Refinance Risk";
    detail = "The refinance payment would push the property into negative cashflow.";
  } else if (recoveryWeak) {
    headline = "Refinance Risk";
    detail = `Only ${Math.round(recovery * 100)}% of cash invested would come out on refinance.`;
  } else {
    headline = "Refinance Appears Viable";
    detail =
      cashLeftInDeal <= 0
        ? "The refinance recycles all invested cash while covering debt service."
        : `The refinance covers debt service at ${postRefiDscr.toFixed(2)}x DSCR with ${Math.round(recovery * 100)}% cash recovered.`;
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
    cashPulledOut,
    cashLeftInDeal,
    postRefiDscr,
    postRefiMonthlyCashflow,
    viable,
    status: viable ? "viable" : "risk",
    headline,
    detail,
  };
}
