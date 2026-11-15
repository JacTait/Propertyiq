import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ScenarioColumn {
  key: string;
  label: string;
}

export interface ScenarioRow {
  key: string;
  label: string;
  values: Record<string, ReactNode>;
  emphasize?: boolean;
}

export function ScenarioComparison({
  title,
  columns,
  rows,
  className,
}: {
  title: string;
  columns: ScenarioColumn[];
  rows: ScenarioRow[];
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden border border-border bg-card rounded-lg", className)}>
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-[17px] font-medium">{title}</h2>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Metric</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-2 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border last:border-0">
                <th
                  scope="row"
                  className={cn("px-4 py-2 text-left font-normal text-muted-foreground", row.emphasize && "font-medium text-foreground")}
                >
                  {row.label}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-2 text-right font-figure tabular-nums", row.emphasize && "font-medium")}>
                    {row.values[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
