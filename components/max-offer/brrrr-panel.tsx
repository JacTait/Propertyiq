"use client";

import { FormProvider, type UseFormReturn } from "react-hook-form";
import { Repeat } from "lucide-react";
import type { MaxOfferFormValues } from "@/lib/utils/schema";
import type { MaxOfferResults } from "@/lib/types";
import { FieldGrid, SectionTitle } from "@/components/forms/fields";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatRow } from "@/components/dashboard/stat-row";
import { MaxNumberField } from "@/components/max-offer/form-fields";

export function BrrrrPanel({ form, results }: { form: UseFormReturn<MaxOfferFormValues>; results: MaxOfferResults }) {
  const fmt = useFormatters();
  const b = results.brrrr;

  return (
    <FormProvider {...form}>
      <Card>
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Repeat className="size-4" />
          </span>
          <div>
            <CardTitle>BRRRR Mode</CardTitle>
            <CardDescription>
              Primary figures use the supported refinance loan. Full-LTV is shown separately when it fails DSCR.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <SectionTitle title="Refinance assumptions" />
          <FieldGrid>
            <MaxNumberField name="brrrr.refinanceLtv" label="Refinance LTV" suffix="%" />
            <MaxNumberField name="brrrr.refinanceRate" label="Refinance Rate" suffix="%" />
          </FieldGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supported Refinance</p>
              <StatRow label="Total Project Cost" value={fmt.currency(b.totalProjectCost)} />
              <StatRow label="Investor Cash Invested" value={fmt.currency(b.initialCashInvested)} />
              <StatRow label="LTV-Based Loan" value={fmt.currency(b.ltvBasedLoan)} />
              <StatRow
                label="DSCR-Supported Loan"
                value={b.dscrSupportedLoan == null ? "—" : fmt.currency(b.dscrSupportedLoan)}
              />
              <StatRow label="Supported Refinance Loan" value={fmt.currency(b.supportedRefinanceLoan)} emphasis />
              <StatRow label="Limiting Factor" value={b.limitingLabel} />
              <StatRow label="Supported Payment" value={`${fmt.currency(b.supportedPayment)}/mo`} />
              <StatRow label="Supported DSCR" value={b.supportedDscr == null ? "—" : fmt.ratio(b.supportedDscr)} />
              <StatRow label="Net Supported Refinance Proceeds" value={fmt.currency(b.netSupportedRefinanceProceeds)} />
              <StatRow label="Cash Recovered" value={fmt.currency(b.cashPulledOut)} />
              <StatRow label="Cash Left In Deal" value={fmt.currency(b.cashLeftInDeal)} />
              <StatRow label="Excess Cash Out" value={fmt.currency(b.excessCashOut)} />
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">BRRRR Efficiency Score</p>
                <p className="mt-1 text-3xl font-black tabular">{b.efficiencyScore}/100</p>
                <Progress value={b.efficiencyScore} className="mt-3" />
              </div>
              <StatRow
                label="Cash Recovery Percentage"
                value={b.infiniteReturn ? "100%+" : fmt.percent(b.cashRecoveryPercent)}
              />
              <StatRow label="Post-Refinance Cashflow" value={`${fmt.signedCurrency(b.monthlyCashflow)}/mo`} />
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full-LTV Scenario</p>
            <StatRow
              label={b.fullLtvCompliant ? "Full-LTV Loan" : "LTV Ceiling — Not DSCR Compliant"}
              value={fmt.currency(b.fullLtvLoan)}
            />
            <StatRow label="Full-LTV Payment" value={`${fmt.currency(b.fullLtvPayment)}/mo`} />
            <StatRow label="Full-LTV DSCR" value={fmt.ratio(b.fullLtvDscr)} />
            <StatRow label="Full-LTV Cashflow" value={`${fmt.signedCurrency(b.fullLtvMonthlyCashflow)}/mo`} />
            <p className="mt-2 text-sm text-muted-foreground">
              {b.fullLtvCompliant ? "Full-LTV Scenario — DSCR Compliant" : "Full-LTV Scenario — Not DSCR Compliant"}
            </p>
          </div>
        </CardContent>
      </Card>
    </FormProvider>
  );
}
