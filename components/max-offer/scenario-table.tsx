"use client";

import type { MaxOfferResults, OfferScenario } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function recTone(label: string): "success" | "primary" | "warning" | "danger" {
  if (label === "Excellent") return "success";
  if (label === "Good") return "primary";
  if (label === "At maximum") return "warning";
  return "danger";
}

export function ScenarioTable({ results }: { results: MaxOfferResults }) {
  const fmt = useFormatters();
  const rows: { label: string; render: (s: OfferScenario) => string; highlight?: boolean }[] = [
    { label: "Purchase Price", render: (s) => fmt.currency(s.purchasePrice), highlight: true },
    { label: "Cashflow", render: (s) => fmt.signedCurrency(s.monthlyCashflow) },
    { label: "ROI", render: (s) => fmt.percent(s.roi) },
    { label: "DSCR", render: (s) => fmt.ratio(s.dscr) },
    { label: "Cap Rate", render: (s) => fmt.percent(s.capRate) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Analysis</CardTitle>
        <CardDescription>How cashflow, ROI and coverage change as you walk up the bid ladder.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Metric
                </th>
                {results.scenarios.map((s) => (
                  <th key={s.key} className="px-3 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold">{s.label}</span>
                      <Badge variant={recTone(s.recommendation)}>{s.recommendation}</Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border/60">
                  <td className="px-3 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                  {results.scenarios.map((s) => (
                    <td
                      key={s.key}
                      className={cn("px-3 py-2.5 text-right tabular", row.highlight && "font-bold")}
                    >
                      {row.render(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
