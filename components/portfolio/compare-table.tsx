"use client";

import { Fragment } from "react";
import Link from "next/link";
import type { PortfolioProperty } from "@/lib/types";
import { formatPropertySpecs, strategyLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { analysisOpenPath } from "@/lib/utils/routes";
import { useFormatters } from "@/hooks/useSettings";
import type { Formatters } from "@/lib/utils/format";
import { StatusIndicator } from "@/components/underwriting/status-indicator";
import { DealSurvivalInfo } from "@/components/underwriting/deal-survival-info";

interface CompareRow {
  key: string;
  label: string;
  value: (p: PortfolioProperty) => number | string;
  format?: (v: number, fmt: Formatters) => string;
  lowerIsBetter?: boolean;
  numeric?: boolean;
}

interface CompareGroup {
  label: string;
  rows: CompareRow[];
}

const GROUPS: CompareGroup[] = [
  {
    label: "Acquisition",
    rows: [
      { key: "asking", label: "Asking Price", value: (p) => p.input.financing.askingPrice, format: (v, f) => f.currency(v), lowerIsBetter: true, numeric: true },
      { key: "offer", label: "Proposed Offer", value: (p) => p.snapshot.proposedOffer ?? p.input.financing.proposedOffer ?? 0, format: (v, f) => f.currency(v), lowerIsBetter: true, numeric: true },
      { key: "price", label: "Purchase Price", value: (p) => p.snapshot.purchasePrice, format: (v, f) => f.currency(v), lowerIsBetter: true, numeric: true },
      { key: "rehab", label: "Rehab", value: (p) => p.input.brrrr.rehabCost, format: (v, f) => f.currency(v), lowerIsBetter: true, numeric: true },
      { key: "allin", label: "All-In Cost", value: (p) => p.snapshot.allInCost ?? 0, format: (v, f) => (v ? f.currency(v) : "—"), lowerIsBetter: true, numeric: true },
      { key: "max", label: "Maximum Offer", value: (p) => p.snapshot.guidelineMaxOffer ?? 0, format: (v, f) => (v ? f.currency(v) : "—"), numeric: true },
    ],
  },
  {
    label: "Operations",
    rows: [
      { key: "verified", label: "Verified Rent", value: (p) => p.snapshot.verifiedRent ?? p.input.income.verifiedRent, format: (v, f) => (v ? f.currency(v) : "—"), numeric: true },
      { key: "cashflow", label: "Cashflow", value: (p) => p.snapshot.monthlyCashflow, format: (v, f) => f.signedCurrency(v), numeric: true },
      { key: "cap", label: "Cap Rate", value: (p) => p.snapshot.capRate, format: (v, f) => f.percent(v), numeric: true },
    ],
  },
  {
    label: "Refinance",
    rows: [
      { key: "arv", label: "ARV", value: (p) => p.input.brrrr.afterRepairValue, format: (v, f) => f.currency(v), numeric: true },
      { key: "loan", label: "Supported Loan", value: (p) => p.snapshot.supportedRefinanceLoan ?? 0, format: (v, f) => (v ? f.currency(v) : "—"), numeric: true },
      { key: "dscr", label: "DSCR", value: (p) => p.snapshot.postRefinanceDscr ?? p.snapshot.dscr, format: (v, f) => (Number.isFinite(v) ? f.ratio(v) : "N/A"), numeric: true },
      { key: "recovered", label: "Cash Recovered", value: (p) => Math.max(0, (p.snapshot.allInCost ?? 0) - (p.snapshot.cashLeftInDeal ?? 0)), format: (v, f) => f.currency(v), numeric: true },
      { key: "cashLeft", label: "Cash Left In Deal", value: (p) => p.snapshot.cashLeftInDeal ?? 0, format: (v, f) => f.currency(v), lowerIsBetter: true, numeric: true },
    ],
  },
  {
    label: "Risk",
    rows: [
      { key: "buybox", label: "Buy Box Status", value: (p) => p.snapshot.buyBoxStatus ?? "no-profile" },
      { key: "survival", label: "Survival Score", value: (p) => p.snapshot.dealSurvivalScore ?? 0, format: (v) => `${Math.round(v)}/100`, numeric: true },
      { key: "risk", label: "Primary Risk", value: (p) => p.snapshot.primaryRisk ?? "—" },
      { key: "wcCashflow", label: "Downside Cashflow", value: (p) => p.snapshot.worstCaseCashflow ?? 0, format: (v, f) => f.signedCurrency(v), numeric: true },
      { key: "verdict", label: "Verdict", value: (p) => p.snapshot.quickVerdict ?? p.snapshot.recommendation },
    ],
  },
];

function displayValue(row: CompareRow, property: PortfolioProperty, fmt: Formatters): string {
  const raw = row.value(property);
  if (typeof raw === "string") {
    if (row.key === "buybox") {
      return raw === "inside" ? "Inside" : raw === "outside" ? "Outside" : "Not set";
    }
    if (row.key === "verdict") {
      if (raw === "worth-pursuing") return "Worth Pursuing";
      if (raw === "investigate") return "Investigate Further";
      if (raw === "walk-away") return "Walk Away";
      if (raw === "insufficient-data") return "Insufficient Data";
    }
    return raw;
  }
  if (!row.format) return String(raw);
  return row.format(raw, fmt);
}

export function CompareTable({ properties }: { properties: PortfolioProperty[] }) {
  const fmt = useFormatters();
  if (properties.length === 0) return null;

  const winnerFor = (row: CompareRow): string | null => {
    if (!row.numeric || properties.length < 2) return null;
    const values = properties.map((p) => ({ id: p.id, v: Number(row.value(p)) }));
    if (values.some((item) => !Number.isFinite(item.v))) return null;
    if (row.key === "allin" || row.key === "max" || row.key === "loan" || row.key === "recovered") {
      if (values.every((item) => item.v === 0)) return null;
    }
    const sorted = [...values].sort((a, b) => (row.lowerIsBetter ? a.v - b.v : b.v - a.v));
    if (sorted.length > 1 && sorted[0].v === sorted[1].v) return null;
    return sorted[0].id;
  };

  return (
    <div className="overflow-x-auto border border-border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Metric</th>
            {properties.map((p) => (
              <th key={p.id} className="px-3 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <Link href={analysisOpenPath(p)} className="font-medium hover:text-primary">
                    {p.name}
                  </Link>
                  <span className="text-[11px] font-normal text-muted-foreground">{formatPropertySpecs(p.input.property)}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {p.regionName} · {strategyLabel(p.strategy, true)}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => (
            <Fragment key={group.label}>
              <tr className="border-t border-border bg-muted/40">
                <th
                  colSpan={properties.length + 1}
                  className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {group.label}
                </th>
              </tr>
              {group.rows.map((row) => {
                const winner = winnerFor(row);
                return (
                  <tr key={row.key} className="border-t border-border">
                    <td className="px-3 py-2.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {row.label}
                        {row.key === "survival" ? <DealSurvivalInfo /> : null}
                      </span>
                    </td>
                    {properties.map((p) => {
                      const isWinner = winner === p.id;
                      const text = displayValue(row, p, fmt);
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            "px-3 py-2.5 text-right font-figure tabular-nums",
                            isWinner && "text-success",
                          )}
                        >
                          {row.key === "buybox" ? (
                            <StatusIndicator
                              level={p.snapshot.buyBoxStatus === "inside" ? "pass" : p.snapshot.buyBoxStatus === "outside" ? "fail" : "neutral"}
                            >
                              {text}
                            </StatusIndicator>
                          ) : (
                            text
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
