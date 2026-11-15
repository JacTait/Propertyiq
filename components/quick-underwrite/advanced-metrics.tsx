"use client";

import { CollapsibleSection } from "@/components/quick-underwrite/collapsible-section";
import { StatRow } from "@/components/dashboard/stat-row";
import { SelectField } from "@/components/forms/fields";
import { CAP_RATE_BASIS_OPTIONS } from "@/lib/constants";
import { useFormatters } from "@/hooks/useSettings";
import type { AnalysisResults, QuickUnderwriteResults } from "@/lib/types";
import { formatDscr } from "@/lib/calculations/ratios";

export function AdvancedMetrics({
  results,
  analysis,
}: {
  results: QuickUnderwriteResults;
  analysis: AnalysisResults | null;
}) {
  const fmt = useFormatters();
  return (
    <CollapsibleSection
      title="Advanced metrics"
      description="Yield, projections and extra ratios stay here so they do not crowd the refinance decision."
    >
      <SelectField name="decision.capRateBasis" label="Cap rate value basis" options={CAP_RATE_BASIS_OPTIONS} />
      <p className="mb-3 text-xs text-muted-foreground">
        Cap rate uses {results.capRateBasisLabel}. The basis does not change unless you select a different one.
      </p>
      <StatRow label={`Cap rate (${results.capRateBasisLabel})`} value={results.capRate === null ? "—" : fmt.percent(results.capRate)} />
      <StatRow label="Cash-on-cash" value={results.cashOnCash === null ? "—" : fmt.percent(results.cashOnCash)} />
      {analysis ? (
        <>
          <StatRow label="Gross yield" value={fmt.percent(analysis.grossYield)} />
          <StatRow label="Net yield" value={fmt.percent(analysis.netYield)} />
          <StatRow label="Acquisition DSCR" value={formatDscr(analysis.dscr)} />
          <StatRow label="5-year equity" value={fmt.currency(analysis.fiveYear.equity)} />
          <StatRow label="10-year total return" value={fmt.percent(analysis.tenYear.roi)} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Full yield metrics appear after a purchase or proposed offer is entered.</p>
      )}
    </CollapsibleSection>
  );
}
