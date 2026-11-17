import { describe, expect, it } from "vitest";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { matchBuyBox, subjectFromAnalysis } from "@/lib/calculations/buy-box";
import { calculateSharedScenarios } from "@/lib/calculations/deal-scenarios";
import { evaluateDealDecision } from "@/lib/calculations/deal-decision";
import { lakeviewAnalysis, lakeviewDraft, LAKEVIEW_TARGETS } from "@/lib/calculations/lakeview-deal";
import { analyzeOffer } from "@/lib/calculations/offer-analysis";
import { canonicalArv, toMaxOfferInputs } from "@/lib/calculations/offer-inputs";
import { calculateQuickUnderwrite } from "@/lib/calculations/quick-underwrite";
import { sizeSupportedRefinance, validateRefinance } from "@/lib/calculations/refinance";
import { resolveUnderwrittenPrice } from "@/lib/calculations/underwritten-price";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { analysisWorkflowToSharedDeal, maxOfferToSharedDeal, sharedDealToMaxOffer } from "@/lib/deal-draft/mappers";
import { createDefaultBuyBox } from "@/data/default-buy-box";

describe("Lakeview cross-workflow consistency", () => {
  it("resolves underwritten price from proposed offer when purchase is 0", () => {
    const input = lakeviewAnalysis();
    const resolved = resolveUnderwrittenPrice(input);
    expect(resolved.value).toBe(181_500);
    expect(resolved.source).toBe("proposed");
    expect(resolved.label).toBe("Proposed Offer");
  });

  it("uses the same OfferAnalysisResult across Quick Underwrite, Max Offer and underwriteDeal", () => {
    const input = lakeviewAnalysis();
    const offer = analyzeOffer(input, LAKEVIEW_TARGETS);
    const quick = calculateQuickUnderwrite(input, null, LAKEVIEW_TARGETS);
    const max = calculateMaxOffer(toMaxOfferInputs(input, LAKEVIEW_TARGETS));
    const pack = underwriteDeal(input, analyzeProperty(input), null, { targets: LAKEVIEW_TARGETS });

    expect(quick.offer?.provenance.engine).toBe(offer.provenance.engine);
    expect(quick.offer?.recommendedOffer).toBe(offer.recommendedOffer);
    expect(quick.offer?.maximumOffer).toBe(offer.maximumOffer);
    expect(quick.offer?.limitingConstraint).toBe(offer.limitingConstraint);
    expect(quick.offer?.marginOfSafety.percent).toBe(offer.marginOfSafety.percent);

    expect(max.recommendedOffer).toBe(offer.recommendedOffer);
    expect(max.maximumOffer).toBe(offer.maximumOffer);
    expect(max.limitingConstraint).toBe(offer.limitingConstraint);

    expect(pack.offer.recommendedOffer).toBe(offer.recommendedOffer);
    expect(pack.offer.maximumOffer).toBe(offer.maximumOffer);
    expect(pack.offer.limitingConstraint).toBe(offer.limitingConstraint);
    expect(pack.margin.percent).toBe(offer.marginOfSafety.percent);
    expect(pack.offer.usingDefaultTargets).toBe(false);
    expect(quick.usingDefaultTargets).toBe(false);
  });

  it("keeps expected, resilience stress and downside bad-year cashflows identical everywhere", () => {
    const input = lakeviewAnalysis();
    const scenarios = calculateSharedScenarios(input, { includeSensitivity: false, targets: LAKEVIEW_TARGETS });
    const quick = calculateQuickUnderwrite(input, null, LAKEVIEW_TARGETS);
    const pack = underwriteDeal(input, analyzeProperty(input), null, { targets: LAKEVIEW_TARGETS });

    expect(quick.downside?.expectedCashflow).toBeCloseTo(scenarios.expected.monthlyCashflow, 8);
    expect(quick.downside?.stressCashflow).toBeCloseTo(scenarios.stress.monthlyCashflow, 8);
    expect(quick.downside?.badYearCashflow).toBeCloseTo(scenarios.worst.monthlyCashflow, 8);
    expect(pack.resilience.scenarios.find((item) => item.key === "expected")?.monthlyCashflow).toBeCloseTo(
      scenarios.expected.monthlyCashflow,
      8,
    );
    expect(pack.resilience.scenarios.find((item) => item.key === "stress")?.monthlyCashflow).toBeCloseTo(
      scenarios.stress.monthlyCashflow,
      8,
    );
    expect(pack.downside.worstCase.monthlyCashflow).toBeCloseTo(scenarios.worst.monthlyCashflow, 8);
    expect(quick.downside?.expectedDscr).toBeCloseTo(scenarios.expected.dscr, 8);
    expect(quick.downside?.stressDscr).toBeCloseTo(scenarios.stress.dscr, 8);
    expect(quick.downside?.badYearDscr).toBeCloseTo(scenarios.worst.dscr, 8);
    expect(quick.downside?.expectedRoi).toBeCloseTo(scenarios.expected.roi, 8);
    expect(scenarios.expected.monthlyCashflow).not.toBeCloseTo(986, 0);
    expect(scenarios.stress.monthlyCashflow).not.toBeCloseTo(777, 0);
  });

  it("does not present deal-decision conservative NOI as the shared expected cashflow", () => {
    const input = lakeviewAnalysis();
    const scenarios = calculateSharedScenarios(input, { includeSensitivity: false, targets: LAKEVIEW_TARGETS });
    const decision = evaluateDealDecision(input);
    expect(scenarios.expected.monthlyCashflow).not.toBeCloseTo(decision.conservative.monthlyCashflow, 0);
    expect(scenarios.stress.monthlyCashflow).not.toBeCloseTo(decision.scenarios.stress.monthlyCashflow, 0);
  });

  it("uses supported refinance as the primary result and keeps full LTV as a secondary scenario", () => {
    const input = lakeviewAnalysis();
    const results = analyzeProperty(input);
    const sized = sizeSupportedRefinance({
      arv: 275_000,
      refinanceLtv: 75,
      interestRate: 7,
      termYears: 30,
      requiredDscr: 1.25,
      monthlyNoi: results.noi / 12,
    });
    const validation = validateRefinance(input, results);
    const pack = underwriteDeal(input, results, null, { targets: LAKEVIEW_TARGETS });
    const quick = calculateQuickUnderwrite(input, null, LAKEVIEW_TARGETS);
    const max = calculateMaxOffer(toMaxOfferInputs(input, LAKEVIEW_TARGETS));

    expect(sized.ltvBasedMaximumLoan).toBeCloseTo(206_250, 0);
    expect(validation.ltvBasedLoan).toBeCloseTo(206_250, 0);
    expect(validation.supportedRefinanceLoan).toBeCloseTo(sized.supportedRefinanceLoan, 0);
    expect(validation.loanAmount).toBeCloseTo(sized.supportedRefinanceLoan, 0);
    expect(validation.limitingFactor).toBe("dscr");
    expect(validation.supportedDscr ?? 0).toBeGreaterThanOrEqual(1.25 - 1e-6);
    expect(validation.fullLtvCompliant).toBe(false);
    expect(validation.fullLtvDscr).toBeLessThan(1.25);
    expect(validation.headline).toMatch(/DSCR Limited/i);
    expect(pack.refinance.supportedRefinanceLoan).toBeCloseTo(sized.supportedRefinanceLoan, 0);
    expect(pack.refinance.fullLtvLoan).toBeCloseTo(206_250, 0);
    expect(quick.refinance.supportedRefinanceLoan).toBeCloseTo(sized.supportedRefinanceLoan, 0);
    expect(max.brrrr.supportedRefinanceLoan).toBeCloseTo(sized.supportedRefinanceLoan, 0);
    expect(max.brrrr.ltvBasedLoan).toBeCloseTo(206_250, 0);
    expect(max.brrrr.fullLtvCompliant).toBe(false);
    expect(max.brrrr.refinanceAmount).toBeCloseTo(max.brrrr.supportedRefinanceLoan, 0);
  });

  it("recalculates offers and refinance when ARV changes on the shared draft", () => {
    let draft = lakeviewDraft();
    expect(canonicalArv(draft.input)).toBe(275_000);
    expect(sharedDealToMaxOffer(draft).property.arv).toBe(275_000);

    const nextInput = { ...draft.input, brrrr: { ...draft.input.brrrr, afterRepairValue: 300_000 } };
    draft = analysisWorkflowToSharedDeal(draft, nextInput, "quick-underwrite");
    expect(draft.input.brrrr.afterRepairValue).toBe(300_000);
    expect(draft.input.decision.advertisedArv).toBe(300_000);
    expect(sharedDealToMaxOffer(draft).property.arv).toBe(300_000);

    const before = analyzeOffer(lakeviewAnalysis(), LAKEVIEW_TARGETS);
    const after = analyzeOffer(draft.input, LAKEVIEW_TARGETS);
    expect(after.maxOffer.brrrr.ltvBasedLoan).toBeCloseTo(225_000, 0);
    expect(after.maxOffer.brrrr.ltvBasedLoan).not.toBe(before.maxOffer.brrrr.ltvBasedLoan);
    expect(validateRefinance(draft.input, analyzeProperty(draft.input)).ltvBasedLoan).toBeCloseTo(225_000, 0);

    const maxInput = sharedDealToMaxOffer(draft);
    maxInput.property.arv = 310_000;
    draft = maxOfferToSharedDeal(draft, maxInput);
    expect(draft.input.brrrr.afterRepairValue).toBe(310_000);
    expect(canonicalArv(draft.input)).toBe(310_000);
    expect(sharedDealToMaxOffer(draft).property.arv).toBe(310_000);
  });

  it("propagates Max Offer target edits into reconstructed Maximum Offer", () => {
    const draft = lakeviewDraft();
    const maxInput = sharedDealToMaxOffer(draft);
    maxInput.targets.desiredCashOnCash = 14;
    const next = maxOfferToSharedDeal(draft, maxInput);
    expect(next.targets.desiredCashOnCash).toBe(14);
    const original = analyzeOffer(draft.input, draft.targets);
    const updated = analyzeOffer(next.input, next.targets);
    expect(updated.maximumOffer).not.toBe(original.maximumOffer);
    expect(updated.provenance.targetSet.desiredCashOnCash).toBe(14);
  });

  it("Buy Box labels the price field it actually evaluates", () => {
    const input = lakeviewAnalysis();
    const box = createDefaultBuyBox();
    box.maxPurchasePrice = 250_000;
    const match = matchBuyBox(box, subjectFromAnalysis(input));
    const price = match.reasons.find((reason) => reason.key === "price");
    expect(price?.message).toMatch(/Asking price is within the Buy Box ceiling/i);
    expect(price?.message).not.toMatch(/Purchase price/i);
  });
});
