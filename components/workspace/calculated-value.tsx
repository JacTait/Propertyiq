"use client";

import { cn } from "@/lib/utils/cn";

interface CalculatedValueProps {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
  className?: string;
}

export function CalculatedValue({ label, value, hint, emphasize, className }: CalculatedValueProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div
        className={cn(
          "flex h-10 items-center rounded-lg border border-dashed px-3 text-sm font-semibold tabular",
          emphasize
            ? "border-primary/40 bg-primary/8 text-foreground"
            : "border-border bg-muted/40 text-foreground",
        )}
      >
        {value}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
