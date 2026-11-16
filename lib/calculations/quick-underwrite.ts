import type {
  AnalysisInput,
  AllInCostBreakdown,
  BuyBoxMatch,
  BuyBoxProfile,
  CapRateBasis,
  CashRecoveryResults,
  PriceSource,
  QuickDownsideSnapshot,
  QuickOperatingStatement,
  QuickRentResolution,
  QuickRefinanceResults,
  QuickUnderwriteResults,
  QuickUnderwriteVerdictResult,
  QuickVerdictRule,
  RentSource,
  UnderwritingWarning,
} from "@/lib/types";
import { calculateMonthlyPayment } from "@/lib/calculations/mortgage";
import { calculateCapRate, calculateCashOnCash, clamp } from "@/lib/calculations/ratios";
import { monthlyUtilitiesTotal } from "@/lib/calculations/utilities";
import { matchBuyBox } from "@/lib/calculations/buy-box";
import { formatDscrOrNA, sizeSupportedRefinance } from "@/lib/calculations/refinance";
import { computeCashRecovery } from "@/lib/calculations/cash-recovery";
import { normalizeAnalysisInput } from "@/lib/calculations/normalize-input";
import { resolveAcquisitionLoan } from "@/lib/calculations/brrrr-capital";
import { calculateDealResilience } from "@/lib/calculations/deal-resilience";
import { calculateDownsideAnalysis } from "@/lib/calculations/downside-analysis";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { analysisToMaxOfferInputs, marginFromAnalysis } from "@/lib/calculations/margin-of-safety";
import { applyActiveRent } from "@/lib/calculations/rent";
import { rehabContingencyAmount, totalRehabBudget } from "@/lib/calculations/deal-decision";
import {
  buildPriceComparisons,
  formatMoneyAmount,
  resolveUnderwrittenPrice,
  toPriceSource,
} from "@/lib/calculations/underwritten-price";

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

const RENT_LABELS: Record<RentSource, { label: string; basis: string }> = {
  listing: { label: "Underwritten using Listing Rent", basis: "Listing Rent" },
  verified: { label: "Underwritten using Verified Local Rent", basis: "Verified Local Rent" },
  conservative: { label: "Underwritten using Conservative Rent", basis: "Conservative Rent" },
};

const CAP_RATE_LABELS: Record<CapRateBasis, string> = {
  purchase: "Purchase Price",
  "proposed-offer": "Proposed Offer",
  asking: "Current Asking Price",
  "all-in": "All-In Cost",
  arv: "ARV",
};

export function resolveQuickRent(input: AnalysisInput): QuickRentResolution {
  const listing = Math.max(0, finite(input.income.monthlyRent));
  const verified = Math.max(0, finite(input.income.verifiedRent));
  const conservative = Math.max(0, finite(input.income.conservativeRent));
  const source: RentSource =
    input.income.rentSource === "listing" || input.income.rentSource === "conservative"
      ? input.income.rentSource
      : "verified";
  const active = source === "listing" ? listing : source === "conservative" ? conservative : verified;
  const names = RENT_LABELS[source];
  return { listing, verified, conservative, source, active, label: names.label, basisLabel: names.basis };
}

export function resolveAcquisitionPrice(input: AnalysisInput): PriceSource {
  return toPriceSource(resolveUnderwrittenPrice(input));
}

export function resolveHoldingCost(input: AnalysisInput): {
  calculated: number;
  override: number;
  used: number;
  source: "calculated" | "override";
} {
  const calculated = Math.max(0, finite(input.flip.holdingCostsMonthly) * finite(input.flip.holdDurationMonths));
  const override = money(input.flip.holdingCostOverride);
  if (override > 0) return { calculated, override, used: override, source: "override" };
  return { calculated, override: 0, used: calculated, source: "calculated" };
}

export function buildAllInCost(input: AnalysisInput, acquisition: PriceSource): AllInCostBreakdown {
  const estimatedRehab = Math.max(0, finite(input.brrrr.rehabCost));
  const contingencyPercent = Math.max(0, finite(input.decision.rehabContingencyPercent));
  const contingency = rehabContingencyAmount(estimatedRehab, contingencyPercent);
  const adjustedRehab = totalRehabBudget(estimatedRehab, contingencyPercent);
  const otherRehab = Math.max(0, finite(input.brrrr.otherRehabCosts));
  const holding = resolveHoldingCost(input);
  const closing = Math.max(0, finite(input.financing.closingCosts));
  const inspection = Math.max(0, finite(input.financing.inspectionCosts));
  const legal = Math.max(0, finite(input.financing.legalFees));
  const loanFees = Math.max(0, finite(input.financing.loanFees));
  const otherAcquisition = Math.max(0, finite(input.financing.otherAcquisitionCosts));
  const price = acquisition.value;

  if (price === null) {
    return {
      ready: false,
      acquisitionPriceUsed: null,
      acquisitionPriceSource: acquisition,
      estimatedRehab,
      rehabContingencyAmount: contingency,
      adjustedRehabBudget: adjustedRehab,
      otherRehabCosts: otherRehab,
      closingCosts: closing,
      inspectionCosts: inspection,
      legalFees: legal,
      loanFees,
      calculatedHoldingCost: holding.calculated,
      holdingCostOverride: holding.override,
      holdingCostsUsed: holding.used,
      holdingCostSource: holding.source,
      otherAcquisitionCosts: otherAcquisition,
      total: null,
      message: "Enter an asking price, proposed offer, or purchase price to calculate all-in cost.",
    };
  }

  const total =
    price +
    adjustedRehab +
    otherRehab +
    closing +
    inspection +
    legal +
    loanFees +
    holding.used +
    otherAcquisition;

  return {
    ready: true,
    acquisitionPriceUsed: price,
    acquisitionPriceSource: acquisition,
    estimatedRehab,
    rehabContingencyAmount: contingency,
    adjustedRehabBudget: adjustedRehab,
    otherRehabCosts: otherRehab,
    closingCosts: closing,
    inspectionCosts: inspection,
    legalFees: legal,
    loanFees,
    calculatedHoldingCost: holding.calculated,
    holdingCostOverride: holding.override,
    holdingCostsUsed: holding.used,
    holdingCostSource: holding.source,
    otherAcquisitionCosts: otherAcquisition,
    total,
    message: null,
  };
}

export function buildOperatingStatement(input: AnalysisInput, activeMonthlyRent: number): QuickOperatingStatement {
  const vacancyPercent = Math.max(0, finite(input.expenses.vacancyPercent));
  const vacancyAllowance = activeMonthlyRent * (vacancyPercent / 100);
  const effectiveMonthlyIncome = activeMonthlyRent - vacancyAllowance;
  const managementCost = activeMonthlyRent * (Math.max(0, finite(input.expenses.managementPercent)) / 100);
  const maintenanceReserve = activeMonthlyRent * (Math.max(0, finite(input.expenses.maintenancePercent)) / 100);
  const capexReserve = activeMonthlyRent * (Math.max(0, finite(input.expenses.capexPercent)) / 100);
  const monthlyPropertyTax = Math.max(0, finite(input.expenses.propertyTaxAnnual)) / 12;
  const monthlyInsurance = Math.max(0, finite(input.expenses.insuranceAnnual)) / 12;
  const monthlyHoa = Math.max(0, finite(input.expenses.hoaMonthly));
  const monthlyUtilities = monthlyUtilitiesTotal(input.expenses);
  const otherMonthlyExpenses = Math.max(0, finite(input.expenses.otherMonthly));
  const totalMonthlyOperatingExpenses =
    managementCost +
    maintenanceReserve +
    capexReserve +
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyHoa +
    monthlyUtilities +
    otherMonthlyExpenses;
  const monthlyNoi = effectiveMonthlyIncome - totalMonthlyOperatingExpenses;
  return {
    activeMonthlyRent,
    vacancyAllowance,
    effectiveMonthlyIncome,
    managementCost,
    maintenanceReserve,
    capexReserve,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyUtilities,
    otherMonthlyExpenses,
    totalMonthlyOperatingExpenses,
    monthlyNoi,
    annualNoi: monthlyNoi * 12,
  };
}

function capRateValue(
  basis: CapRateBasis,
  input: AnalysisInput,
  acquisition: PriceSource,
  allIn: AllInCostBreakdown,
): number | null {
  switch (basis) {
    case "purchase":
      return money(input.financing.purchasePrice) || null;
    case "proposed-offer":
      return money(input.financing.proposedOffer) || null;
    case "asking":
      return money(input.financing.askingPrice) || null;
    case "all-in":
      return allIn.total;
    case "arv":
      return money(input.brrrr.afterRepairValue) || null;
    default:
      return acquisition.value;
  }
}

function defaultCapRateBasis(input: AnalysisInput): CapRateBasis {
  const stored = input.decision.capRateBasis;
  if (stored === "proposed-offer" || stored === "asking" || stored === "all-in" || stored === "arv" || stored === "purchase") {
    return stored;
  }
  const source = resolveUnderwrittenPrice(input).source;
  if (source === "purchase") return "purchase";
  if (source === "asking") return "asking";
  return "proposed-offer";
}

export function buildQuickRefinance(
  input: AnalysisInput,
  operating: QuickOperatingStatement,
  acquisition: PriceSource,
): QuickRefinanceResults {
  const arv = money(input.brrrr.afterRepairValue);
  const requiredDscr = input.brrrr.refinanceDscrMin > 0 ? input.brrrr.refinanceDscrMin : 1.25;
  const sized = sizeSupportedRefinance({
    arv,
    refinanceLtv: clamp(input.brrrr.refinanceLtv || 75, 0, 100),
    interestRate: input.brrrr.refinanceRate || input.financing.interestRate,
    termYears: input.brrrr.refinanceTermYears || input.financing.termYears,
    requiredDscr,
    monthlyNoi: operating.monthlyNoi,
  });
  const derivedPayoff = acquisition.value
    ? resolveAcquisitionLoan(acquisition.value, input.financing.depositPercent)
    : 0;
  const override = money(input.brrrr.loanPayoffAmount);
  const loanPayoffAmount = override > 0 ? override : derivedPayoff;
  return {
    arv,
    refinanceLtv: clamp(input.brrrr.refinanceLtv || 75, 0, 100),
    interestRate: input.brrrr.refinanceRate || input.financing.interestRate,
    termYears: input.brrrr.refinanceTermYears || input.financing.termYears,
    requiredDscr,
    refinanceClosingCosts: Math.max(0, finite(input.brrrr.refinanceClosingCosts)),
    ltvBasedMaximumLoan: sized.ltvBasedMaximumLoan,
    dscrSupportedMaximumLoan: sized.dscrSupportedMaximumLoan,
    supportedRefinanceLoan: sized.supportedRefinanceLoan,
    limitingFactor: sized.limitingFactor,
    limitingLabel: sized.limitingLabel,
    monthlyPayment: sized.monthlyPayment,
    postRefiDscr: sized.postRefiDscr,
    postRefiDscrLabel: formatDscrOrNA(sized.postRefiDscr),
    loanPayoffAmount,
    loanPayoffDerived: override <= 0,
  };
}

function engineInput(input: AnalysisInput, acquisition: PriceSource, rent: QuickRentResolution): AnalysisInput {
  const next = applyActiveRent({
    ...input,
    income: { ...input.income, rentSource: rent.source, monthlyRent: rent.active },
    financing: {
      ...input.financing,
      purchasePrice: acquisition.value ?? 0,
    },
    brrrr: { ...input.brrrr, expectedRent: rent.active },
  });
  return next;
}

function collectWarnings(args: {
  input: AnalysisInput;
  rent: QuickRentResolution;
  refinance: QuickRefinanceResults;
  buyBox: BuyBoxMatch;
  downsideCashflow: number | null;
  asking: number;
  proposed: number;
  underwritten: PriceSource;
  maximumOffer: number | null;
  marginPercent: number | null;
  cashLeft: number | null;
}): UnderwritingWarning[] {
  const {
    input,
    rent,
    refinance,
    buyBox,
    downsideCashflow,
    asking,
    proposed,
    underwritten,
    maximumOffer,
    marginPercent,
    cashLeft,
  } = args;
  const warnings: UnderwritingWarning[] = [];
  const push = (warning: UnderwritingWarning) => {
    if (!warnings.some((item) => item.key === warning.key)) warnings.push(warning);
  };

  if (rent.verified <= 0) {
    push({
      key: "verified-rent-missing",
      severity: "critical",
      title: "Verified rent has not been entered.",
      detail: "Enter a property-specific verified local rent before treating the underwrite as complete.",
    });
  }
  if (rent.source === "listing") {
    push({
      key: "using-listing-rent",
      severity: "warning",
      title: "Analysis is using listing rent.",
      detail: "Listing rent is not a substitute for verified local rent.",
    });
  }
  if (refinance.limitingFactor === "dscr") {
    push({
      key: "dscr-limited",
      severity: "warning",
      title: "The refinance is DSCR-limited.",
      detail: "Rent cannot support the full LTV refinance payment, so the supported loan is capped by DSCR.",
    });
  }
  if (refinance.postRefiDscr !== null && refinance.postRefiDscr + 1e-6 < refinance.requiredDscr) {
    push({
      key: "post-refi-dscr",
      severity: "critical",
      title: "Post-refinance DSCR is below the required threshold.",
      detail: `${refinance.postRefiDscrLabel} versus a ${formatDscrOrNA(refinance.requiredDscr)} requirement.`,
    });
  }
  const max = maximumOffer !== null && maximumOffer > 0 ? maximumOffer : null;
  const underwrittenAboveMax =
    underwritten.value !== null && max !== null && underwritten.value > max;
  if (underwrittenAboveMax && underwritten.value !== null && max !== null) {
    push({
      key: "underwritten-above-max",
      severity: "critical",
      title: `The price currently being underwritten is ${formatMoneyAmount(underwritten.value - max)} above the calculated maximum offer.`,
      detail: `${underwritten.label} of ${formatMoneyAmount(underwritten.value)} is the price used for the verdict.`,
    });
  } else if (marginPercent !== null && marginPercent < 0) {
    push({
      key: "negative-mos",
      severity: "warning",
      title: "Margin of safety is negative.",
      detail: "The price currently being underwritten sits above the calculated maximum offer.",
    });
  }
  if (asking > 0 && max !== null && asking > max && !underwrittenAboveMax) {
    const proposedNote =
      proposed > 0 && proposed <= max
        ? ` Proposed offer is ${formatMoneyAmount(max - proposed)} below the calculated maximum offer.`
        : "";
    push({
      key: "asking-above-max",
      severity: "warning",
      title: `Asking price is ${formatMoneyAmount(asking - max)} above the calculated maximum offer.`,
      detail: proposedNote.trim() || "The listing is above the price that still meets the current return targets.",
    });
  }
  if (input.decision.rehabContingencyPercent < 10 && money(input.brrrr.rehabCost) > 0) {
    push({
      key: "thin-contingency",
      severity: "warning",
      title: "Rehab contingency is below the configured minimum.",
      detail: "A 10% rehab contingency is the current Quick Underwrite default.",
    });
  }
  if (downsideCashflow !== null && downsideCashflow < 0) {
    push({
      key: "downside-cf",
      severity: "critical",
      title: "Downside cashflow is negative.",
      detail: "The more severe bad-year case turns monthly cash flow negative.",
    });
  }
  if (buyBox.status === "outside") {
    push({
      key: "outside-buy-box",
      severity: "critical",
      title: "The deal is outside the selected Buy Box.",
      detail: buyBox.reasons.find((reason) => reason.tone === "fail")?.message ?? "At least one Buy Box rule failed.",
    });
  }
  const targetCashLeft = money(input.decision.targetCashLeftInDeal);
  if (targetCashLeft > 0 && cashLeft !== null && cashLeft > targetCashLeft) {
    push({
      key: "cash-left-target",
      severity: "warning",
      title: "Cash left in the deal exceeds the investor’s target.",
      detail: "Net refinance proceeds leave more cash in the deal than the entered target.",
    });
  }
  if (input.income.verificationStatus === "unverified" || !input.neighbourhood.lastUpdated) {
    push({
      key: "neighbourhood-unverified",
      severity: "info",
      title: "Neighbourhood market data has not been verified.",
      detail: "No live neighbourhood data is connected. Figures are user-entered only.",
    });
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  return warnings.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function buildVerdict(args: {
  missing: string[];
  buyBox: BuyBoxMatch;
  refinance: QuickRefinanceResults;
  monthlyCashflow: number | null;
  downsideCashflow: number | null;
  underwritten: number | null;
  maximumOffer: number | null;
  marginPercent: number | null;
  criticalWarnings: boolean;
}): QuickUnderwriteVerdictResult {
  const {
    missing,
    buyBox,
    refinance,
    monthlyCashflow,
    downsideCashflow,
    underwritten,
    maximumOffer,
    marginPercent,
    criticalWarnings,
  } = args;

  if (missing.length > 0) {
    return {
      verdict: "insufficient-data",
      label: "Insufficient Data",
      summary: `Based on the assumptions entered, ${missing.join("; ")}.`,
      rules: missing.map((item) => ({
        key: item,
        label: item,
        passed: false,
        applicable: true,
        detail: item,
      })),
    };
  }

  const insideOrNone = buyBox.status === "inside" || buyBox.status === "no-profile";
  const dscrMeets =
    refinance.postRefiDscr !== null && refinance.postRefiDscr + 1e-9 >= refinance.requiredDscr;
  const expectedPositive = monthlyCashflow !== null && monthlyCashflow > 0;
  const downsideOk = downsideCashflow !== null && downsideCashflow >= 0;
  const underwrittenAboveMax =
    underwritten !== null && maximumOffer !== null && maximumOffer > 0 && underwritten > maximumOffer;
  const negativeMos = marginPercent !== null && marginPercent < 0;
  const refiNotViable =
    refinance.postRefiDscr !== null && (refinance.postRefiDscr < 1 || refinance.supportedRefinanceLoan <= 0);
  const dscrBelowOne = refinance.postRefiDscr !== null && refinance.postRefiDscr < 1;
  const expectedNegative = monthlyCashflow !== null && monthlyCashflow < 0;
  const downsideNegative = downsideCashflow !== null && downsideCashflow < 0;
  const outside = buyBox.status === "outside";

  const rules: QuickVerdictRule[] = [
    {
      key: "buy-box",
      label: "Buy Box",
      passed: insideOrNone,
      applicable: true,
      detail: insideOrNone
        ? buyBox.status === "no-profile"
          ? "No active Buy Box."
          : "Inside the active Buy Box."
        : "Outside the active Buy Box.",
    },
    {
      key: "post-refi-dscr",
      label: "Post-refinance DSCR meets required DSCR",
      passed: dscrMeets,
      applicable: refinance.postRefiDscr !== null,
      detail: refinance.postRefiDscrLabel,
    },
    {
      key: "expected-cf",
      label: "Expected monthly cashflow is positive",
      passed: expectedPositive,
      applicable: monthlyCashflow !== null,
      detail: monthlyCashflow === null ? "Not available" : `${monthlyCashflow >= 0 ? "+" : ""}${Math.round(monthlyCashflow)}/mo`,
    },
    {
      key: "downside-cf",
      label: "Downside monthly cashflow is non-negative",
      passed: downsideOk,
      applicable: downsideCashflow !== null,
      detail: downsideCashflow === null ? "Not available" : `${downsideCashflow >= 0 ? "+" : ""}${Math.round(downsideCashflow)}/mo`,
    },
    {
      key: "critical-warnings",
      label: "No critical refinance or data warning",
      passed: !criticalWarnings,
      applicable: true,
      detail: criticalWarnings ? "Critical warnings are present." : "No critical warnings.",
    },
  ];

  const walkAwayHits = [
    outside,
    dscrBelowOne,
    expectedNegative,
    downsideNegative,
    underwrittenAboveMax,
    negativeMos,
    refiNotViable,
  ].filter(Boolean).length;

  if (
    insideOrNone &&
    dscrMeets &&
    expectedPositive &&
    downsideOk &&
    !criticalWarnings
  ) {
    return {
      verdict: "worth-pursuing",
      label: "Worth Pursuing",
      summary: "Based on the assumptions entered, the deal clears Buy Box, refinance DSCR, expected cash flow and downside cash flow checks.",
      rules,
    };
  }

  if (walkAwayHits >= 2) {
    return {
      verdict: "walk-away",
      label: "Walk Away",
      summary: "Based on the assumptions entered, two or more material conditions fail.",
      rules,
    };
  }

  return {
    verdict: "investigate",
    label: "Investigate Further",
    summary: "Based on the assumptions entered, results are mixed or one material condition fails.",
    rules,
  };
}

export function calculateQuickUnderwrite(
  raw: AnalysisInput,
  buyBox: BuyBoxProfile | null | undefined,
): QuickUnderwriteResults {
  const input = normalizeAnalysisInput(raw);
  const rent = resolveQuickRent(input);
  const acquisition = resolveAcquisitionPrice(input);
  const allIn = buildAllInCost(input, acquisition);
  const operating = buildOperatingStatement(input, rent.active);
  const loanAmount = acquisition.value
    ? resolveAcquisitionLoan(acquisition.value, input.financing.depositPercent)
    : 0;
  const acquisitionMonthlyPayment = calculateMonthlyPayment(
    loanAmount,
    input.financing.interestRate,
    input.financing.termYears,
  );
  const monthlyCashflow =
    acquisition.value === null
      ? null
      : Number.isFinite(operating.monthlyNoi - acquisitionMonthlyPayment)
        ? operating.monthlyNoi - acquisitionMonthlyPayment
        : null;
  const annualCashflow = monthlyCashflow === null ? null : monthlyCashflow * 12;
  const capRateBasis = defaultCapRateBasis(input);
  const capBasisValue = capRateValue(capRateBasis, input, acquisition, allIn);
  const capRate =
    capBasisValue && capBasisValue > 0 ? calculateCapRate(operating.annualNoi, capBasisValue) : null;
  const refinance = buildQuickRefinance(input, operating, acquisition);
  const investorCashInvested =
    allIn.total === null ? null : Math.max(0, allIn.total - loanAmount);
  const cashOnCash =
    investorCashInvested && investorCashInvested > 0 && annualCashflow !== null
      ? calculateCashOnCash(annualCashflow, investorCashInvested)
      : null;
  const cashRecovery: CashRecoveryResults | null =
    allIn.total === null || investorCashInvested === null
      ? null
      : {
          ...computeCashRecovery({
            totalCapitalInvested: investorCashInvested,
            grossRefinanceProceeds: refinance.supportedRefinanceLoan,
            refinanceClosingCosts: refinance.refinanceClosingCosts,
            loanPayoffAmount: refinance.loanPayoffAmount,
          }),
          totalProjectCost: allIn.total,
          investorCashInvested,
        };

  const buyBoxMatch = matchBuyBox(buyBox, {
    propertyType: input.property.propertyType,
    bedrooms: input.property.bedrooms,
    purchasePrice: acquisition.value ?? 0,
    askingPrice: money(input.financing.askingPrice),
    monthlyRent: rent.active,
    arv: money(input.brrrr.afterRepairValue),
    zipCode: input.property.zipCode,
    strategy: input.strategy,
  });

  const missing: string[] = [];
  if (rent.active <= 0) missing.push("Active rent is missing");
  if (!acquisition.value) missing.push("Enter an asking price, proposed offer, or purchase price");
  if (money(input.brrrr.afterRepairValue) <= 0) missing.push("ARV is missing");

  let maximumOffer: number | null = null;
  let marginPercent: number | null = null;
  let downside: QuickDownsideSnapshot | null = null;
  if (rent.active > 0 && money(input.brrrr.afterRepairValue) > 0) {
    const mapped = engineInput(input, acquisition, rent);
    const offerInput = analysisToMaxOfferInputs(mapped);
    offerInput.property.expectedMonthlyRent = rent.active;
    offerInput.property.arv = money(input.brrrr.afterRepairValue);
    offerInput.property.askingPrice = money(input.financing.askingPrice);
    const maxOffer = calculateMaxOffer(offerInput);
    maximumOffer = maxOffer.feasible ? maxOffer.maximumOffer : 0;
    const margin = marginFromAnalysis(input, null, {
      recommendedOffer: maxOffer.recommendedOffer,
      maximumOffer: maxOffer.maximumOffer,
    });
    marginPercent = margin.ready ? margin.percent : null;

    const resilience = calculateDealResilience(mapped, { includeSensitivity: false });
    const expected = resilience.scenarios.find((item) => item.key === "expected");
    const stress = resilience.scenarios.find((item) => item.key === "stress");
    const down = calculateDownsideAnalysis(input, {
      includeSensitivity: false,
      maximumOffer: maxOffer.maximumOffer,
      askingPrice: acquisition.value,
      postRefinanceDscr: refinance.postRefiDscr ?? undefined,
      refinanceLoanAmount: refinance.supportedRefinanceLoan,
      refinanceLimitingFactor: refinance.limitingFactor,
      requiredDscr: refinance.requiredDscr,
    });
    downside = {
      expectedCashflow: expected?.monthlyCashflow ?? 0,
      stressCashflow: stress?.monthlyCashflow ?? 0,
      expectedDscr: expected?.dscr ?? 0,
      stressDscr: stress?.dscr ?? 0,
      expectedRoi: expected?.roi ?? 0,
      stressRoi: stress?.roi ?? 0,
      dealSurvivalScore: down.score,
      primaryRisk: down.primaryRiskLabel,
      components: down.components,
    };
  }

  const priceComparisons = buildPriceComparisons(input, maximumOffer);

  const warnings = collectWarnings({
    input,
    rent,
    refinance,
    buyBox: buyBoxMatch,
    downsideCashflow: downside?.stressCashflow ?? null,
    asking: money(input.financing.askingPrice),
    proposed: money(input.financing.proposedOffer),
    underwritten: acquisition,
    maximumOffer,
    marginPercent,
    cashLeft: cashRecovery?.cashLeftInDeal ?? null,
  });

  const verdict = buildVerdict({
    missing,
    buyBox: buyBoxMatch,
    refinance,
    monthlyCashflow,
    downsideCashflow: downside?.stressCashflow ?? null,
    underwritten: acquisition.value,
    maximumOffer,
    marginPercent,
    criticalWarnings: warnings.some((item) => item.severity === "critical"),
  });

  const resolved = resolveUnderwrittenPrice(input);

  return {
    rent,
    acquisitionPrice: acquisition,
    underwrittenPrice: resolved.value,
    underwrittenPriceSource: resolved.source,
    priceComparisons,
    allIn,
    operating,
    acquisitionMonthlyPayment,
    monthlyCashflow,
    annualCashflow,
    capRate,
    capRateBasis,
    capRateBasisLabel: CAP_RATE_LABELS[capRateBasis],
    cashOnCash,
    refinance,
    cashRecovery,
    buyBox: buyBoxMatch,
    marginOfSafetyPercent: marginPercent,
    maximumOffer,
    downside,
    verdict,
    warnings,
    missing,
    generatedAt: new Date().toISOString(),
  };
}
