"use client";

import type { DealGrade, DealResilienceResults, ResilienceScenarioMetrics } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { ScoreBreakdown } from "@/components/underwriting/score-breakdown";
import { ScenarioComparison } from "@/components/underwriting/scenario-comparison";
import { MajorMetric } from "@/components/underwriting/major-metric";
import { DealScoreGauge } from "@/components/analysis/deal-score-gauge";

const GRADE_TO_DEAL: Record<DealResilienceResults["grade"], DealGrade> = {
  "very-resilient": "elite",
  resilient: "excellent",
  acceptable: "good",
  fragile: "average",
  "high-risk": "avoid",
};

export function DealResiliencePanel({
  resilience,
  compact = false,
}: {
  resilience: DealResilienceResults;
  compact?: boolean;
}) {
  const fmt = useFormatters();
  const stress = resilience.scenarios.find((s) => s.key === "stress");
  const worst = resilience.scenarios.find((s) => s.key === "worst");
  const columns = resilience.scenarios
    .filter((s) => s.key === "expected" || s.key === "stress" || s.key === "worst")
    .map((s) => ({ key: s.key, label: s.label }));

  const valueFor = (key: "expected" | "stress" | "worst", pick: (s: ResilienceScenarioMetrics) => string) => {
    const scenario = resilience.scenarios.find((s) => s.key === key);
    return scenario ? pick(scenario) : "—";
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MajorMetric
          label="Survives Stress"
          value={stress && stress.monthlyCashflow >= 0 && Number.isFinite(stress.dscr) && stress.dscr >= 1 ? "Yes" : "No"}
          tone={stress && stress.monthlyCashflow >= 0 && stress.dscr >= 1 ? "success" : "danger"}
        />
        <MajorMetric
          label="Resilience Worst-Case Cashflow"
          value={worst ? fmt.signedCurrency(worst.monthlyCashflow) : "—"}
          tone={worst && worst.monthlyCashflow >= 0 ? "success" : "danger"}
        />
        <MajorMetric
          label="Primary Risk"
          value={resilience.components.slice().sort((a, b) => a.score - b.score)[0]?.label ?? "—"}
          tone="warning"
        />
      </div>
      <ScenarioComparison
        title="Expected · Resilience Stress · Resilience Worst"
        columns={columns}
        rows={[
          {
            key: "rent",
            label: "Rent factor",
            values: {
              expected: valueFor("expected", (s) => fmt.percent((s.shocks.rentFactor - 1) * 100, 0)),
              stress: valueFor("stress", (s) => fmt.percent((s.shocks.rentFactor - 1) * 100, 0)),
              worst: valueFor("worst", (s) => fmt.percent((s.shocks.rentFactor - 1) * 100, 0)),
            },
          },
          {
            key: "rehab",
            label: "Rehab factor",
            values: {
              expected: valueFor("expected", (s) => fmt.percent((s.shocks.rehabFactor - 1) * 100, 0)),
              stress: valueFor("stress", (s) => fmt.percent((s.shocks.rehabFactor - 1) * 100, 0)),
              worst: valueFor("worst", (s) => fmt.percent((s.shocks.rehabFactor - 1) * 100, 0)),
            },
          },
          {
            key: "cashflow",
            label: "Cashflow",
            emphasize: true,
            values: {
              expected: valueFor("expected", (s) => fmt.signedCurrency(s.monthlyCashflow)),
              stress: valueFor("stress", (s) => fmt.signedCurrency(s.monthlyCashflow)),
              worst: valueFor("worst", (s) => fmt.signedCurrency(s.monthlyCashflow)),
            },
          },
          {
            key: "roi",
            label: "ROI",
            values: {
              expected: valueFor("expected", (s) => fmt.percent(s.roi)),
              stress: valueFor("stress", (s) => fmt.percent(s.roi)),
              worst: valueFor("worst", (s) => fmt.percent(s.roi)),
            },
          },
          {
            key: "dscr",
            label: "DSCR",
            values: {
              expected: valueFor("expected", (s) => fmt.ratio(s.dscr)),
              stress: valueFor("stress", (s) => fmt.ratio(s.dscr)),
              worst: valueFor("worst", (s) => fmt.ratio(s.dscr)),
            },
          },
          {
            key: "cashleft",
            label: "Cash Left In Deal",
            values: { expected: "—", stress: "—", worst: "—" },
          },
          {
            key: "refi",
            label: "Refinance Status",
            values: {
              expected: valueFor("expected", (s) => (s.refinanceViable ? "Viable" : "At risk")),
              stress: valueFor("stress", (s) => (s.refinanceViable ? "Viable" : "At risk")),
              worst: valueFor("worst", (s) => (s.refinanceViable ? "Viable" : "At risk")),
            },
          },
        ]}
      />
      <div className={compact ? "grid gap-4 lg:grid-cols-[160px_1fr]" : "grid gap-4 lg:grid-cols-[200px_1fr]"}>
        <div className="border border-border bg-card rounded-lg px-4 py-3">
          <DealScoreGauge
            score={resilience.score}
            grade={GRADE_TO_DEAL[resilience.grade]}
            label="Resilience"
            idPrefix="resilience"
          />
        </div>
        <ScoreBreakdown
          title="Component scores"
          score={resilience.score}
          grade={resilience.gradeLabel}
          components={resilience.components.map((component) => ({
            key: component.key,
            label: component.label,
            score: component.score,
          }))}
        />
      </div>
    </div>
  );
}
