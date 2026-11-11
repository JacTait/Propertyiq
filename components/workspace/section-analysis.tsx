"use client";

import type { AnalysisInput, AnalysisResults, InvestmentSummary, RentSource, UnderwritingPack } from "@/lib/types";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { ResultsPanel } from "@/components/dashboard/results-panel";
import { LiveSummary } from "@/components/workspace/live-summary";
import { AssumptionCheck } from "@/components/workspace/assumption-check";
import { ScenarioTable } from "@/components/workspace/scenario-table";
import { WhatBreaks } from "@/components/workspace/what-breaks";
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
      <div id="decision-summary" className="scroll-mt-28 xl:hidden">
        <LiveSummary decision={decision} />
      </div>
      <p className="hidden text-sm text-muted-foreground xl:block">
        The live decision summary stays in the right-hand column. Checks, scenarios and limits sit here so traditional
        metrics stay secondary.
      </p>
      <AssumptionCheck decision={decision} />
      <ScenarioTable decision={decision} />
      <WhatBreaks decision={decision} />
      {decision ? (
        <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            Secondary metrics — traditional ratios
          </summary>
          <div className="mt-4">
            <SecondaryMetrics decision={decision} />
          </div>
        </details>
      ) : null}
      {results && summary ? (
        <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            More detail — projections, charts and legacy score
          </summary>
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
