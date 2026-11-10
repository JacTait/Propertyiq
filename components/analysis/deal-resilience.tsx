"use client";

import type { DealGrade, DealResilienceResults } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DealScoreGauge } from "@/components/analysis/deal-score-gauge";

const GRADE_TO_DEAL: Record<DealResilienceResults["grade"], DealGrade> = {
  "very-resilient": "elite",
  resilient: "excellent",
  acceptable: "good",
  fragile: "average",
  "high-risk": "avoid",
};

const GRADE_TONE: Record<DealResilienceResults["grade"], "success" | "primary" | "warning" | "danger"> = {
  "very-resilient": "success",
  resilient: "success",
  acceptable: "primary",
  fragile: "warning",
  "high-risk": "danger",
};

export function DealResiliencePanel({
  resilience,
  compact = false,
}: {
  resilience: DealResilienceResults;
  compact?: boolean;
}) {
  const fmt = useFormatters();
  const tone = GRADE_TONE[resilience.grade];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Deal Resilience Analyzer</CardTitle>
          <CardDescription>Best, expected, stress and worst-case underwrites.</CardDescription>
        </div>
        <Badge variant={tone}>{resilience.gradeLabel}</Badge>
      </CardHeader>
      <CardContent className={cn("grid gap-6", compact ? "lg:grid-cols-[auto_1fr]" : "xl:grid-cols-[auto_1fr]")}>
        <div className="flex flex-col items-center gap-2">
          <DealScoreGauge
            score={resilience.score}
            grade={GRADE_TO_DEAL[resilience.grade]}
            label="Resilience"
            idPrefix="resilience"
            size={compact ? 168 : 200}
          />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {resilience.scenarios.map((scenario) => (
              <div key={scenario.key} className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{scenario.label}</p>
                <p className="mt-1 text-sm font-bold tabular">{fmt.percent(scenario.roi, 1)} ROI</p>
                <p className="text-xs tabular text-muted-foreground">{fmt.signedCurrency(scenario.monthlyCashflow)}/mo</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {resilience.components.map((component) => (
              <div key={component.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold">{component.label}</p>
                    <p className="tabular text-muted-foreground">{Math.round(component.score)}/100</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        component.score >= 80 ? "bg-success" : component.score >= 60 ? "bg-warning" : "bg-destructive",
                      )}
                      style={{ width: `${component.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{component.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
