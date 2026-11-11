"use client";

import { useFieldArray, useFormContext, useWatch, type FieldPath } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { RentEntryMode } from "@/lib/types";
import { createId } from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";
import { FieldGrid, NumberField, SectionTitle, TextField } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Button } from "@/components/ui/button";
import { CalculatedValue } from "@/components/workspace/calculated-value";
import { useFormatters } from "@/hooks/useSettings";

export function SectionIncome() {
  const { control, setValue } = useFormContext<AnalysisFormValues>();
  const strategy = useWatch<AnalysisFormValues, "strategy">({ name: "strategy" });
  const mode = useWatch<AnalysisFormValues, "income.rentEntryMode">({ name: "income.rentEntryMode" });
  const income = useWatch<AnalysisFormValues, "income">({ name: "income" });
  const { fields, append, remove } = useFieldArray({ control, name: "income.units" });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  const unitTotal = (income?.units ?? []).reduce(
    (sum, unit) => sum + (typeof unit.monthlyRent === "number" && Number.isFinite(unit.monthlyRent) ? unit.monthlyRent : 0),
    0,
  );

  const setMode = (next: RentEntryMode) => {
    if (next === mode) return;
    if (next === "units" && fields.length === 0) {
      append({ id: createId("unit"), label: "Unit 1", monthlyRent: 0 });
    }
    setValue("income.rentEntryMode", next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-7">
      <div>
        <SectionTitle
          title="Rents"
          description="Decision analysis uses conservative rent. Switching Total / Units does not overwrite the other set of values."
        />
        <FieldGrid>
          <NumberField
            name="income.monthlyRent"
            label="Advertised / listing rent"
            prefix={symbol}
            hint="Asking or projected monthly rent."
          />
          <NumberField
            name="income.conservativeRent"
            label="Conservative rent"
            prefix={symbol}
            hint="The rent the decision underwrite uses."
          />
        </FieldGrid>
        <p className="mt-3 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-sm">
          Conservative rent is the decision input. Listing rent stays visible for comparison and does not overwrite it.
        </p>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Current / in-place rent" />
          <div className="flex rounded-full border border-border p-0.5" role="radiogroup" aria-label="Current rent entry mode">
            {(["total", "units"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                  mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "total" ? "Total" : "By unit"}
              </button>
            ))}
          </div>
        </div>
        {mode === "total" ? (
          <FieldGrid>
            <NumberField
              name="income.currentMonthlyRent"
              label="Current monthly rent"
              prefix={symbol}
              hint="In-place gross rent. Separate from advertised and conservative."
            />
          </FieldGrid>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                <TextField
                  name={`income.units.${index}.label` as FieldPath<AnalysisFormValues>}
                  label={index === 0 ? "Unit" : ""}
                  placeholder={`Unit ${index + 1}`}
                />
                <NumberField
                  name={`income.units.${index}.monthlyRent` as FieldPath<AnalysisFormValues>}
                  label={index === 0 ? "Rent" : ""}
                  prefix={symbol}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mb-0.5"
                  onClick={() => remove(index)}
                  aria-label={`Remove unit ${index + 1}`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: createId("unit"), label: `Unit ${fields.length + 1}`, monthlyRent: 0 })}
              >
                <Plus /> Add unit
              </Button>
              <CalculatedValue label="Unit total" value={fmt.currency(unitTotal)} className="w-40" />
            </div>
            <p className="text-xs text-muted-foreground">
              Unit rows are not copied into current monthly rent. Switch back to Total to edit that figure separately.
            </p>
          </div>
        )}
      </div>

      <details className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Verified rent, other income and growth</summary>
        <div className="mt-4">
          <FieldGrid>
            <NumberField
              name="income.verifiedRent"
              label="Verified / comps rent"
              prefix={symbol}
              hint="Used by the existing secondary analysis until you change rent source."
            />
            <NumberField name="income.otherMonthlyIncome" label="Other monthly income" prefix={symbol} />
            <NumberField name="income.rentGrowthRate" label="Rent growth" suffix="%" />
          </FieldGrid>
        </div>
      </details>

      {strategy === "short-term-rental" ? (
        <div>
          <SectionTitle
            title="Short-term rental"
            description="Nightly inputs stay for the STR engine. Conservative monthly rent still drives the decision underwrite."
          />
          <FieldGrid>
            <NumberField name="income.nightlyRate" label="Nightly rate" prefix={symbol} />
            <NumberField name="income.occupancyRate" label="Occupancy" suffix="%" />
            <NumberField name="income.cleaningCostsMonthly" label="Cleaning (monthly)" prefix={symbol} />
            <NumberField name="income.platformFeePercent" label="Platform fees" suffix="%" />
          </FieldGrid>
        </div>
      ) : null}
    </div>
  );
}

export function incomeStatus(input: {
  income?: { conservativeRent?: number; monthlyRent?: number; currentMonthlyRent?: number };
}): "ready" | "review" | "empty" {
  if ((input.income?.conservativeRent ?? 0) > 0) return "ready";
  if ((input.income?.monthlyRent ?? 0) > 0 || (input.income?.currentMonthlyRent ?? 0) > 0) return "review";
  return "empty";
}
