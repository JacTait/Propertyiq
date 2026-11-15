"use client";

import { useFormContext } from "react-hook-form";
import { FieldGrid, NumberField, SelectField, TextAreaField, TextField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RENT_SOURCE_KINDS, RENT_VERIFICATION_STATUSES } from "@/lib/constants";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { QuickRentResolution, RentSource, RentVerificationStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const BASES: { value: RentSource; label: string }[] = [
  { value: "listing", label: "Listing" },
  { value: "verified", label: "Verified" },
  { value: "conservative", label: "Conservative" },
];

export function RentValidationPanel({ rent }: { rent: QuickRentResolution }) {
  const symbol = useCurrencySymbol();
  const { setValue, watch } = useFormContext<AnalysisFormValues>();
  const status = (watch("income.verificationStatus") ?? "unverified") as RentVerificationStatus;
  const source = watch("income.rentSource");

  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle title="Rent validation" description={rent.label} />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active rent basis</p>
          <div className="flex rounded-full border border-border p-0.5">
            {BASES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setValue("income.rentSource", item.value, { shouldDirty: true, shouldValidate: true })}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  source === item.value ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Badge variant={status === "unverified" ? "muted" : status === "user-verified" ? "primary" : "success"}>
            {RENT_VERIFICATION_STATUSES.find((item) => item.value === status)?.label}
          </Badge>
        </div>
        <FieldGrid>
          <NumberField name="income.monthlyRent" label="Listing Rent" prefix={symbol} emptyAsZero />
          <NumberField
            name="income.verifiedRent"
            label="Verified Local Rent"
            prefix={symbol}
            emptyAsZero
            hint="Default underwriting rent. Do not paste a city-wide average here."
          />
          <NumberField name="income.conservativeRent" label="Conservative Rent" prefix={symbol} emptyAsZero />
          <SelectField name="income.rentSourceKind" label="Rent Source Type" options={RENT_SOURCE_KINDS} />
          <SelectField name="income.verificationStatus" label="Verification" options={RENT_VERIFICATION_STATUSES} />
          <TextField name="income.dateVerified" label="Date Verified" placeholder="2026-11-13" />
          <TextAreaField name="income.rentSourceNotes" label="Rent Source Notes" className="sm:col-span-2" />
        </FieldGrid>
        <p className="mt-3 text-xs text-muted-foreground">
          Verification is user-entered. This app does not claim a connected data provider verified the rent.
        </p>
      </CardContent>
    </Card>
  );
}
