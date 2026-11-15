"use client";

import { FieldGrid, NumberField, TextAreaField, TextField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import { NO_LIVE_NEIGHBOURHOOD_DATA } from "@/services/property-data";

export function NeighbourhoodPanel() {
  const symbol = useCurrencySymbol();
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle title="Neighbourhood information" description={NO_LIVE_NEIGHBOURHOOD_DATA} />
        <p className="mb-4 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Manual or locally stored notes only. Seeded regional defaults are not live or verified market data.
        </p>
        <FieldGrid>
          <TextField name="neighbourhood.name" label="Neighbourhood Name" />
          <TextField name="neighbourhood.zipCode" label="ZIP or Postcode" />
          <NumberField name="neighbourhood.userEnteredMarketRent" label="User-Entered Market Rent" prefix={symbol} emptyAsZero />
          <NumberField name="neighbourhood.typicalRentLow" label="Typical Rent Low" prefix={symbol} emptyAsZero />
          <NumberField name="neighbourhood.typicalRentHigh" label="Typical Rent High" prefix={symbol} emptyAsZero />
          <NumberField name="neighbourhood.propertyTaxEstimate" label="Property Tax Estimate" prefix={symbol} emptyAsZero />
          <NumberField name="neighbourhood.insuranceEstimate" label="Insurance Estimate" prefix={symbol} emptyAsZero />
          <NumberField name="neighbourhood.vacancyAssumption" label="Vacancy Assumption" suffix="%" />
          <TextField name="neighbourhood.dataSourceLabel" label="Data Source Label" placeholder="Manual entry" />
          <TextField name="neighbourhood.lastUpdated" label="Last Updated Date" placeholder="2026-11-13" />
          <TextAreaField name="neighbourhood.investorNotes" label="Investor Notes" className="sm:col-span-2" />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}
