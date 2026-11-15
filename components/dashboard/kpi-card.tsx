import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/utils/labels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  index?: number;
  children?: ReactNode;
}

const VALUE_TONE: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  primary: "text-foreground",
  muted: "text-foreground",
};

export function KpiCard({ label, value, sub, icon: Icon, tone = "primary", hint, children }: KpiCardProps) {
  const card = (
    <div className="border border-border bg-card px-4 py-3 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
      </div>
      <p className={cn("mt-2 font-figure text-[22px] font-medium leading-none tabular-nums sm:text-[26px]", VALUE_TONE[tone])}>
        {value}
      </p>
      {sub && <p className="mt-1.5 truncate text-xs text-muted-foreground">{sub}</p>}
      {children}
    </div>
  );

  if (!hint) return card;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}
