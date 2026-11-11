"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SensitivityPoint } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters } from "@/hooks/useSettings";
import { CHART_THEME } from "@/components/charts/chart-card";

export function RefinanceSensitivityChart({ data }: { data: SensitivityPoint[] }) {
  const fmt = useFormatters();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis
          dataKey="changePercent"
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v} LTV`}
        />
        <YAxis
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => `${Number(v).toFixed(2)}x`}
        />
        <Tooltip
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          labelFormatter={(v) => `Refinance LTV ${Number(v) > 0 ? "+" : ""}${v} pts`}
          formatter={(value, name) =>
            name === "Post-Refi DSCR" ? fmt.ratio(Number(value)) : fmt.currency(Number(value))
          }
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <ReferenceLine x={0} stroke={CHART_THEME.text} strokeOpacity={0.4} />
        <ReferenceLine y={1} stroke={CHART_COLORS.danger} strokeDasharray="4 4" strokeOpacity={0.7} />
        <Line type="monotone" dataKey="dscr" name="Post-Refi DSCR" stroke={CHART_COLORS.violet} strokeWidth={2.4} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
