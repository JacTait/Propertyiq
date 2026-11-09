"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartDatum } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { CHART_THEME } from "@/components/charts/chart-card";

export function ExpenseBreakdownChart({ data }: { data: ChartDatum[] }) {
  const fmt = useFormatters();
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0 || total <= 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No expenses to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color ?? "#6366f1"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={CHART_THEME.tooltip}
          labelStyle={CHART_THEME.tooltipLabel}
          formatter={(value, name) => [
            `${fmt.currency(Number(value))} (${((Number(value) / total) * 100).toFixed(1)}%)`,
            String(name),
          ]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: CHART_THEME.text, maxWidth: "45%" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
