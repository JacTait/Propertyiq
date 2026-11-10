"use client";

import { motion } from "framer-motion";
import type { MaxOfferResults } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TIERS = [
  { key: "excellent", label: "Excellent Offer", color: "text-success", bar: "bg-success", ring: "border-success/30 bg-success/10" },
  { key: "good", label: "Good Offer", color: "text-primary", bar: "bg-primary", ring: "border-primary/30 bg-primary/10" },
  { key: "maximum", label: "Maximum Offer", color: "text-warning", bar: "bg-warning", ring: "border-warning/30 bg-warning/10" },
  { key: "too-expensive", label: "Too Expensive", color: "text-destructive", bar: "bg-destructive", ring: "border-destructive/30 bg-destructive/10" },
] as const;

export function OfferTiers({ results }: { results: MaxOfferResults }) {
  const fmt = useFormatters();
  const values: Record<(typeof TIERS)[number]["key"], string> = {
    excellent: fmt.currency(results.excellentOffer),
    good: fmt.currency(results.goodOffer),
    maximum: fmt.currency(results.maximumOffer),
    "too-expensive": results.maximumOffer > 0 ? `Above ${fmt.currency(results.maximumOffer)}` : "Any price",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer Tiers</CardTitle>
        <CardDescription>Colour-coded bid ladder from conservative to the hard ceiling.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("relative overflow-hidden rounded-2xl border p-4", tier.ring)}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1", tier.bar)} />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{tier.label}</p>
              <p className={cn("mt-2 text-xl font-black tabular tracking-tight", tier.color)}>{values[tier.key]}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
