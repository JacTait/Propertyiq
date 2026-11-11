"use client";

import type { AnalysisInput, AnalysisResults, InvestmentSummary, RentSource, UnderwritingPack } from "@/lib/types";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { ResultsPanel } from "@/components/dashboard/results-panel";
import { LiveSummary } from "@/components/workspace/live-summary";
import { SecondaryMetrics } from "@/components/workspace/secondary-metrics";

interface SectionAnalysisProps {
  decision: DealDecisionResult | null;
  input: AnalysisInput;
  results: AnalysisResults | null;
  summary: InvestmentSummary | null;
  underwriting: UnderwritingPack | null;
  onRentSourceChange: (source: RentSource) => void;
}

export function SectionAnalysis({
  decision,
  input,
  results,
  summary,
  underwriting,
  onRentSourceChange,
}: SectionAnalysisProps) {
  return (
    <div className="space-y-4">
      <div id="decision-summary" className="scroll-mt-28 space-y-4 xl:hidden">
        <LiveSummary decision={decision} />
        <SecondaryMetrics decision={decision} />
      </div>
      <p className="hidden text-sm text-muted-foreground xl:block">
        The live decision summary stays in the right-hand column while you edit. Projections and the legacy score sit
        under More detail.
      </p>
      {results && summary ? (
        <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">More detail — projections, charts and legacy score</summary>
          <div className="mt-4">
            <ResultsPanel
              input={input}
              results={results}
              summary={summary}
              underwriting={underwriting}
              onRentSourceChange={onRentSourceChange}
            />
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">Add a purchase price and conservative rent to load projections.</p>
      )}
    </div>
  );
}
