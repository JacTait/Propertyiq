"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
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

const toneClasses: Record<Tone, { icon: string; value: string; ring: string }> = {
  success: { icon: "bg-success/15 text-success", value: "text-success", ring: "from-success/20" },
  warning: { icon: "bg-warning/15 text-warning", value: "text-warning", ring: "from-warning/20" },
  danger: { icon: "bg-destructive/15 text-destructive", value: "text-destructive", ring: "from-destructive/20" },
  primary: { icon: "bg-primary/15 text-primary", value: "text-foreground", ring: "from-primary/20" },
  muted: { icon: "bg-muted text-muted-foreground", value: "text-foreground", ring: "from-muted/40" },
};

export function KpiCard({ label, value, sub, icon: Icon, tone = "primary", hint, index = 0, children }: KpiCardProps) {
  const t = toneClasses[tone];
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/40"
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100", t.ring)} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", t.icon)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className={cn("relative mt-2 text-xl font-bold tracking-tight tabular sm:text-2xl", t.value)}>{value}</p>
      {sub && <p className="relative mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
      {children}
    </motion.div>
  );

  if (!hint) return card;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="bottom">{hint}</TooltipContent>
    </Tooltip>
  );
}
