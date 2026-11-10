"use client";

import { Bath, BedDouble, Calendar, MapPin, Ruler, Trees } from "lucide-react";
import type { AnalysisInput } from "@/lib/types";
import { conditionLabel, countryName, propertyTypeLabel, strategyLabel } from "@/lib/utils/labels";
import { getRegionName } from "@/data/market-data";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function PropertySummaryCard({ input }: { input: AnalysisInput }) {
  const fmt = useFormatters();
  const { property, location, financing, strategy } = input;
  const m = location.market;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold">{property.name || "Untitled property"}</h3>
              <Badge variant="primary">{strategyLabel(strategy, true)}</Badge>
              <Badge variant="muted">{propertyTypeLabel(property.propertyType)}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {property.address ? `${property.address}, ` : ""}
              {property.zipCode ? `${property.zipCode}, ` : ""}
              {getRegionName(location.country, location.region)}, {countryName(location.country)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Purchase Price</p>
            <p className="text-2xl font-bold tabular">{fmt.currency(financing.purchasePrice)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Spec icon={BedDouble} label="Beds" value={String(property.bedrooms)} />
          <Spec icon={Bath} label="Baths" value={String(property.bathrooms)} />
          <Spec icon={Ruler} label="Sq Ft" value={fmt.number(property.squareFootage)} />
          <Spec icon={Trees} label="Lot" value={fmt.number(property.lotSize)} />
          <Spec icon={Calendar} label="Built" value={String(property.yearBuilt)} />
          <Spec icon={MapPin} label="Condition" value={conditionLabel(property.condition)} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs sm:grid-cols-4">
          <Market label="Property Tax" value={fmt.percent(m.propertyTaxRate, 2)} />
          <Market label="Insurance" value={fmt.currency(m.insuranceAnnual)} />
          <Market label="Appreciation" value={fmt.percent(m.appreciationRate)} />
          <Market label="Rental Yield" value={fmt.percent(m.rentalYield)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Spec({ icon: Icon, label, value }: { icon: typeof Bath; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-0.5 truncate text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

function Market({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold tabular">{value}</p>
    </div>
  );
}
