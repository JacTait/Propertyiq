"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export interface AppreciationDatum {
  year: string;
  value: number;
  baseline: number;
}

export function AppreciationChart({ data }: { data: AppreciationDatum[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();
  const baseline = data[0]?.baseline ?? 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="year" tick={{ fill: CHART_THEME.text, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={64}
          domain={["dataMin - 10000", "auto"]}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <Tooltip
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => [fmt.currency(Number(value)), "Projected Value"]}
        />
        <ReferenceLine y={baseline} stroke={CHART_COLORS.muted} strokeDasharray="4 4" label={{ value: "Purchase", fill: CHART_THEME.text, fontSize: 11, position: "insideTopLeft" }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.success}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_COLORS.success, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
