"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import { useFormatters } from "@/hooks/useSettings";
import { useMortgageCalculation } from "@/hooks/useMortgageCalculation";
import { FieldGrid, NumberField, NumberInput, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { CalculatedValue } from "@/components/workspace/calculated-value";

export function SectionFinancing() {
  const { setValue, getValues } = useFormContext<AnalysisFormValues>();
  const financing = useWatch<AnalysisFormValues, "financing">({ name: "financing" });
  const expenses = useWatch<AnalysisFormValues, "expenses">({ name: "expenses" });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();

  const mortgage = useMortgageCalculation({
    purchasePrice: n(financing?.purchasePrice),
    depositPercent: n(financing?.depositPercent),
    interestRate: n(financing?.interestRate),
    termYears: n(financing?.termYears),
  });

  const monthlyTax = n(expenses?.propertyTaxAnnual) / 12;
  const monthlyInsurance = n(expenses?.insuranceAnnual) / 12;
  const monthlyHoa = n(expenses?.hoaMonthly);
  const piti = mortgage.monthlyPayment + monthlyTax + monthlyInsurance + monthlyHoa;

  const handleDepositAmount = (amount: number) => {
    const price = getValues("financing.purchasePrice");
    if (!Number.isFinite(amount) || !Number.isFinite(price) || price <= 0) return;
    const pct = Math.min(100, Math.max(0, (amount / price) * 100));
    setValue("financing.depositPercent", Math.round(pct * 100) / 100, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-7">
      <div>
        <SectionTitle
          title="Loan terms"
          description="Purchase price and acquisition fees live in Acquisition. 100% deposit is an all-cash deal."
        />
        <FieldGrid>
          <NumberField name="financing.depositPercent" label="Deposit" suffix="%" />
          <NumberInput
            id="workspace-deposit-amount"
            label="Deposit amount"
            prefix={symbol}
            value={Math.round(mortgage.depositAmount)}
            onChange={handleDepositAmount}
          />
          <CalculatedValue label="Loan amount" value={fmt.currency(mortgage.loanAmount)} />
          <NumberField name="financing.interestRate" label="Interest rate" suffix="%" />
          <NumberField name="financing.termYears" label="Term" suffix="yrs" />
        </FieldGrid>
      </div>

      <div>
        <SectionTitle
          title="Monthly debt service"
          description="Cash flow uses P&I only. Tax, insurance and HOA stay in operating expenses."
        />
        <FieldGrid>
          <CalculatedValue label="Principal & interest" value={fmt.currency(mortgage.monthlyPayment)} emphasize />
          <CalculatedValue
            label="PITI (informational)"
            value={fmt.currency(piti)}
            hint="Not deducted from NOI. Shown so you can compare with a lender PITI quote."
          />
        </FieldGrid>
      </div>
    </div>
  );
}

function n(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function financingStatus(input: {
  financing?: { termYears?: number; purchasePrice?: number };
}): "ready" | "review" | "empty" {
  if ((input.financing?.purchasePrice ?? 0) <= 0) return "review";
  if ((input.financing?.termYears ?? 0) > 0) return "ready";
  return "review";
}
