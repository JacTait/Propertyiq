"use client";

import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Globe2, MapPin, RotateCcw, TrendingUp, Users } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { CountryCode } from "@/lib/types";
import { COUNTRIES } from "@/lib/constants";
import { getMarketProfile, getRegions, toMarketData } from "@/data/market-data";
import { regionLabel } from "@/lib/utils/labels";
import { useFormatters } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGrid, NumberField, SectionTitle, SelectField } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";

export function LocationStep() {
  const { setValue, getValues } = useFormContext<AnalysisFormValues>();
  const country = useWatch<AnalysisFormValues, "location.country">({ name: "location.country" });
  const region = useWatch<AnalysisFormValues, "location.region">({ name: "location.region" });
  const market = useWatch<AnalysisFormValues, "location.market">({ name: "location.market" });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();

  const regions = useMemo(() => getRegions(country), [country]);
  const profile = getMarketProfile(country, region);

  const applyMarket = (c: CountryCode, r: string) => {
    const p = getMarketProfile(c, r);
    if (!p) return;
    const data = toMarketData(p);
    setValue("location.market", data, { shouldDirty: true, shouldValidate: true });
    const price = getValues("financing.purchasePrice");
    if (Number.isFinite(price) && price > 0) {
      setValue("expenses.propertyTaxAnnual", Math.round(price * (data.propertyTaxRate / 100)), { shouldDirty: true });
    }
    setValue("expenses.insuranceAnnual", data.insuranceAnnual, { shouldDirty: true });
  };

  const handleCountry = (c: CountryCode) => {
    const first = getRegions(c)[0];
    if (first) {
      setValue("location.region", first.code, { shouldDirty: true, shouldValidate: true });
      applyMarket(c, first.code);
    }
  };

  const isOverridden =
    profile &&
    market &&
    (profile.propertyTaxRate !== market.propertyTaxRate ||
      profile.insuranceAnnual !== market.insuranceAnnual ||
      profile.appreciationRate !== market.appreciationRate ||
      profile.rentalYield !== market.rentalYield ||
      profile.populationGrowth !== market.populationGrowth ||
      profile.medianPropertyValue !== market.medianPropertyValue);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Where is the property?" description="Market intelligence loads automatically for the selected region." />
        <FieldGrid>
          <SelectField<CountryCode>
            name="location.country"
            label="Country"
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            onValueChange={handleCountry}
          />
          <SelectField<string>
            name="location.region"
            label={regionLabel(country)}
            options={regions.map((r) => ({ value: r.code, label: r.name }))}
            onValueChange={(r) => applyMarket(country, r)}
          />
        </FieldGrid>
      </div>

      {profile && (
        <motion.div
          key={`${country}-${region}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5"
        >
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <MapPin className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Market Intelligence</p>
                <h4 className="text-lg font-bold">{profile.regionName}</h4>
                <p className="text-xs text-muted-foreground">
                  Median value {fmt.currency(profile.medianPropertyValue)} · Population growth {fmt.percent(profile.populationGrowth)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOverridden && <Badge variant="warning">Overridden</Badge>}
              <Button variant="outline" size="sm" onClick={() => applyMarket(country, region)} disabled={!isOverridden}>
                <RotateCcw /> Reset
              </Button>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={<Globe2 className="size-4" />} label="Property Tax" value={fmt.percent(profile.propertyTaxRate, 2)} />
            <Stat icon={<TrendingUp className="size-4" />} label="Appreciation" value={fmt.percent(profile.appreciationRate)} />
            <Stat icon={<TrendingUp className="size-4" />} label="Rental Yield" value={fmt.percent(profile.rentalYield)} />
            <Stat icon={<Users className="size-4" />} label="Insurance" value={fmt.currency(profile.insuranceAnnual)} />
          </div>
        </motion.div>
      )}

      <div>
        <SectionTitle
          title="Override market assumptions"
          description="Adjust any figure to match your own research. Overrides flow into every calculation."
        />
        <FieldGrid className="sm:grid-cols-3">
          <NumberField name="location.market.propertyTaxRate" label="Property Tax Rate" suffix="%" hint="Annual tax as % of property value" />
          <NumberField name="location.market.insuranceAnnual" label="Insurance (Annual)" prefix={symbol} />
          <NumberField name="location.market.appreciationRate" label="Appreciation" suffix="%" hint="Expected annual price growth" />
          <NumberField name="location.market.rentalYield" label="Rental Yield" suffix="%" />
          <NumberField name="location.market.populationGrowth" label="Population Growth" suffix="%" />
          <NumberField name="location.market.medianPropertyValue" label="Median Value" prefix={symbol} />
        </FieldGrid>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular">{value}</p>
    </div>
  );
}
