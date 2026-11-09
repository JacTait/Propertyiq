import type { BrrrrInputs, BrrrrResults, ExpenseInputs, FinancingInputs } from "@/lib/types";
import { calculateMonthlyPayment } from "@/lib/calculations/mortgage";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { clamp, safeDivide } from "@/lib/calculations/ratios";

export interface BrrrrParams {
  financing: FinancingInputs;
  brrrr: BrrrrInputs;
  expenses: ExpenseInputs;
  initialLoanAmount: number;
}

export function calculateBrrrr(p: BrrrrParams): BrrrrResults {
  const { financing, brrrr, expenses } = p;
  const acquisitionCosts =
    financing.closingCosts + financing.legalFees + financing.inspectionCosts + financing.loanFees;
  const totalProjectCost = financing.purchasePrice + acquisitionCosts + brrrr.rehabCost;
  const initialCashInvested = Math.max(0, totalProjectCost - p.initialLoanAmount);

  const refinanceAmount = brrrr.afterRepairValue * (brrrr.refinanceLtv / 100);
  // Refinance proceeds first pay off the original acquisition loan.
  const netProceeds = refinanceAmount - p.initialLoanAmount;
  const cashPulledOut = Math.max(0, netProceeds);
  const cashLeftInDeal = Math.max(0, initialCashInvested - cashPulledOut);

  const newMonthlyPayment = calculateMonthlyPayment(
    refinanceAmount,
    brrrr.refinanceRate,
    brrrr.refinanceTermYears,
  );
  const annualDebtService = newMonthlyPayment * 12;

  const income = calculateIncome(brrrr.expectedRent, expenses.vacancyPercent);
  const opex = calculateOperatingExpenses(expenses, income.effectiveGrossIncome, income.annualIncome);
  const noi = income.effectiveGrossIncome - opex.annual;
  const annualCashflow = noi - annualDebtService;

  const infiniteReturn = cashLeftInDeal <= 0 && annualCashflow > 0;
  const roi = infiniteReturn ? Infinity : safeDivide(annualCashflow, cashLeftInDeal) * 100;
  const equityAfterRefinance = brrrr.afterRepairValue - refinanceAmount;

  // Efficiency: capital recovered (70%) + cashflow health (30%).
  const recoveryRatio = initialCashInvested > 0 ? cashPulledOut / initialCashInvested : 1;
  const recoveryScore = clamp(recoveryRatio, 0, 1) * 70;
  const cashflowScore = clamp(annualCashflow / 12 / 400, 0, 1) * 30;
  const efficiencyScore = Math.round(recoveryScore + cashflowScore);

  return {
    totalProjectCost,
    initialCashInvested,
    refinanceAmount,
    cashPulledOut,
    cashLeftInDeal,
    newMonthlyPayment,
    monthlyCashflow: annualCashflow / 12,
    annualCashflow,
    roi,
    equityAfterRefinance,
    efficiencyScore,
    infiniteReturn,
  };
}
