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
            <CardDescription>Sized from ARV, refinance LTV and the DSCR gate.</CardDescription>
          </div>
        </div>
        <Badge variant={viable ? "success" : "danger"}>{viable ? "Refinance Appears Viable" : "Refinance Risk"}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <p className={cn("text-sm font-medium", viable ? "text-success" : "text-destructive")}>{validation.detail}</p>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <StatRow label="ARV" value={fmt.currency(validation.arv)} />
            <StatRow label="Refinance LTV" value={fmt.percent(validation.refinanceLtv, 0)} />
            <StatRow label="Interest Rate" value={fmt.percent(validation.interestRate, 2)} />
            <StatRow label="DSCR Requirement" value={fmt.ratio(validation.dscrRequirement)} />
            <StatRow label="Maximum Refinance Amount" value={fmt.currency(validation.maximumRefinanceAmount)} emphasis />
          </div>
          <div>
            <StatRow label="Loan Amount" value={fmt.currency(validation.loanAmount)} />
            <StatRow label="Monthly Payment" value={`${fmt.currency(validation.monthlyPayment)}/mo`} />
            <StatRow label="Estimated Cash Pulled Out" value={fmt.currency(validation.cashPulledOut)} />
            <StatRow label="Estimated Cash Left In Deal" value={fmt.currency(validation.cashLeftInDeal)} />
            <StatRow label="Post-Refi DSCR" value={fmt.ratio(validation.postRefiDscr)} emphasis />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
