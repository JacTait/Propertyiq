import type { AmortizationEntry, AmortizationYear, Mortgage } from "@/lib/types";

/**
 * Standard amortising mortgage payment.
 * M = P * r / (1 - (1 + r)^-n)
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const n = Math.round(termYears * 12);
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function buildAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): AmortizationEntry[] {
  if (principal <= 0 || termYears <= 0) return [];
  const n = Math.round(termYears * 12);
  const r = annualRatePercent / 100 / 12;
  const payment = calculateMonthlyPayment(principal, annualRatePercent, termYears);
  const schedule: AmortizationEntry[] = [];
  let balance = principal;

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    let principalPaid = payment - interest;
    if (month === n || principalPaid > balance) {
      principalPaid = balance;
    }
    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      month,
      year: Math.ceil(month / 12),
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance,
    });
  }
  return schedule;
}

export function summariseByYear(schedule: AmortizationEntry[]): AmortizationYear[] {
  const years = new Map<number, AmortizationYear>();
  for (const entry of schedule) {
    const existing = years.get(entry.year);
    if (existing) {
      existing.principal += entry.principal;
      existing.interest += entry.interest;
      existing.balance = entry.balance;
    } else {
      years.set(entry.year, {
        year: entry.year,
        principal: entry.principal,
        interest: entry.interest,
        balance: entry.balance,
      });
    }
  }
  return Array.from(years.values());
}

export interface MortgageParams {
  purchasePrice: number;
  depositPercent: number;
  interestRate: number;
  termYears: number;
}

export function calculateMortgage(params: MortgageParams): Mortgage {
  const depositAmount = (params.purchasePrice * params.depositPercent) / 100;
  const loanAmount = Math.max(0, params.purchasePrice - depositAmount);
  const monthlyPayment = calculateMonthlyPayment(loanAmount, params.interestRate, params.termYears);
  const schedule = buildAmortizationSchedule(loanAmount, params.interestRate, params.termYears);
  const totalPaid = schedule.reduce((sum, e) => sum + e.payment, 0);
  const totalInterest = schedule.reduce((sum, e) => sum + e.interest, 0);

  return {
    loanAmount,
    depositAmount,
    interestRate: params.interestRate,
    termYears: params.termYears,
    monthlyPayment,
    totalInterest,
    totalPaid,
    schedule,
    yearly: summariseByYear(schedule),
  };
}

/** Remaining loan balance at the end of a given year (0 = purchase date). */
export function balanceAtYear(mortgage: Mortgage, year: number): number {
  if (year <= 0) return mortgage.loanAmount;
  const yearly = mortgage.yearly[year - 1];
  if (yearly) return yearly.balance;
  return 0;
}

/** Principal paid during a given year (1-indexed). */
export function principalPaidInYear(mortgage: Mortgage, year: number): number {
  return mortgage.yearly[year - 1]?.principal ?? 0;
}
