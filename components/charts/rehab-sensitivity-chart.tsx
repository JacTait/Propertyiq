"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RehabSensitivityPoint } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function RehabSensitivityChart({ data }: { data: RehabSensitivityPoint[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();
  const series = data.map((point) => ({
    ...point,
    remainingRehabHeadroom: point.remainingRehabHeadroom ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="changePercent"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
        />
        <YAxis
          yAxisId="cash"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <YAxis
          yAxisId="headroom"
          orientation="right"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <Tooltip
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          labelFormatter={(v) => `Rehab ${Number(v) > 0 ? "+" : ""}${v}%`}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <ReferenceLine yAxisId="cash" x={0} stroke={CHART_THEME.text} strokeOpacity={0.4} />
        <Line
          yAxisId="cash"
          type="monotone"
          dataKey="totalCashInvested"
          name="Total cash required"
          stroke={CHART_COLORS.warning}
          strokeWidth={2.4}
          dot={{ r: 3 }}
        />
        <Line
          yAxisId="headroom"
          type="monotone"
          dataKey="remainingRehabHeadroom"
          name="Remaining rehab headroom"
          stroke={CHART_COLORS.violet}
          strokeWidth={2.4}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
