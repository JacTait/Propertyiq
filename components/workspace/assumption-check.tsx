"use client";

import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import {
  assumptionChecksForDisplay,
  groupAssumptionChecks,
} from "@/lib/calculations/decision-support";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface AssumptionCheckProps {
  decision: DealDecisionResult | null;
  compact?: boolean;
}

export function AssumptionCheck({ decision, compact = false }: AssumptionCheckProps) {
  if (!decision) return null;
  const grouped = groupAssumptionChecks(assumptionChecksForDisplay(decision));
  const attention = grouped.highRisk.length + grouped.review.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Assumption check</CardTitle>
        <CardDescription>
          {compact
            ? "Inputs that still need verification before treating these results as reliable."
            : "How trustworthy are the assumptions behind these results? This highlights inputs to verify — it does not decide the deal."}
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {attention === 0
            ? "No high-risk or review items on the current inputs."
            : `${grouped.highRisk.length} high risk · ${grouped.review.length} to review`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.highRisk.length > 0 ? (
          <CheckGroup title="High risk" items={grouped.highRisk} variant="danger" />
        ) : null}
        {grouped.review.length > 0 ? <CheckGroup title="Review" items={grouped.review} variant="warning" /> : null}
        {!compact && grouped.confirmed.length > 0 ? (
          <details className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Confirmed ({grouped.confirmed.length})</summary>
            <div className="mt-3">
              <CheckGroup title="Confirmed" items={grouped.confirmed} variant="success" hideHeading />
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CheckGroup({
  title,
  items,
  variant,
  hideHeading,
}: {
  title: string;
  items: { key: string; title: string; detail: string; status: string }[];
  variant: "danger" | "warning" | "success";
  hideHeading?: boolean;
}) {
  return (
    <div>
      {hideHeading ? null : (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "rounded-xl border px-3 py-2",
              variant === "danger" && "border-destructive/30 bg-destructive/8",
              variant === "warning" && "border-warning/30 bg-warning/8",
              variant === "success" && "border-border/70 bg-background/40",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              <Badge variant={variant}>{title}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
