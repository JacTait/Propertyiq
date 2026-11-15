"use client";

import type { MaxOfferResults } from "@/lib/types";
import { metricTone } from "@/lib/utils/labels";
import { useFormatters } from "@/hooks/useSettings";
import { MajorMetric } from "@/components/underwriting/major-metric";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { FinancialSection } from "@/components/underwriting/financial-section";

export function MaxOfferKpis({ results, askingPrice = 0 }: { results: MaxOfferResults; askingPrice?: number }) {
  const fmt = useFormatters();
  const m = results.atRecommended.purchasePrice > 0 ? results.atRecommended : results.atMaximum;
  const limiting = results.constraints.find((c) => c.isLimiting);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MajorMetric
          label="Target Offer"
          value={fmt.currency(results.recommendedOffer)}
          detail={`${fmt.percent(results.safetyMarginPercent)} below the ceiling`}
          tone="primary"
          size="major"
        />
        <MajorMetric
          label="Maximum Offer"
          value={fmt.currency(results.maximumOffer)}
          detail={limiting ? `Limited by ${limiting.label}` : results.feasible ? "All targets cleared" : "No feasible offer"}
          tone={results.feasible ? "success" : "danger"}
          size="major"
        />
        <MajorMetric
          label="Current Ask"
          value={askingPrice > 0 ? fmt.currency(askingPrice) : "—"}
          detail={askingPrice > 0 ? "Listing price entered" : "No asking price entered"}
          tone={askingPrice > 0 && askingPrice > results.maximumOffer ? "danger" : "default"}
        />
        <MajorMetric
          label="Margin of Safety"
          value={fmt.percent(results.safetyMarginPercent)}
          detail={fmt.currency(results.safetyMargin)}
          tone={results.safetyMargin > 0 ? "success" : "warning"}
        />
      </div>
      <FinancialSection title="Limiting constraint">
        <p className="mb-3 text-sm">
          {limiting
            ? `The final maximum offer is set by ${limiting.label}.`
            : "No single constraint is binding because the offer is not feasible on the current targets."}
        </p>
        {results.constraints.map((constraint) => (
          <FinancialDataRow
            key={constraint.key}
            label={constraint.label}
            value={fmt.currency(constraint.maxPurchasePrice)}
            emphasis={constraint.isLimiting}
            tone={constraint.isLimiting ? "warning" : "default"}
            status={constraint.isLimiting ? "warn" : "pass"}
          />
        ))}
        <FinancialDataRow label="Cashflow at recommended" value={fmt.signedCurrency(m.monthlyCashflow)} />
        <FinancialDataRow label="ROI at recommended" value={fmt.percent(m.roi)} tone={metricTone(m.roi, { good: 12, ok: 8 })} />
        <FinancialDataRow label="DSCR at recommended" value={fmt.ratio(m.dscr)} tone={metricTone(m.dscr, { good: 1.25, ok: 1 })} />
        <FinancialDataRow label="Cash-on-cash at recommended" value={fmt.percent(m.cashOnCash)} />
      </FinancialSection>
    </div>
  );
}
