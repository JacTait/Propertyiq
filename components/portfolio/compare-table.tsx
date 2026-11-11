"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import type { PortfolioProperty } from "@/lib/types";
import { formatPropertySpecs, gradeTone, strategyLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { analysisOpenPath } from "@/lib/utils/routes";
import { useFormatters } from "@/hooks/useSettings";
import type { Formatters } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CompareRow {
  key: string;
  label: string;
  value: (p: PortfolioProperty) => number;
  format: (v: number, fmt: Formatters) => string;
  /** true when a lower value wins (e.g. price) */
  lowerIsBetter?: boolean;
}

const ROWS: CompareRow[] = [
  { key: "price", label: "Purchase Price", value: (p) => p.snapshot.purchasePrice, format: (v, f) => f.currency(v), lowerIsBetter: true },
  { key: "roi", label: "ROI", value: (p) => p.snapshot.roi, format: (v, f) => (v >= 999 ? "∞" : f.percent(v)) },
  { key: "coc", label: "Cash-on-Cash", value: (p) => p.snapshot.cashOnCash, format: (v, f) => f.percent(v) },
  { key: "cap", label: "Cap Rate", value: (p) => p.snapshot.capRate, format: (v, f) => f.percent(v) },
  { key: "gross", label: "Gross Yield", value: (p) => p.snapshot.grossYield, format: (v, f) => f.percent(v) },
  { key: "net", label: "Net Yield", value: (p) => p.snapshot.netYield, format: (v, f) => f.percent(v) },
  { key: "cashflow", label: "Monthly Cashflow", value: (p) => p.snapshot.monthlyCashflow, format: (v, f) => f.signedCurrency(v) },
  { key: "annual", label: "Annual Cashflow", value: (p) => p.snapshot.annualCashflow, format: (v, f) => f.signedCurrency(v) },
  { key: "dscr", label: "DSCR", value: (p) => p.snapshot.dscr, format: (v, f) => f.ratio(v) },
  { key: "appr", label: "Appreciation", value: (p) => p.snapshot.appreciationRate, format: (v, f) => f.percent(v) },
  { key: "score", label: "Deal Score", value: (p) => p.snapshot.dealScore, format: (v) => `${Math.round(v)}/100` },
  { key: "resilience", label: "Resilience Score", value: (p) => p.snapshot.resilienceScore ?? 0, format: (v) => `${Math.round(v)}/100` },
  { key: "mos", label: "Margin of Safety", value: (p) => p.snapshot.marginOfSafetyPercent ?? 0, format: (v, f) => f.percent(v) },
];

export function CompareTable({ properties }: { properties: PortfolioProperty[] }) {
  const fmt = useFormatters();
  if (properties.length === 0) return null;

  const winnerFor = (row: CompareRow): string | null => {
    if (properties.length < 2) return null;
    const values = properties.map((p) => ({ id: p.id, v: row.value(p) }));
    const sorted = [...values].sort((a, b) => (row.lowerIsBetter ? a.v - b.v : b.v - a.v));
    if (sorted.length > 1 && sorted[0].v === sorted[1].v) return null;
    return sorted[0].id;
  };

  const wins = new Map<string, number>();
  ROWS.forEach((row) => {
    const w = winnerFor(row);
    if (w) wins.set(w, (wins.get(w) ?? 0) + 1);
  });

  const best = [...properties].sort((a, b) => b.snapshot.dealScore - a.snapshot.dealScore)[0];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-r from-success/15 via-card to-card p-5"
      >
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-success/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-success text-success-foreground shadow-lg shadow-success/30">
            <Trophy className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-success">Best Investment</p>
            <h3 className="text-xl font-bold">
              <Link href={analysisOpenPath(best)} className="hover:text-primary hover:underline">
                {best.name}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">
              Highest deal score ({best.snapshot.dealScore}/100) · {best.snapshot.recommendation} · wins {wins.get(best.id) ?? 0} of{" "}
              {ROWS.length} metrics
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPropertySpecs(best.input.property)} · {best.regionName} · {strategyLabel(best.strategy, true)}
            </p>
          </div>
          <Badge variant={gradeTone(best.snapshot.grade)} className="px-3 py-1 text-sm">
            {strategyLabel(best.strategy, true)} · {best.regionName}
          </Badge>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Side-by-Side Comparison</CardTitle>
          <CardDescription>Winning values are highlighted per metric.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Metric</th>
                  {properties.map((p) => (
                    <th key={p.id} className="px-3 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 font-bold">
                          {p.id === best.id && <Crown className="size-3.5 text-success" />}
                          <Link href={analysisOpenPath(p)} className="hover:text-primary hover:underline">
                            {p.name}
                          </Link>
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {formatPropertySpecs(p.input.property)}
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {p.regionName} · {strategyLabel(p.strategy, true)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const winner = winnerFor(row);
                  return (
                    <tr key={row.key} className="border-t border-border/60">
                      <td className="px-3 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                      {properties.map((p) => {
                        const isWinner = winner === p.id;
                        return (
                          <td
                            key={p.id}
                            className={cn(
                              "px-3 py-2.5 text-right tabular",
                              isWinner && "bg-success/10 font-bold text-success",
                            )}
                          >
                            {row.format(row.value(p), fmt)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold">Metrics won</td>
                  {properties.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 text-right font-bold tabular">
                      {wins.get(p.id) ?? 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
