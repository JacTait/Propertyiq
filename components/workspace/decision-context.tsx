"use client";

import Link from "next/link";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { dashboardPath } from "@/lib/utils/routes";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AssumptionCheck } from "@/components/workspace/assumption-check";
import { WhatBreaks } from "@/components/workspace/what-breaks";
import { cashflowTone, MARGIN_BADGE_VARIANT, signedMonthly } from "@/components/workspace/decision-display";
import { cn } from "@/lib/utils/cn";

interface DecisionContextProps {
  decision: DealDecisionResult | null;
  purpose: "resilience" | "downside";
  dashboardHref?: string;
}

const PURPOSE_COPY: Record<DecisionContextProps["purpose"], { title: string; distinction: string }> = {
  resilience: {
    title: "Deal Workspace context",
    distinction:
      "Deal Workspace asks whether the deal works under your underwriting. This page asks how much deterioration it can absorb.",
  },
  downside: {
    title: "Deal Workspace context",
    distinction:
      "Deal Workspace asks whether the deal works under your underwriting. This page asks what happens when the deal moves against you.",
  },
};

export function DecisionContext({ decision, purpose, dashboardHref }: DecisionContextProps) {
  const fmt = useFormatters();
  const copy = PURPOSE_COPY[purpose];

  if (!decision) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.distinction}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Add a purchase price and conservative rent in Deal Workspace.</p>
        </CardContent>
      </Card>
    );
  }

  const conservative = decision.conservative.monthlyCashflow;
  const stress = decision.scenarios.stress.monthlyCashflow;
  const margin = decision.marginForError;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.distinction}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conservative cash flow
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-semibold tabular",
                  cashflowTone(conservative) === "positive" && "text-success",
                  cashflowTone(conservative) === "negative" && "text-destructive",
                )}
              >
                {signedMonthly(fmt, conservative)}
                <span className="sr-only">
                  {cashflowTone(conservative) === "negative" ? "Negative" : cashflowTone(conservative) === "positive" ? "Positive" : "Breakeven"}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stress-case cash flow
              </p>
              <p
                className={cn(
                  "mt-1 text-lg font-semibold tabular",
                  cashflowTone(stress) === "positive" && "text-success",
                  cashflowTone(stress) === "negative" && "text-destructive",
                )}
              >
                {signedMonthly(fmt, stress)}
                <span className="sr-only">
                  {cashflowTone(stress) === "negative" ? "Negative" : cashflowTone(stress) === "positive" ? "Positive" : "Breakeven"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin for error</p>
            <Badge variant={MARGIN_BADGE_VARIANT[margin.label]}>{margin.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{margin.explanation}</p>
          <Link
            href={dashboardHref ?? dashboardPath()}
            className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Open Deal Workspace
          </Link>
        </CardContent>
      </Card>
      <AssumptionCheck decision={decision} compact />
      <WhatBreaks decision={decision} compact />
    </div>
  );
}
