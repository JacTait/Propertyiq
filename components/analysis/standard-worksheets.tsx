"use client";

import type { AnalysisInput, AnalysisResults, UnderwritingPack } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { FinancialSection, SectionDivider } from "@/components/underwriting/financial-section";

export function StandardUnderwritingWorksheets({
  input,
  results,
  underwriting,
}: {
  input: AnalysisInput;
  results: AnalysisResults;
  underwriting?: UnderwritingPack | null;
}) {
  const fmt = useFormatters();
  const rent = underwriting?.rent;
  const refi = underwriting?.refinance;
  const expenses = results.expenseBreakdown;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <FinancialSection eyebrow="Stage 1" title="Buy">
        <FinancialDataRow label="Asking Price" value={input.financing.askingPrice > 0 ? fmt.currency(input.financing.askingPrice) : "—"} />
        <FinancialDataRow label="Proposed Offer" value={input.financing.proposedOffer > 0 ? fmt.currency(input.financing.proposedOffer) : "—"} />
        <FinancialDataRow label="Purchase Price" value={fmt.currency(input.financing.purchasePrice)} />
        <FinancialDataRow label="Rehab" value={fmt.currency(input.brrrr.rehabCost)} />
        <FinancialDataRow label="Closing Costs" value={fmt.currency(input.financing.closingCosts)} />
        <SectionDivider />
        <FinancialDataRow label="Cash To Close" value={fmt.currency(results.cashToClose)} emphasis />
        <FinancialDataRow label="Total Cash Invested" value={fmt.currency(results.totalCashInvested)} />
      </FinancialSection>
      <FinancialSection eyebrow="Stage 2" title="Operate">
        <FinancialDataRow label="Listing Rent" value={rent ? fmt.currency(rent.listing) : fmt.currency(input.income.monthlyRent)} />
        <FinancialDataRow
          label="Verified Local Rent"
          value={rent ? fmt.currency(rent.verified) : fmt.currency(input.income.verifiedRent)}
          tone="primary"
        />
        <FinancialDataRow
          label="Conservative Rent"
          value={rent ? fmt.currency(rent.conservative) : fmt.currency(input.income.conservativeRent)}
        />
        <SectionDivider />
        <FinancialDataRow label="Active Rent" value={fmt.currency(results.monthlyIncome)} emphasis />
        {expenses.slice(0, 6).map((item) => (
          <FinancialDataRow key={item.key} label={item.label} value={fmt.currency(item.monthly)} />
        ))}
        <SectionDivider />
        <FinancialDataRow label="NOI" value={fmt.currency(results.noi)} detail="annual" emphasis />
        <FinancialDataRow
          label="Cashflow"
          value={fmt.signedCurrency(results.monthlyCashflow)}
          emphasis
          tone={results.monthlyCashflow >= 0 ? "success" : "danger"}
        />
      </FinancialSection>
      <FinancialSection eyebrow="Stage 3" title="Refinance">
        {refi ? (
          <>
            <FinancialDataRow label="ARV" value={fmt.currency(refi.arv)} />
            <FinancialDataRow label="Refinance LTV" value={fmt.percent(refi.refinanceLtv, 0)} />
            <FinancialDataRow label="Supported Loan" value={fmt.currency(refi.maximumRefinanceAmount)} emphasis />
            <FinancialDataRow label="Payment" value={fmt.currency(refi.monthlyPayment)} />
            <FinancialDataRow label="Post-Refi DSCR" value={fmt.ratio(refi.postRefiDscr)} />
            <FinancialDataRow label="Cash Recovered" value={fmt.currency(refi.cashPulledOut)} />
            <FinancialDataRow label="Cash Left In Deal" value={fmt.currency(refi.cashLeftInDeal)} />
            <FinancialDataRow label="Status" value={refi.headline} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Refinance figures appear after ARV and refinance terms are entered.</p>
        )}
      </FinancialSection>
    </div>
  );
}
