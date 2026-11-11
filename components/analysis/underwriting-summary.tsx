"use client";

import type { UnderwritingSummary } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function UnderwritingSummaryCard({ summary }: { summary: UnderwritingSummary }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Underwriting Summary</CardTitle>
          <CardDescription>Professional narrative from the Buy Box, refinance and stress tests.</CardDescription>
        </div>
        <Badge variant="primary">{summary.assessment}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
        <ul className="space-y-1 text-sm">
          {summary.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deal Survival Score</p>
            <p className="text-2xl font-black tabular">{summary.dealSurvivalScore}/100</p>
            <p className="text-sm font-medium">{summary.dealSurvivalVerdict}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Primary Risk</p>
            <p className="text-lg font-bold">{summary.primaryRisk}</p>
            <p className="text-sm text-muted-foreground">Assessment: {summary.assessment}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overall Resilience Score</p>
          <p className="text-2xl font-black tabular">{summary.resilienceScore}/100</p>
          <p className="text-sm font-medium">Assessment: {summary.assessment}</p>
        </div>
      </CardContent>
    </Card>
  );
}
