"use client";

import {
  Activity,
  BadgePercent,
  Banknote,
  CircleDollarSign,
  Coins,
  Landmark,
  LineChart,
  Percent,
  PiggyBank,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { AnalysisResults } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { metricTone } from "@/lib/utils/labels";
import { KpiCard } from "@/components/dashboard/kpi-card";

export function KpiGrid({ results }: { results: AnalysisResults }) {
  const fmt = useFormatters();
  const r = results;
  const roiDisplay = r.roi >= 999 ? "∞" : fmt.percent(r.roi);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      <KpiCard index={0} label="Mortgage Payment" value={fmt.currency(r.mortgage.monthlyPayment)} sub="per month" icon={Landmark} tone="muted" hint="Principal & interest payment based on true amortisation" />
      <KpiCard index={1} label="Cashflow" value={fmt.signedCurrency(r.monthlyCashflow)} sub="per month after debt" icon={Wallet} tone={metricTone(r.monthlyCashflow, { good: 300, ok: 0 })} />
      <KpiCard index={2} label="Annual Cashflow" value={fmt.signedCurrency(r.annualCashflow)} sub="NOI − debt service" icon={Banknote} tone={metricTone(r.annualCashflow, { good: 3600, ok: 0 })} />
      <KpiCard index={3} label="Gross Yield" value={fmt.percent(r.grossYield)} sub="gross income ÷ price" icon={Percent} tone={metricTone(r.grossYield, { good: 7, ok: 5 })} />
      <KpiCard index={4} label="Net Yield" value={fmt.percent(r.netYield)} sub="NOI ÷ price" icon={BadgePercent} tone={metricTone(r.netYield, { good: 5, ok: 3.5 })} />
      <KpiCard index={5} label="Cap Rate" value={fmt.percent(r.capRate)} sub="unlevered return" icon={Activity} tone={metricTone(r.capRate, { good: 6.5, ok: 4.5 })} />
      <KpiCard index={6} label="Cash-on-Cash" value={fmt.percent(r.cashOnCash)} sub="cashflow ÷ cash invested" icon={Coins} tone={metricTone(r.cashOnCash, { good: 8, ok: 4 })} />
      <KpiCard index={7} label="ROI" value={roiDisplay} sub={r.fixFlip ? "profit ÷ cash invested" : r.brrrr ? "on cash left in deal" : "yr 1 incl. equity & appreciation"} icon={TrendingUp} tone={metricTone(r.roi, { good: 12, ok: 6 })} />
      <KpiCard index={8} label="DSCR" value={fmt.ratio(r.dscr)} sub="NOI ÷ debt service" icon={Scale} tone={metricTone(r.dscr, { good: 1.25, ok: 1.0 })} hint="Lenders typically require 1.20x–1.25x" />
      <KpiCard index={9} label="NOI" value={fmt.currency(r.noi)} sub="per year" icon={CircleDollarSign} tone={metricTone(r.noi, { good: 1, ok: 0 })} />
      <KpiCard index={10} label="Equity Projection" value={fmt.currency(r.fiveYear.equity)} sub={`year 5 · ${fmt.signedCurrency(r.fiveYear.equityGain)}`} icon={LineChart} tone="primary" />
      <KpiCard index={11} label="Total Cash Invested" value={fmt.currency(r.totalCashInvested)} sub="deposit, fees & capital" icon={PiggyBank} tone="muted" />
    </div>
  );
}
