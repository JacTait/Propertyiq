"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SensitivityPoint } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function VacancySensitivityChart({ data }: { data: SensitivityPoint[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="changePercent"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `+${v} pts`}
        />
        <YAxis
          yAxisId="cf"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <YAxis
          yAxisId="roi"
          orientation="right"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
        />
        <Tooltip
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          labelFormatter={(v) => `Vacancy +${v} pts`}
          formatter={(value, name) =>
            name === "ROI" ? fmt.percent(Number(value), 1) : fmt.currency(Number(value))
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <ReferenceLine yAxisId="cf" x={0} stroke={CHART_THEME.text} strokeOpacity={0.4} />
        <Line yAxisId="cf" type="monotone" dataKey="monthlyCashflow" name="Monthly Cashflow" stroke={CHART_COLORS.orange} strokeWidth={2.4} dot={{ r: 3 }} />
        <Line yAxisId="roi" type="monotone" dataKey="roi" name="ROI" stroke={CHART_COLORS.cyan} strokeWidth={2.4} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
