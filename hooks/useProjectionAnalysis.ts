"use client";

import { useMemo } from "react";
import type {
  AmortizationChartDatum,
  AnalysisResults,
  CashflowChartDatum,
  ChartDatum,
  EquityChartDatum,
  IncomeExpenseChartDatum,
} from "@/lib/types";
import { EXPENSE_PALETTE } from "@/lib/constants";

export interface ProjectionChartData {
  incomeVsExpenses: IncomeExpenseChartDatum[];
  expenseBreakdown: ChartDatum[];
  equityGrowth: EquityChartDatum[];
  appreciation: { year: string; value: number; baseline: number }[];
  cashflow: CashflowChartDatum[];
  amortization: AmortizationChartDatum[];
}

export function useProjectionAnalysis(results: AnalysisResults | null): ProjectionChartData | null {
  return useMemo(() => {
    if (!results) return null;

    const incomeVsExpenses: IncomeExpenseChartDatum[] = [
      {
        name: "Monthly",
        income: results.effectiveGrossIncome / 12,
        expenses: results.operatingExpensesMonthly,
        debtService: results.mortgage.monthlyPayment,
        cashflow: results.monthlyCashflow,
      },
      {
        name: "Annual",
        income: results.effectiveGrossIncome,
        expenses: results.operatingExpensesAnnual,
        debtService: results.annualDebtService,
        cashflow: results.annualCashflow,
      },
    ];

    const expenseBreakdown: ChartDatum[] = [
      ...results.expenseBreakdown.map((item, index) => ({
        name: item.label,
        value: item.annual,
        color: EXPENSE_PALETTE[index % EXPENSE_PALETTE.length],
      })),
      ...(results.annualDebtService > 0
        ? [{ name: "Mortgage", value: results.annualDebtService, color: "#475569" }]
        : []),
    ];

    const equityGrowth: EquityChartDatum[] = results.projections.map((p) => ({
      year: `Y${p.year}`,
      equity: p.equity,
      propertyValue: p.propertyValue,
      loanBalance: p.loanBalance,
    }));

    const purchasePrice = results.projections[0]
      ? results.projections[0].propertyValue - results.projections[0].appreciationGain
      : 0;
    const appreciation = [
      { year: "Y0", value: purchasePrice, baseline: purchasePrice },
      ...results.projections.map((p) => ({ year: `Y${p.year}`, value: p.propertyValue, baseline: purchasePrice })),
    ];

    const cashflow: CashflowChartDatum[] = results.projections.map((p) => ({
      year: `Y${p.year}`,
      cashflow: p.annualCashflow,
      cumulative: p.cumulativeCashflow,
    }));

    const amortization: AmortizationChartDatum[] = results.mortgage.yearly.map((y) => ({
      year: `Y${y.year}`,
      principal: y.principal,
      interest: y.interest,
      balance: y.balance,
    }));

    return { incomeVsExpenses, expenseBreakdown, equityGrowth, appreciation, cashflow, amortization };
  }, [results]);
}
