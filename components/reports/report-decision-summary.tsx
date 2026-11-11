"use client";

import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { reportAssumptionIssues, reportPrimaryMetrics, reportWhatBreaks } from "@/lib/calculations/report-decision";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { cashflowTone, MARGIN_BADGE_VARIANT, signedMonthly, wholeMoney } from "@/components/workspace/decision-display";
import { cn } from "@/lib/utils/cn";

interface ReportDecisionSummaryProps {
  decision: DealDecisionResult;
}

export function ReportDecisionSummary({ decision }: ReportDecisionSummaryProps) {
  const fmt = useFormatters();
  const metrics = reportPrimaryMetrics(decision);
  const issues = reportAssumptionIssues(decision);
  const breaks = reportWhatBreaks(decision, fmt);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Deal Workspace underwrite</p>
        <h2 className="mt-1 text-xl font-semibold">Decision summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Conservative figures from the saved Deal Workspace inputs. Stress-case cash flow uses the same persisted stress
          scenario. The investor guideline below is an ARV-based ceiling, not the return-based Max Offer engine.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric
          label="Total all-in cost"
          value={metrics.allInCost === null ? null : wholeMoney(fmt, metrics.allInCost)}
          empty="All-in cost is unavailable."
        />
        <Metric
          label="All-in % of conservative ARV"
          value={metrics.allInPctConservativeArv === null ? null : fmt.percent(metrics.allInPctConservativeArv, 1)}
          empty="Add a conservative ARV to calculate all-in percent."
        />
        <Metric
          label="Conservative monthly cash flow"
          value={metrics.conservativeMonthlyCashflow === null ? null : signedMonthly(fmt, metrics.conservativeMonthlyCashflow)}
          empty="Enter conservative rent to calculate cash flow."
          tone={metrics.conservativeMonthlyCashflow === null ? undefined : cashflowTone(metrics.conservativeMonthlyCashflow)}
        />
        <Metric
          label="Stress-case monthly cash flow"
          value={metrics.stressMonthlyCashflow === null ? null : signedMonthly(fmt, metrics.stressMonthlyCashflow)}
          empty="Stress cash flow is unavailable."
          tone={metrics.stressMonthlyCashflow === null ? undefined : cashflowTone(metrics.stressMonthlyCashflow)}
        />
        <Metric
          label="Investor guideline max offer"
          value={metrics.guidelineMaxOffer === null ? null : wholeMoney(fmt, metrics.guidelineMaxOffer)}
          empty="Add a conservative ARV to calculate the ARV-based guideline. This is not the Max Offer analyser."
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin for error</p>
          <Badge variant={MARGIN_BADGE_VARIANT[decision.marginForError.label]} className="mt-1">
            {metrics.marginLabel}
          </Badge>
          <p className="mt-1 text-sm text-muted-foreground">{metrics.marginExplanation}</p>
        </div>
      </div>

      {metrics.allCash ? (
        <p className="text-sm text-muted-foreground">
          All-cash underwrite: cash flow equals NOI because P&amp;I is zero. DSCR is not applicable.
        </p>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold">Assumption issues requiring review</h3>
        {issues.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No high-risk or review items on the current inputs.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {issues.map((item) => (
              <li key={item.key} className="text-sm">
                <span className="font-medium">{item.title}.</span>{" "}
                <span className="text-muted-foreground">{item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">What breaks this deal</h3>
        <p className="mt-1 text-xs text-muted-foreground">Limits from the current underwrite. Not an investment recommendation.</p>
        {breaks.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Add a purchase price and conservative rent to calculate limits.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {breaks.map((item) => (
              <li key={item.key} className="text-sm">
                <span className="font-medium">{item.title}</span>
                {item.value ? <span className="tabular"> — {item.value}</span> : null}
                <span className="text-muted-foreground">. {item.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  empty,
  tone,
}: {
  label: string;
  value: string | null;
  empty: string;
  tone?: "positive" | "negative" | "zero";
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>
      )}
    </div>
  );
}
