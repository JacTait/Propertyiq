"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ResilienceScenarioMetrics } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

const COLORS: Record<string, string> = {
  best: CHART_COLORS.success,
  expected: CHART_COLORS.primary,
  stress: CHART_COLORS.warning,
  worst: CHART_COLORS.danger,
};

export function CashflowStressChart({ scenarios }: { scenarios: ResilienceScenarioMetrics[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={scenarios} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: CHART_THEME.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <ReferenceLine y={0} stroke={CHART_THEME.text} strokeOpacity={0.4} />
        <Bar dataKey="monthlyCashflow" name="Monthly Cashflow" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {scenarios.map((s) => (
            <Cell key={s.key} fill={COLORS[s.key] ?? CHART_COLORS.primary} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
