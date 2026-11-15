"use client";

import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Card, CardContent } from "@/components/ui/card";
import { StatRow } from "@/components/dashboard/stat-row";
import { useFormatters } from "@/hooks/useSettings";
import type { QuickOperatingStatement } from "@/lib/types";

export function OperatingExpenses({ operating }: { operating: QuickOperatingStatement }) {
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  return (
    <Card>
      <CardContent className="pt-5 sm:pt-6">
        <SectionTitle
          title="Operating expenses"
          description={`${operating.activeMonthlyRent > 0 ? "Percent lines use the active rent basis." : "Enter rent to see monthly operating cost."}`}
        />
        <FieldGrid>
          <NumberField
            name="expenses.propertyTaxAnnual"
            label="Annual Property Tax"
            prefix={symbol}
            emptyAsZero
            hint={`${fmt.currency(operating.monthlyPropertyTax)} / mo`}
          />
          <NumberField
            name="expenses.insuranceAnnual"
            label="Annual Insurance"
            prefix={symbol}
            emptyAsZero
            hint={`${fmt.currency(operating.monthlyInsurance)} / mo`}
          />
          <NumberField name="expenses.managementPercent" label="Property Management" suffix="%" />
          <NumberField name="expenses.vacancyPercent" label="Vacancy" suffix="%" />
          <NumberField name="expenses.maintenancePercent" label="Maintenance" suffix="%" />
          <NumberField name="expenses.capexPercent" label="CapEx Reserve" suffix="%" />
          <NumberField name="expenses.hoaMonthly" label="Monthly HOA" prefix={symbol} emptyAsZero />
          <NumberField name="expenses.utilitiesMonthly" label="Monthly Utilities" prefix={symbol} emptyAsZero hint="Shared/combined utilities. Split water/sewer/trash from Standard Analysis still count." />
          <NumberField name="expenses.otherMonthly" label="Other Monthly Expenses" prefix={symbol} emptyAsZero />
        </FieldGrid>
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <StatRow label="Vacancy allowance" value={fmt.currency(operating.vacancyAllowance)} />
          <StatRow label="Effective monthly income" value={fmt.currency(operating.effectiveMonthlyIncome)} />
          <StatRow label="Monthly tax" value={fmt.currency(operating.monthlyPropertyTax)} />
          <StatRow label="Monthly insurance" value={fmt.currency(operating.monthlyInsurance)} />
          <StatRow label="Total monthly operating expenses" value={fmt.currency(operating.totalMonthlyOperatingExpenses)} emphasis />
          <StatRow label="Monthly NOI before debt" value={fmt.signedCurrency(operating.monthlyNoi)} emphasis />
        </div>
      </CardContent>
    </Card>
  );
}
