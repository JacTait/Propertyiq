"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MaxOfferResults } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { compactCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { ChartCard, CHART_THEME } from "@/components/charts/chart-card";

export function MaxOfferCharts({ results }: { results: MaxOfferResults }) {
  const fmt = useFormatters();
  const { settings } = useSettings();
  const data = results.curve.map((p) => ({
    ...p,
    priceLabel: Math.round(p.purchasePrice),
  }));
  const max = results.maximumOffer;
  const rec = results.recommendedOffer;
  const asking = results.scenarios.find((s) => s.key === "asking")?.purchasePrice ?? 0;
  const ceiling = Math.max(max * 1.2, asking, rec, 1);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ChartCard title="Purchase Price vs Monthly Cashflow" description="Cashflow falls as leverage and debt service rise.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="purchasePrice"
              tick={{ fill: CHART_THEME.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
            />
            <YAxis
              tick={{ fill: CHART_THEME.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
            />
            <Tooltip
              contentStyle={CHART_THEME.tooltip}
              labelStyle={CHART_THEME.tooltipLabel}
              formatter={(value) => fmt.signedCurrency(Number(value))}
              labelFormatter={(label) => `Price ${fmt.currency(Number(label))}`}
            />
            {rec > 0 && <ReferenceLine x={rec} stroke={CHART_COLORS.primary} strokeDasharray="4 4" />}
            {max > 0 && <ReferenceLine x={max} stroke={CHART_COLORS.warning} strokeDasharray="4 4" />}
            <Line type="monotone" dataKey="monthlyCashflow" name="Cashflow" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Purchase Price vs ROI" description="Total first-year return on cash invested.">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
            <XAxis
              dataKey="purchasePrice"
              tick={{ fill: CHART_THEME.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
            />
            <YAxis
              tick={{ fill: CHART_THEME.text, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={CHART_THEME.tooltip}
              labelStyle={CHART_THEME.tooltipLabel}
              formatter={(value) => fmt.percent(Number(value))}
              labelFormatter={(label) => `Price ${fmt.currency(Number(label))}`}
            />
            {rec > 0 && <ReferenceLine x={rec} stroke={CHART_COLORS.primary} strokeDasharray="4 4" />}
            {max > 0 && <ReferenceLine x={max} stroke={CHART_COLORS.warning} strokeDasharray="4 4" />}
            <Line type="monotone" dataKey="roi" name="ROI" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Investment Safety Zone" description="Excellent, good and risk bands relative to your maximum.">
        <SafetyZone results={results} ceiling={ceiling} />
      </ChartCard>
    </div>
  );
}

function SafetyZone({ results, ceiling }: { results: MaxOfferResults; ceiling: number }) {
  const fmt = useFormatters();
  const rec = results.recommendedOffer;
  const max = results.maximumOffer;
  const asking = results.scenarios.find((s) => s.key === "asking")?.purchasePrice ?? 0;
  const scale = (price: number) => (ceiling <= 0 ? 0 : Math.min(100, Math.max(0, (price / ceiling) * 100)));

  const excellentWidth = scale(rec);
  const goodWidth = Math.max(0, scale(max) - excellentWidth);
  const riskWidth = Math.max(0, 100 - scale(max));

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="relative h-10 w-full overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 bg-success/80" style={{ width: `${excellentWidth}%` }} />
        <div className="absolute inset-y-0 bg-primary/80" style={{ left: `${excellentWidth}%`, width: `${goodWidth}%` }} />
        <div className="absolute inset-y-0 bg-destructive/80" style={{ left: `${excellentWidth + goodWidth}%`, width: `${riskWidth}%` }} />
        {rec > 0 && <Marker left={scale(rec)} label="Rec" tone="primary" />}
        {max > 0 && <Marker left={scale(max)} label="Max" tone="warning" />}
        {asking > 0 && <Marker left={scale(asking)} label="Ask" tone="danger" />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <LegendSwatch className="bg-success" label="Excellent Zone" value={`≤ ${fmt.currency(rec, { compact: true })}`} />
        <LegendSwatch className="bg-primary" label="Good Zone" value={`to ${fmt.currency(max, { compact: true })}`} />
        <LegendSwatch className="bg-destructive" label="Risk Zone" value={`above max`} />
      </div>
    </div>
  );
}

function Marker({ left, label, tone }: { left: number; label: string; tone: "primary" | "warning" | "danger" }) {
  return (
    <div className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%` }}>
      <div
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow",
          tone === "primary" && "bg-primary",
          tone === "warning" && "bg-warning text-warning-foreground",
          tone === "danger" && "bg-destructive",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function LegendSwatch({ className, label, value }: { className: string; label: string; value: string }) {
  return (
    <div>
      <span className={cn("mb-1 inline-block size-2 rounded-full", className)} />
      <p className="font-semibold text-muted-foreground">{label}</p>
      <p className="tabular text-foreground">{value}</p>
    </div>
  );
}
