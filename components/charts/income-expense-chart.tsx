"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IncomeExpenseChartDatum } from "@/lib/types";
import { CHART_COLORS } from "@/lib/constants";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { compactCurrency } from "@/lib/utils/format";
import { CHART_THEME } from "@/components/charts/chart-card";

export function IncomeExpenseChart({ data }: { data: IncomeExpenseChartDatum[] }) {
  const fmt = useFormatters();
  const { settings } = useSettings();
  const monthly = data.filter((d) => d.name === "Monthly");

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={monthly} barGap={8} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: CHART_THEME.text, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: CHART_THEME.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => compactCurrency(v, settings.currency)}
          width={64}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => fmt.currency(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_THEME.text }} iconType="circle" iconSize={8} />
        <Bar dataKey="income" name="Income" fill={CHART_COLORS.success} radius={[6, 6, 0, 0]} maxBarSize={56} />
        <Bar dataKey="expenses" name="Operating Expenses" fill={CHART_COLORS.warning} radius={[6, 6, 0, 0]} maxBarSize={56} />
        <Bar dataKey="debtService" name="Mortgage" fill={CHART_COLORS.muted} radius={[6, 6, 0, 0]} maxBarSize={56} />
        <Bar dataKey="cashflow" name="Cashflow" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
