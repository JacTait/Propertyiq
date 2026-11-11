"use client";

import { Compass, Shield } from "lucide-react";
import type { MarginOfSafety, MaxOfferResults, OfferTier, SafetyRating } from "@/lib/types";
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

const STATUS_TONE: Record<OfferTier, "success" | "primary" | "warning" | "danger"> = {
  excellent: "success",
  good: "primary",
  maximum: "warning",
  "too-expensive": "danger",
};

export function OfferEvaluationCard({
  askingPrice,
  results,
  margin,
}: {
  askingPrice: number | null;
  results: MaxOfferResults;
  margin: MarginOfSafety;
}) {
  const fmt = useFormatters();

  if (!askingPrice || !margin.ready) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Compass className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Margin of Safety</p>
                <Badge variant="muted">Discovery</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter asking price to calculate margin of safety.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tone = margin.rating ? RATING_TONE[margin.rating] : STATUS_TONE[results.recommendation.tier];
  const overpriced = Math.max(0, askingPrice - results.maximumOffer);
  const cushion = Math.max(0, results.maximumOffer - askingPrice);

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
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Listing Evaluation</p>
              <Badge variant="primary">Evaluation</Badge>
            </div>
            <p className="mt-1 text-2xl font-black tabular">{fmt.percent(margin.percent, 1)}</p>
            <p className="text-sm text-muted-foreground">{margin.detail}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Margin Of Safety" value={fmt.percent(margin.percent, 1)} />
              <Metric label="Deal Status" value={results.recommendation.title} />
              <Metric
                label="Overpriced Amount"
                value={overpriced > 0 ? fmt.currency(overpriced) : fmt.currency(0)}
                hint={overpriced > 0 ? "Asking above the maximum offer" : "At or under the maximum"}
              />
              <Metric
                label="Cushion"
                value={fmt.currency(cushion)}
                hint={cushion > 0 ? "Room under the maximum offer" : "No room under the ceiling"}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate font-bold tabular">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
