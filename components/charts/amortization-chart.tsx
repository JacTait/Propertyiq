"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AmortizationChartDatum } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function AmortizationChart({ data }: { data: AmortizationChartDatum[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No mortgage — purchase is all cash
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={data.length > 15 ? 4 : 1}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <Bar yAxisId="left" dataKey="principal" name="Principal" stackId="pay" fill={CHART_COLORS.primary} maxBarSize={28} />
        <Bar yAxisId="left" dataKey="interest" name="Interest" stackId="pay" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Area yAxisId="right" type="monotone" dataKey="balance" name="Balance" stroke={CHART_COLORS.secondary} strokeWidth={2} fill="url(#balanceFill)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
