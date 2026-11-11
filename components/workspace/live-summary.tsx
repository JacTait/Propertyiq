"use client";

import { ArrowDownRight, ArrowUpRight, Minus, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { DealDecisionResult, MarginForErrorLabel } from "@/lib/calculations/deal-decision";
import { useFormatters } from "@/hooks/useSettings";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cashflowTone, signedMonthly, wholeMoney } from "@/components/workspace/decision-display";

interface LiveSummaryProps {
  decision: DealDecisionResult | null;
  id?: string;
  className?: string;
}

const MARGIN_BADGE: Record<
  MarginForErrorLabel,
  { variant: "success" | "warning" | "danger" | "primary"; icon: typeof ShieldCheck }
> = {
  "Stronger margin": { variant: "success", icon: ShieldCheck },
  "Moderate margin": { variant: "primary", icon: ShieldQuestion },
  "Thin margin": { variant: "warning", icon: ShieldAlert },
  "Negative underwrite": { variant: "danger", icon: ShieldAlert },
};

export function LiveSummary({ decision, id, className }: LiveSummaryProps) {
  const fmt = useFormatters();

  if (!decision) {
    return (
      <Card id={id} className={className}>
        <CardHeader>
          <CardTitle>Decision summary</CardTitle>
          <CardDescription>Enter a purchase price and conservative rent to underwrite the deal.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allInPct = decision.costs.allInPctConservativeArv;
  const guideline = decision.guidelineMaxOffer;
  const conservativeCf = decision.conservative.monthlyCashflow;
  const stressCf = decision.scenarios.stress.monthlyCashflow;
  const margin = decision.marginForError;
  const marginMeta = MARGIN_BADGE[margin.label];
  const MarginIcon = marginMeta.icon;

  return (
    <Card id={id} className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Decision summary</CardTitle>
        <CardDescription>What you are into the deal for, how it cash-flows, and the guideline ceiling.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total all-in cost</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight tabular">{wholeMoney(fmt, decision.costs.allInCost)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Purchase, acquisition costs, rehab and holding.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CashflowBlock
            label="Conservative cash flow"
            value={signedMonthly(fmt, conservativeCf)}
            tone={cashflowTone(conservativeCf)}
            hint="NOI − P&I on the conservative underwrite."
          />
          <CashflowBlock
            label="Stress-case cash flow"
            value={signedMonthly(fmt, stressCf)}
            tone={cashflowTone(stressCf)}
            hint={
              decision.stressUsesProductDefaults
                ? "Uses default stress-case haircuts until you customise them. Not a verified custom scenario."
                : "Uses the saved stress-case assumptions on this deal."
            }
          />
        </div>

        <div className="space-y-3 border-t border-border/60 pt-3">
          <MetricBlock
            label="All-in % of conservative ARV"
            value={allInPct === null ? null : fmt.percent(allInPct, 1)}
            empty="Add a conservative ARV to calculate."
            hint="Total all-in cost ÷ conservative ARV."
          />
          <MetricBlock
            label="Investor guideline max offer"
            value={guideline === null ? null : wholeMoney(fmt, guideline)}
            empty="Add a conservative ARV to calculate."
            hint="Based on your configurable ARV guideline."
          />
        </div>

        <div
          className={cn(
            "rounded-xl border px-3 py-3",
            margin.label === "Negative underwrite" && "border-destructive/30 bg-destructive/8",
            margin.label === "Thin margin" && "border-warning/30 bg-warning/8",
            margin.label === "Moderate margin" && "border-border bg-muted/30",
            margin.label === "Stronger margin" && "border-success/30 bg-success/8",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin for error</p>
            <Badge variant={marginMeta.variant}>
              <MarginIcon aria-hidden />
              {margin.label}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-foreground">{margin.explanation}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Descriptive status from cash flow, stress, rehab headroom and the ARV guideline — not a score or a guarantee.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CashflowBlock({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative" | "zero";
  hint: string;
}) {
  const Icon = tone === "positive" ? ArrowUpRight : tone === "negative" ? ArrowDownRight : Minus;
  const sign = tone === "positive" ? "Positive" : tone === "negative" ? "Negative" : "Breakeven";
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-lg font-semibold tabular sm:text-xl",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span>{value}</span>
        <span className="sr-only">{sign}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  empty,
  hint,
}: {
  label: string;
  value: string | null;
  empty: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <p className="mt-1 text-xl font-semibold tabular">{value}</p>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
