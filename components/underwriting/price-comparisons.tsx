"use client";

import type { PriceVsMaximumOffer } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { FinancialSection } from "@/components/underwriting/financial-section";
import { formatMoneyDelta } from "@/lib/calculations/underwritten-price";

function toneFor(status: PriceVsMaximumOffer["status"]) {
  if (status === "above-maximum") return "danger" as const;
  if (status === "below-maximum") return "success" as const;
  if (status === "at-maximum") return "warning" as const;
  return "muted" as const;
}

export function PriceComparisons({
  comparisons,
  maximumOffer,
}: {
  comparisons: PriceVsMaximumOffer[];
  maximumOffer: number | null;
}) {
  const fmt = useFormatters();
  return (
    <FinancialSection eyebrow="Price checks" title="Price vs Maximum Offer">
      {comparisons.map((item) => (
        <div key={item.key} className="border-t border-border pt-2 first:border-0 first:pt-0">
          <FinancialDataRow
            label={item.label}
            value={item.entered ? fmt.currency(item.price) : "—"}
          />
          {item.entered && maximumOffer !== null && maximumOffer > 0 ? (
            <FinancialDataRow label="Maximum Offer" value={fmt.currency(maximumOffer)} />
          ) : null}
          <FinancialDataRow
            label={item.differenceLabel}
            value={item.difference === null ? "—" : formatMoneyDelta(item.difference)}
            tone={toneFor(item.status)}
          />
          <FinancialDataRow label="Status" value={item.statusLabel} tone={toneFor(item.status)} />
        </div>
      ))}
    </FinancialSection>
  );
}
