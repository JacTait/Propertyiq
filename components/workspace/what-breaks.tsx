"use client";

import type { BreakSeverity, DealDecisionResult } from "@/lib/calculations/deal-decision";
import { presentWhatBreaks } from "@/lib/calculations/decision-support";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface WhatBreaksProps {
  decision: DealDecisionResult | null;
}

const SEVERITY_LABEL: Record<BreakSeverity, string> = {
  critical: "Limit reached",
  warning: "Close to a limit",
  info: "Threshold",
};

export function WhatBreaks({ decision }: WhatBreaksProps) {
  const fmt = useFormatters();
  if (!decision) return null;
  const items = presentWhatBreaks(decision, fmt);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>What breaks this deal?</CardTitle>
        <CardDescription>See where the current underwriting reaches its limits.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a purchase price and conservative rent to calculate limits.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "rounded-xl border px-3 py-3",
                  item.severity === "critical" && "border-destructive/30 bg-destructive/8",
                  item.severity === "warning" && "border-warning/30 bg-warning/8",
                  item.severity === "info" && "border-border/70 bg-muted/20",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <Badge
                    variant={item.severity === "critical" ? "danger" : item.severity === "warning" ? "warning" : "muted"}
                  >
                    {SEVERITY_LABEL[item.severity]}
                  </Badge>
                </div>
                {item.value ? (
                  <p
                    className={cn(
                      "mt-1 text-xl font-semibold tabular",
                      item.severity === "critical" && "text-destructive",
                    )}
                  >
                    {item.value}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
