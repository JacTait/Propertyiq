"use client";

import type { ProjectionData, ProjectionSummary } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectionTableProps {
  projections: ProjectionData[];
  fiveYear: ProjectionSummary;
  tenYear: ProjectionSummary;
}

export function ProjectionTable({ projections, fiveYear, tenYear }: ProjectionTableProps) {
  const fmt = useFormatters();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ten-Year Projection</CardTitle>
        <CardDescription>Value, debt, equity and cashflow by year</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryTile title="Five-Year" summary={fiveYear} />
          <SummaryTile title="Ten-Year" summary={tenYear} />
        </div>
        <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-xs sm:text-sm">
            <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Year</th>
                <th className="px-3 py-2 text-right font-semibold">Value</th>
                <th className="px-3 py-2 text-right font-semibold">Loan</th>
                <th className="px-3 py-2 text-right font-semibold">Equity</th>
                <th className="px-3 py-2 text-right font-semibold">Cashflow</th>
                <th className="px-3 py-2 text-right font-semibold">Cumulative</th>
                <th className="px-3 py-2 text-right font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((p) => (
                <tr
                  key={p.year}
                  className={cn(
                    "border-t border-border/60 tabular transition-colors hover:bg-accent/30",
                    (p.year === 5 || p.year === 10) && "bg-primary/5 font-semibold",
                  )}
                >
                  <td className="px-3 py-2">Year {p.year}</td>
                  <td className="px-3 py-2 text-right">{fmt.currency(p.propertyValue)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{fmt.currency(p.loanBalance)}</td>
                  <td className="px-3 py-2 text-right">{fmt.currency(p.equity)}</td>
                  <td className={cn("px-3 py-2 text-right", p.annualCashflow >= 0 ? "text-success" : "text-destructive")}>
                    {fmt.signedCurrency(p.annualCashflow)}
                  </td>
                  <td className="px-3 py-2 text-right">{fmt.signedCurrency(p.cumulativeCashflow)}</td>
                  <td className="px-3 py-2 text-right">{fmt.percent(p.roi, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ title, summary }: { title: string; summary: ProjectionSummary }) {
  const fmt = useFormatters();
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{title} Outlook</p>
      <p className="mt-1 text-2xl font-bold tabular">{fmt.currency(summary.totalReturn)}</p>
      <p className="text-xs text-muted-foreground">total return · {fmt.percent(summary.annualisedRoi)} annualised</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Equity</p>
          <p className="font-semibold tabular">{fmt.currency(summary.equity)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Property Value</p>
          <p className="font-semibold tabular">{fmt.currency(summary.propertyValue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cumulative Cashflow</p>
          <p className="font-semibold tabular">{fmt.signedCurrency(summary.cumulativeCashflow)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cumulative ROI</p>
          <p className="font-semibold tabular">{fmt.percent(summary.roi, 0)}</p>
        </div>
      </div>
    </div>
  );
}
