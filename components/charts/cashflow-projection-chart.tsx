"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowChartDatum } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function CashflowProjectionChart({ data }: { data: CashflowChartDatum[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="year" tick={{ fill: CHART_THEME.text, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <ReferenceLine y={0} stroke={CHART_THEME.text} strokeOpacity={0.5} />
        <Bar dataKey="cashflow" name="Annual Cashflow" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((d) => (
            <Cell key={d.year} fill={d.cashflow >= 0 ? CHART_COLORS.success : CHART_COLORS.danger} />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="cumulative"
          name="Cumulative"
          stroke={CHART_COLORS.primary}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
