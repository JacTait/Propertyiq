import type {
  MaxOfferBrrrrResults,
  MaxOfferInputs,
  MaxOfferResults,
  MaxOfferSummary,
  OfferConstraint,
  OfferConstraintKey,
  OfferDealMetrics,
  OfferRecommendation,
  OfferScenario,
  OfferTier,
  PriceMetricPoint,
} from "@/lib/types";
import { calculateMonthlyPayment, calculateMortgage, principalPaidInYear } from "@/lib/calculations/mortgage";
import { calculateIncome } from "@/lib/calculations/cashflow";
import {
  calculateCapRate,
  calculateCashOnCash,
  calculateDscr,
  calculateGrossYield,
  clamp,
  safeDivide,
} from "@/lib/calculations/ratios";

const SEARCH_STEPS = 40;
const PRICE_STEP = 50;
const EPS = 1e-6;

export function roundMoney(value: number, step = PRICE_STEP): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / step) * step;
}

export function sanitizeMaxOffer(input: MaxOfferInputs): MaxOfferInputs {
  const clean = <T extends object>(obj: T): T => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "number") {
        out[key] = Number.isFinite(value) ? value : 0;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        out[key] = clean(value as object);
      } else {
        out[key] = value;
      }
    }
    return out as T;
  };
  return clean(input);
}

function depositPercent(input: MaxOfferInputs): number {
  const ltv = clamp(input.financing.loanToValue, 0, 100);
  if (ltv > 0) return clamp(100 - ltv, 0, 100);
  return clamp(input.financing.downPaymentPercent, 0, 100);
}

/** Operating expenses excluding vacancy (vacancy is taken off gross income). */
export function annualOperatingExpenses(input: MaxOfferInputs, annualGross: number, egi: number): number {
  const { expenses } = input;
  return (
    expenses.propertyTaxAnnual +
    expenses.insuranceAnnual +
    egi * (expenses.managementPercent / 100) +
    annualGross * (expenses.maintenancePercent / 100) +
    annualGross * (expenses.capexPercent / 100) +
    expenses.hoaMonthly * 12 +
    expenses.otherMonthly * 12
  );
}

export function metricsAtPrice(input: MaxOfferInputs, purchasePrice: number): OfferDealMetrics {
  const price = Math.max(0, purchasePrice);
  const dpPct = depositPercent(input);
  const downPayment = price * (dpPct / 100);
  const loanAmount = Math.max(0, price - downPayment);
  const monthlyPayment = calculateMonthlyPayment(loanAmount, input.financing.interestRate, input.financing.termYears);
  const annualDebtService = monthlyPayment * 12;

  const income = calculateIncome(input.property.expectedMonthlyRent, input.expenses.vacancyPercent);
  const opex = annualOperatingExpenses(input, income.annualIncome, income.effectiveGrossIncome);
  const noi = income.effectiveGrossIncome - opex;
  const annualCashflow = noi - annualDebtService;
  const cashInvested =
    downPayment +
    input.property.closingCosts +
    input.property.holdingCosts +
    input.property.rehabBudget +
    input.financing.loanFees;

  const mortgage = calculateMortgage({
    purchasePrice: price,
    depositPercent: dpPct,
    interestRate: input.financing.interestRate,
    termYears: input.financing.termYears,
  });
  const principalYearOne = principalPaidInYear(mortgage, 1);
  const roi = safeDivide(annualCashflow + principalYearOne, cashInvested) * 100;

  return {
    purchasePrice: price,
    loanAmount,
    downPayment,
    monthlyPayment,
    annualDebtService,
    monthlyIncome: income.monthlyIncome,
    annualIncome: income.annualIncome,
    vacancyLoss: income.vacancyLoss,
    effectiveGrossIncome: income.effectiveGrossIncome,
    operatingExpensesAnnual: opex,
    noi,
    monthlyCashflow: annualCashflow / 12,
    annualCashflow,
    cashInvested,
    roi,
    cashOnCash: calculateCashOnCash(annualCashflow, cashInvested),
    dscr: calculateDscr(noi, annualDebtService),
    capRate: calculateCapRate(noi, price),
    grossYield: calculateGrossYield(income.annualIncome, price),
    principalYearOne,
  };
}

function meets(
  metrics: OfferDealMetrics,
  key: OfferConstraintKey,
  input: MaxOfferInputs,
): boolean {
  const t = input.targets;
  switch (key) {
    case "cashflow":
      return metrics.monthlyCashflow + EPS >= t.desiredMonthlyCashflow;
    case "roi":
      return metrics.roi + EPS >= t.desiredRoi;
    case "cashOnCash":
      return metrics.cashOnCash + EPS >= t.desiredCashOnCash;
    case "dscr":
      return metrics.dscr + EPS >= t.minimumDscr;
  }
}

function meetsAll(metrics: OfferDealMetrics, input: MaxOfferInputs): boolean {
  return (
    meets(metrics, "cashflow", input) &&
    meets(metrics, "roi", input) &&
    meets(metrics, "cashOnCash", input) &&
    meets(metrics, "dscr", input)
  );
}

function maxPriceForConstraint(input: MaxOfferInputs, key: OfferConstraintKey, upperBound: number): number {
  if (upperBound <= 0) return 0;
  if (!meets(metricsAtPrice(input, 0), key, input)) return 0;
  if (meets(metricsAtPrice(input, upperBound), key, input)) return upperBound;

  let lo = 0;
  let hi = upperBound;
  for (let i = 0; i < SEARCH_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (meets(metricsAtPrice(input, mid), key, input)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function constraintLabel(key: OfferConstraintKey): string {
  switch (key) {
    case "cashflow":
      return "Monthly cashflow";
    case "roi":
      return "ROI";
    case "cashOnCash":
      return "Cash-on-cash";
    case "dscr":
      return "Minimum DSCR";
  }
}

function scenarioRecommendation(tier: OfferTier): string {
  switch (tier) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "maximum":
      return "At maximum";
    case "too-expensive":
      return "Too expensive";
  }
}

export function classifyOffer(price: number, excellent: number, good: number, maximum: number): OfferTier {
  if (price <= 0 || maximum <= 0) return "too-expensive";
  if (price <= excellent) return "excellent";
  if (price <= good) return "good";
  if (price <= maximum + 0.5) return "maximum";
  return "too-expensive";
}

function buildRecommendation(
  maximumOffer: number,
  recommendedOffer: number,
  excellentOffer: number,
  goodOffer: number,
  askingPrice: number,
  feasible: boolean,
  limiting: OfferConstraintKey | null,
): OfferRecommendation {
  if (!feasible || maximumOffer <= 0) {
    return {
      tier: "too-expensive",
      title: "Targets Unreachable",
      headline: "This rent and expense profile cannot meet your investing criteria at any purchase price.",
      body: "Raise rent, cut operating costs, or relax cashflow / DSCR / return targets, then run the numbers again.",
    };
  }

  const limitingNote = limiting ? ` The binding constraint is ${constraintLabel(limiting).toLowerCase()}.` : "";
  const asking = askingPrice > 0 ? askingPrice : recommendedOffer;
  const tier = classifyOffer(asking, excellentOffer, goodOffer, maximumOffer);

  if (askingPrice <= 0) {
    return {
      tier: "good",
      title: "Target Offer Ready",
      headline: `Based on your goals, this property can be purchased for up to ${formatPlain(maximumOffer)} while maintaining your return requirements.`,
      body: `A recommended target offer of ${formatPlain(recommendedOffer)} provides additional safety margin and stronger long-term returns.${limitingNote}`,
    };
  }

  switch (tier) {
    case "excellent":
      return {
        tier,
        title: "Excellent Deal",
        headline: `The asking price of ${formatPlain(askingPrice)} sits well inside your maximum of ${formatPlain(maximumOffer)}.`,
        body: `A recommended target offer of ${formatPlain(recommendedOffer)} still leaves a meaningful safety margin versus your return requirements.${limitingNote}`,
      };
    case "good":
      return {
        tier,
        title: "Good Deal",
        headline: `You can pay up to ${formatPlain(maximumOffer)} and still hit your targets. Asking of ${formatPlain(askingPrice)} is workable.`,
        body: `Push toward ${formatPlain(recommendedOffer)} if you can — that price adds protection against vacancy and maintenance surprises.${limitingNote}`,
      };
    case "maximum":
      return {
        tier,
        title: "At Maximum",
        headline: `Asking of ${formatPlain(askingPrice)} is at the ceiling of what your criteria allow (max ${formatPlain(maximumOffer)}).`,
        body: `There is little room for error. Negotiate toward ${formatPlain(recommendedOffer)} before you waive contingencies.${limitingNote}`,
      };
    case "too-expensive":
      return {
        tier,
        title: "Too Expensive",
        headline: `Asking of ${formatPlain(askingPrice)} is above your maximum allowable offer of ${formatPlain(maximumOffer)}.`,
        body: `Walk away or renegotiate. Paying this price would miss at least one of your cashflow, ROI, cash-on-cash or DSCR targets.${limitingNote}`,
      };
  }
}

function formatPlain(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function buildScenario(
  key: OfferScenario["key"],
  label: string,
  price: number,
  input: MaxOfferInputs,
  excellent: number,
  good: number,
  maximum: number,
): OfferScenario {
  const m = metricsAtPrice(input, price);
  const tier = classifyOffer(price, excellent, good, maximum);
  return {
    key,
    label,
    purchasePrice: price,
    monthlyCashflow: m.monthlyCashflow,
    roi: m.roi,
    cashOnCash: m.cashOnCash,
    dscr: m.dscr,
    capRate: m.capRate,
    recommendation: scenarioRecommendation(tier),
  };
}

function buildCurve(input: MaxOfferInputs, maximumOffer: number): PriceMetricPoint[] {
  const hi = Math.max(maximumOffer * 1.25, input.property.arv * 0.9, 50_000);
  const lo = Math.max(hi * 0.35, 5_000);
  const points: PriceMetricPoint[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const purchasePrice = lo + ((hi - lo) * i) / steps;
    const m = metricsAtPrice(input, purchasePrice);
    points.push({
      purchasePrice,
      monthlyCashflow: m.monthlyCashflow,
      roi: m.roi,
      dscr: m.dscr,
      capRate: m.capRate,
    });
  }
  return points;
}

function buildBrrrr(input: MaxOfferInputs, purchasePrice: number, metrics: OfferDealMetrics): MaxOfferBrrrrResults {
  const totalProjectCost =
    purchasePrice + input.property.rehabBudget + input.property.closingCosts + input.property.holdingCosts + input.financing.loanFees;
  const initialCashInvested = metrics.cashInvested;
  const refinanceAmount = input.property.arv * (input.brrrr.refinanceLtv / 100);
  const cashPulledOut = Math.max(0, refinanceAmount - metrics.loanAmount);
  const cashLeftInDeal = Math.max(0, initialCashInvested - cashPulledOut);
  const cashRecoveryPercent = safeDivide(cashPulledOut, initialCashInvested) * 100;
  const recoveryScore = clamp(cashRecoveryPercent / 100, 0, 1) * 70;
  const cashflowScore = clamp(metrics.monthlyCashflow / 400, 0, 1) * 30;
  const infiniteReturn = cashLeftInDeal <= 0 && metrics.monthlyCashflow > 0;

  return {
    totalProjectCost,
    initialCashInvested,
    refinanceAmount,
    cashPulledOut,
    cashLeftInDeal,
    cashRecoveryPercent,
    monthlyCashflow: metrics.monthlyCashflow,
    efficiencyScore: Math.round(recoveryScore + cashflowScore),
    infiniteReturn,
  };
}

function buildSummary(
  input: MaxOfferInputs,
  results: Pick<MaxOfferResults, "maximumOffer" | "recommendedOffer" | "atMaximum" | "feasible" | "limitingConstraint">,
): MaxOfferSummary {
  const rent = input.property.expectedMonthlyRent;
  const arv = input.property.arv;
  const max = results.maximumOffer;
  const rec = results.recommendedOffer;
  const m = results.atMaximum;
  const generatedAt = new Date().toISOString();

  if (!results.feasible || max <= 0) {
    return {
      headline: `Based on rent of ${formatPlain(rent)}/month and an ARV of ${formatPlain(arv)}, the current targets cannot be met at any purchase price.`,
      bullets: [
        "Net operating income does not cover the cashflow, return or DSCR hurdles you set.",
        "Revisit rent, vacancy, management and CapEx assumptions before offering.",
      ],
      closing: "Do not submit an offer until the underwriting supports your criteria.",
      generatedAt,
    };
  }

  return {
    headline: `Based on a rent of ${formatPlain(rent)}/month and an ARV of ${formatPlain(arv)}, PropertyIQ estimates a maximum purchase price of ${formatPlain(max)}.`,
    bullets: [
      `${formatPlain(Math.abs(m.monthlyCashflow))}/month cashflow (${m.monthlyCashflow >= 0 ? "positive" : "negative"})`,
      `${m.roi.toFixed(1)}% ROI including year-one principal paydown`,
      `${m.dscr.toFixed(2)}x DSCR`,
    ],
    closing: `A recommended target offer of ${formatPlain(rec)} would create additional protection against vacancy and maintenance risks.`,
    generatedAt,
  };
}

/**
 * Work backwards from investor targets to the highest purchase price that still clears
 * cashflow, ROI, cash-on-cash and DSCR hurdles. The tightest constraint wins.
 */
export function calculateMaxOffer(raw: MaxOfferInputs): MaxOfferResults {
  const input = sanitizeMaxOffer(raw);
  const upperBound = Math.max(input.property.arv, 1);
  const keys: OfferConstraintKey[] = ["cashflow", "roi", "cashOnCash", "dscr"];

  const rawCaps = keys.map((key) => ({
    key,
    label: constraintLabel(key),
    maxPurchasePrice: maxPriceForConstraint(input, key, upperBound),
  }));

  const tightest = rawCaps.reduce((min, c) => (c.maxPurchasePrice < min.maxPurchasePrice ? c : min), rawCaps[0]);
  const rawMax = tightest.maxPurchasePrice;
  const feasible = rawMax > 0 && meetsAll(metricsAtPrice(input, rawMax), input);
  const maximumOffer = feasible ? roundMoney(rawMax) : 0;

  const buffer = clamp(input.targets.safetyBufferPercent, 0, 40) / 100;
  const recommendedOffer = feasible ? roundMoney(maximumOffer * (1 - buffer)) : 0;
  const excellentOffer = feasible ? roundMoney(recommendedOffer * 0.955) : 0;
  const goodOffer = feasible ? roundMoney(recommendedOffer + (maximumOffer - recommendedOffer) * 0.3) : 0;
  const safetyMargin = Math.max(0, maximumOffer - recommendedOffer);

  const constraints: OfferConstraint[] = rawCaps.map((c) => ({
    ...c,
    maxPurchasePrice: roundMoney(c.maxPurchasePrice),
    isLimiting: feasible && c.key === tightest.key,
  }));

  const atMaximum = metricsAtPrice(input, maximumOffer || 0);
  const atRecommended = metricsAtPrice(input, recommendedOffer || 0);
  const askingPrice = input.property.askingPrice;

  const excellentForClass = excellentOffer || recommendedOffer;
  const goodForClass = goodOffer || Math.round((recommendedOffer + maximumOffer) / 2);

  const scenarios: OfferScenario[] = [];
  if (excellentOffer > 0) {
    scenarios.push(buildScenario("excellent", "Excellent Offer", excellentOffer, input, excellentForClass, goodForClass, maximumOffer));
  }
  if (recommendedOffer > 0) {
    scenarios.push(buildScenario("recommended", "Recommended Offer", recommendedOffer, input, excellentForClass, goodForClass, maximumOffer));
  }
  if (maximumOffer > 0) {
    scenarios.push(buildScenario("maximum", "Maximum Offer", maximumOffer, input, excellentForClass, goodForClass, maximumOffer));
  }
  if (askingPrice > 0) {
    scenarios.push(buildScenario("asking", "Current Asking Price", askingPrice, input, excellentForClass, goodForClass, maximumOffer));
  }

  const recommendation = buildRecommendation(
    maximumOffer,
    recommendedOffer,
    excellentForClass,
    goodForClass,
    askingPrice,
    feasible,
    feasible ? tightest.key : null,
  );

  const summarySeed = {
    maximumOffer,
    recommendedOffer,
    atMaximum,
    feasible,
    limitingConstraint: feasible ? tightest.key : null,
  };
  const summary = buildSummary(input, summarySeed);

  return {
    feasible,
    maximumOffer,
    recommendedOffer,
    excellentOffer,
    goodOffer,
    safetyMargin,
    safetyMarginPercent: safeDivide(safetyMargin, maximumOffer) * 100,
    limitingConstraint: feasible ? tightest.key : null,
    constraints,
    atMaximum,
    atRecommended,
    recommendation,
    scenarios,
    curve: buildCurve(input, maximumOffer || upperBound),
    brrrr: buildBrrrr(input, recommendedOffer || maximumOffer, atRecommended.purchasePrice > 0 ? atRecommended : atMaximum),
    summary,
    generatedAt: summary.generatedAt,
  };
}
