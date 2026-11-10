import type {
  AnalysisInput,
  AnalysisResults,
  BuyBoxMatch,
  DealResilienceResults,
  RefinanceValidation,
  UnderwritingSummary,
} from "@/lib/types";
import { resolveRent } from "@/lib/calculations/rent";

interface SummaryArgs {
  input: AnalysisInput;
  results: AnalysisResults;
  buyBox: BuyBoxMatch;
  refinance: RefinanceValidation;
  resilience: DealResilienceResults;
}

function money(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function generateUnderwritingSummary(args: SummaryArgs): UnderwritingSummary {
  const { input, results, buyBox, refinance, resilience } = args;
  const rent = resolveRent(input);
  const stress = resilience.scenarios.find((s) => s.key === "stress");
  const expected = resilience.scenarios.find((s) => s.key === "expected");
  const paragraphs: string[] = [];

  if (buyBox.status === "inside") {
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
    paragraphs.push("The deal generates positive cashflow under both expected and stress-case assumptions.");
  } else if (expectedCf >= 0) {
    paragraphs.push("The deal cashflows on expected assumptions, but the stress case turns cashflow negative.");
  } else {
    paragraphs.push("The deal does not generate positive cashflow on the expected underwrite.");
  }

  if (stress) {
    const stillProfit = stress.monthlyCashflow >= 0 && stress.roi >= 0;
    paragraphs.push(
      stillProfit
        ? "Even with a 10% reduction in rent and a 15% increase in rehab costs the property remains profitable."
        : "A 10% reduction in rent and a 15% increase in rehab costs would erase profitability.",
    );
  }

  const bullets = [
    `Underwriting rent (${rent.source}): $${money(rent.active)}/month`,
    `Expected cashflow: ${expectedCf >= 0 ? "+" : ""}$${money(expectedCf)}/month`,
    `Expected ROI: ${(expected?.roi ?? results.roi).toFixed(1)}%`,
    `Stress-case DSCR: ${(stress?.dscr ?? results.dscr).toFixed(2)}x`,
    `Refinance: ${refinance.viable ? "appears viable" : "at risk"}`,
  ];

  return {
    headline: `${resilience.gradeLabel} deal · ${resilience.score}/100 resilience`,
    paragraphs,
    bullets,
    resilienceScore: resilience.score,
    assessment: `${resilience.gradeLabel} Deal`,
    generatedAt: new Date().toISOString(),
  };
}
