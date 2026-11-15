"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatRow } from "@/components/dashboard/stat-row";
import { useFormatters } from "@/hooks/useSettings";
import type { AnalysisInput, QuickUnderwriteResults } from "@/lib/types";

export function AcquisitionRefinanceComparison({
  input,
  results,
}: {
  input: AnalysisInput;
  results: QuickUnderwriteResults;
}) {
  const fmt = useFormatters();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acquisition versus refinance</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acquisition</p>
          <StatRow label="Asking Price" value={fmt.currency(input.financing.askingPrice)} />
          <StatRow label="Proposed Offer" value={fmt.currency(input.financing.proposedOffer)} />
          <StatRow label="Purchase Price" value={fmt.currency(input.financing.purchasePrice)} />
          <StatRow label="Rehab" value={fmt.currency(results.allIn.estimatedRehab)} />
          <StatRow
            label="All-In Cost"
            value={results.allIn.total === null ? "—" : fmt.currency(results.allIn.total)}
            emphasis
          />
          <StatRow label={results.rent.basisLabel} value={`${fmt.currency(results.rent.active)}/mo`} />
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">Refinance</p>
          <StatRow label="ARV" value={fmt.currency(results.refinance.arv)} />
          <StatRow label="Refinance LTV" value={fmt.percent(results.refinance.refinanceLtv, 0)} />
          <StatRow label="Supported Loan" value={fmt.currency(results.refinance.supportedRefinanceLoan)} emphasis />
          <StatRow label="Payment" value={`${fmt.currency(results.refinance.monthlyPayment)}/mo`} />
          <StatRow label="DSCR" value={results.refinance.postRefiDscrLabel} emphasis />
          <StatRow label="Cash Recovered" value={fmt.currency(results.cashRecovery?.cashRecovered ?? 0)} />
          <StatRow label="Cash Left In Deal" value={fmt.currency(results.cashRecovery?.cashLeftInDeal ?? 0)} />
        </div>
      </CardContent>
    </Card>
  );
}
