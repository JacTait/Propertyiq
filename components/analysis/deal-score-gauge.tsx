"use client";

import type { ReactNode } from "react";
import type { DealGrade } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const GRADE_COLORS: Record<DealGrade, string> = {
  elite: "var(--success)",
  excellent: "var(--success)",
  good: "var(--primary)",
  average: "var(--warning)",
  avoid: "var(--destructive)",
};

interface DealScoreGaugeProps {
  score: number;
  grade: DealGrade;
  size?: number;
  className?: string;
  animated?: boolean;
  label?: string;
  idPrefix?: string;
  action?: ReactNode;
}

export function DealScoreGauge({
  score,
  grade,
  className,
  label = "Deal Score",
  action,
}: DealScoreGaugeProps) {
  const tone = GRADE_COLORS[grade];
  return (
    <div className={cn("min-w-[140px]", className)}>
      <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>{label}</span>
        {action}
      </div>
      <p className="mt-1 font-figure text-[40px] font-medium leading-none tabular-nums" style={{ color: tone }}>
        {Math.round(score)}
        <span className="ml-1 text-base text-muted-foreground">/ 100</span>
      </p>
      <div className="mt-3 h-1 bg-muted">
        <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: tone }} />
      </div>
    </div>
  );
}
