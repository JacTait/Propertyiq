import type {
  AnalysisInput,
  AnalysisResults,
  BuyBoxMatch,
  DealResilienceResults,
  DownsideAnalysisResults,
  RefinanceValidation,
  UnderwritingSummary,
} from "@/lib/types";
import { resolveRent } from "@/lib/calculations/rent";
import { formatDscr } from "@/lib/calculations/ratios";

interface SummaryArgs {
  input: AnalysisInput;
  results: AnalysisResults;
  buyBox: BuyBoxMatch;
  refinance: RefinanceValidation;
  resilience: DealResilienceResults;
  downside: DownsideAnalysisResults;
}

function money(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function signedMoney(value: number): string {
  const amount = Math.round(Math.abs(value)).toLocaleString("en-US");
  return `${value >= 0 ? "+" : "-"}$${amount}`;
}

export function generateUnderwritingSummary(args: SummaryArgs): UnderwritingSummary {
  const { input, results, buyBox, refinance, resilience, downside } = args;
  const rent = resolveRent(input);
  const stress = resilience.scenarios.find((s) => s.key === "stress");
  const expected = resilience.scenarios.find((s) => s.key === "expected");
  const paragraphs: string[] = [];

  const asking = typeof input.financing.askingPrice === "number" ? input.financing.askingPrice : 0;
  const listingMissesTargets = buyBox.status === "inside" && asking > 0 && downside.marginReady && downside.marginOfSafetyPercent < 0;
  if (listingMissesTargets) {
    paragraphs.push(
      "The property fits the active Buy Box characteristics, but the current listing price does not meet your return targets.",
    );
  } else if (buyBox.status === "inside") {
    paragraphs.push(`This property meets the active Buy Box criteria${buyBox.profileName ? ` (${buyBox.profileName})` : ""}.`);
  } else if (buyBox.status === "outside") {
    const fail = buyBox.reasons.find((r) => r.tone === "fail");
    paragraphs.push(
      `This property is outside the active Buy Box${buyBox.profileName ? ` (${buyBox.profileName})` : ""}${fail ? `: ${fail.message}` : "."}`,
    );
  } else {
    paragraphs.push("No Buy Box is active, so the deal was underwritten without a predefined filter.");
  }

  if (refinance.viable) {
    paragraphs.push("The refinance appears viable based on the projected ARV.");
  } else {
    paragraphs.push(`Refinance risk: ${refinance.detail}`);
  }

  const expectedCf = expected?.monthlyCashflow ?? results.monthlyCashflow;
  const stressCf = stress?.monthlyCashflow ?? results.monthlyCashflow;
  if (expectedCf >= 0 && stressCf >= 0) {
    paragraphs.push(
      `The deal remains cash-flow positive under the Resilience stress case (${signedMoney(stressCf)}/month).`,
    );
  } else if (expectedCf >= 0) {
    paragraphs.push(
      `The deal cashflows on expected assumptions (${signedMoney(expectedCf)}/month), but the Resilience stress case turns cash-flow negative (${signedMoney(stressCf)}/month).`,
    );
  } else {
    paragraphs.push(
      `The deal does not generate positive cashflow on the expected underwrite (${signedMoney(expectedCf)}/month).`,
    );
  }

  if (stress) {
    const stillProfit = stress.monthlyCashflow >= 0 && stress.roi >= 0;
    paragraphs.push(
      stillProfit
        ? "Even with Resilience stress (rent −10% and rehab +15%) the property remains profitable on that case."
        : "Resilience stress (rent −10% and rehab +15%) would erase profitability on that case.",
    );
  }

  paragraphs.push(downside.assessment);

  const worstRoi = downside.worstCase.roi;
  const worstRoiLabel = worstRoi === Infinity ? "∞" : `${worstRoi.toFixed(1)}%`;

  const bullets = [
    `Underwriting rent (${rent.source}): $${money(rent.active)}/month`,
    `Expected cashflow: ${expectedCf >= 0 ? "+" : ""}$${money(expectedCf)}/month`,
    `Leveraged first-year total return: ${(expected?.roi ?? results.roi).toFixed(1)}% (includes assumed appreciation; analysis cash-to-close basis)`,
    `Resilience stress-case DSCR: ${formatDscr(stress?.dscr ?? results.dscr)}`,
    `Refinance: ${refinance.viable ? "appears viable" : "at risk"}`,
    `Deal Survival Score: ${downside.score}/100 · ${downside.gradeLabel}`,
    `Primary Risk: ${downside.primaryRiskLabel}`,
    `Worst-case cashflow: ${signedMoney(downside.worstCase.monthlyCashflow)}/month`,
    `Worst-case DSCR: ${formatDscr(downside.worstCase.dscr)}`,
    `Bad-year total return: ${worstRoiLabel} (downside cash flow plus principal and configured appreciation)`,
    `Deal Survival Verdict: ${downside.survival.verdictLabel}`,
  ];

  return {
    headline: `${downside.gradeLabel} · Survival ${downside.score}/100`,
    paragraphs,
    bullets,
    resilienceScore: resilience.score,
    assessment: `${downside.gradeLabel} · ${downside.survival.verdictLabel}`,
    generatedAt: new Date().toISOString(),
    dealSurvivalScore: downside.score,
    primaryRisk: downside.primaryRiskLabel,
    worstCaseCashflow: downside.worstCase.monthlyCashflow,
    worstCaseDscr: downside.worstCase.dscr,
    worstCaseRoi: Number.isFinite(downside.worstCase.roi) ? downside.worstCase.roi : 0,
    dealSurvivalVerdict: downside.survival.verdictLabel,
  };
}
