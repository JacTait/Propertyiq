"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatRow } from "@/components/dashboard/stat-row";
import { Badge } from "@/components/ui/badge";
import { useFormatters } from "@/hooks/useSettings";
import type { QuickUnderwriteResults } from "@/lib/types";

export function CashRecoveryCard({ results }: { results: QuickUnderwriteResults }) {
  const fmt = useFormatters();
  const recovery = results.cashRecovery;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Cash recovery</CardTitle>
          <CardDescription>Gross loan, net proceeds, cash recovered and cash left in are separate figures.</CardDescription>
        </div>
        <Badge variant={results.refinance.limitingFactor === "dscr" ? "warning" : "primary"}>
          {results.refinance.limitingLabel}
        </Badge>
      </CardHeader>
      <CardContent>
        <StatRow label="LTV-based maximum loan" value={fmt.currency(results.refinance.ltvBasedMaximumLoan)} />
        <StatRow
          label="DSCR-supported maximum loan"
          value={
            results.refinance.dscrSupportedMaximumLoan === null
              ? "Not applicable"
              : fmt.currency(results.refinance.dscrSupportedMaximumLoan)
          }
        />
        <StatRow label="Supported refinance loan" value={fmt.currency(results.refinance.supportedRefinanceLoan)} emphasis />
        <StatRow label="Refinance payment" value={`${fmt.currency(results.refinance.monthlyPayment)}/mo`} />
        <StatRow label="Post-refinance DSCR" value={results.refinance.postRefiDscrLabel} emphasis />
        <StatRow
          label={results.refinance.loanPayoffDerived ? "Loan payoff (derived)" : "Loan payoff (entered)"}
          value={fmt.currency(results.refinance.loanPayoffAmount)}
        />
        {recovery ? (
          <>
            <StatRow label="Gross refinance loan" value={fmt.currency(recovery.grossRefinanceProceeds)} />
            <StatRow label="Net refinance proceeds" value={fmt.currency(recovery.netRefinanceProceeds)} />
            <StatRow label="Cash recovered" value={fmt.currency(recovery.cashRecovered)} emphasis />
            <StatRow label="Excess cash out" value={fmt.currency(recovery.excessCashOut)} />
            <StatRow label="Cash left in deal" value={fmt.currency(recovery.cashLeftInDeal)} emphasis />
            <StatRow
              label="Cash recovery %"
              value={recovery.cashRecoveryPercent === null ? "—" : fmt.percent(recovery.cashRecoveryPercent)}
            />
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{results.allIn.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
