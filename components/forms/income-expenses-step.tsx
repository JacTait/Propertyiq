"use client";

import { useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { InvestmentStrategy } from "@/lib/types";
import { strategyLabel } from "@/lib/utils/labels";
import { Badge } from "@/components/ui/badge";
import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";

export function IncomeExpensesStep() {
  const strategy = useWatch<AnalysisFormValues, "strategy">({ name: "strategy" });
  const symbol = useCurrencySymbol();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle
          title="Income & expense assumptions"
          description="Inputs adapt to the selected strategy."
        />
        <Badge variant="primary">{strategyLabel(strategy, true)}</Badge>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={strategy}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <IncomeSection strategy={strategy} symbol={symbol} />
          <ExpenseSection strategy={strategy} symbol={symbol} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function IncomeSection({ strategy, symbol }: { strategy: InvestmentStrategy; symbol: string }) {
  switch (strategy) {
    case "short-term-rental":
      return (
        <div>
          <SectionTitle title="Short-term rental income" />
          <FieldGrid>
            <NumberField name="income.nightlyRate" label="Nightly Rate" prefix={symbol} />
            <NumberField name="income.occupancyRate" label="Occupancy" suffix="%" hint="Average nights booked per month ÷ nights available" />
            <NumberField name="income.cleaningCostsMonthly" label="Cleaning Costs (Monthly)" prefix={symbol} />
            <NumberField name="income.platformFeePercent" label="Airbnb / Platform Fees" suffix="%" />
            <NumberField name="income.rentGrowthRate" label="Revenue Growth" suffix="%" hint="Annual growth in nightly revenue" />
          </FieldGrid>
        </div>
      );
    case "fix-flip":
      return (
        <div>
          <SectionTitle title="Renovation & exit" />
          <FieldGrid>
            <NumberField name="flip.renovationBudget" label="Renovation Budget" prefix={symbol} />
            <NumberField name="flip.expectedSalePrice" label="Expected Sale Price" prefix={symbol} />
            <NumberField name="flip.holdDurationMonths" label="Hold Duration" suffix="months" />
            <NumberField name="flip.holdingCostsMonthly" label="Holding Costs (Monthly)" prefix={symbol} hint="Taxes, insurance, utilities while renovating. Mortgage payments are added automatically." />
            <NumberField name="flip.financingCosts" label="Financing Costs" prefix={symbol} hint="Points, hard-money fees, bridging interest" />
            <NumberField name="flip.sellingCostsPercent" label="Selling Costs" suffix="%" />
            <NumberField name="flip.realtorFeePercent" label="Realtor Fee" suffix="%" />
          </FieldGrid>
        </div>
      );
    case "brrrr":
      return (
        <div>
          <SectionTitle title="Rehab & refinance" />
          <FieldGrid>
            <NumberField name="brrrr.rehabCost" label="Rehab Cost" prefix={symbol} />
            <NumberField name="brrrr.afterRepairValue" label="After Repair Value (ARV)" prefix={symbol} />
            <NumberField name="brrrr.refinanceLtv" label="Refinance LTV" suffix="%" />
            <NumberField name="brrrr.refinanceRate" label="Refinance Rate" suffix="%" />
            <NumberField name="brrrr.refinanceTermYears" label="Refinance Term" suffix="yrs" />
            <NumberField name="brrrr.expectedRent" label="Expected Monthly Rent" prefix={symbol} />
            <NumberField name="income.rentGrowthRate" label="Rent Growth" suffix="%" />
          </FieldGrid>
        </div>
      );
    case "commercial-lease":
      return (
        <div>
          <SectionTitle title="Lease income" />
          <FieldGrid>
            <NumberField name="income.monthlyRent" label="Monthly Lease Income" prefix={symbol} />
            <NumberField name="income.otherMonthlyIncome" label="Other Income" prefix={symbol} hint="Parking, signage, CAM recoveries" />
            <NumberField name="income.rentGrowthRate" label="Annual Escalation" suffix="%" />
          </FieldGrid>
        </div>
      );
    case "buy-hold":
    default:
      return (
        <div>
          <SectionTitle title="Rental income" />
          <FieldGrid>
            <NumberField name="income.monthlyRent" label="Monthly Rent" prefix={symbol} />
            <NumberField name="income.otherMonthlyIncome" label="Other Income" prefix={symbol} hint="Laundry, parking, storage, pet rent" />
            <NumberField name="income.rentGrowthRate" label="Rent Growth" suffix="%" hint="Expected annual rent increase" />
          </FieldGrid>
        </div>
      );
  }
}

function ExpenseSection({ strategy, symbol }: { strategy: InvestmentStrategy; symbol: string }) {
  if (strategy === "fix-flip") {
    return (
      <div>
        <SectionTitle
          title="Carrying costs"
          description="Property tax and insurance inform the market data; day-to-day holding costs are captured above."
        />
        <FieldGrid>
          <NumberField name="expenses.propertyTaxAnnual" label="Property Tax (Annual)" prefix={symbol} />
          <NumberField name="expenses.insuranceAnnual" label="Insurance (Annual)" prefix={symbol} />
        </FieldGrid>
      </div>
    );
  }

  const isStr = strategy === "short-term-rental";

  return (
    <div>
      <SectionTitle title="Operating expenses" />
      <FieldGrid>
        <NumberField name="expenses.propertyTaxAnnual" label="Property Tax (Annual)" prefix={symbol} />
        <NumberField name="expenses.insuranceAnnual" label="Insurance (Annual)" prefix={symbol} />
        <NumberField name="expenses.hoaMonthly" label="HOA (Monthly)" prefix={symbol} />
        <NumberField name="expenses.managementPercent" label="Management Fee" suffix="%" hint="Percentage of collected income" />
        {!isStr && <NumberField name="expenses.vacancyPercent" label="Vacancy" suffix="%" />}
        <NumberField name="expenses.maintenancePercent" label="Maintenance" suffix="%" hint="Percentage of gross income reserved for repairs" />
        <NumberField name="expenses.utilitiesMonthly" label="Utilities (Monthly)" prefix={symbol} />
        <NumberField name="expenses.otherMonthly" label="Other Expenses (Monthly)" prefix={symbol} />
        <NumberField name="expenses.expenseGrowthRate" label="Expense Growth" suffix="%" />
      </FieldGrid>
    </div>
  );
}
