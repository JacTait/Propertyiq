"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Check } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { PropertyType } from "@/lib/types";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { FieldGrid, NumberField, SectionTitle, SelectField, TextField } from "@/components/forms/fields";
import { Label } from "@/components/ui/label";

export function PropertyStep() {
  const { control } = useFormContext<AnalysisFormValues>();

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Identify the property" description="A name helps you find it later in your portfolio." />
        <FieldGrid>
          <TextField name="property.name" label="Property Name" placeholder="e.g. 42 Palm Avenue" />
          <TextField name="property.address" label="Address (optional)" placeholder="Street, city" />
        </FieldGrid>
      </div>

      <div>
        <SectionTitle title="Property details" />
        <FieldGrid className="sm:grid-cols-3">
          <SelectField<PropertyType>
            name="property.propertyType"
            label="Property Type"
            options={PROPERTY_TYPES}
            className="sm:col-span-3"
          />
          <NumberField name="property.bedrooms" label="Bedrooms" />
          <NumberField name="property.bathrooms" label="Bathrooms" />
          <NumberField name="property.yearBuilt" label="Year Built" />
          <NumberField name="property.squareFootage" label="Square Footage" suffix="sq ft" />
          <NumberField name="property.lotSize" label="Lot Size" suffix="sq ft" />
        </FieldGrid>
      </div>

      <div>
        <Label className="mb-2 block">Condition</Label>
        <Controller
          control={control}
          name="property.condition"
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup">
              {PROPERTY_CONDITIONS.map((c) => {
                const active = field.value === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(c.value)}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                        : "border-border bg-card/40 hover:border-primary/40 hover:bg-accent/40",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{c.label}</span>
                      <span className="block text-xs text-muted-foreground">{c.description}</span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {active && <Check className="size-3" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
