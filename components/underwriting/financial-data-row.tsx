import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type DataRowTone = "default" | "success" | "warning" | "danger" | "primary" | "muted";
export type DataRowStatus = "pass" | "fail" | "warn" | "info";

export interface FinancialDataRowProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasis?: boolean;
  divider?: boolean;
  tone?: DataRowTone;
  status?: DataRowStatus;
  tooltip?: string;
  className?: string;
}

const TONE: Record<DataRowTone, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

const STATUS: Record<DataRowStatus, { mark: string; className: string; label: string }> = {
  pass: { mark: "✓", className: "text-success", label: "Pass" },
  fail: { mark: "✕", className: "text-destructive", label: "Fail" },
  warn: { mark: "!", className: "text-warning", label: "Attention" },
  info: { mark: "i", className: "text-muted-foreground", label: "Information" },
};

export function FinancialDataRow({
  label,
  value,
  detail,
  emphasis = false,
  divider = false,
  tone = "default",
  status,
  tooltip,
  className,
}: FinancialDataRowProps) {
  const statusMeta = status ? STATUS[status] : null;

  return (
    <div
      className={cn(
        "flex min-h-8 items-baseline justify-between gap-4 py-1.5 text-sm",
        divider && "border-t border-border pt-2.5 mt-1",
        emphasis && "min-h-10",
        className,
      )}
    >
      <span className={cn("flex min-w-0 items-center gap-1.5", emphasis ? "font-medium text-foreground" : "text-muted-foreground")}>
        {statusMeta ? (
          <span className={cn("font-figure text-[11px]", statusMeta.className)} aria-label={statusMeta.label}>
            {statusMeta.mark}
          </span>
        ) : null}
        <span className={cn(emphasis && "uppercase tracking-[0.12em] text-[11px]")}>{label}</span>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/70 hover:text-foreground" aria-label={`About ${label}`}>
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <span className="min-w-0 text-right">
        <span className={cn("font-figure tabular-nums", emphasis ? "text-base" : "text-sm", TONE[tone])}>{value}</span>
        {detail ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span> : null}
      </span>
    </div>
  );
}
