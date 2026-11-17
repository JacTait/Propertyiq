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
  expectedCashflow?: number;
  comparisonCashflow?: number;
  expectedLabel?: string;
  comparisonLabel?: string;
  hasUnderwrittenPrice?: boolean;
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

export function DecisionContext({
  decision,
  purpose,
  dashboardHref,
  expectedCashflow,
  comparisonCashflow,
  expectedLabel = "Expected Cashflow",
  comparisonLabel = "Stress Cashflow",
  hasUnderwrittenPrice,
}: DecisionContextProps) {
  const fmt = useFormatters();
  const copy = PURPOSE_COPY[purpose];
  const expected = expectedCashflow;
  const comparison = comparisonCashflow;
  const hasSharedScenarios = typeof expected === "number" && typeof comparison === "number";

  if (!decision && !hasSharedScenarios) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.distinction}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {hasUnderwrittenPrice === false
              ? "Enter an asking price, proposed offer or purchase price to calculate limits."
              : "Enter an asking price, proposed offer or purchase price to calculate limits."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const margin = decision?.marginForError;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.distinction}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasSharedScenarios ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{expectedLabel}</p>
                <p
                  className={cn(
                    "mt-1 text-lg font-semibold tabular",
                    cashflowTone(expected) === "positive" && "text-success",
                    cashflowTone(expected) === "negative" && "text-destructive",
                  )}
                >
                  {signedMonthly(fmt, expected)}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{comparisonLabel}</p>
                <p
                  className={cn(
                    "mt-1 text-lg font-semibold tabular",
                    cashflowTone(comparison) === "positive" && "text-success",
                    cashflowTone(comparison) === "negative" && "text-destructive",
                  )}
                >
                  {signedMonthly(fmt, comparison)}
                </p>
              </div>
            </div>
          ) : null}
          {margin ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin for error</p>
                <Badge variant={MARGIN_BADGE_VARIANT[margin.label]}>{margin.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{margin.explanation}</p>
            </>
          ) : null}
          <Link
            href={dashboardHref ?? dashboardPath()}
            className="inline-flex text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Open Deal Workspace
          </Link>
        </CardContent>
      </Card>
      {decision ? <AssumptionCheck decision={decision} compact /> : null}
      <WhatBreaks decision={decision} compact hasUnderwrittenPrice={hasUnderwrittenPrice} />
    </div>
  );
}
