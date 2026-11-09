import type { AnalysisInput, AnalysisResults } from "@/lib/types";
import { PROJECTION_YEARS } from "@/lib/constants";
import { calculateMortgage } from "@/lib/calculations/mortgage";
import {
  calculateBreakEvenOccupancy,
  calculateCashflow,
  calculateIncome,
  calculateNoi,
  calculateOperatingExpenses,
} from "@/lib/calculations/cashflow";
import {
  calculateCapRate,
  calculateCashOnCash,
  calculateCashToClose,
  calculateDscr,
  calculateGrossYield,
  calculateNetYield,
  calculateTotalRoi,
} from "@/lib/calculations/ratios";
import { buildProjections, summariseProjection } from "@/lib/calculations/projections";
import { calculateShortTermRental } from "@/lib/calculations/short-term-rental";
import { calculateFixFlip } from "@/lib/calculations/fix-flip";
import { calculateBrrrr } from "@/lib/calculations/brrrr";
import { calculateDealScore, type DealScoreInputs } from "@/lib/calculations/deal-score";

/**
 * Runs the full analysis pipeline for a property.
 * Pure function — safe to call on every form change.
 */
export function analyzeProperty(input: AnalysisInput): AnalysisResults {
  const { financing, income, expenses, strategy, location } = input;

  const mortgage = calculateMortgage({
    purchasePrice: financing.purchasePrice,
    depositPercent: financing.depositPercent,
    interestRate: financing.interestRate,
    termYears: financing.termYears,
  });

  const cashToClose = calculateCashToClose({
    depositAmount: mortgage.depositAmount,
    closingCosts: financing.closingCosts,
    legalFees: financing.legalFees,
    inspectionCosts: financing.inspectionCosts,
    loanFees: financing.loanFees,
  });

  const renovationCapital =
    strategy === "fix-flip"
      ? input.flip.renovationBudget
      : strategy === "brrrr"
        ? input.brrrr.rehabCost
        : 0;
  const totalCashInvested = cashToClose + renovationCapital;
  const annualDebtService = mortgage.monthlyPayment * 12;

  /* ---------------- Strategy-specific income selection ---------------- */
  const isStr = strategy === "short-term-rental";
  const shortTermRental = isStr
    ? calculateShortTermRental({
        income,
        expenses,
        purchasePrice: financing.purchasePrice,
        annualDebtService,
        totalCashInvested,
      })
    : null;

  const baseMonthlyIncome = isStr
    ? (shortTermRental?.monthlyRevenue ?? 0)
    : strategy === "brrrr"
      ? input.brrrr.expectedRent + income.otherMonthlyIncome
      : income.monthlyRent + income.otherMonthlyIncome;

  const incomeSummary = calculateIncome(baseMonthlyIncome, isStr ? 0 : expenses.vacancyPercent);

  const opex = isStr
    ? calculateOperatingExpenses({ ...expenses, vacancyPercent: 0 }, incomeSummary.annualIncome, incomeSummary.annualIncome, {
        extraAnnual: [
          { key: "platformFees", label: "Platform Fees", annual: shortTermRental?.platformFeesAnnual ?? 0 },
          { key: "cleaning", label: "Cleaning", annual: shortTermRental?.cleaningCostsAnnual ?? 0 },
        ],
      })
    : calculateOperatingExpenses(expenses, incomeSummary.effectiveGrossIncome, incomeSummary.annualIncome);

  const noi = calculateNoi(incomeSummary.effectiveGrossIncome, opex.annual);
  const cashflow = calculateCashflow(noi, annualDebtService);

  const grossYield = calculateGrossYield(incomeSummary.annualIncome, financing.purchasePrice);
  const netYield = calculateNetYield(noi, financing.purchasePrice);
  const capRate = calculateCapRate(noi, financing.purchasePrice);
  const cashOnCash = calculateCashOnCash(cashflow.annual, totalCashInvested);
  const dscr = calculateDscr(noi, annualDebtService);
  const breakEvenOccupancy = calculateBreakEvenOccupancy(
    opex.annual,
    annualDebtService,
    incomeSummary.annualIncome,
  );

  /* ---------------- Projections ---------------- */
  const projections = buildProjections({
    purchasePrice: financing.purchasePrice,
    appreciationRate: location.market.appreciationRate,
    rentGrowthRate: income.rentGrowthRate,
    expenseGrowthRate: expenses.expenseGrowthRate,
    effectiveGrossIncomeYear1: incomeSummary.effectiveGrossIncome,
    operatingExpensesYear1: opex.annual,
    mortgage,
    totalCashInvested,
    years: PROJECTION_YEARS,
  });

  const fiveYear = summariseProjection(projections, 5, financing.purchasePrice, mortgage.loanAmount, totalCashInvested);
  const tenYear = summariseProjection(projections, 10, financing.purchasePrice, mortgage.loanAmount, totalCashInvested);

  const firstYear = projections[0];
  const totalRoi = calculateTotalRoi(
    cashflow.annual,
    firstYear?.principalPaid ?? 0,
    firstYear?.appreciationGain ?? 0,
    totalCashInvested,
  );

  /* ---------------- Strategy modules ---------------- */
  const fixFlip =
    strategy === "fix-flip"
      ? calculateFixFlip({
          financing,
          flip: input.flip,
          loanAmount: mortgage.loanAmount,
          monthlyMortgagePayment: mortgage.monthlyPayment,
        })
      : null;

  const brrrr =
    strategy === "brrrr"
      ? calculateBrrrr({
          financing,
          brrrr: input.brrrr,
          expenses,
          initialLoanAmount: mortgage.loanAmount,
        })
      : null;

  /* ---------------- Headline ROI & deal score ---------------- */
  let roi = totalRoi;
  let scoreInputs: DealScoreInputs = {
    roi: cashOnCash,
    monthlyCashflow: cashflow.monthly,
    capRate,
    dscr,
    grossYield,
    negativeCashflow: cashflow.monthly < 0,
    dscrBelowOne: dscr < 1,
  };

  if (fixFlip) {
    roi = fixFlip.roi;
    scoreInputs = {
      roi: fixFlip.annualisedRoi / 2, // annualised flip returns run hot; normalise against rental scale
      monthlyCashflow: fixFlip.profit / Math.max(1, fixFlip.holdDurationMonths) / 10,
      capRate: fixFlip.profitMargin / 2,
      dscr: fixFlip.breakEvenSalePrice > 0 ? input.flip.expectedSalePrice / fixFlip.breakEvenSalePrice : 0,
      grossYield: fixFlip.profitMargin,
      negativeCashflow: fixFlip.profit < 0,
      dscrBelowOne: fixFlip.profit < 0,
    };
  } else if (brrrr) {
    roi = brrrr.infiniteReturn ? 999 : brrrr.roi;
    const brrrrDscr = calculateDscr(noi, brrrr.newMonthlyPayment * 12);
    scoreInputs = {
      roi: brrrr.infiniteReturn ? 100 : brrrr.roi,
      monthlyCashflow: brrrr.monthlyCashflow,
      capRate: calculateCapRate(noi, brrrr.totalProjectCost),
      dscr: brrrrDscr,
      grossYield: calculateGrossYield(input.brrrr.expectedRent * 12, brrrr.totalProjectCost),
      negativeCashflow: brrrr.monthlyCashflow < 0,
      dscrBelowOne: brrrrDscr < 1,
    };
  } else if (shortTermRental) {
    scoreInputs = { ...scoreInputs, roi: shortTermRental.roi };
  }

  const dealScore = calculateDealScore(scoreInputs);

  return {
    strategy,
    mortgage,
    cashToClose,
    totalCashInvested,
    monthlyIncome: incomeSummary.monthlyIncome,
    annualIncome: incomeSummary.annualIncome,
    effectiveGrossIncome: incomeSummary.effectiveGrossIncome,
    vacancyLoss: incomeSummary.vacancyLoss,
    operatingExpensesMonthly: opex.monthly,
    operatingExpensesAnnual: opex.annual,
    expenseBreakdown: opex.breakdown,
    noi,
    annualDebtService,
    monthlyCashflow: cashflow.monthly,
    annualCashflow: cashflow.annual,
    grossYield,
    netYield,
    capRate,
    cashOnCash,
    dscr,
    breakEvenOccupancy,
    roi,
    projections,
    fiveYear,
    tenYear,
    shortTermRental,
    fixFlip,
    brrrr,
    dealScore,
    generatedAt: new Date().toISOString(),
  };
}
