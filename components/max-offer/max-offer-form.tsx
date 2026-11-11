"use client";

import { FormProvider, useFormContext, useWatch, type UseFormReturn } from "react-hook-form";
import { Home, Landmark, Target, Wallet, Wrench } from "lucide-react";
import type { CountryCode } from "@/lib/types";
import type { MaxOfferFormValues } from "@/lib/utils/schema";
import { MAX_OFFER_CASHFLOW_PRESETS, MAX_OFFER_ROI_PRESETS } from "@/lib/constants";
import { FieldGrid, SectionTitle } from "@/components/forms/fields";
import { PropertyDetailsFields } from "@/components/forms/property-details-fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaxNumberField } from "@/components/max-offer/form-fields";
import { TargetSlider } from "@/components/max-offer/target-slider";

interface MaxOfferFormProps {
  form: UseFormReturn<MaxOfferFormValues>;
  onLocationChange?: (country: CountryCode, region: string) => void;
}

export function MaxOfferForm({ form, onLocationChange }: MaxOfferFormProps) {
  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <IdentitySection onLocationChange={onLocationChange} />
        <PropertySection />
        <FinancingSection />
        <ExpenseSection />
        <TargetsSection />
      </div>
    </FormProvider>
  );
}

function IdentitySection({ onLocationChange }: { onLocationChange?: (country: CountryCode, region: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Home className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Section 1</p>
          <CardTitle>Property Details</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <PropertyDetailsFields onLocationChange={onLocationChange} />
      </CardContent>
    </Card>
  );
}

function PropertySection() {
  const symbol = useCurrencySymbol();
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wrench className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Section 2</p>
          <CardTitle>Deal Numbers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <SectionTitle
          title="What you know about the deal"
          description="ARV, rent, rehab, expenses and targets set what you can pay. You do not need a purchase price. Add asking price only when you want to score a listing."
        />
        <FieldGrid>
          <MaxNumberField name="property.arv" label="ARV (After Repair Value)" prefix={symbol} hint="Expected value after renovations are complete." />
          <MaxNumberField name="property.expectedMonthlyRent" label="Expected Monthly Rent" prefix={symbol} />
          <MaxNumberField name="property.rehabBudget" label="Rehab Budget" prefix={symbol} />
          <MaxNumberField name="property.closingCosts" label="Closing Costs" prefix={symbol} />
          <MaxNumberField name="property.holdingCosts" label="Holding Costs" prefix={symbol} hint="Taxes, insurance, utilities and interest during rehab." />
          <MaxNumberField
            name="property.askingPrice"
            label="Current Asking Price"
            prefix={symbol}
            placeholder="Optional"
            className="sm:col-span-2"
            hint="Optional. Leave at 0 for Discovery (recommended and maximum offer only). Enter a listing price to evaluate margin of safety, deal status, overpricing and cushion."
          />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}

function FinancingSection() {
  const { setValue } = useFormContext<MaxOfferFormValues>();
  const symbol = useCurrencySymbol();

  const syncFromLtv = (ltv: number) => {
    if (!Number.isFinite(ltv)) return;
    const clamped = Math.min(100, Math.max(0, ltv));
    setValue("financing.downPaymentPercent", Math.round((100 - clamped) * 100) / 100, { shouldDirty: true, shouldValidate: true });
  };

  const syncFromDown = (down: number) => {
    if (!Number.isFinite(down)) return;
    const clamped = Math.min(100, Math.max(0, down));
    setValue("financing.loanToValue", Math.round((100 - clamped) * 100) / 100, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Landmark className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Section 3</p>
          <CardTitle>Financing</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <SectionTitle title="Acquisition loan" description="LTV and down payment stay in sync. The loan is sized from LTV." />
        <FieldGrid>
          <MaxNumberField name="financing.interestRate" label="Interest Rate" suffix="%" />
          <MaxNumberField name="financing.termYears" label="Mortgage Term" suffix="yrs" />
          <MaxNumberField name="financing.loanToValue" label="Loan-To-Value" suffix="%" onValueChange={syncFromLtv} />
          <MaxNumberField name="financing.downPaymentPercent" label="Down Payment" suffix="%" onValueChange={syncFromDown} />
          <MaxNumberField name="financing.loanFees" label="Loan Fees" prefix={symbol} className="sm:col-span-2" />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}

function ExpenseSection() {
  const symbol = useCurrencySymbol();
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Wallet className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Section 4</p>
          <CardTitle>Operating Expenses</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <SectionTitle title="Stabilised carry costs" description="Vacancy comes off gross rent. Management is applied to effective income." />
        <FieldGrid>
          <MaxNumberField name="expenses.propertyTaxAnnual" label="Property Tax" prefix={symbol} hint="Annual amount." />
          <MaxNumberField name="expenses.insuranceAnnual" label="Insurance" prefix={symbol} hint="Annual premium." />
          <MaxNumberField name="expenses.managementPercent" label="Property Management" suffix="%" />
          <MaxNumberField name="expenses.vacancyPercent" label="Vacancy" suffix="%" />
          <MaxNumberField name="expenses.maintenancePercent" label="Maintenance" suffix="%" />
          <MaxNumberField name="expenses.capexPercent" label="CapEx Reserve" suffix="%" />
          <MaxNumberField name="expenses.hoaMonthly" label="HOA Fees" prefix={symbol} hint="Monthly." />
          <MaxNumberField name="expenses.otherMonthly" label="Other Expenses" prefix={symbol} hint="Monthly." />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}

function TargetsSection() {
  const { setValue } = useFormContext<MaxOfferFormValues>();
  const fmt = useFormatters();
  const cashflow = useWatch({ name: "targets.desiredMonthlyCashflow" });
  const roi = useWatch({ name: "targets.desiredRoi" });
  const symbol = useCurrencySymbol();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Target className="size-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Section 5</p>
          <CardTitle>Investor Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SectionTitle title="What the deal must clear" description="The maximum offer is the highest price that still hits every target." />
        <div className="space-y-5 rounded-xl border border-border/70 bg-muted/20 p-4">
          <TargetSlider
            label="Desired Cashflow"
            value={typeof cashflow === "number" && Number.isFinite(cashflow) ? cashflow : 200}
            options={MAX_OFFER_CASHFLOW_PRESETS}
            format={(v) => fmt.currency(v, { decimals: 0 })}
            onChange={(v) => setValue("targets.desiredMonthlyCashflow", v, { shouldDirty: true, shouldValidate: true })}
          />
          <TargetSlider
            label="Desired ROI"
            value={typeof roi === "number" && Number.isFinite(roi) ? roi : 12}
            options={MAX_OFFER_ROI_PRESETS}
            format={(v) => fmt.percent(v)}
            onChange={(v) => setValue("targets.desiredRoi", v, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
        <FieldGrid>
          <MaxNumberField name="targets.desiredMonthlyCashflow" label="Desired Monthly Cashflow" prefix={symbol} />
          <MaxNumberField name="targets.desiredRoi" label="Desired ROI" suffix="%" />
          <MaxNumberField name="targets.desiredCashOnCash" label="Desired Cash-On-Cash" suffix="%" />
          <MaxNumberField name="targets.minimumDscr" label="Minimum DSCR" suffix="x" />
          <MaxNumberField
            name="targets.safetyBufferPercent"
            label="Desired Safety Buffer"
            suffix="%"
            hint="Recommended offer is this percentage below the maximum."
            className="sm:col-span-2"
          />
        </FieldGrid>
      </CardContent>
    </Card>
  );
}
