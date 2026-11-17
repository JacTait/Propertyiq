import type { AnalysisInput, MaxOfferInputs, MaxOfferTargetInputs } from "@/lib/types";
import { DEFAULT_INVESTOR_TARGETS } from "@/lib/constants";
import { acquisitionClosingCosts, holdingCostsFromFlip } from "@/lib/calculations/brrrr-capital";
import { resolveArv } from "@/lib/calculations/refinance";
import { resolveRent } from "@/lib/calculations/rent";

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function money(value: unknown): number {
  return Math.max(0, finiteNumber(value));
}

export function canonicalInvestorTargets(targets?: MaxOfferTargetInputs | null): {
  targets: MaxOfferTargetInputs;
  usingDefaultTargets: boolean;
} {
  if (!targets) {
    return { targets: { ...DEFAULT_INVESTOR_TARGETS }, usingDefaultTargets: true };
  }
  return {
    targets: {
      desiredMonthlyCashflow: finiteNumber(targets.desiredMonthlyCashflow, DEFAULT_INVESTOR_TARGETS.desiredMonthlyCashflow),
      desiredRoi: finiteNumber(targets.desiredRoi, DEFAULT_INVESTOR_TARGETS.desiredRoi),
      desiredCashOnCash: finiteNumber(targets.desiredCashOnCash, DEFAULT_INVESTOR_TARGETS.desiredCashOnCash),
      minimumDscr: finiteNumber(targets.minimumDscr, DEFAULT_INVESTOR_TARGETS.minimumDscr),
      safetyBufferPercent: finiteNumber(targets.safetyBufferPercent, DEFAULT_INVESTOR_TARGETS.safetyBufferPercent),
    },
    usingDefaultTargets: false,
  };
}

export function canonicalArv(input: AnalysisInput): number {
  const afterRepair = money(input.brrrr.afterRepairValue);
  if (afterRepair > 0) return afterRepair;
  const advertised = money(input.decision.advertisedArv);
  if (advertised > 0) return advertised;
  return resolveArv(input);
}

/** One Max Offer input mapping for every workflow. */
export function toMaxOfferInputs(
  input: AnalysisInput,
  targets?: MaxOfferTargetInputs | null,
  extras?: { loanToValue?: number; usingDefaultTargets?: boolean },
): MaxOfferInputs {
  const rent = resolveRent(input);
  const deposit = clampPercent(finiteNumber(input.financing.depositPercent, 25));
  const ltv =
    extras?.loanToValue && extras.loanToValue > 0
      ? clampPercent(extras.loanToValue)
      : clampPercent(100 - deposit);
  const resolved = canonicalInvestorTargets(targets);
  return {
    property: {
      name: input.property.name,
      arv: canonicalArv(input),
      expectedMonthlyRent: rent.active,
      rehabBudget: money(input.strategy === "fix-flip" ? input.flip.renovationBudget : input.brrrr.rehabCost),
      closingCosts: acquisitionClosingCosts(input.financing) - money(input.financing.loanFees),
      holdingCosts: holdingCostsFromFlip(input.flip),
      askingPrice: money(input.financing.askingPrice),
      propertyType: input.property.propertyType,
      bedrooms: input.property.bedrooms,
      bathrooms: input.property.bathrooms,
      zipCode: input.property.zipCode ?? "",
    },
    location: {
      country: input.location.country,
      region: input.location.region,
    },
    strategy: input.strategy,
    financing: {
      interestRate: input.financing.interestRate,
      termYears: input.financing.termYears,
      loanToValue: ltv,
      downPaymentPercent: deposit,
      loanFees: money(input.financing.loanFees),
    },
    expenses: {
      propertyTaxAnnual: input.expenses.propertyTaxAnnual,
      insuranceAnnual: input.expenses.insuranceAnnual,
      managementPercent: input.expenses.managementPercent,
      vacancyPercent: input.expenses.vacancyPercent,
      maintenancePercent: input.expenses.maintenancePercent,
      capexPercent: input.expenses.capexPercent,
      hoaMonthly: input.expenses.hoaMonthly,
      otherMonthly: input.expenses.otherMonthly,
    },
    targets: resolved.targets,
    brrrr: {
      refinanceLtv: input.brrrr.refinanceLtv || 75,
      refinanceRate: input.brrrr.refinanceRate || input.financing.interestRate,
    },
  };
}
