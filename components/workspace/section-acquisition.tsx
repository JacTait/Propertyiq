"use client";

import { useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { CountryCode } from "@/lib/types";
import { COUNTRIES, PROPERTY_CONDITIONS, PROPERTY_TYPES, STRATEGIES } from "@/lib/constants";
import { getMarketProfile, getRegions, toMarketData } from "@/data/market-data";
import { regionLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { FieldGrid, NumberField, SectionTitle, SelectField, TextField } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { CalculatedValue } from "@/components/workspace/calculated-value";

interface SectionAcquisitionProps {
  decision: DealDecisionResult | null;
}

export function SectionAcquisition({ decision }: SectionAcquisitionProps) {
  const { control, setValue, getValues } = useFormContext<AnalysisFormValues>();
  const country = useWatch<AnalysisFormValues, "location.country">({ name: "location.country" });
  const strategy = useWatch<AnalysisFormValues, "strategy">({ name: "strategy" });
  const taxRate = useWatch<AnalysisFormValues, "location.market.propertyTaxRate">({
    name: "location.market.propertyTaxRate",
  });
  const regions = useMemo(() => getRegions(country), [country]);
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  const costs = decision?.costs;

  const applyMarket = (c: CountryCode, r: string) => {
    const profile = getMarketProfile(c, r);
    if (!profile) return;
    const data = toMarketData(profile);
    setValue("location.market", data, { shouldDirty: true, shouldValidate: true });
    const price = getValues("financing.purchasePrice");
    if (Number.isFinite(price) && price > 0) {
      setValue("expenses.propertyTaxAnnual", Math.round(price * (data.propertyTaxRate / 100)), { shouldDirty: true });
    }
    setValue("expenses.insuranceAnnual", data.insuranceAnnual, { shouldDirty: true });
  };

  const handleCountry = (c: CountryCode) => {
    const first = getRegions(c)[0];
    if (!first) return;
    setValue("location.region", first.code, { shouldDirty: true, shouldValidate: true });
    applyMarket(c, first.code);
  };

  const handlePriceChange = (price: number) => {
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(taxRate)) return;
    setValue("expenses.propertyTaxAnnual", Math.round(price * (taxRate / 100)), { shouldDirty: true });
  };

  return (
    <div className="space-y-7">
      <div>
        <SectionTitle title="Property" description="Identity stays with the deal across Workspace, Max Offer and Resilience." />
        <FieldGrid>
          <TextField name="property.name" label="Property name" placeholder="e.g. 42 Palm Avenue" className="sm:col-span-2" />
          <SelectField name="property.propertyType" label="Type" options={PROPERTY_TYPES} />
          <TextField name="property.zipCode" label="ZIP / postcode" placeholder="33602" />
          <NumberField name="property.bedrooms" label="Bedrooms" />
          <NumberField name="property.bathrooms" label="Bathrooms" />
          <SelectField<CountryCode>
            name="location.country"
            label="Country"
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            onValueChange={handleCountry}
          />
          <SelectField<string>
            name="location.region"
            label={regionLabel(country)}
            options={regions.map((r) => ({ value: r.code, label: r.name }))}
            onValueChange={(r) => applyMarket(country, r)}
          />
        </FieldGrid>
        <details className="mt-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            More property details
          </summary>
          <div className="mt-4 space-y-4">
            <FieldGrid>
              <TextField name="property.address" label="Address" placeholder="Street, city" className="sm:col-span-2" />
              <NumberField name="property.yearBuilt" label="Year built" />
              <NumberField name="property.squareFootage" label="Floor area" suffix="sq ft" />
              <NumberField name="property.lotSize" label="Lot size" suffix="sq ft" />
            </FieldGrid>
            <Controller
              control={control}
              name="property.condition"
              render={({ field }) => (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Condition</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Property condition">
                    {PROPERTY_CONDITIONS.map((item) => {
                      const active = field.value === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => field.onChange(item.value)}
                          className={cn(
                            "flex items-start justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background/50 hover:border-primary/40",
                          )}
                        >
                          <span>
                            <span className="block font-medium">{item.label}</span>
                            <span className="block text-xs text-muted-foreground">{item.description}</span>
                          </span>
                          {active ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            />
          </div>
        </details>
      </div>

      <div>
        <SectionTitle title="Strategy" description="This changes which exit and income extras appear below. It does not hide the core underwrite." />
        <Controller
          control={control}
          name="strategy"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Investment strategy">
              {STRATEGIES.map((item) => {
                const active = field.value === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => field.onChange(item.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {item.short}
                  </button>
                );
              })}
            </div>
          )}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {STRATEGIES.find((item) => item.value === strategy)?.description}
        </p>
      </div>

      <div>
        <SectionTitle title="Purchase" />
        <FieldGrid>
          <NumberField
            name="financing.askingPrice"
            label="Asking price"
            prefix={symbol}
            hint="Optional. Leave at 0 if you do not have a list price."
          />
          <NumberField
            name="financing.purchasePrice"
            label="Purchase price"
            prefix={symbol}
            hint="Price you are underwriting."
            onValueChange={handlePriceChange}
          />
        </FieldGrid>
      </div>

      <div>
        <SectionTitle
          title="Acquisition fees"
          description="These four lines are exclusive. Closing costs do not already include legal, inspection or loan fees."
        />
        <FieldGrid>
          <NumberField name="financing.closingCosts" label="Closing costs" prefix={symbol} />
          <NumberField name="financing.legalFees" label="Legal fees" prefix={symbol} />
          <NumberField name="financing.inspectionCosts" label="Inspection costs" prefix={symbol} />
          <NumberField name="financing.loanFees" label="Loan fees" prefix={symbol} />
          <NumberField
            name="financing.otherAcquisitionCosts"
            label="Other acquisition costs"
            prefix={symbol}
            hint="Anything else to get in. Defaults to 0."
          />
        </FieldGrid>
      </div>

      <div>
        <SectionTitle title="Rehab & holding" description="New analyses start at 10% contingency. Legacy deals keep 0% until you edit them." />
        <FieldGrid>
          {strategy === "fix-flip" ? (
            <NumberField name="flip.renovationBudget" label="Base rehab" prefix={symbol} />
          ) : (
            <NumberField name="brrrr.rehabCost" label="Base rehab" prefix={symbol} />
          )}
          <NumberField
            name="decision.rehabContingencyPercent"
            label="Rehab contingency"
            suffix="%"
            hint="Applied to base rehab only."
          />
          <CalculatedValue
            label="Contingency amount"
            value={fmt.currency(costs?.rehabContingencyAmount ?? 0)}
          />
          <CalculatedValue
            label="Total rehab budget"
            value={fmt.currency(costs?.totalRehabBudget ?? 0)}
            emphasize
          />
          <NumberField name="flip.holdingCostsMonthly" label="Monthly holding cost" prefix={symbol} />
          <NumberField name="flip.holdDurationMonths" label="Holding period" suffix="months" />
          <CalculatedValue label="Total holding cost" value={fmt.currency(costs?.totalHoldingCost ?? 0)} />
        </FieldGrid>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-4">
        <MiniTotal label="Acquisition fees" value={fmt.currency(costs?.acquisitionFees ?? 0)} />
        <MiniTotal label="Total rehab" value={fmt.currency(costs?.totalRehabBudget ?? 0)} />
        <MiniTotal label="Total holding" value={fmt.currency(costs?.totalHoldingCost ?? 0)} />
        <MiniTotal label="Total all-in cost" value={fmt.currency(costs?.allInCost ?? 0)} emphasize />
      </div>
    </div>
  );
}

function MiniTotal({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold tabular sm:text-base", emphasize && "text-primary")}>{value}</p>
    </div>
  );
}

export function acquisitionStatus(input: {
  property?: { name?: string };
  financing?: { purchasePrice?: number };
}): "ready" | "review" | "empty" {
  const named = Boolean(input.property?.name?.trim());
  const priced = (input.financing?.purchasePrice ?? 0) > 0;
  if (priced && named) return "ready";
  if (priced || named) return "review";
  return "empty";
}
