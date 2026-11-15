import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { DataRowTone } from "@/components/underwriting/financial-data-row";

const TONE: Record<DataRowTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function MajorMetric({
  label,
  value,
  detail,
  tone = "default",
  size = "kpi",
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: DataRowTone;
  size?: "major" | "kpi";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 border border-border bg-card px-4 py-3 rounded-lg", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-figure font-medium tabular-nums tracking-tight",
          size === "major" ? "text-[32px] leading-none sm:text-[40px]" : "text-[22px] leading-none sm:text-[26px]",
          TONE[tone],
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
