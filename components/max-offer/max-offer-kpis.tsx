"use client";

import { BadgeDollarSign, Landmark, Percent, Shield, TrendingUp, Wallet } from "lucide-react";
import type { MaxOfferResults } from "@/lib/types";
import { metricTone } from "@/lib/utils/labels";
import { useFormatters } from "@/hooks/useSettings";
import { KpiCard } from "@/components/dashboard/kpi-card";

export function MaxOfferKpis({ results }: { results: MaxOfferResults }) {
  const fmt = useFormatters();
  const m = results.atRecommended.purchasePrice > 0 ? results.atRecommended : results.atMaximum;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        index={0}
        label="Maximum Offer Price"
        value={fmt.currency(results.maximumOffer, { compact: true })}
        sub="highest price you can pay and still hit every target"
        icon={BadgeDollarSign}
        tone={results.feasible ? "success" : "danger"}
      />
      <KpiCard
        index={1}
        label="Recommended Offer"
        value={fmt.currency(results.recommendedOffer, { compact: true })}
        sub={`${fmt.percent(results.safetyMarginPercent)} below the ceiling`}
        icon={Shield}
        tone="primary"
      />
      <KpiCard
        index={2}
        label="Safety Margin"
        value={fmt.currency(results.safetyMargin, { compact: true })}
        sub="maximum minus recommended"
        icon={Shield}
        tone={results.safetyMargin > 0 ? "success" : "warning"}
      />
      <KpiCard
        index={3}
        label="Expected Monthly Cashflow"
        value={fmt.signedCurrency(m.monthlyCashflow)}
        sub="at the recommended offer"
        icon={Wallet}
        tone={metricTone(m.monthlyCashflow, { good: 300, ok: 0 })}
      />
      <KpiCard
        index={4}
        label="First-year return at recommended offer"
        value={fmt.percent(m.roi)}
        sub="Annual cash flow plus year-one principal, divided by total cash invested."
        icon={TrendingUp}
        tone={metricTone(m.roi, { good: 12, ok: 8 })}
      />
      <KpiCard
        index={5}
        label="Cash-on-cash at recommended offer"
        value={fmt.percent(m.cashOnCash)}
        sub="annual cashflow ÷ cash invested"
        icon={Percent}
        tone={metricTone(m.cashOnCash, { good: 8, ok: 4 })}
      />
      <KpiCard
        index={6}
        label="DSCR"
        value={fmt.ratio(m.dscr)}
        sub="NOI ÷ annual debt service"
        icon={Landmark}
        tone={metricTone(m.dscr, { good: 1.25, ok: 1 })}
      />
      <KpiCard
        index={7}
        label="Cap Rate"
        value={fmt.percent(m.capRate)}
        sub="NOI ÷ purchase price"
        icon={TrendingUp}
        tone={metricTone(m.capRate, { good: 6, ok: 4 })}
      />
    </div>
  );
}
