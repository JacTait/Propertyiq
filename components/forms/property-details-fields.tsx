"use client";

import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { CountryCode, InvestmentStrategy, PropertyType } from "@/lib/types";
import { COUNTRIES, PROPERTY_TYPES, STRATEGIES } from "@/lib/constants";
import { getRegions } from "@/data/market-data";
import { regionLabel } from "@/lib/utils/labels";
import { ensureRegionForCountry } from "@/lib/property-identity";
import { FieldGrid, FieldWrapper, NumberInput, SectionTitle } from "@/components/forms/fields";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PropertyDetailsFieldsProps {
  /** Called after country or region changes so the host form can refresh market data. */
  onLocationChange?: (country: CountryCode, region: string) => void;
  description?: string;
}

export function PropertyDetailsFields({
  onLocationChange,
  description = "Shared across Deal Workspace, Max Offer and Deal Resilience.",
}: PropertyDetailsFieldsProps) {
  const { control, setValue } = useFormContext();
  const country = (useWatch({ name: "location.country" }) as CountryCode | undefined) ?? "US";
  const regions = useMemo(() => getRegions(country), [country]);

  const handleCountry = (next: CountryCode) => {
    const region = ensureRegionForCountry(next, "");
    setValue("location.country", next, { shouldDirty: true, shouldValidate: true });
    setValue("location.region", region, { shouldDirty: true, shouldValidate: true });
    onLocationChange?.(next, region);
  };

  const handleRegion = (region: string) => {
    setValue("location.region", region, { shouldDirty: true, shouldValidate: true });
    onLocationChange?.(country, region);
  };

  return (
    <div>
      <SectionTitle title="Property details" description={description} />
      <FieldGrid>
        <IdentityText name="property.name" label="Property Name" placeholder="e.g. 42 Palm Avenue" className="sm:col-span-2" />
        <IdentitySelect<PropertyType>
          name="property.propertyType"
          label="Property Type"
          options={PROPERTY_TYPES}
          className="sm:col-span-2"
        />
        <Controller
          control={control}
          name="property.bedrooms"
          render={({ field, fieldState }) => (
            <NumberInput
              id="identity-bedrooms"
              label="Bedrooms"
              value={typeof field.value === "number" ? field.value : NaN}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="property.bathrooms"
          render={({ field, fieldState }) => (
            <NumberInput
              id="identity-bathrooms"
              label="Bathrooms"
              value={typeof field.value === "number" ? field.value : NaN}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <IdentitySelect<CountryCode>
          name="location.country"
          label="Country"
          options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
          onValueChange={handleCountry}
        />
        <IdentitySelect<string>
          name="location.region"
          label={regionLabel(country)}
          options={regions.map((r) => ({ value: r.code, label: r.name }))}
          onValueChange={handleRegion}
        />
        <IdentityText name="property.zipCode" label="ZIP Code" placeholder="33602" />
        <IdentitySelect<InvestmentStrategy> name="strategy" label="Investment Strategy" options={STRATEGIES.map((s) => ({ value: s.value, label: s.short }))} />
      </FieldGrid>
    </div>
  );
}

function IdentityText({
  name,
  label,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const { control } = useFormContext();
  const id = name.replace(/\./g, "-");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldWrapper label={label} htmlFor={id} error={fieldState.error?.message} className={className}>
          <Input
            id={id}
            placeholder={placeholder}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            aria-invalid={fieldState.error ? true : undefined}
          />
        </FieldWrapper>
      )}
    />
  );
}

function IdentitySelect<V extends string>({
  name,
  label,
  options,
  onValueChange,
  className,
}: {
  name: string;
  label: string;
  options: { value: V; label: string }[];
  onValueChange?: (value: V) => void;
  className?: string;
}) {
  const { control } = useFormContext();
  const id = name.replace(/\./g, "-");
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldWrapper label={label} htmlFor={id} error={fieldState.error?.message} className={className}>
          <Select
            value={typeof field.value === "string" ? field.value : undefined}
            onValueChange={(v) => {
              field.onChange(v);
              onValueChange?.(v as V);
            }}
          >
            <SelectTrigger id={id} aria-invalid={fieldState.error ? true : undefined}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldWrapper>
      )}
    />
  );
}
