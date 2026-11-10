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
              Refinance the recommended offer against ARV. Rehab, rent and ARV come from the property inputs above.
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
              <StatRow label="Maximum Refinance Amount" value={fmt.currency(b.refinanceAmount)} />
              <StatRow label="Cash Pulled Out" value={fmt.currency(b.cashPulledOut)} />
              <StatRow label="Cash Remaining In Deal" value={fmt.currency(b.cashLeftInDeal)} />
              <StatRow label="Initial Cash Invested" value={fmt.currency(b.initialCashInvested)} />
              <StatRow label="Total Project Cost" value={fmt.currency(b.totalProjectCost)} />
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">BRRRR Efficiency Score</p>
                <p className="mt-1 text-3xl font-black tabular">{b.efficiencyScore}/100</p>
                <Progress value={b.efficiencyScore} className="mt-3" />
              </div>
              <StatRow
                label="Cash Recovery"
                value={b.infiniteReturn ? "100%+" : fmt.percent(b.cashRecoveryPercent)}
              />
              <StatRow label="Post-refi Cashflow" value={`${fmt.signedCurrency(b.monthlyCashflow)}/mo`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </FormProvider>
  );
}
