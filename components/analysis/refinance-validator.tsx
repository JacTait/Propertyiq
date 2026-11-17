"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import type { RefinanceValidation } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatRow } from "@/components/dashboard/stat-row";

export function RefinanceValidator({ validation, children }: { validation: RefinanceValidation; children?: ReactNode }) {
  const fmt = useFormatters();
  const viable = validation.viable;

  return (
    <Card className={cn(viable ? "border-success/30" : "border-destructive/30")}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              viable ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {viable ? <CheckCircle2 className="size-5" /> : <CircleAlert className="size-5" />}
          </span>
          <div>
            <CardTitle>BRRRR Refinance Validator</CardTitle>
            <CardDescription>Primary status uses the supported refinance loan, not the full LTV ceiling.</CardDescription>
          </div>
        </div>
        <Badge variant={viable ? "success" : "danger"}>{validation.headline}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <p className={cn("text-sm font-medium", viable ? "text-success" : "text-destructive")}>{validation.detail}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supported Refinance</p>
            <StatRow label="ARV" value={fmt.currency(validation.arv)} />
            <StatRow label="Refinance LTV" value={fmt.percent(validation.refinanceLtv, 0)} />
            <StatRow label="DSCR Requirement" value={fmt.ratio(validation.dscrRequirement)} />
            <StatRow label="LTV-Based Loan" value={fmt.currency(validation.ltvBasedLoan)} />
            <StatRow
              label="DSCR-Supported Loan"
              value={validation.dscrSupportedLoan == null ? "—" : fmt.currency(validation.dscrSupportedLoan)}
            />
            <StatRow label="Supported Refinance Loan" value={fmt.currency(validation.supportedRefinanceLoan)} emphasis />
            <StatRow label="Limiting Factor" value={validation.limitingLabel} />
            <StatRow label="Supported Payment" value={`${fmt.currency(validation.supportedPayment)}/mo`} />
            <StatRow
              label="Supported DSCR"
              value={validation.supportedDscr == null ? "—" : fmt.ratio(validation.supportedDscr)}
            />
            <StatRow label="Cash Recovered" value={fmt.currency(validation.cashPulledOut)} />
            <StatRow label="Cash Left In Deal" value={fmt.currency(Math.max(0, validation.cashLeftInDeal))} />
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full-LTV Scenario</p>
            <StatRow
              label={validation.fullLtvCompliant ? "Full-LTV Loan" : "LTV Ceiling — Not DSCR Compliant"}
              value={fmt.currency(validation.fullLtvLoan)}
            />
            <StatRow label="Full-LTV Payment" value={`${fmt.currency(validation.fullLtvPayment)}/mo`} />
            <StatRow label="Full-LTV DSCR" value={fmt.ratio(validation.fullLtvDscr)} />
            <StatRow label="Full-LTV Cashflow" value={`${fmt.signedCurrency(validation.fullLtvMonthlyCashflow)}/mo`} />
            <p className="mt-2 text-sm text-muted-foreground">{validation.fullLtvHeadline}</p>
            <p className="text-sm text-muted-foreground">{validation.fullLtvDetail}</p>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Cash left in the deal uses investor cash invested minus net supported refinance proceeds, not total project
          cost minus the LTV ceiling.
        </p>
      </CardContent>
    </Card>
  );
}
