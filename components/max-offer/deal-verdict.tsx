"use client";

import { motion } from "framer-motion";
import { Ban, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import type { MaxOfferResults, OfferTier } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";

const TONE: Record<OfferTier, { wrap: string; icon: string; Icon: typeof Sparkles }> = {
  excellent: { wrap: "border-success/30 from-success/20", icon: "bg-success text-success-foreground", Icon: Sparkles },
  good: { wrap: "border-primary/30 from-primary/20", icon: "bg-primary text-primary-foreground", Icon: CheckCircle2 },
  maximum: { wrap: "border-warning/30 from-warning/20", icon: "bg-warning text-warning-foreground", Icon: ShieldAlert },
  "too-expensive": { wrap: "border-destructive/30 from-destructive/20", icon: "bg-destructive text-destructive-foreground", Icon: Ban },
};

export function DealVerdict({ results, evaluating = false }: { results: MaxOfferResults; evaluating?: boolean }) {
  const rec = results.recommendation;
  const tone = TONE[rec.tier];
  const Icon = tone.Icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn("relative overflow-hidden border bg-gradient-to-r via-card to-card", tone.wrap)}>
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-current opacity-10 blur-3xl" />
        <CardContent className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-lg", tone.icon)}>
            <Icon className="size-6" />
          </span>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {evaluating ? "Deal Status" : "Discovery"}
            </p>
            <h3 className="text-2xl font-black tracking-tight">{rec.title}</h3>
            <p className="text-sm leading-relaxed text-foreground/90">{rec.headline}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{rec.body}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
