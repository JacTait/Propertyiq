import type { BrrrrInputs, BrrrrResults, ExpenseInputs, FinancingInputs } from "@/lib/types";
import { DEFAULT_REFINANCE_DSCR } from "@/lib/constants";
import { calculateIncome, calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { clamp, safeDivide } from "@/lib/calculations/ratios";
import { acquisitionClosingCosts, computeBrrrrCapital } from "@/lib/calculations/brrrr-capital";
import { computeCashRecovery } from "@/lib/calculations/cash-recovery";
import { sizeSupportedRefinance } from "@/lib/calculations/refinance";

export interface BrrrrParams {
  financing: FinancingInputs;
  brrrr: BrrrrInputs;
  expenses: ExpenseInputs;
  initialLoanAmount: number;
  holdingCosts?: number;
}

export function calculateBrrrr(p: BrrrrParams): BrrrrResults {
  const { financing, brrrr, expenses } = p;
  const income = calculateIncome(brrrr.expectedRent, expenses.vacancyPercent);
  const opex = calculateOperatingExpenses(expenses, income.effectiveGrossIncome, income.annualIncome);
  const noi = income.effectiveGrossIncome - opex.annual;
  const sized = sizeSupportedRefinance({
    arv: brrrr.afterRepairValue,
    refinanceLtv: brrrr.refinanceLtv,
    interestRate: brrrr.refinanceRate,
    termYears: brrrr.refinanceTermYears,
    requiredDscr: brrrr.refinanceDscrMin > 0 ? brrrr.refinanceDscrMin : DEFAULT_REFINANCE_DSCR,
    monthlyNoi: noi / 12,
  });
  const refinanceAmount = sized.supportedRefinanceLoan;
  const capital = computeBrrrrCapital({
    purchasePrice: financing.purchasePrice,
    rehabCost: brrrr.rehabCost,
    closingCosts: acquisitionClosingCosts(financing),
    holdingCosts: p.holdingCosts ?? 0,
    originalLoan: p.initialLoanAmount,
    refinanceProceeds: refinanceAmount,
  });
  const recovery = computeCashRecovery({
    totalCapitalInvested: capital.totalCapitalInvested,
    grossRefinanceProceeds: refinanceAmount,
    refinanceClosingCosts: Math.max(0, brrrr.refinanceClosingCosts),
    loanPayoffAmount: capital.originalLoanPayoff,
  });

  const newMonthlyPayment = sized.monthlyPayment;
  const annualDebtService = newMonthlyPayment * 12;
  const annualCashflow = noi - annualDebtService;

  const cashLeftInDeal = recovery.cashLeftInDeal;
  const infiniteReturn = cashLeftInDeal <= 0 && annualCashflow > 0;
  const roi = infiniteReturn ? Infinity : safeDivide(annualCashflow, cashLeftInDeal) * 100;
  const equityAfterRefinance = brrrr.afterRepairValue - refinanceAmount;

  const recovered = recovery.cashRecovered;
  const recoveryRatio = capital.totalCapitalInvested > 0 ? recovered / capital.totalCapitalInvested : 1;
  const recoveryScore = clamp(recoveryRatio, 0, 1) * 70;
  const cashflowScore = clamp(annualCashflow / 12 / 400, 0, 1) * 30;
  const efficiencyScore = Math.round(recoveryScore + cashflowScore);

  return {
    totalProjectCost: capital.totalProjectCost,
    initialCashInvested: capital.totalCapitalInvested,
    refinanceAmount,
    cashPulledOut: recovered,
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
