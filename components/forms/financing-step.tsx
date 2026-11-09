"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Landmark, Wallet } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import { useFormatters } from "@/hooks/useSettings";
import { useMortgageCalculation } from "@/hooks/useMortgageCalculation";
import { calculateCashToClose } from "@/lib/calculations/ratios";
import { FieldGrid, NumberField, NumberInput, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";

export function FinancingStep() {
  const { setValue, getValues } = useFormContext<AnalysisFormValues>();
  const financing = useWatch<AnalysisFormValues, "financing">({ name: "financing" });
  const taxRate = useWatch<AnalysisFormValues, "location.market.propertyTaxRate">({
    name: "location.market.propertyTaxRate",
  });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();

  const mortgage = useMortgageCalculation({
    purchasePrice: financing.purchasePrice,
    depositPercent: financing.depositPercent,
    interestRate: financing.interestRate,
    termYears: financing.termYears,
  });

  const cashToClose = calculateCashToClose({
    depositAmount: mortgage.depositAmount,
    closingCosts: n(financing.closingCosts),
    legalFees: n(financing.legalFees),
    inspectionCosts: n(financing.inspectionCosts),
    loanFees: n(financing.loanFees),
  });

  const handlePriceChange = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) return;
    if (Number.isFinite(taxRate)) {
      setValue("expenses.propertyTaxAnnual", Math.round(price * (taxRate / 100)), { shouldDirty: true });
    }
  };

  const handleDepositAmount = (amount: number) => {
    const price = getValues("financing.purchasePrice");
    if (!Number.isFinite(amount) || !Number.isFinite(price) || price <= 0) return;
    const pct = Math.min(100, Math.max(0, (amount / price) * 100));
    setValue("financing.depositPercent", Math.round(pct * 100) / 100, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle title="Purchase & loan" description="Deposit percentage and amount stay in sync automatically." />
        <FieldGrid>
          <NumberField
            name="financing.purchasePrice"
            label="Purchase Price"
            prefix={symbol}
            className="sm:col-span-2"
            onValueChange={handlePriceChange}
          />
          <NumberField name="financing.depositPercent" label="Deposit Percentage" suffix="%" />
          <NumberInput
            id="deposit-amount"
            label="Deposit Amount"
            prefix={symbol}
            value={Math.round(mortgage.depositAmount)}
            onChange={handleDepositAmount}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mortgage Amount</span>
            <div className="flex h-10 items-center rounded-lg border border-dashed border-border bg-muted/40 px-3 text-sm font-semibold tabular">
              {fmt.currency(mortgage.loanAmount)}
            </div>
          </div>
          <NumberField name="financing.interestRate" label="Interest Rate" suffix="%" />
          <NumberField name="financing.termYears" label="Mortgage Term" suffix="yrs" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Monthly Payment</span>
            <div className="flex h-10 items-center rounded-lg border border-dashed border-border bg-muted/40 px-3 text-sm font-semibold tabular">
              {fmt.currency(mortgage.monthlyPayment)}
            </div>
          </div>
        </FieldGrid>
      </div>

      <div>
        <SectionTitle title="Acquisition costs" />
        <FieldGrid>
          <NumberField name="financing.closingCosts" label="Closing Costs" prefix={symbol} />
          <NumberField name="financing.legalFees" label="Legal Fees" prefix={symbol} />
          <NumberField name="financing.inspectionCosts" label="Inspection Costs" prefix={symbol} />
          <NumberField name="financing.loanFees" label="Loan Fees" prefix={symbol} />
        </FieldGrid>
      </div>

      <motion.div
        layout
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Total Cash Needed To Close</p>
              <p className="text-2xl font-bold tabular sm:text-3xl">{fmt.currency(cashToClose)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:text-sm">
            <span>Deposit</span>
            <span className="text-right font-medium text-foreground tabular">{fmt.currency(mortgage.depositAmount)}</span>
            <span>Fees & costs</span>
            <span className="text-right font-medium text-foreground tabular">
              {fmt.currency(cashToClose - mortgage.depositAmount)}
            </span>
            <span className="flex items-center gap-1">
              <Landmark className="size-3" /> Total interest
            </span>
            <span className="text-right font-medium text-foreground tabular">{fmt.currency(mortgage.totalInterest)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function n(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
