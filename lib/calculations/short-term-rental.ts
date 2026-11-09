import type { ExpenseInputs, IncomeInputs, ShortTermRentalResults } from "@/lib/types";
import { DAYS_PER_MONTH } from "@/lib/constants";
import { calculateOperatingExpenses } from "@/lib/calculations/cashflow";
import { calculateCapRate, calculateCashOnCash } from "@/lib/calculations/ratios";

export interface StrParams {
  income: IncomeInputs;
  expenses: ExpenseInputs;
  purchasePrice: number;
  annualDebtService: number;
  totalCashInvested: number;
}

export function calculateShortTermRentalRevenue(nightlyRate: number, occupancyPercent: number): {
  monthlyRevenue: number;
  annualRevenue: number;
  occupiedNightsPerYear: number;
} {
  const occupancy = occupancyPercent / 100;
  const monthlyRevenue = nightlyRate * DAYS_PER_MONTH * occupancy;
  return {
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
    occupiedNightsPerYear: 365 * occupancy,
  };
}

export function calculateShortTermRental(p: StrParams): ShortTermRentalResults {
  const { monthlyRevenue, annualRevenue, occupiedNightsPerYear } = calculateShortTermRentalRevenue(
    p.income.nightlyRate,
    p.income.occupancyRate,
  );
  const platformFeesAnnual = annualRevenue * (p.income.platformFeePercent / 100);
  const cleaningCostsAnnual = p.income.cleaningCostsMonthly * 12;

  const opex = calculateOperatingExpenses(
    { ...p.expenses, vacancyPercent: 0 },
    annualRevenue,
    annualRevenue,
    {
      extraAnnual: [
        { key: "platformFees", label: "Platform Fees", annual: platformFeesAnnual },
        { key: "cleaning", label: "Cleaning", annual: cleaningCostsAnnual },
      ],
    },
  );

  const noi = annualRevenue - opex.annual;
  const annualCashflow = noi - p.annualDebtService;

  return {
    monthlyRevenue,
    annualRevenue,
    platformFeesAnnual,
    cleaningCostsAnnual,
    operatingExpensesAnnual: opex.annual,
    noi,
    annualProfit: annualCashflow,
    monthlyCashflow: annualCashflow / 12,
    annualCashflow,
    capRate: calculateCapRate(noi, p.purchasePrice),
    roi: calculateCashOnCash(annualCashflow, p.totalCashInvested),
    occupiedNightsPerYear,
  };
}
