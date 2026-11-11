import type {
  AnalysisInput,
  AnalysisResults,
  BuyBoxMatch,
  DealKillerWarning,
  DealResilienceResults,
  MarginOfSafety,
  RefinanceValidation,
  ResolvedRent,
} from "@/lib/types";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { applyActiveRent } from "@/lib/calculations/rent";
import { formatDscr } from "@/lib/calculations/ratios";

interface KillerArgs {
  input: AnalysisInput;
  results: AnalysisResults;
  rent: ResolvedRent;
  buyBox: BuyBoxMatch;
  refinance: RefinanceValidation;
  resilience: DealResilienceResults;
  margin: MarginOfSafety;
}

export function collectDealKillers(args: KillerArgs): DealKillerWarning[] {
  const { input, results, rent, buyBox, refinance, resilience, margin } = args;
  const warnings: DealKillerWarning[] = [];
  const stress = resilience.scenarios.find((s) => s.key === "stress");
  const expected = resilience.scenarios.find((s) => s.key === "expected");

  if (buyBox.status === "outside") {
    const fail = buyBox.reasons.find((r) => r.tone === "fail");
    warnings.push({
      key: "buy-box",
      severity: "critical",
      title: "Outside the active Buy Box",
      detail: fail?.message ?? "This property fails at least one Buy Box rule.",
    });
  }

  if (rent.source !== "listing" && rent.listing > rent.active + 1) {
    const listingInput = applyActiveRent({
      ...input,
      income: { ...input.income, rentSource: "listing" },
    });
    const listingResults = analyzeProperty(listingInput);
    const listingRoi = listingResults.roi;
    const verifiedRoi = results.roi;
    if (listingRoi >= 8 && verifiedRoi < 8) {
      warnings.push({
        key: "listing-rent-roi",
        severity: "warning",
        title: "Deal only meets ROI target using listing rent",
        detail: `Listing rent produces ${listingRoi.toFixed(1)}% ROI, but the ${rent.source} rent used for underwriting lands at ${verifiedRoi.toFixed(1)}%.`,
      });
    }
  }

  if (rent.source === "listing" && rent.verified > 0 && rent.verified < rent.listing) {
    warnings.push({
      key: "using-listing",
      severity: "warning",
      title: "Underwriting on listing rent",
      detail: "Switch to verified or conservative rent before treating these returns as reliable.",
    });
  }

  const rehab = input.strategy === "fix-flip" ? input.flip.renovationBudget : input.brrrr.rehabCost;
  const arv = input.brrrr.afterRepairValue || input.flip.expectedSalePrice || input.financing.purchasePrice;
  if (rehab > 0 && arv > 0 && rehab / arv < 0.06 && (input.property.condition === "needs-repair" || input.property.condition === "full-renovation" || input.strategy === "brrrr" || input.strategy === "fix-flip")) {
    warnings.push({
      key: "rehab-thin",
      severity: "warning",
      title: "Rehab budget leaves little contingency",
      detail: `Rehab is ${Math.round((rehab / arv) * 100)}% of ARV. A 10–15% contingency is typical on value-add deals.`,
    });
  }

  if (!refinance.viable) {
    warnings.push({
      key: "refi-risk",
      severity: input.strategy === "brrrr" ? "critical" : "warning",
      title: "Refinance viability weak",
      detail: refinance.detail,
    });
  }

  const dscrFloor = input.brrrr.refinanceDscrMin || 1.25;
  if (stress && Number.isFinite(stress.dscr) && stress.dscr < dscrFloor) {
    warnings.push({
      key: "stress-dscr",
      severity: stress.dscr < 1 ? "critical" : "warning",
      title: "DSCR below target under stress conditions",
      detail: `Stress-case DSCR is ${formatDscr(stress.dscr)} versus a ${formatDscr(dscrFloor)} target.`,
    });
  }

  if (stress && stress.monthlyCashflow < 0) {
    warnings.push({
      key: "stress-cf",
      severity: "critical",
      title: "Negative cashflow under stress case",
      detail: `A 10% rent cut and 15% rehab overrun produces ${Math.round(stress.monthlyCashflow)}/mo cashflow.`,
    });
  }

  if (margin.ready && (margin.rating === "danger" || margin.rating === "weak")) {
    warnings.push({
      key: "mos",
      severity: margin.rating === "danger" ? "critical" : "warning",
      title: margin.rating === "danger" ? "Current price leaves almost no margin of safety" : "Thin margin of safety",
      detail: margin.detail,
    });
  }

  if (expected && expected.monthlyCashflow < 0) {
    warnings.push({
      key: "expected-cf",
      severity: "critical",
      title: "Negative cashflow on the expected case",
      detail: "The deal does not cashflow even before stress is applied.",
    });
  }

  return warnings;
}
