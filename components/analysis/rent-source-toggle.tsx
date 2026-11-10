"use client";

import type { RentSource, ResolvedRent } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent } from "@/components/ui/card";

const OPTIONS: { value: RentSource; label: string }[] = [
  { value: "listing", label: "Listing" },
  { value: "verified", label: "Verified" },
  { value: "conservative", label: "Conservative" },
];

interface RentSourceToggleProps {
  rent: ResolvedRent;
  onChange: (source: RentSource) => void;
}

export function RentSourceToggle({ rent, onChange }: RentSourceToggleProps) {
  const fmt = useFormatters();
  const amount = (source: RentSource) =>
    source === "listing" ? rent.listing : source === "conservative" ? rent.conservative : rent.verified;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rent used for analysis</p>
            <p className="mt-0.5 text-xl font-bold tabular">{fmt.currency(rent.active)}<span className="text-sm font-medium text-muted-foreground">/mo</span></p>
          </div>
          <div className="flex rounded-xl border border-border bg-muted/40 p-1" role="radiogroup" aria-label="Rent source">
            {OPTIONS.map((option) => {
              const active = rent.source === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-left transition-all",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="block text-[11px] font-semibold">{option.label}</span>
                  <span className="block text-xs tabular">{fmt.currency(amount(option.value), { compact: true })}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Metrics are calculated on verified rent by default. Listing is the advertised figure; conservative applies a haircut.
        </p>
      </CardContent>
    </Card>
  );
}
