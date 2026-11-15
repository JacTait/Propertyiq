"use client";

import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import type { PriceSource } from "@/lib/types";

export function AcquisitionInputs({ usedPrice }: { usedPrice: PriceSource }) {
  const symbol = useCurrencySymbol();
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle
          title="Acquisition"
          description={`Price used in calculations: ${usedPrice.label}${usedPrice.value ? "" : "."}`}
        />
        <FieldGrid>
          <NumberField name="financing.askingPrice" label="Current Asking Price" prefix={symbol} emptyAsZero hint="Optional. 0 means no listing price." />
          <NumberField name="financing.proposedOffer" label="Proposed Offer Price" prefix={symbol} emptyAsZero hint="Used when purchase price is blank." />
          <NumberField name="financing.purchasePrice" label="Purchase Price" prefix={symbol} emptyAsZero hint="Optional while discovering the maximum offer." />
          <NumberField name="financing.closingCosts" label="Closing Costs" prefix={symbol} emptyAsZero />
          <NumberField name="financing.inspectionCosts" label="Inspection Costs" prefix={symbol} emptyAsZero />
          <NumberField name="financing.legalFees" label="Legal Fees" prefix={symbol} emptyAsZero />
          <NumberField name="financing.loanFees" label="Loan Fees" prefix={symbol} emptyAsZero />
          <NumberField name="financing.otherAcquisitionCosts" label="Other Acquisition Costs" prefix={symbol} emptyAsZero />
          <NumberField name="financing.depositPercent" label="Down Payment" suffix="%" />
          <NumberField name="financing.interestRate" label="Acquisition Rate" suffix="%" />
          <NumberField name="financing.termYears" label="Acquisition Term" suffix="yrs" />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}
