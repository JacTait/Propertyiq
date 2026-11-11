"use client";

import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { useFormatters } from "@/hooks/useSettings";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wholeMoney } from "@/components/workspace/decision-display";

interface SecondaryMetricsProps {
  decision: DealDecisionResult | null;
  className?: string;
}

export function SecondaryMetrics({ decision, className }: SecondaryMetricsProps) {
  const fmt = useFormatters();

  if (!decision) return null;

  const { conservative, costs } = decision;
  const allCash = costs.loanAmount === 0 && costs.purchasePrice > 0;

  const rows: MetricRow[] = [
    {
      label: "Conservative NOI",
      value: wholeMoney(fmt, conservative.noi),
      hint: "Annual net operating income on conservative rent.",
    },
    {
      label: "Annual conservative cash flow",
      value: `${conservative.annualCashflow < 0 ? "-" : conservative.annualCashflow > 0 ? "+" : ""}${wholeMoney(fmt, Math.abs(conservative.annualCashflow))}`,
      hint: "NOI − annual P&I.",
    },
    {
      label: "Cap rate",
      value: conservative.capRate === null ? null : fmt.percent(conservative.capRate, 1),
      empty: "Add a purchase price to calculate cap rate.",
      hint: "NOI ÷ purchase price.",
    },
    {
      label: "Cash-on-cash return",
      value: conservative.cashOnCash === null ? null : fmt.percent(conservative.cashOnCash, 1),
      empty: "Add cash invested to calculate cash-on-cash.",
      hint: "Annual cash flow ÷ cash invested.",
    },
    {
      label: "DSCR",
      value: conservative.dscr === null ? null : fmt.ratio(conservative.dscr, 2),
      empty: allCash
        ? "DSCR is not applicable on an all-cash deal."
        : "Add financing details to calculate DSCR.",
      hint: "NOI ÷ annual debt service.",
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Secondary metrics</CardTitle>
        <CardDescription>Traditional financial metrics. Break-even limits sit in What breaks this deal?</CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start justify-between gap-3 border-t border-border/50 px-5 py-2.5 sm:px-6"
            >
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground/90">{row.hint}</dd>
              </div>
              <p
                className={cn(
                  "shrink-0 text-right text-sm font-medium tabular",
                  row.value === null && "max-w-[11rem] font-normal text-muted-foreground",
                )}
              >
                {row.value ?? row.empty}
              </p>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

interface MetricRow {
  label: string;
  value: string | null;
  empty?: string;
  hint: string;
}
