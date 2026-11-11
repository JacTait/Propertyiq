"use client";

import type { AnalysisInput, AnalysisResults, InvestmentSummary, RentSource, UnderwritingPack } from "@/lib/types";
import { ResultsPanel } from "@/components/dashboard/results-panel";

interface SectionAnalysisProps {
  input: AnalysisInput;
  results: AnalysisResults | null;
  summary: InvestmentSummary | null;
  underwriting: UnderwritingPack | null;
  onRentSourceChange: (source: RentSource) => void;
}

export function SectionAnalysis({
  input,
  results,
  summary,
  underwriting,
  onRentSourceChange,
}: SectionAnalysisProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Conservative cash flow, scenarios, assumption checks and “what breaks this deal?” will sit here. Until then,
        existing projections stay under More detail so nothing is lost.
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
