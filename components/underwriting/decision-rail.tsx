"use client";

import type { QuickUnderwriteResults } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { DecisionStatus } from "@/components/underwriting/status-indicator";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import {
  DealSurvivalInfo,
  dealSurvivalInfoFromSnapshot,
} from "@/components/underwriting/deal-survival-info";

export function DecisionRail({
  results,
  className,
  sticky = false,
}: {
  results: QuickUnderwriteResults;
  className?: string;
  sticky?: boolean;
}) {
  const fmt = useFormatters();
  const score = results.downside?.dealSurvivalScore;
  const risk = results.downside?.primaryRisk;
  const dscr = results.refinance.postRefiDscrLabel;
  const cashLeft = results.cashRecovery?.cashLeftInDeal;

  return (
    <aside
      className={cn(
        "border border-border bg-card rounded-lg px-4 py-4",
        sticky && "xl:sticky xl:top-20",
        className,
      )}
    >
      <DecisionStatus verdict={results.verdict.verdict} label={results.verdict.label} />
      <div className="mt-4 flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>Deal Survival</span>
        <DealSurvivalInfo
          {...(results.downside ? dealSurvivalInfoFromSnapshot(results.downside) : {})}
        />
      </div>
      {score != null ? (
        <p className="mt-2 font-figure text-[32px] font-medium leading-none tabular-nums">
          {Math.round(score)}
          <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Survival score appears after the deal is fully specified.</p>
      )}
      <div className="mt-4 space-y-0.5 border-t border-border pt-3">
        <FinancialDataRow
          label="Underwritten Price"
          value={results.underwrittenPrice ? fmt.currency(results.underwrittenPrice) : "—"}
          detail={results.underwrittenPriceSource ? `Based on ${results.acquisitionPrice.label}` : "No price entered yet."}
        />
        <FinancialDataRow label="Maximum Offer" value={results.maximumOffer == null ? "—" : fmt.currency(results.maximumOffer)} />
        <FinancialDataRow label="Post-Refinance DSCR" value={dscr} />
        <FinancialDataRow label="Cash Left In Deal" value={cashLeft == null ? "—" : fmt.currency(cashLeft)} />
        <FinancialDataRow label="Primary Risk" value={risk ?? "—"} />
      </div>
      <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
        {results.verdict.rules.map((rule) => (
          <li
            key={rule.key}
            className={cn(
              "flex gap-2 text-sm",
              !rule.applicable && "text-muted-foreground",
              rule.applicable && rule.passed && "text-muted-foreground",
              rule.applicable && !rule.passed && "text-destructive",
            )}
          >
            <span className="font-figure w-3 shrink-0" aria-hidden>
              {rule.applicable ? (rule.passed ? "✓" : "✕") : "·"}
            </span>
            <span>
              {rule.label}
              {rule.detail ? <span className="mt-0.5 block text-xs text-muted-foreground">{rule.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Based on the assumptions entered. Not financial advice.</p>
    </aside>
  );
}
