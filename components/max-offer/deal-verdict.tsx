"use client";

import type { MaxOfferResults, OfferTier } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const TONE: Record<OfferTier, string> = {
  excellent: "text-success",
  good: "text-primary",
  maximum: "text-warning",
  "too-expensive": "text-destructive",
};

export function DealVerdict({ results, evaluating = false }: { results: MaxOfferResults; evaluating?: boolean }) {
  const rec = results.recommendation;
  return (
    <section className="border border-border bg-card rounded-lg px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {evaluating ? "Deal Status" : "Discovery"}
      </p>
      <h3 className={cn("mt-1 font-heading text-2xl font-medium", TONE[rec.tier])}>{rec.title}</h3>
      <p className="mt-2 text-sm">{rec.headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{rec.body}</p>
    </section>
  );
}
