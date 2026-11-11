import type { BrrrrInputs, BrrrrResults, ExpenseInputs, FinancingInputs } from "@/lib/types";
import { calculateMonthlyPayment } from "@/lib/calculations/mortgage";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { clamp, safeDivide } from "@/lib/calculations/ratios";
import { acquisitionClosingCosts, computeBrrrrCapital } from "@/lib/calculations/brrrr-capital";

export interface BrrrrParams {
  financing: FinancingInputs;
  brrrr: BrrrrInputs;
  expenses: ExpenseInputs;
  initialLoanAmount: number;
  holdingCosts?: number;
}

export function calculateBrrrr(p: BrrrrParams): BrrrrResults {
  const { financing, brrrr, expenses } = p;
  const refinanceAmount = Math.max(0, brrrr.afterRepairValue * (brrrr.refinanceLtv / 100));
  const capital = computeBrrrrCapital({
    purchasePrice: financing.purchasePrice,
    rehabCost: brrrr.rehabCost,
    closingCosts: acquisitionClosingCosts(financing),
    holdingCosts: p.holdingCosts ?? 0,
    originalLoan: p.initialLoanAmount,
    refinanceProceeds: refinanceAmount,
  });

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

  const cashLeftInDeal = Math.max(0, capital.cashLeftInDeal);
  const infiniteReturn = cashLeftInDeal <= 0 && annualCashflow > 0;
  const roi = infiniteReturn ? Infinity : safeDivide(annualCashflow, cashLeftInDeal) * 100;
  const equityAfterRefinance = brrrr.afterRepairValue - refinanceAmount;

  const recovered = Math.max(0, capital.cashPulledOut);
  const recoveryRatio = capital.totalCapitalInvested > 0 ? recovered / capital.totalCapitalInvested : 1;
  const recoveryScore = clamp(recoveryRatio, 0, 1) * 70;
  const cashflowScore = clamp(annualCashflow / 12 / 400, 0, 1) * 30;
  const efficiencyScore = Math.round(recoveryScore + cashflowScore);

  return {
    totalProjectCost: capital.totalProjectCost,
    initialCashInvested: capital.totalCapitalInvested,
    refinanceAmount,
    cashPulledOut: capital.cashPulledOut,
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
