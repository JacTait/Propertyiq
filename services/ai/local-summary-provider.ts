import type { InvestmentSummary, SummarySection } from "@/lib/types";
import { conditionLabel, propertyTypeLabel, strategyLabel } from "@/lib/utils/labels";
import type { InvestmentSummaryProvider, SummaryContext } from "@/services/ai/types";

type Tone = SummarySection["tone"];

function toneFor(value: number, good: number, ok: number): Tone {
  if (value >= good) return "positive";
  if (value >= ok) return "neutral";
  return "negative";
}

export function buildLocalSummary(ctx: SummaryContext): InvestmentSummary {
  const { input, results, regionName, formatCurrency: fc, formatPercent: fp } = ctx;
  const { property, financing, location, strategy } = input;
  const r = results;
  const market = location.market;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  /* ---------------- Property Overview ---------------- */
  const age = new Date().getFullYear() - property.yearBuilt;
  const overview: SummarySection = {
    key: "overview",
    title: "Property Overview",
    tone: "neutral",
    paragraphs: [
      `${property.name} is a ${property.bedrooms}-bed, ${property.bathrooms}-bath ${propertyTypeLabel(
        property.propertyType,
      ).toLowerCase()} of approximately ${property.squareFootage.toLocaleString()} sq ft located in ${regionName}. Built in ${
        property.yearBuilt
      } (${age} years old) and rated in ${conditionLabel(property.condition).toLowerCase()} condition, the asset is being evaluated under a ${strategyLabel(
        strategy,
      )} strategy at a purchase price of ${fc(financing.purchasePrice)}.`,
      `The acquisition is structured with a ${fp(financing.depositPercent, 0)} deposit (${fc(
        r.mortgage.depositAmount,
      )}) and a ${fc(r.mortgage.loanAmount)} mortgage at ${fp(financing.interestRate, 2)} over ${
        financing.termYears
      } years, producing a monthly payment of ${fc(r.mortgage.monthlyPayment)}. Total cash required to close is ${fc(
        r.cashToClose,
      )}.`,
    ],
  };

  /* ---------------- Financial Performance ---------------- */
  const perfTone = toneFor(r.capRate, 7, 5);
  const performance: SummarySection = {
    key: "performance",
    title: "Financial Performance",
    tone: perfTone,
    paragraphs: [
      `Gross scheduled income is ${fc(r.annualIncome)} per year${
        r.vacancyLoss > 0 ? ` with ${fc(r.vacancyLoss)} allowed for vacancy` : ""
      }. After ${fc(r.operatingExpensesAnnual)} of operating expenses, net operating income lands at ${fc(
        r.noi,
      )}, equating to a cap rate of ${fp(r.capRate)} and a net yield of ${fp(r.netYield)}.`,
      perfTone === "positive"
        ? "Operating margins are healthy relative to the purchase price, indicating the asset is priced attractively against its income."
        : perfTone === "neutral"
          ? "Operating returns are in line with market norms; there is limited pricing cushion if expenses rise."
          : "Operating returns are compressed. The price appears full relative to the income the asset can generate.",
    ],
  };
  if (r.capRate >= 7) strengths.push(`Strong ${fp(r.capRate)} cap rate`);
  if (r.capRate < 5) weaknesses.push(`Compressed ${fp(r.capRate)} cap rate`);

  /* ---------------- Cashflow Assessment ---------------- */
  const cfTone: Tone = r.monthlyCashflow >= 300 ? "positive" : r.monthlyCashflow >= 0 ? "neutral" : "negative";
  const cashflow: SummarySection = {
    key: "cashflow",
    title: "Cashflow Assessment",
    tone: cfTone,
    paragraphs: [
      `Annual debt service of ${fc(r.annualDebtService)} leaves ${fc(r.annualCashflow)} of annual cashflow, or ${fc(
        r.monthlyCashflow,
      )} per month. The debt service coverage ratio is ${
        r.dscr >= 99 ? "not applicable (no debt)" : `${r.dscr.toFixed(2)}x`
      }, and the property breaks even at ${fp(r.breakEvenOccupancy, 0)} occupancy.`,
      cfTone === "positive"
        ? "Cashflow is comfortably positive with a meaningful buffer against vacancy, rate increases or unexpected repairs."
        : cfTone === "neutral"
          ? "Cashflow is marginally positive. A modest expense shock or extended vacancy could push the property into a monthly deficit."
          : "The property is cashflow negative at current assumptions. Holding it will require ongoing capital contributions from the investor.",
    ],
  };
  if (r.monthlyCashflow >= 300) strengths.push(`Positive cashflow of ${fc(r.monthlyCashflow)}/month`);
  if (r.monthlyCashflow < 0) weaknesses.push(`Negative monthly cashflow of ${fc(r.monthlyCashflow)}`);
  if (r.dscr >= 1.25 && r.dscr < 99) strengths.push(`Lender-friendly DSCR of ${r.dscr.toFixed(2)}x`);
  if (r.dscr < 1) weaknesses.push(`DSCR below 1.0x (${r.dscr.toFixed(2)}x)`);

  /* ---------------- ROI Assessment ---------------- */
  const roiParagraphs: string[] = [];
  let roiTone: Tone = toneFor(r.cashOnCash, 8, 4);
  if (r.fixFlip) {
    const f = r.fixFlip;
    roiTone = toneFor(f.roi, 20, 10);
    roiParagraphs.push(
      `The flip requires ${fc(f.totalInvestment)} of total investment (${fc(
        f.cashInvested,
      )} in cash) and targets a sale at ${fc(input.flip.expectedSalePrice)}. After ${fc(
        f.sellingCosts,
      )} in selling costs, projected profit is ${fc(f.profit)} — a ${fp(f.profitMargin)} margin and ${fp(
        f.roi,
      )} return on cash, or ${fp(f.annualisedRoi)} annualised over ${f.holdDurationMonths} months.`,
      `Break-even sale price is ${fc(f.breakEvenSalePrice)}, giving a ${fp(
        ((input.flip.expectedSalePrice - f.breakEvenSalePrice) / Math.max(1, input.flip.expectedSalePrice)) * 100,
      )} pricing cushion against the target.`,
    );
    if (f.profitMargin >= 15) strengths.push(`Healthy ${fp(f.profitMargin)} flip margin`);
    if (f.profit < 0) weaknesses.push("Projected flip loss at current sale price");
  } else if (r.brrrr) {
    const b = r.brrrr;
    roiTone = b.infiniteReturn ? "positive" : toneFor(b.roi, 12, 6);
    roiParagraphs.push(
      `The BRRRR plan puts ${fc(b.totalProjectCost)} into the project with ${fc(
        b.initialCashInvested,
      )} of investor cash. Refinancing at ${fp(input.brrrr.refinanceLtv, 0)} LTV on a ${fc(
        input.brrrr.afterRepairValue,
      )} after-repair value releases ${fc(b.refinanceAmount)}, pulling ${fc(b.cashPulledOut)} back out and leaving ${fc(
        b.cashLeftInDeal,
      )} in the deal.`,
      b.infiniteReturn
        ? "All invested capital is recovered on refinance while the property continues to cashflow — an infinite return on remaining equity."
        : `Post-refinance cashflow of ${fc(b.monthlyCashflow)} per month yields ${fp(
            b.roi,
          )} on the cash left in the deal. BRRRR efficiency scores ${b.efficiencyScore}/100.`,
    );
    if (b.efficiencyScore >= 70) strengths.push(`Efficient capital recycling (${b.efficiencyScore}/100)`);
    if (b.monthlyCashflow < 0) weaknesses.push("Negative cashflow after refinance");
  } else {
    roiParagraphs.push(
      `Against ${fc(r.totalCashInvested)} of total cash invested, first-year cash-on-cash return is ${fp(
        r.cashOnCash,
      )}. Including principal paydown and appreciation, total first-year ROI is ${fp(r.roi)}.`,
      `Over five years the position is projected to return ${fc(r.fiveYear.totalReturn)} (${fp(
        r.fiveYear.roi,
      )} cumulative, ${fp(r.fiveYear.annualisedRoi)} annualised), rising to ${fc(r.tenYear.totalReturn)} (${fp(
        r.tenYear.roi,
      )}) by year ten.`,
    );
    if (r.cashOnCash >= 8) strengths.push(`${fp(r.cashOnCash)} cash-on-cash return`);
    if (r.cashOnCash < 4) weaknesses.push(`Low ${fp(r.cashOnCash)} cash-on-cash return`);
  }
  const roi: SummarySection = { key: "roi", title: "ROI Assessment", tone: roiTone, paragraphs: roiParagraphs };

  /* ---------------- Risk Assessment ---------------- */
  const risks: string[] = [];
  if (r.dscr < 1.2 && r.dscr < 99) risks.push("tight debt coverage");
  if (r.breakEvenOccupancy > 85) risks.push(`a high ${fp(r.breakEvenOccupancy, 0)} break-even occupancy`);
  if (financing.depositPercent < 20) risks.push("high leverage");
  if (property.condition === "needs-repair" || property.condition === "full-renovation")
    risks.push("renovation and cost-overrun exposure");
  if (age > 50) risks.push("an ageing building envelope and systems");
  if (strategy === "short-term-rental") risks.push("regulatory and seasonality exposure typical of short-term rentals");
  if (market.populationGrowth < 0) risks.push("a shrinking regional population");
  const riskTone: Tone = risks.length === 0 ? "positive" : risks.length <= 2 ? "neutral" : "negative";
  const risk: SummarySection = {
    key: "risk",
    title: "Risk Assessment",
    tone: riskTone,
    paragraphs: [
      risks.length === 0
        ? "No material risk flags were triggered. Leverage, coverage, condition and market trend all sit within comfortable ranges."
        : `Key risk factors include ${risks.join(", ")}. ${
            risks.length > 2
              ? "Taken together these warrant a larger contingency reserve and conservative underwriting."
              : "These are manageable with a sensible contingency reserve."
          }`,
    ],
    bullets: risks.map((x) => x.charAt(0).toUpperCase() + x.slice(1)),
  };

  /* ---------------- Market Outlook ---------------- */
  const marketTone = toneFor(market.appreciationRate, 4.5, 3);
  const marketSection: SummarySection = {
    key: "market",
    title: "Market Outlook",
    tone: marketTone,
    paragraphs: [
      `${regionName} shows an expected appreciation rate of ${fp(market.appreciationRate)} per year, a typical rental yield of ${fp(
        market.rentalYield,
      )} and population growth of ${fp(market.populationGrowth)}. Median property values sit at ${fc(
        market.medianPropertyValue,
      )}, placing this purchase ${
        financing.purchasePrice > market.medianPropertyValue * 1.1
          ? "above"
          : financing.purchasePrice < market.medianPropertyValue * 0.9
            ? "below"
            : "in line with"
      } the regional median.`,
      `Property tax runs at ${fp(market.propertyTaxRate, 2)} of value with insurance estimated at ${fc(
        market.insuranceAnnual,
      )} annually — ${market.propertyTaxRate > 1.5 ? "a relatively heavy" : "a moderate"} carrying cost burden.`,
    ],
  };
  if (market.appreciationRate >= 4.5) strengths.push(`Strong regional appreciation (${fp(market.appreciationRate)})`);
  if (market.populationGrowth >= 1) strengths.push("Growing regional population");
  if (market.propertyTaxRate > 1.8) weaknesses.push(`High property tax burden (${fp(market.propertyTaxRate, 2)})`);

  /* ---------------- Long-Term Outlook ---------------- */
  const longTerm: SummarySection = {
    key: "long-term",
    title: "Long-Term Outlook",
    tone: toneFor(r.tenYear.annualisedRoi, 10, 5),
    paragraphs: [
      `By year five the property is projected to be worth ${fc(r.fiveYear.propertyValue)} with ${fc(
        r.fiveYear.equity,
      )} of equity. By year ten, value reaches ${fc(r.tenYear.propertyValue)} and equity ${fc(
        r.tenYear.equity,
      )}, with cumulative cashflow of ${fc(r.tenYear.cumulativeCashflow)}.`,
      `Total ten-year return is estimated at ${fc(r.tenYear.totalReturn)} — ${fp(
        r.tenYear.annualisedRoi,
      )} annualised on invested capital. Mortgage paydown contributes ${fc(
        r.mortgage.loanAmount - (r.projections[9]?.loanBalance ?? 0),
      )} of that equity build.`,
    ],
  };

  /* ---------------- Final Recommendation ---------------- */
  const rec = r.dealScore.recommendation;
  const final: SummarySection = {
    key: "final",
    title: "Final Recommendation",
    tone: rec === "Elite Opportunity" || rec === "Strong Buy" || rec === "Buy" ? "positive" : rec === "Neutral" ? "neutral" : "negative",
    paragraphs: [
      `PropertyIQ scores this deal ${r.dealScore.score}/100 (${r.dealScore.gradeLabel}). ${r.dealScore.headline}`,
      recommendationNarrative(rec, strengths.length, weaknesses.length),
    ],
  };

  if (strengths.length === 0) strengths.push("Straightforward structure with no exotic assumptions");
  if (weaknesses.length === 0) weaknesses.push("Returns remain sensitive to interest-rate movements");

  return {
    headline: `${r.dealScore.recommendation}: ${property.name}`,
    recommendation: rec,
    sections: [overview, performance, cashflow, roi, risk, marketSection, longTerm, final],
    strengths,
    weaknesses,
    generatedAt: new Date().toISOString(),
  };
}

function recommendationNarrative(rec: InvestmentSummary["recommendation"], s: number, w: number): string {
  switch (rec) {
    case "Elite Opportunity":
      return "This is a rare combination of yield, coverage and growth. We recommend moving decisively while protecting against execution risk.";
    case "Strong Buy":
      return `With ${s} identified strengths against ${w} weaknesses, the deal offers an attractive risk-adjusted return. Proceed to due diligence.`;
    case "Buy":
      return "Fundamentals support acquisition at or slightly below the asking price. Negotiate on inspection findings to improve the margin of safety.";
    case "Neutral":
      return "The property is neither compelling nor poor. It may suit investors prioritising appreciation over income, but a price reduction would materially improve the case.";
    case "High Risk":
      return "Returns rely on favourable assumptions holding. Only proceed if you have a specific edge — below-market rent upside, value-add potential or a significant discount.";
    case "Avoid":
      return "At the current price and assumptions the deal does not meet investment thresholds. We recommend passing or re-underwriting at a substantially lower entry price.";
  }
}

export class LocalSummaryProvider implements InvestmentSummaryProvider {
  readonly id = "local-rules";
  readonly label = "PropertyIQ Analyst (local)";

  async generate(context: SummaryContext): Promise<InvestmentSummary> {
    return buildLocalSummary(context);
  }
}
