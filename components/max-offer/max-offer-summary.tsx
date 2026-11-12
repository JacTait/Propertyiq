"use client";

import { Sparkles } from "lucide-react";
import type { MaxOfferInputs, MaxOfferResults } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MaxOfferSummaryCard({ input, results }: { input: MaxOfferInputs; results: MaxOfferResults }) {
  const fmt = useFormatters();
  const m = results.atMaximum;
  const headline = results.feasible
    ? `Based on a rent of ${fmt.currency(input.property.expectedMonthlyRent)}/month and an ARV of ${fmt.currency(input.property.arv)}, PropertyIQ estimates a maximum purchase price of ${fmt.currency(results.maximumOffer)}.`
    : results.summary.headline;
  const bullets = results.feasible
    ? [
        `${fmt.signedCurrency(m.monthlyCashflow)} monthly cashflow`,
        `${fmt.percent(m.roi)} first-year return`,
        `${fmt.ratio(m.dscr)} DSCR`,
      ]
    : results.summary.bullets;
  const closing = results.feasible
    ? `A recommended target offer of ${fmt.currency(results.recommendedOffer)} would create additional protection against vacancy and maintenance risks.`
    : results.summary.closing;

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <CardTitle>AI Investment Summary</CardTitle>
          <CardDescription>Generated from your targets, rent and ARV — not a canned template.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed">
        <p>{headline}</p>
        <p className="text-muted-foreground">At this purchase price the property achieves:</p>
        <ul className="space-y-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <p>{closing}</p>
      </CardContent>
    </Card>
  );
}
