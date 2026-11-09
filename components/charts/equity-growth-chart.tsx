"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityChartDatum } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function EquityGrowthChart({ data, years = 5 }: { data: EquityChartDatum[]; years?: number }) {
  const fmt = useFormatters();
  const { settings } = useSettings();
  const sliced = data.slice(0, years);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sliced} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.5} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="propertyValue" name="Property Value" stroke={CHART_COLORS.secondary} strokeWidth={2} fill="url(#valueFill)" />
        <Area type="monotone" dataKey="loanBalance" name="Loan Balance" stroke={CHART_COLORS.muted} strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
        <Area type="monotone" dataKey="equity" name="Equity" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#equityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
