"use client";

import { Shield } from "lucide-react";
import type { MarginOfSafety, SafetyRating } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const RATING_TONE: Record<SafetyRating, "success" | "primary" | "warning" | "danger"> = {
  excellent: "success",
  strong: "success",
  good: "primary",
  weak: "warning",
  danger: "danger",
};

export function MarginOfSafetyCard({ margin }: { margin: MarginOfSafety }) {
  const fmt = useFormatters();
  const tone = RATING_TONE[margin.rating];

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              tone === "success" && "bg-success/15 text-success",
              tone === "primary" && "bg-primary/15 text-primary",
              tone === "warning" && "bg-warning/15 text-warning",
              tone === "danger" && "bg-destructive/15 text-destructive",
            )}
          >
            <Shield className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin of Safety</p>
              <Badge variant={tone}>{margin.ratingLabel}</Badge>
            </div>
            <p className="mt-1 text-2xl font-black tabular">{fmt.percent(margin.percent, 1)}</p>
            <p className="text-sm text-muted-foreground">{margin.detail}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Metric label="Recommended" value={fmt.currency(margin.recommendedOffer, { compact: true })} />
              <Metric label="Maximum" value={fmt.currency(margin.maximumOffer, { compact: true })} />
              <Metric label="Dollar cushion" value={fmt.signedCurrency(margin.dollarCushion)} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate font-bold tabular">{value}</p>
    </div>
  );
}
