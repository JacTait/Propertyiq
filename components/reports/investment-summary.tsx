"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, XCircle } from "lucide-react";
import type { InvestmentSummary as InvestmentSummaryType, SummarySection } from "@/lib/types";
import { recommendationTone } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatters } from "@/hooks/useSettings";

const toneDot: Record<SummarySection["tone"], string> = {
  positive: "bg-success",
  neutral: "bg-warning",
  negative: "bg-destructive",
};

export function InvestmentSummary({ summary, animated = true }: { summary: InvestmentSummaryType; animated?: boolean }) {
  const fmt = useFormatters();
  const tone = recommendationTone(summary.recommendation);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
            <Bot className="size-5" />
          </span>
          <div>
            <CardTitle>AI Investment Summary</CardTitle>
            <CardDescription>Analyst-style report generated from your inputs · {fmt.dateTime(summary.generatedAt)}</CardDescription>
          </div>
        </div>
        <Badge variant={tone} className="px-3 py-1 text-sm">
          {summary.recommendation}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <ListCard title="Strengths" items={summary.strengths} icon={CheckCircle2} className="border-success/30 bg-success/5" iconClass="text-success" />
          <ListCard title="Weaknesses" items={summary.weaknesses} icon={XCircle} className="border-destructive/30 bg-destructive/5" iconClass="text-destructive" />
        </div>

        <div className="space-y-5">
          {summary.sections.map((section, i) => (
            <motion.section
              key={section.key}
              initial={animated ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-4"
            >
              <span className={cn("absolute left-0 top-1.5 size-2 rounded-full", toneDot[section.tone])} />
              <h4 className="text-sm font-semibold">{section.title}</h4>
              <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5">
                    {section.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.section>
          ))}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          This summary is generated algorithmically from the figures you entered and the bundled regional market dataset.
          It is not financial advice. Verify all assumptions with your own due diligence.
        </p>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  items,
  icon: Icon,
  className,
  iconClass,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  className: string;
  iconClass: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
