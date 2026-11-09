import type { Mortgage, ProjectionData, ProjectionSummary } from "@/lib/types";
import { balanceAtYear, principalPaidInYear } from "@/lib/calculations/mortgage";
import { safeDivide } from "@/lib/calculations/ratios";

export interface ProjectionParams {
  purchasePrice: number;
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  effectiveGrossIncomeYear1: number;
  operatingExpensesYear1: number;
  mortgage: Mortgage;
  totalCashInvested: number;
  years: number;
}

export function buildProjections(p: ProjectionParams): ProjectionData[] {
  const projections: ProjectionData[] = [];
  const annualDebtService = p.mortgage.monthlyPayment * 12;
  let cumulativeCashflow = 0;
  let previousValue = p.purchasePrice;

  for (let year = 1; year <= p.years; year++) {
    const growthIncome = Math.pow(1 + p.rentGrowthRate / 100, year - 1);
    const growthExpense = Math.pow(1 + p.expenseGrowthRate / 100, year - 1);
    const annualIncome = p.effectiveGrossIncomeYear1 * growthIncome;
    const annualExpenses = p.operatingExpensesYear1 * growthExpense;
    const debtService = year <= p.mortgage.termYears ? annualDebtService : 0;
    const annualCashflow = annualIncome - annualExpenses - debtService;
    cumulativeCashflow += annualCashflow;

    const propertyValue = p.purchasePrice * Math.pow(1 + p.appreciationRate / 100, year);
    const loanBalance = balanceAtYear(p.mortgage, year);
    const equity = propertyValue - loanBalance;
    const principalPaid = principalPaidInYear(p.mortgage, year);
    const appreciationGain = propertyValue - previousValue;
    previousValue = propertyValue;

    const equityGain = equity - (p.purchasePrice - p.mortgage.loanAmount);
    const totalReturn = equityGain + cumulativeCashflow;

    projections.push({
      year,
      propertyValue,
      loanBalance,
      equity,
      annualIncome,
      annualExpenses,
      annualDebtService: debtService,
      annualCashflow,
      cumulativeCashflow,
      principalPaid,
      appreciationGain,
      totalReturn,
      roi: safeDivide(totalReturn, p.totalCashInvested) * 100,
    });
  }
  return projections;
}

export function summariseProjection(
  projections: ProjectionData[],
  years: number,
  purchasePrice: number,
  loanAmount: number,
  totalCashInvested: number,
): ProjectionSummary {
  const row = projections[Math.min(years, projections.length) - 1];
  if (!row) {
    return {
      years,
      propertyValue: purchasePrice,
      equity: purchasePrice - loanAmount,
      equityGain: 0,
      cumulativeCashflow: 0,
      totalReturn: 0,
      roi: 0,
      annualisedRoi: 0,
    };
  }
  const initialEquity = purchasePrice - loanAmount;
  const equityGain = row.equity - initialEquity;
  const totalReturn = equityGain + row.cumulativeCashflow;
  const roi = safeDivide(totalReturn, totalCashInvested) * 100;
  const multiple = safeDivide(totalReturn + totalCashInvested, totalCashInvested, 1);
  const annualisedRoi = multiple > 0 ? (Math.pow(multiple, 1 / years) - 1) * 100 : -100;
  return {
    years,
    propertyValue: row.propertyValue,
    equity: row.equity,
    equityGain,
    cumulativeCashflow: row.cumulativeCashflow,
    totalReturn,
    roi,
    annualisedRoi,
  };
}
