"use client";

import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceSummaryPlaceholderProps {
  decision: DealDecisionResult | null;
}

export function WorkspaceSummaryPlaceholder({ decision }: WorkspaceSummaryPlaceholderProps) {
  const fmt = useFormatters();
  const allIn = decision?.costs.allInCost ?? 0;
  const allInPct = decision?.costs.allInPctConservativeArv;
  const guideline = decision?.guidelineMaxOffer;
  const cashflow = decision?.conservative.monthlyCashflow;

  return (
    <Card className="xl:sticky xl:top-20">
      <CardHeader>
        <CardTitle>Live summary</CardTitle>
        <CardDescription>
          Full conservative cash flow, stress case and guideline status arrive in the next pass. These figures
          already use the locked decision engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Row label="All-in cost" value={fmt.currency(allIn)} />
        <Row
          label="All-in % of conservative ARV"
          value={allInPct === null || allInPct === undefined ? "Add conservative ARV" : fmt.percent(allInPct)}
        />
        <Row
          label="Guideline max offer"
          value={guideline === null || guideline === undefined ? "Add conservative ARV" : fmt.currency(guideline)}
        />
        <Row
          label="Conservative cash flow"
          value={cashflow === undefined ? "—" : fmt.signedCurrency(cashflow)}
          hint="NOI − P&I. All-cash deals equal NOI."
        />
      </CardContent>
    </Card>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground/80">{hint}</p> : null}
      </div>
      <p className="text-sm font-semibold tabular">{value}</p>
    </div>
  );
}
