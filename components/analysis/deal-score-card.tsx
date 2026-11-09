"use client";

import { motion } from "framer-motion";
import { Award, ShieldAlert, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import type { DealScore, Recommendation } from "@/lib/types";
import { gradeTone, recommendationTone } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DealScoreGauge } from "@/components/analysis/deal-score-gauge";
import { useFormatters } from "@/hooks/useSettings";

const REC_ICONS: Record<Recommendation, typeof Award> = {
  "Elite Opportunity": Sparkles,
  "Strong Buy": Award,
  Buy: ThumbsUp,
  Neutral: ShieldCheck,
  "High Risk": ShieldAlert,
  Avoid: ThumbsDown,
};

const toneBg: Record<string, string> = {
  success: "from-success/20 via-success/5",
  primary: "from-primary/20 via-primary/5",
  warning: "from-warning/20 via-warning/5",
  danger: "from-destructive/20 via-destructive/5",
  muted: "from-muted via-muted/40",
};

const toneBar: Record<string, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};

export function DealScoreCard({ dealScore, animated = true }: { dealScore: DealScore; animated?: boolean }) {
  const fmt = useFormatters();
  const tone = gradeTone(dealScore.grade);
  const recTone = recommendationTone(dealScore.recommendation);
  const RecIcon = REC_ICONS[dealScore.recommendation];

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent", toneBg[tone])} />
      <CardContent className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <DealScoreGauge score={dealScore.score} grade={dealScore.grade} animated={animated} />
          <Badge variant={tone} className="px-3 py-1 text-sm">
            {dealScore.gradeLabel}
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  recTone === "success" && "bg-success/20 text-success",
                  recTone === "primary" && "bg-primary/20 text-primary",
                  recTone === "warning" && "bg-warning/20 text-warning",
                  recTone === "danger" && "bg-destructive/20 text-destructive",
                )}
              >
                <RecIcon className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommendation</p>
                <p className="text-lg font-bold">{dealScore.recommendation}</p>
                <p className="mt-1 text-sm text-muted-foreground">{dealScore.headline}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-2.5">
            {dealScore.components.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground">{Math.round(c.weight * 100)}% weight</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: "easeOut" }}
                    className={cn("h-full rounded-full", toneBar[scoreTone(c.score)])}
                  />
                </div>
                <div className="w-20 text-right">
                  <p className="font-semibold tabular">{Math.round(c.score)}/100</p>
                  <p className="text-[10px] text-muted-foreground tabular">{rawLabel(c.key, c.rawValue, fmt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function scoreTone(score: number): string {
  if (score >= 70) return "success";
  if (score >= 45) return "warning";
  return "danger";
}

function rawLabel(
  key: DealScore["components"][number]["key"],
  value: number,
  fmt: ReturnType<typeof useFormatters>,
): string {
  switch (key) {
    case "cashflow":
      return `${fmt.currency(value)}/mo`;
    case "dscr":
      return fmt.ratio(value);
    default:
      return fmt.percent(value);
  }
}
