"use client";

import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import { CalculatedValue } from "@/components/workspace/calculated-value";
import type { AllInCostBreakdown } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";

export function RehabInputs({ allIn }: { allIn: AllInCostBreakdown }) {
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle title="Rehab & holding" description="Contingency is estimated rehab × contingency %. Override holding cost if you have a lump sum." />
        <FieldGrid>
          <NumberField name="brrrr.rehabCost" label="Estimated Rehab Cost" prefix={symbol} emptyAsZero />
          <NumberField name="decision.rehabContingencyPercent" label="Rehab Contingency" suffix="%" />
          <CalculatedValue label="Rehab Contingency Amount" value={fmt.currency(allIn.rehabContingencyAmount)} />
          <CalculatedValue label="Adjusted Rehab Budget" value={fmt.currency(allIn.adjustedRehabBudget)} />
          <NumberField name="flip.holdDurationMonths" label="Expected Rehab Duration" suffix="mo" emptyAsZero />
          <NumberField name="flip.holdingCostsMonthly" label="Monthly Holding Cost" prefix={symbol} emptyAsZero />
          <NumberField
            name="flip.holdingCostOverride"
            label="Total Holding Cost Override"
            prefix={symbol}
            emptyAsZero
            hint="Leave at 0 to use duration × monthly holding cost."
          />
          <NumberField name="brrrr.otherRehabCosts" label="Other Rehab Costs" prefix={symbol} emptyAsZero />
          <CalculatedValue
            label="Holding Costs Used"
            value={fmt.currency(allIn.holdingCostsUsed)}
            hint={allIn.holdingCostSource === "override" ? "Override" : "Calculated"}
          />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}
