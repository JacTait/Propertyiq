"use client";

import { useFormContext } from "react-hook-form";
import { FieldGrid, NumberField, TextAreaField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REFINANCE_LTV_PRESETS } from "@/lib/constants";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import { cn } from "@/lib/utils/cn";

export function RefinanceInputs() {
  const symbol = useCurrencySymbol();
  const { setValue, watch } = useFormContext<AnalysisFormValues>();
  const ltv = watch("brrrr.refinanceLtv");
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle title="Refinance assumptions" description="Kept beside acquisition so the refinance maths stay on this screen." />
        <div className="mb-4 flex flex-wrap gap-2">
          {REFINANCE_LTV_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={ltv === preset ? "default" : "outline"}
              onClick={() => setValue("brrrr.refinanceLtv", preset, { shouldDirty: true, shouldValidate: true })}
              className={cn(ltv === preset && "pointer-events-none")}
            >
              {preset}% LTV
            </Button>
          ))}
        </div>
        <FieldGrid>
          <NumberField name="brrrr.afterRepairValue" label="ARV" prefix={symbol} emptyAsZero />
          <NumberField name="brrrr.refinanceLtv" label="Refinance LTV" suffix="%" />
          <NumberField name="brrrr.refinanceRate" label="Refinance Interest Rate" suffix="%" />
          <NumberField name="brrrr.refinanceTermYears" label="Refinance Term" suffix="yrs" />
          <NumberField name="brrrr.refinanceDscrMin" label="Required DSCR" hint="Must be greater than zero." />
          <NumberField name="brrrr.refinanceClosingCosts" label="Refinance Closing Costs" prefix={symbol} emptyAsZero />
          <NumberField
            name="brrrr.loanPayoffAmount"
            label="Loan Payoff Amount"
            prefix={symbol}
            emptyAsZero
            hint="Leave at 0 to derive payoff from purchase price and down payment."
          />
          <TextAreaField name="brrrr.refinanceNotes" label="Seasoning or Refinance Notes" className="sm:col-span-2" />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}
