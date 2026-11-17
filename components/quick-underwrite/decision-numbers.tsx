"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatRow } from "@/components/dashboard/stat-row";
import { useFormatters } from "@/hooks/useSettings";
import type { AnalysisInput, QuickUnderwriteResults } from "@/lib/types";

export function DecisionNumbers({ input, results }: { input: AnalysisInput; results: QuickUnderwriteResults }) {
  const fmt = useFormatters();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Acquisition</CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Asking Price" value={fmt.currency(input.financing.askingPrice)} />
          <StatRow label="Proposed Offer" value={fmt.currency(input.financing.proposedOffer)} />
          <StatRow
            label="Underwritten Price"
            value={results.underwrittenPrice ? fmt.currency(results.underwrittenPrice) : "—"}
            detail={results.underwrittenPriceSource ? `Based on ${results.acquisitionPrice.label}` : "No price entered yet."}
          />
          <StatRow label="Rehab Cost" value={fmt.currency(results.allIn.estimatedRehab)} />
          <StatRow label="Adjusted Rehab Budget" value={fmt.currency(results.allIn.adjustedRehabBudget)} />
          <StatRow label="All-In Cost" value={results.allIn.total === null ? "—" : fmt.currency(results.allIn.total)} emphasis />
          <StatRow label="ARV" value={fmt.currency(results.refinance.arv)} />
          <StatRow label="Active Rent" value={`${fmt.currency(results.rent.active)}/mo`} />
          <StatRow label="Taxes" value={`${fmt.currency(results.operating.monthlyPropertyTax)}/mo`} />
          <StatRow label="Insurance" value={`${fmt.currency(results.operating.monthlyInsurance)}/mo`} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Refinance</CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow label="Refinance LTV" value={fmt.percent(results.refinance.refinanceLtv, 0)} />
          <StatRow label="LTV-Based Maximum Loan" value={fmt.currency(results.refinance.ltvBasedMaximumLoan)} />
          <StatRow
            label="DSCR-Supported Maximum Loan"
            value={
              results.refinance.dscrSupportedMaximumLoan === null
                ? "Not applicable"
                : fmt.currency(results.refinance.dscrSupportedMaximumLoan)
            }
          />
          <StatRow label="Supported Refinance Loan" value={fmt.currency(results.refinance.supportedRefinanceLoan)} emphasis />
          <StatRow label="Refinance Payment" value={`${fmt.currency(results.refinance.monthlyPayment)}/mo`} />
          <StatRow label="Post-Refinance DSCR" value={results.refinance.postRefiDscrLabel} emphasis />
          <StatRow
            label="Total Project Cost"
            value={results.cashRecovery ? fmt.currency(results.cashRecovery.totalProjectCost) : "—"}
          />
          <StatRow
            label="Investor Cash Invested"
            value={results.cashRecovery ? fmt.currency(results.cashRecovery.investorCashInvested) : "—"}
          />
          <StatRow label="Cash Recovered" value={fmt.currency(results.cashRecovery?.cashRecovered ?? 0)} />
          <StatRow label="Cash Left In Deal" value={fmt.currency(results.cashRecovery?.cashLeftInDeal ?? 0)} />
          <StatRow
            label="Cash Recovery Percentage"
            value={results.cashRecovery?.cashRecoveryPercent == null ? "—" : fmt.percent(results.cashRecovery.cashRecoveryPercent)}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <StatRow
            label="Monthly Cashflow"
            value={results.monthlyCashflow === null ? "—" : `${fmt.signedCurrency(results.monthlyCashflow)}/mo`}
            emphasis
          />
          <StatRow label={`Cap Rate (${results.capRateBasisLabel})`} value={results.capRate === null ? "—" : fmt.percent(results.capRate)} />
          <StatRow label="Cash-on-Cash Return" value={results.cashOnCash === null ? "—" : fmt.percent(results.cashOnCash)} />
          <StatRow
            label="Margin of Safety"
            value={results.marginOfSafetyPercent === null ? "—" : fmt.percent(results.marginOfSafetyPercent)}
          />
          <StatRow
            label="Resilience Stress Cashflow"
            value={results.downside ? `${fmt.signedCurrency(results.downside.stressCashflow)}/mo` : "—"}
          />
          <StatRow
            label="Downside Bad-Year Cashflow"
            value={results.downside ? `${fmt.signedCurrency(results.downside.badYearCashflow)}/mo` : "—"}
          />
          <StatRow
            label="Downside Bad-Year DSCR"
            value={results.downside ? results.downside.badYearDscr === Infinity ? "Not applicable" : `${results.downside.badYearDscr.toFixed(2)}x` : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
