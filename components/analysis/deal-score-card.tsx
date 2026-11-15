"use client";

import type { DealScore } from "@/lib/types";
import { recommendationTone } from "@/lib/utils/labels";
import { ScoreBreakdown } from "@/components/underwriting/score-breakdown";
import { StatusIndicator } from "@/components/underwriting/status-indicator";
import { useFormatters } from "@/hooks/useSettings";

export function DealScoreCard({ dealScore }: { dealScore: DealScore; animated?: boolean }) {
  const fmt = useFormatters();
  const recTone = recommendationTone(dealScore.recommendation);
  const level = recTone === "success" ? "pass" : recTone === "warning" ? "warn" : recTone === "danger" ? "fail" : "neutral";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <ScoreBreakdown
        title="Deal Score"
        score={dealScore.score}
        grade={dealScore.gradeLabel}
        components={dealScore.components.map((component) => ({
          key: component.key,
          label: component.label,
          score: component.score,
        }))}
      />
      <section className="border border-border bg-card rounded-lg px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Recommendation</p>
        <div className="mt-2">
          <StatusIndicator level={level}>{dealScore.recommendation}</StatusIndicator>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{dealScore.headline}</p>
        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {dealScore.components.map((component) => (
            <li key={component.key} className="flex justify-between gap-3">
              <span>{component.label}</span>
              <span className="font-figure tabular-nums">{rawLabel(component.key, component.rawValue, fmt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function rawLabel(
  key: DealScore["components"][number]["key"],
  value: number,
  fmt: ReturnType<typeof useFormatters>,
): string {
  switch (key) {
    case "cashflow":
      return `${fmt.currency(value)}/mo`;
    case "dscr":
      return fmt.ratio(value);
    default:
      return fmt.percent(value);
  }
}
