import type { ExpenseBreakdownItem, ExpenseInputs } from "@/lib/types";

export interface IncomeSummary {
  monthlyIncome: number;
  annualIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
}

export function calculateIncome(
  monthlyIncome: number,
  vacancyPercent: number,
): IncomeSummary {
  const annualIncome = monthlyIncome * 12;
  const vacancyLoss = annualIncome * (vacancyPercent / 100);
  return {
    monthlyIncome,
    annualIncome,
    vacancyLoss,
    effectiveGrossIncome: annualIncome - vacancyLoss,
  };
}

export interface OperatingExpenseOptions {
  /** Extra line items (e.g. STR cleaning / platform fees) expressed annually. */
  extraAnnual?: { key: string; label: string; annual: number }[];
  /** Skip vacancy-based management fee basis when income is already occupancy-adjusted. */
  managementBasisAnnual?: number;
}

export interface OperatingExpenseSummary {
  annual: number;
  monthly: number;
  breakdown: ExpenseBreakdownItem[];
}

export function calculateOperatingExpenses(
  expenses: ExpenseInputs,
  effectiveGrossIncome: number,
  annualGrossIncome: number,
  options: OperatingExpenseOptions = {},
): OperatingExpenseSummary {
  const managementBasis = options.managementBasisAnnual ?? effectiveGrossIncome;
  const items: ExpenseBreakdownItem[] = [
    item("propertyTax", "Property Tax", expenses.propertyTaxAnnual),
    item("insurance", "Insurance", expenses.insuranceAnnual),
    item("hoa", "HOA", expenses.hoaMonthly * 12),
    item("management", "Management", managementBasis * (expenses.managementPercent / 100)),
    item("maintenance", "Maintenance", annualGrossIncome * (expenses.maintenancePercent / 100)),
    item("utilities", "Utilities", expenses.utilitiesMonthly * 12),
    item("other", "Other", expenses.otherMonthly * 12),
    ...(options.extraAnnual ?? []).map((e) => item(e.key, e.label, e.annual)),
  ];
  const breakdown = items.filter((i) => i.annual > 0);
  const annual = breakdown.reduce((sum, i) => sum + i.annual, 0);
  return { annual, monthly: annual / 12, breakdown };
}

function item(key: string, label: string, annual: number): ExpenseBreakdownItem {
  return { key, label, annual, monthly: annual / 12 };
}

export function calculateNoi(effectiveGrossIncome: number, operatingExpensesAnnual: number): number {
  return effectiveGrossIncome - operatingExpensesAnnual;
}

export function calculateCashflow(noi: number, annualDebtService: number): {
  annual: number;
  monthly: number;
} {
  const annual = noi - annualDebtService;
  return { annual, monthly: annual / 12 };
}

export function calculateBreakEvenOccupancy(
  operatingExpensesAnnual: number,
  annualDebtService: number,
  annualGrossIncome: number,
): number {
  if (annualGrossIncome <= 0) return 0;
  return ((operatingExpensesAnnual + annualDebtService) / annualGrossIncome) * 100;
}
