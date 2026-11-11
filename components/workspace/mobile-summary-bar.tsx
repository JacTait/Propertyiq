"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { useFormatters } from "@/hooks/useSettings";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { cashflowTone, signedMonthly } from "@/components/workspace/decision-display";

interface MobileSummaryBarProps {
  decision: DealDecisionResult | null;
  onViewSummary: () => void;
}

export function MobileSummaryBar({ decision, onViewSummary }: MobileSummaryBarProps) {
  const fmt = useFormatters();
  const conservativeCf = decision?.conservative.monthlyCashflow ?? 0;
  const stressCf = decision?.scenarios.stress.monthlyCashflow ?? 0;
  const allInPct = decision?.costs.allInPctConservativeArv ?? null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-30 px-2 xl:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 overflow-hidden rounded-2xl border border-border bg-card/95 px-2.5 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
        <MiniMetric
          label="CF"
          ariaLabel="Conservative cash flow"
          value={signedMonthly(fmt, conservativeCf)}
          tone={cashflowTone(conservativeCf)}
        />
        <MiniMetric
          label="All-in"
          ariaLabel="All-in percent of conservative ARV"
          value={allInPct === null ? "Add ARV" : fmt.percent(allInPct, 1)}
          muted={allInPct === null}
        />
        <MiniMetric
          label="Stress"
          ariaLabel="Stress-case cash flow"
          value={signedMonthly(fmt, stressCf)}
          tone={cashflowTone(stressCf)}
        />
        <Button type="button" size="sm" className="shrink-0 px-2.5 text-xs" onClick={onViewSummary}>
          View summary
        </Button>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  ariaLabel,
  value,
  tone,
  muted,
}: {
  label: string;
  ariaLabel?: string;
  value: string;
  tone?: "positive" | "negative" | "zero";
  muted?: boolean;
}) {
  const Icon = tone === "positive" ? ArrowUpRight : tone === "negative" ? ArrowDownRight : tone === "zero" ? Minus : null;
  const sign = tone === "positive" ? "Positive" : tone === "negative" ? "Negative" : tone === "zero" ? "Breakeven" : undefined;
  return (
    <div className="min-w-0 flex-1" aria-label={ariaLabel ?? label}>
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "flex items-center gap-0.5 truncate text-xs font-semibold tabular",
          muted && "font-medium text-muted-foreground",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        {Icon ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
        <span>{value}</span>
        {sign ? <span className="sr-only">{sign}</span> : null}
      </p>
    </div>
  );
}
