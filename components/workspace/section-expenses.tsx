"use client";

import { useWatch } from "react-hook-form";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { InsuranceSource } from "@/lib/types";
import { monthlyUtilitiesTotal } from "@/lib/calculations/utilities";
import { useFormatters } from "@/hooks/useSettings";
import { FieldGrid, NumberField, SectionTitle, SelectField } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { CalculatedValue } from "@/components/workspace/calculated-value";

const INSURANCE_SOURCE_OPTIONS: { value: InsuranceSource; label: string }[] = [
  { value: "quote", label: "Current quote" },
  { value: "estimate", label: "Estimate" },
  { value: "previous", label: "Previous policy" },
];

export function SectionExpenses() {
  const strategy = useWatch<AnalysisFormValues, "strategy">({ name: "strategy" });
  const source = useWatch<AnalysisFormValues, "expenses.insuranceSource">({ name: "expenses.insuranceSource" });
  const expenses = useWatch<AnalysisFormValues, "expenses">({ name: "expenses" });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  const utilities = monthlyUtilitiesTotal(expenses ?? {});
  const isFlip = strategy === "fix-flip";
  const isStr = strategy === "short-term-rental";

  return (
    <div className="space-y-7">
      <div>
        <SectionTitle
          title="Fixed operating costs"
          description="Tax, insurance and HOA are in NOI. They are not deducted again from cash flow."
        />
        <FieldGrid>
          <NumberField name="expenses.propertyTaxAnnual" label="Property tax (annual)" prefix={symbol} />
          <NumberField name="expenses.insuranceAnnual" label="Insurance (annual)" prefix={symbol} />
          <SelectField<InsuranceSource>
            name="expenses.insuranceSource"
            label="Insurance source"
            options={INSURANCE_SOURCE_OPTIONS}
          />
          {!isFlip ? <NumberField name="expenses.hoaMonthly" label="HOA (monthly)" prefix={symbol} /> : null}
        </FieldGrid>
        {source && source !== "quote" ? (
          <p className="mt-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
            Get a current insurance quote before relying on this cash-flow estimate.
          </p>
        ) : null}
      </div>

      {isFlip ? (
        <p className="text-sm text-muted-foreground">
          Day-to-day holding during works is in Acquisition. Property tax and insurance here inform the market carrying cost.
        </p>
      ) : (
        <>
          <div>
            <SectionTitle title="Reserves" description="Percentages of collected or gross income. CapEx / reserves are separate from maintenance." />
            <FieldGrid>
              <NumberField
                name="expenses.managementPercent"
                label="Management"
                suffix="%"
                hint="Percentage of collected income."
              />
              {!isStr ? <NumberField name="expenses.vacancyPercent" label="Vacancy" suffix="%" /> : null}
              <NumberField
                name="expenses.maintenancePercent"
                label="Maintenance"
                suffix="%"
                hint="Percentage of gross income reserved for repairs."
              />
              <NumberField
                name="expenses.capexPercent"
                label="CapEx / reserves"
                suffix="%"
                hint="Percentage of gross income reserved for capital expenditure. New deals start at 0."
              />
            </FieldGrid>
          </div>

          <div>
            <SectionTitle
              title="Utilities"
              description="Monthly utilities = water + sewer + trash + shared. Shared does not also add the legacy combined utilities line."
            />
            <FieldGrid>
              <NumberField name="expenses.waterMonthly" label="Water (monthly)" prefix={symbol} />
              <NumberField name="expenses.sewerMonthly" label="Sewer (monthly)" prefix={symbol} />
              <NumberField name="expenses.trashMonthly" label="Trash (monthly)" prefix={symbol} />
              <NumberField
                name="expenses.sharedUtilitiesMonthly"
                label="Shared utilities (monthly)"
                prefix={symbol}
                hint="An explicit 0 is kept. It does not fall back to the old combined utilities figure."
              />
              <NumberField name="expenses.otherMonthly" label="Other expenses (monthly)" prefix={symbol} />
              <NumberField name="expenses.expenseGrowthRate" label="Expense growth" suffix="%" />
              <CalculatedValue label="Monthly utilities" value={fmt.currency(utilities)} />
            </FieldGrid>
          </div>
        </>
      )}
    </div>
  );
}

export function expensesStatus(input: {
  expenses?: { propertyTaxAnnual?: number; insuranceAnnual?: number };
}): "ready" | "review" | "empty" {
  if ((input.expenses?.propertyTaxAnnual ?? 0) > 0 || (input.expenses?.insuranceAnnual ?? 0) > 0) return "ready";
  return "review";
}
