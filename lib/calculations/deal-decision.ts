import type {
  AnalysisInput,
  DealScenarioKey,
  ExpenseBreakdownItem,
  ExpenseInputs,
  FinancingInputs,
  GuidelineAdditionalCosts,
  IncomeInputs,
  ScenarioAssumptions,
} from "@/lib/types";
import {
  calculateBreakEvenOccupancy,
  calculateCashflow,
  calculateIncome,
  calculateNoi,
  calculateOperatingExpenses,
} from "@/lib/calculations/cashflow";
import { calculateMortgage } from "@/lib/calculations/mortgage";
import { normalizeAnalysisInput } from "@/lib/calculations/normalize-input";
import {
  calculateCapRate,
  calculateCashOnCash,
  nullableDivide,
} from "@/lib/calculations/ratios";
import { monthlyUtilitiesTotal } from "@/lib/calculations/utilities";

export const DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE =
  "The deal does not break even before insurance is included.";

/**
 * Null / empty-state rules. Financing is not a blanket requirement.
 *
 * | Metric                 | Required denominator / guard                         | All-cash (P&I = 0) |
 * |------------------------|------------------------------------------------------|--------------------|
 * | all-in % ARV           | conservative ARV > 0                                 | calculated         |
 * | guideline max offer    | conservative ARV > 0                                 | calculated         |
 * | cap rate               | purchase price > 0                                   | calculated         |
 * | cash-on-cash           | cash invested > 0                                    | calculated         |
 * | break-even occupancy   | annual gross income > 0                              | calculated (P&I 0) |
 * | break-even rent        | percentage-opex coefficient > 0                      | calculated (P&I 0) |
 * | max annual insurance   | EGI − other opex − P&I > 0                           | calculated (P&I 0) |
 * | DSCR                   | annual debt service > 0                              | null               |
 * | cash flow              | always a number; CF = NOI − P&I                      | CF = NOI           |
 */

/** Monthly cash flow below this (and ≥ 0) is labelled marginal rather than positive. */
export const MARGINAL_MONTHLY_CASHFLOW = 100;

const SCENARIO_KEYS: DealScenarioKey[] = ["base", "conservative", "stress"];

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pct(numerator: number, denominator: number): number | null {
  const ratio = nullableDivide(numerator, denominator);
  return ratio === null ? null : ratio * 100;
}

function money(value: unknown): number {
  return Math.max(0, finite(value));
}

export function resolveCurrentMonthlyRent(income: IncomeInputs): number {
  if (income.rentEntryMode === "units") {
    return income.units.reduce((sum, unit) => sum + money(unit.monthlyRent), 0);
  }
  return money(income.currentMonthlyRent);
}

export function baseRehabCost(input: AnalysisInput): number {
  if (input.strategy === "fix-flip") return money(input.flip.renovationBudget);
  return money(input.brrrr.rehabCost);
}

export function rehabContingencyAmount(rehabCost: number, contingencyPercent: number): number {
  return money(rehabCost) * (money(contingencyPercent) / 100);
}

export function totalRehabBudget(rehabCost: number, contingencyPercent: number): number {
  const base = money(rehabCost);
  return base + rehabContingencyAmount(base, contingencyPercent);
}

export function totalHoldingCost(monthlyHolding: number, months: number): number {
  return money(monthlyHolding) * money(months);
}

export function acquisitionFees(financing: Pick<
  FinancingInputs,
  "closingCosts" | "legalFees" | "inspectionCosts" | "loanFees" | "otherAcquisitionCosts"
>): number {
  return (
    money(financing.closingCosts) +
    money(financing.legalFees) +
    money(financing.inspectionCosts) +
    money(financing.loanFees) +
    money(financing.otherAcquisitionCosts)
  );
}

export function allInCost(parts: {
  purchasePrice: number;
  acquisitionFees: number;
  totalRehabBudget: number;
  totalHoldingCost: number;
}): number {
  return (
    money(parts.purchasePrice) +
    money(parts.acquisitionFees) +
    money(parts.totalRehabBudget) +
    money(parts.totalHoldingCost)
  );
}

export function allInPercentOfArv(totalAllIn: number, conservativeArv: number): number | null {
  return pct(totalAllIn, conservativeArv);
}

export function includedGuidelineCosts(
  flags: GuidelineAdditionalCosts,
  financing: FinancingInputs,
  holdingCost: number,
): number {
  let extra = 0;
  if (flags.closingCosts) extra += money(financing.closingCosts);
  if (flags.legalFees) extra += money(financing.legalFees);
  if (flags.inspectionCosts) extra += money(financing.inspectionCosts);
  if (flags.loanFees) extra += money(financing.loanFees);
  if (flags.otherAcquisitionCosts) extra += money(financing.otherAcquisitionCosts);
  if (flags.holdingCosts) extra += money(holdingCost);
  return extra;
}

export function guidelineMaxOffer(args: {
  conservativeArv: number;
  targetArvPercent: number;
  baseRehabCost: number;
  rehabContingencyAmount: number;
  additionalCosts?: number;
}): number | null {
  if (!(args.conservativeArv > 0) || !Number.isFinite(args.conservativeArv)) return null;
  const target = money(args.targetArvPercent);
  return (
    args.conservativeArv * (target / 100) -
    money(args.baseRehabCost) -
    money(args.rehabContingencyAmount) -
    money(args.additionalCosts)
  );
}

export function maximumTotalRehabBudget(args: {
  conservativeArv: number;
  targetArvPercent: number;
  purchasePrice: number;
  additionalCosts?: number;
}): number | null {
  if (!(args.conservativeArv > 0) || !Number.isFinite(args.conservativeArv)) return null;
  return (
    args.conservativeArv * (money(args.targetArvPercent) / 100) -
    money(args.purchasePrice) -
    money(args.additionalCosts)
  );
}

export function remainingRehabHeadroom(
  maximumBudget: number | null,
  currentTotalRehabBudget: number,
): number | null {
  if (maximumBudget === null || !Number.isFinite(maximumBudget)) return null;
  return maximumBudget - money(currentTotalRehabBudget);
}

export function maxAnnualInsurance(args: {
  effectiveGrossIncome: number;
  operatingExpensesExcludingInsurance: number;
  annualDebtService: number;
}): number | null {
  const remaining =
    finite(args.effectiveGrossIncome) -
    finite(args.operatingExpensesExcludingInsurance) -
    finite(args.annualDebtService);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  return remaining;
}

export function breakEvenMonthlyRent(args: {
  otherMonthlyIncome: number;
  vacancyPercent: number;
  managementPercent: number;
  maintenancePercent: number;
  capexPercent: number;
  fixedAnnualExcludingPercentages: number;
  annualDebtService: number;
}): number | null {
  const vacancy = money(args.vacancyPercent) / 100;
  const management = money(args.managementPercent) / 100;
  const maintenance = money(args.maintenancePercent) / 100;
  const capex = money(args.capexPercent) / 100;
  const coefficient = (1 - vacancy) * (1 - management) - maintenance - capex;
  if (!(coefficient > 0) || !Number.isFinite(coefficient)) return null;
  const requiredGross =
    (finite(args.annualDebtService) + finite(args.fixedAnnualExcludingPercentages)) / coefficient;
  if (!Number.isFinite(requiredGross)) return null;
  const monthly = requiredGross / 12 - finite(args.otherMonthlyIncome);
  if (!Number.isFinite(monthly)) return null;
  return monthly < 0 ? 0 : monthly;
}

export function breakEvenOccupancyPercent(
  operatingExpensesAnnual: number,
  annualDebtService: number,
  annualGrossIncome: number,
): number | null {
  if (!(annualGrossIncome > 0) || !Number.isFinite(annualGrossIncome)) return null;
  const value = calculateBreakEvenOccupancy(operatingExpensesAnnual, annualDebtService, annualGrossIncome);
  return Number.isFinite(value) ? value : null;
}

export type ScenarioStatus = "positive" | "marginal" | "negative";
export type AssumptionCheckStatus = "confirmed" | "review" | "high-risk";
export type BreakSeverity = "info" | "warning" | "critical";

export interface DealCostBreakdown {
  purchasePrice: number;
  depositAmount: number;
  loanAmount: number;
  acquisitionFees: number;
  closingCosts: number;
  legalFees: number;
  inspectionCosts: number;
  loanFees: number;
  otherAcquisitionCosts: number;
  baseRehabCost: number;
  rehabContingencyPercent: number;
  rehabContingencyAmount: number;
  totalRehabBudget: number;
  holdingCostsMonthly: number;
  holdDurationMonths: number;
  totalHoldingCost: number;
  allInCost: number;
  allInPctConservativeArv: number | null;
  cashInvested: number;
}

export interface DealOperations {
  monthlyRent: number;
  otherMonthlyIncome: number;
  vacancyPercent: number;
  annualGrossIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpensesAnnual: number;
  operatingExpensesMonthly: number;
  expenseBreakdown: ExpenseBreakdownItem[];
  noi: number;
  monthlyDebtService: number;
  annualDebtService: number;
  monthlyCashflow: number;
  annualCashflow: number;
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
}

export interface DealBreakEvens {
  monthlyRent: number | null;
  occupancyPercent: number | null;
  maxAnnualInsurance: number | null;
  maxInsuranceMessage: string | null;
}

export interface RehabHeadroom {
  maximumTotalRehabBudget: number | null;
  remainingRehabHeadroom: number | null;
  currentTotalRehabBudget: number;
}

export interface DealScenarioResult {
  key: DealScenarioKey;
  monthlyCashflow: number;
  annualCashflow: number;
  noi: number;
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  allInCost: number;
  conservativeArv: number;
  totalRehabBudget: number;
  status: ScenarioStatus;
}

export interface AssumptionCheckItem {
  key: string;
  status: AssumptionCheckStatus;
  title: string;
  detail: string;
}

export interface DealBreakObservation {
  key: string;
  title: string;
  detail: string;
  severity: BreakSeverity;
}

export interface DealDecisionResult {
  advertisedArv: number;
  conservativeArv: number;
  askingPrice: number;
  purchasePrice: number;
  targetArvPercent: number;
  costs: DealCostBreakdown;
  conservative: DealOperations;
  guidelineMaxOffer: number | null;
  breakEvens: DealBreakEvens;
  rehabHeadroom: RehabHeadroom;
  scenarios: Record<DealScenarioKey, DealScenarioResult>;
  whatBreaks: DealBreakObservation[];
  assumptionChecks: AssumptionCheckItem[];
}

function decisionExpenses(expenses: ExpenseInputs): ExpenseInputs {
  return {
    ...expenses,
    utilitiesMonthly: monthlyUtilitiesTotal(expenses),
  };
}

function capexExtra(annualGrossIncome: number, capexPercent: number): { key: string; label: string; annual: number }[] {
  const annual = annualGrossIncome * (money(capexPercent) / 100);
  if (!(annual > 0)) return [];
  return [{ key: "capex", label: "CapEx", annual }];
}

function scenarioStatus(monthlyCashflow: number): ScenarioStatus {
  if (monthlyCashflow < 0) return "negative";
  if (monthlyCashflow < MARGINAL_MONTHLY_CASHFLOW) return "marginal";
  return "positive";
}

function nullableDscr(noi: number, annualDebtService: number): number | null {
  if (!(annualDebtService > 0) || !Number.isFinite(annualDebtService) || !Number.isFinite(noi)) return null;
  return nullableDivide(noi, annualDebtService);
}

function additionalGuidelineCosts(input: AnalysisInput, holdingCost: number): number {
  if (!input.decision.includeAdditionalCostsInGuideline) return 0;
  return includedGuidelineCosts(input.decision.guidelineAdditionalCosts, input.financing, holdingCost);
}

function applyScenario(input: AnalysisInput, assumptions: ScenarioAssumptions): AnalysisInput {
  const rentFactor = 1 + finite(assumptions.rentAdjustmentPercent) / 100;
  const arvFactor = 1 + finite(assumptions.arvAdjustmentPercent) / 100;
  const rehabFactor = 1 + money(assumptions.rehabOverrunPercent) / 100;
  return {
    ...input,
    income: {
      ...input.income,
      conservativeRent: Math.max(0, money(input.income.conservativeRent) * rentFactor),
    },
    expenses: {
      ...input.expenses,
      vacancyPercent: assumptions.vacancyPercent ?? input.expenses.vacancyPercent,
      insuranceAnnual: assumptions.annualInsurance ?? input.expenses.insuranceAnnual,
      maintenancePercent: assumptions.maintenancePercent ?? input.expenses.maintenancePercent,
      capexPercent: assumptions.capexPercent ?? input.expenses.capexPercent,
    },
    brrrr: {
      ...input.brrrr,
      rehabCost: money(input.brrrr.rehabCost) * rehabFactor,
    },
    flip: {
      ...input.flip,
      renovationBudget: money(input.flip.renovationBudget) * rehabFactor,
    },
    decision: {
      ...input.decision,
      conservativeArv: Math.max(0, money(input.decision.conservativeArv) * arvFactor),
    },
  };
}

function computeCosts(input: AnalysisInput): DealCostBreakdown {
  const purchasePrice = money(input.financing.purchasePrice);
  const mortgage = calculateMortgage({
    purchasePrice,
    depositPercent: money(input.financing.depositPercent),
    interestRate: finite(input.financing.interestRate),
    termYears: money(input.financing.termYears),
  });
  const rehab = baseRehabCost(input);
  const contingencyPercent = money(input.decision.rehabContingencyPercent);
  const contingency = rehabContingencyAmount(rehab, contingencyPercent);
  const rehabTotal = totalRehabBudget(rehab, contingencyPercent);
  const holdingMonthly = money(input.flip.holdingCostsMonthly);
  const holdMonths = money(input.flip.holdDurationMonths);
  const holding = totalHoldingCost(holdingMonthly, holdMonths);
  const fees = acquisitionFees(input.financing);
  const total = allInCost({
    purchasePrice,
    acquisitionFees: fees,
    totalRehabBudget: rehabTotal,
    totalHoldingCost: holding,
  });
  const conservativeArv = money(input.decision.conservativeArv);
  return {
    purchasePrice,
    depositAmount: mortgage.depositAmount,
    loanAmount: mortgage.loanAmount,
    acquisitionFees: fees,
    closingCosts: money(input.financing.closingCosts),
    legalFees: money(input.financing.legalFees),
    inspectionCosts: money(input.financing.inspectionCosts),
    loanFees: money(input.financing.loanFees),
    otherAcquisitionCosts: money(input.financing.otherAcquisitionCosts),
    baseRehabCost: rehab,
    rehabContingencyPercent: contingencyPercent,
    rehabContingencyAmount: contingency,
    totalRehabBudget: rehabTotal,
    holdingCostsMonthly: holdingMonthly,
    holdDurationMonths: holdMonths,
    totalHoldingCost: holding,
    allInCost: total,
    allInPctConservativeArv: allInPercentOfArv(total, conservativeArv),
    cashInvested: mortgage.depositAmount + fees + rehabTotal + holding,
  };
}

function computeOperations(input: AnalysisInput, costs: DealCostBreakdown): DealOperations {
  const monthlyRent = money(input.income.conservativeRent);
  const otherMonthlyIncome = money(input.income.otherMonthlyIncome);
  const vacancyPercent = money(input.expenses.vacancyPercent);
  const income = calculateIncome(monthlyRent + otherMonthlyIncome, vacancyPercent);
  const expenses = decisionExpenses(input.expenses);
  const opex = calculateOperatingExpenses(
    expenses,
    income.effectiveGrossIncome,
    income.annualIncome,
    { extraAnnual: capexExtra(income.annualIncome, input.expenses.capexPercent) },
  );
  const mortgage = calculateMortgage({
    purchasePrice: costs.purchasePrice,
    depositPercent: money(input.financing.depositPercent),
    interestRate: finite(input.financing.interestRate),
    termYears: money(input.financing.termYears),
  });
  const annualDebtService = mortgage.monthlyPayment * 12;
  const noi = calculateNoi(income.effectiveGrossIncome, opex.annual);
  const cashflow = calculateCashflow(noi, annualDebtService);
  const purchasePrice = costs.purchasePrice;
  return {
    monthlyRent,
    otherMonthlyIncome,
    vacancyPercent,
    annualGrossIncome: income.annualIncome,
    vacancyLoss: income.vacancyLoss,
    effectiveGrossIncome: income.effectiveGrossIncome,
    operatingExpensesAnnual: opex.annual,
    operatingExpensesMonthly: opex.monthly,
    expenseBreakdown: opex.breakdown,
    noi,
    monthlyDebtService: mortgage.monthlyPayment,
    annualDebtService,
    monthlyCashflow: cashflow.monthly,
    annualCashflow: cashflow.annual,
    capRate: purchasePrice > 0 ? calculateCapRate(noi, purchasePrice) : null,
    cashOnCash: costs.cashInvested > 0 ? calculateCashOnCash(cashflow.annual, costs.cashInvested) : null,
    dscr: nullableDscr(noi, annualDebtService),
  };
}

function computeBreakEvens(input: AnalysisInput, operations: DealOperations): DealBreakEvens {
  const utilitiesMonthly = monthlyUtilitiesTotal(input.expenses);
  const fixedAnnual =
    money(input.expenses.propertyTaxAnnual) +
    money(input.expenses.insuranceAnnual) +
    money(input.expenses.hoaMonthly) * 12 +
    utilitiesMonthly * 12 +
    money(input.expenses.otherMonthly) * 12;
  const monthlyRent = breakEvenMonthlyRent({
    otherMonthlyIncome: operations.otherMonthlyIncome,
    vacancyPercent: operations.vacancyPercent,
    managementPercent: input.expenses.managementPercent,
    maintenancePercent: input.expenses.maintenancePercent,
    capexPercent: input.expenses.capexPercent,
    fixedAnnualExcludingPercentages: fixedAnnual,
    annualDebtService: operations.annualDebtService,
  });
  const occupancyPercent = breakEvenOccupancyPercent(
    operations.operatingExpensesAnnual,
    operations.annualDebtService,
    operations.annualGrossIncome,
  );
  const insuranceItem = operations.expenseBreakdown.find((item) => item.key === "insurance");
  const insuranceAnnual = insuranceItem?.annual ?? money(input.expenses.insuranceAnnual);
  const opexExcludingInsurance = operations.operatingExpensesAnnual - insuranceAnnual;
  const maxInsurance = maxAnnualInsurance({
    effectiveGrossIncome: operations.effectiveGrossIncome,
    operatingExpensesExcludingInsurance: opexExcludingInsurance,
    annualDebtService: operations.annualDebtService,
  });
  return {
    monthlyRent,
    occupancyPercent,
    maxAnnualInsurance: maxInsurance,
    maxInsuranceMessage: maxInsurance === null ? DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE : null,
  };
}

function computeHeadroom(input: AnalysisInput, costs: DealCostBreakdown): RehabHeadroom {
  const extra = additionalGuidelineCosts(input, costs.totalHoldingCost);
  const maximum = maximumTotalRehabBudget({
    conservativeArv: money(input.decision.conservativeArv),
    targetArvPercent: money(input.decision.targetArvPercent),
    purchasePrice: costs.purchasePrice,
    additionalCosts: extra,
  });
  return {
    maximumTotalRehabBudget: maximum,
    remainingRehabHeadroom: remainingRehabHeadroom(maximum, costs.totalRehabBudget),
    currentTotalRehabBudget: costs.totalRehabBudget,
  };
}

function computeScenario(input: AnalysisInput, key: DealScenarioKey): DealScenarioResult {
  const next = applyScenario(input, input.decision.scenarios[key]);
  const costs = computeCosts(next);
  const operations = computeOperations(next, costs);
  return {
    key,
    monthlyCashflow: operations.monthlyCashflow,
    annualCashflow: operations.annualCashflow,
    noi: operations.noi,
    capRate: operations.capRate,
    cashOnCash: operations.cashOnCash,
    dscr: operations.dscr,
    allInCost: costs.allInCost,
    conservativeArv: money(next.decision.conservativeArv),
    totalRehabBudget: costs.totalRehabBudget,
    status: scenarioStatus(operations.monthlyCashflow),
  };
}

export function whatBreaksDeal(result: DealDecisionResult): DealBreakObservation[] {
  const observations: DealBreakObservation[] = [];
  const { conservative, breakEvens, costs, rehabHeadroom, guidelineMaxOffer } = result;

  if (conservative.monthlyCashflow < 0) {
    observations.push({
      key: "conservative-negative",
      title: "Conservative cash flow is already negative",
      detail: `Conservative monthly cash flow is ${conservative.monthlyCashflow.toFixed(0)} after operating expenses and P&I.`,
      severity: "critical",
    });
  }

  if (breakEvens.monthlyRent === null) {
    observations.push({
      key: "rent-floor",
      title: "Break-even rent cannot be calculated",
      detail: "Income does not outgrow percentage-based expenses, so there is no finite rent that breaks even.",
      severity: "critical",
    });
  } else {
    const short = conservative.monthlyRent + 0.005 < breakEvens.monthlyRent;
    observations.push({
      key: "rent-floor",
      title: "Break-even monthly rent",
      detail: `The deal needs ${breakEvens.monthlyRent.toFixed(0)} per month to break even. Conservative rent is ${conservative.monthlyRent.toFixed(0)}.`,
      severity: short ? "critical" : "info",
    });
  }

  const assumedOccupancy = 100 - conservative.vacancyPercent;
  if (breakEvens.occupancyPercent === null) {
    observations.push({
      key: "occupancy",
      title: "Break-even occupancy cannot be calculated",
      detail: "Add gross rent to calculate the occupancy needed to cover operating expenses and P&I.",
      severity: "warning",
    });
  } else {
    const missed = breakEvens.occupancyPercent > assumedOccupancy + 0.005;
    observations.push({
      key: "occupancy",
      title: "Break-even occupancy",
      detail: `The deal needs ${breakEvens.occupancyPercent.toFixed(1)}% occupancy. The underwrite assumes ${assumedOccupancy.toFixed(1)}%.`,
      severity: missed || breakEvens.occupancyPercent > 100 ? "critical" : "info",
    });
  }

  if (breakEvens.maxAnnualInsurance === null) {
    observations.push({
      key: "insurance-cap",
      title: "Insurance cap",
      detail: DEAL_DOES_NOT_BREAK_EVEN_BEFORE_INSURANCE,
      severity: "critical",
    });
  } else {
    const current = conservative.expenseBreakdown.find((item) => item.key === "insurance")?.annual ?? 0;
    observations.push({
      key: "insurance-cap",
      title: "Maximum annual insurance",
      detail: `Annual insurance can rise to ${breakEvens.maxAnnualInsurance.toFixed(0)} before cash flow hits zero. Current insurance is ${current.toFixed(0)}.`,
      severity: current > breakEvens.maxAnnualInsurance ? "critical" : "info",
    });
  }

  if (rehabHeadroom.remainingRehabHeadroom === null) {
    observations.push({
      key: "rehab-overrun",
      title: "Rehab headroom cannot be calculated",
      detail: "Enter a conservative ARV to calculate how much rehab the ARV guideline can absorb.",
      severity: "warning",
    });
  } else {
    const overrun = rehabHeadroom.remainingRehabHeadroom < 0;
    observations.push({
      key: "rehab-overrun",
      title: "Rehab headroom versus ARV guideline",
      detail: overrun
        ? `Total rehab of ${costs.totalRehabBudget.toFixed(0)} exceeds the ARV-guideline budget by ${Math.abs(rehabHeadroom.remainingRehabHeadroom).toFixed(0)}.`
        : `The ARV guideline can absorb ${rehabHeadroom.remainingRehabHeadroom.toFixed(0)} more in total rehab before the threshold is missed.`,
      severity: overrun ? "warning" : "info",
    });
  }

  if (result.askingPrice > 0 && guidelineMaxOffer !== null && result.askingPrice > guidelineMaxOffer) {
    observations.push({
      key: "asking-vs-guideline",
      title: "Asking price is above the guideline maximum offer",
      detail: `Asking price ${result.askingPrice.toFixed(0)} is above the investor ARV guideline of ${guidelineMaxOffer.toFixed(0)}.`,
      severity: "warning",
    });
  }

  return observations;
}

export function assumptionChecks(input: AnalysisInput): AssumptionCheckItem[] {
  const advertised = money(input.decision.advertisedArv);
  const conservative = money(input.decision.conservativeArv);
  const rent = money(input.income.conservativeRent);
  const rehab = baseRehabCost(input);
  const holding = totalHoldingCost(input.flip.holdingCostsMonthly, input.flip.holdDurationMonths);
  const contingency = money(input.decision.rehabContingencyPercent);
  const checks: AssumptionCheckItem[] = [];

  checks.push(
    conservative > 0
      ? {
          key: "conservative-arv",
          status: "confirmed",
          title: "Conservative ARV entered",
          detail: "A conservative after-repair value is available for the guideline and all-in checks.",
        }
      : {
          key: "conservative-arv",
          status: "high-risk",
          title: "Missing conservative ARV",
          detail: "Enter a conservative ARV. All-in percent, guideline offer and rehab headroom stay empty until it is present.",
        },
  );

  if (advertised > 0) {
    checks.push(
      conservative > 0 && conservative < advertised
        ? {
            key: "conservative-vs-advertised",
            status: "confirmed",
            title: "Conservative ARV is below advertised",
            detail: "The underwrite uses a haircut versus the advertised ARV.",
          }
        : {
            key: "conservative-vs-advertised",
            status: "review",
            title: "Conservative ARV is not below advertised",
            detail:
              conservative >= advertised
                ? "Conservative ARV is equal to or above advertised ARV. Confirm the haircut before relying on the guideline."
                : "Advertised ARV is present but conservative ARV is missing.",
          },
    );
  } else {
    checks.push({
      key: "conservative-vs-advertised",
      status: "review",
      title: "Advertised ARV is missing",
      detail: "Add the advertised ARV so the conservative haircut can be checked.",
    });
  }

  checks.push(
    input.expenses.insuranceSource === "quote"
      ? {
          key: "insurance-source",
          status: "confirmed",
          title: "Insurance is a current quote",
          detail: "Cash flow is using a quoted premium.",
        }
      : {
          key: "insurance-source",
          status: "review",
          title: "Insurance is not a current quote",
          detail: "Get a current insurance quote before relying on this cash-flow estimate.",
        },
  );

  checks.push(
    input.expenses.vacancyPercent > 0
      ? {
          key: "vacancy",
          status: "confirmed",
          title: "Vacancy allowance entered",
          detail: `Vacancy is ${input.expenses.vacancyPercent}% of gross rent.`,
        }
      : {
          key: "vacancy",
          status: "review",
          title: "Full occupancy only",
          detail: "Vacancy is 0%. The underwrite assumes the property is never empty.",
        },
  );

  checks.push(
    input.expenses.maintenancePercent > 0
      ? {
          key: "maintenance",
          status: "confirmed",
          title: "Maintenance reserve entered",
          detail: `Maintenance is ${input.expenses.maintenancePercent}% of gross rent.`,
        }
      : {
          key: "maintenance",
          status: "review",
          title: "No maintenance reserve",
          detail: "Maintenance is 0%. Repairs will hit cash flow with no buffer.",
        },
  );

  checks.push(
    input.expenses.capexPercent > 0
      ? {
          key: "capex",
          status: "confirmed",
          title: "CapEx reserve entered",
          detail: `CapEx is ${input.expenses.capexPercent}% of gross rent.`,
        }
      : {
          key: "capex",
          status: "review",
          title: "No CapEx reserve",
          detail: "CapEx is 0%. Capital replacements are not in the underwrite.",
        },
  );

  if (rehab > 0) {
    checks.push(
      contingency > 0
        ? {
            key: "rehab-contingency",
            status: "confirmed",
            title: "Rehab contingency entered",
            detail: `Contingency is ${contingency}% of the rehab budget.`,
          }
        : {
            key: "rehab-contingency",
            status: "review",
            title: "Rehab has no contingency",
            detail: "Rehab is greater than 0 with a 0% contingency.",
          },
    );
    checks.push(
      holding > 0
        ? {
            key: "holding-costs",
            status: "confirmed",
            title: "Holding costs entered",
            detail: "Rehab is paired with holding costs for the work period.",
          }
        : {
            key: "holding-costs",
            status: "review",
            title: "Rehab with no holding costs",
            detail: "Rehab is greater than 0 but holding costs are 0.",
          },
    );
  } else {
    checks.push({
      key: "rehab-contingency",
      status: "confirmed",
      title: "No rehab budget to contingency",
      detail: "Rehab is 0, so a contingency is not required.",
    });
    checks.push({
      key: "holding-costs",
      status: "confirmed",
      title: "No rehab holding period",
      detail: "Rehab is 0, so holding costs during works are not required.",
    });
  }

  checks.push(
    rent > 0
      ? {
          key: "conservative-rent",
          status: "confirmed",
          title: "Conservative rent entered",
          detail: "The decision underwrite uses conservative monthly rent.",
        }
      : {
          key: "conservative-rent",
          status: "high-risk",
          title: "No conservative rent",
          detail: "Enter conservative rent. Cash flow, NOI and break-evens stay empty of meaning until it is present.",
        },
  );

  return checks;
}

export function evaluateDealDecision(raw: AnalysisInput): DealDecisionResult {
  const input = normalizeAnalysisInput(raw);
  const costs = computeCosts(input);
  const conservative = computeOperations(input, costs);
  const extra = additionalGuidelineCosts(input, costs.totalHoldingCost);
  const offer = guidelineMaxOffer({
    conservativeArv: money(input.decision.conservativeArv),
    targetArvPercent: money(input.decision.targetArvPercent),
    baseRehabCost: costs.baseRehabCost,
    rehabContingencyAmount: costs.rehabContingencyAmount,
    additionalCosts: extra,
  });
  const rehabHeadroom = computeHeadroom(input, costs);
  const breakEvens = computeBreakEvens(input, conservative);
  const scenarios = Object.fromEntries(SCENARIO_KEYS.map((key) => [key, computeScenario(input, key)])) as Record<
    DealScenarioKey,
    DealScenarioResult
  >;
  const result: DealDecisionResult = {
    advertisedArv: money(input.decision.advertisedArv),
    conservativeArv: money(input.decision.conservativeArv),
    askingPrice: money(input.financing.askingPrice),
    purchasePrice: costs.purchasePrice,
    targetArvPercent: money(input.decision.targetArvPercent),
    costs,
    conservative,
    guidelineMaxOffer: offer,
    breakEvens,
    rehabHeadroom,
    scenarios,
    whatBreaks: [],
    assumptionChecks: assumptionChecks(input),
  };
  result.whatBreaks = whatBreaksDeal(result);
  return result;
}
