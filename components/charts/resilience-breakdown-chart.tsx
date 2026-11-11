"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import { CHART_THEME } from "@/components/charts/chart-card";

export function ResilienceBreakdownChart({
  components,
}: {
  components: Array<{ label: string; score: number }>;
}) {
  const data = components.map((c) => ({
    name: c.label.replace(" Survival", "").replace(" Durability", "").replace(" of Safety", "").replace(" Viability", ""),
    score: c.score,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: CHART_THEME.text, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: CHART_THEME.text, fontSize: 11 }} axisLine={false} tickLine={false} width={88} />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value) => [`${Math.round(Number(value))}/100`, "Score"]}
        />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={22}>
          {data.map((d) => (
            <Cell
              key={d.name}
              fill={d.score >= 80 ? CHART_COLORS.success : d.score >= 60 ? CHART_COLORS.warning : CHART_COLORS.danger}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
