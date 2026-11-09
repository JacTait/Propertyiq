import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface StatRowProps {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  className?: string;
}

export function StatRow({ label, value, emphasis = false, className }: StatRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 text-sm", className)}>
      <span className={cn("text-muted-foreground", emphasis && "font-semibold text-foreground")}>{label}</span>
      <span className={cn("tabular font-medium", emphasis && "text-base font-bold")}>{value}</span>
    </div>
  );
}
