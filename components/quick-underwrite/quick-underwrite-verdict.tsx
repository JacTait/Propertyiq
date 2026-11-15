"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuickUnderwriteVerdictResult } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const TONE: Record<QuickUnderwriteVerdictResult["verdict"], "success" | "warning" | "danger" | "muted"> = {
  "worth-pursuing": "success",
  investigate: "warning",
  "walk-away": "danger",
  "insufficient-data": "muted",
};

export function QuickUnderwriteVerdictCard({ verdict }: { verdict: QuickUnderwriteVerdictResult }) {
  const tone = TONE[verdict.verdict];
  return (
    <Card
      className={cn(
        tone === "success" && "border-success/40",
        tone === "warning" && "border-warning/40",
        tone === "danger" && "border-destructive/40",
      )}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Underwriting verdict</CardTitle>
          <CardDescription>Based on the assumptions entered. Not financial advice.</CardDescription>
        </div>
        <Badge variant={tone}>{verdict.label}</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{verdict.summary}</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {verdict.rules.map((rule) => (
            <li key={rule.key} className={cn(!rule.applicable && "text-muted-foreground", rule.passed ? "text-success" : "text-destructive")}>
              {rule.applicable ? (rule.passed ? "✓" : "✗") : "•"} {rule.label}
              <span className="ml-1 text-xs text-muted-foreground">{rule.detail}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
