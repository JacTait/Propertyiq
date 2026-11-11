"use client";

import { useId, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { DealScenarioKey, ScenarioAssumptions } from "@/lib/types";
import type { DealDecisionResult, DealScenarioResult, ScenarioStatus } from "@/lib/calculations/deal-decision";
import { DEAL_SCENARIO_KEYS } from "@/lib/calculations/deal-decision";
import {
  isInheritedAssumption,
  SCENARIO_STATUS_LABEL,
  scenarioHasMeaningfulAllInPct,
  summarizeScenarioAssumptions,
} from "@/lib/calculations/decision-support";
import { cloneScenarioAssumptions, DEAL_SCENARIO_LABELS } from "@/lib/constants/deal-workspace";
import { useFormatters } from "@/hooks/useSettings";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField, NumberInput } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { signedMonthly, wholeMoney } from "@/components/workspace/decision-display";

interface ScenarioTableProps {
  decision: DealDecisionResult | null;
}

const STATUS_VARIANT: Record<ScenarioStatus, "success" | "warning" | "danger"> = {
  positive: "success",
  marginal: "warning",
  negative: "danger",
};

export function ScenarioTable({ decision }: ScenarioTableProps) {
  const { setValue } = useFormContext<AnalysisFormValues>();
  const [editing, setEditing] = useState<Record<DealScenarioKey, boolean>>({
    base: false,
    conservative: false,
    stress: false,
  });

  const resetScenario = (key: DealScenarioKey) => {
    setValue(`decision.scenarios.${key}`, cloneScenarioAssumptions(key), { shouldDirty: true, shouldValidate: true });
  };

  const toggleEdit = (key: DealScenarioKey) => {
    setEditing((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Scenario analysis</CardTitle>
        <CardDescription>
          Scenario results use the assumptions shown here. Adjust them to match how you want to stress-test the deal.
          Default haircuts are a starting point, not a universal stress test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden overflow-x-auto md:block">
          <ComparisonTable decision={decision} />
        </div>
        <div className="space-y-3">
          {DEAL_SCENARIO_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-border/70 px-3 py-3">
              <div className="md:hidden">
                <StackedScenario scenarioKey={key} decision={decision} />
              </div>
              <ScenarioEditPanel
                scenarioKey={key}
                editing={editing[key]}
                onToggleEdit={() => toggleEdit(key)}
                onReset={() => resetScenario(key)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ decision }: { decision: DealDecisionResult | null }) {
  const fmt = useFormatters();
  const rows = metricRows(decision, fmt);
  return (
    <table className="w-full min-w-[36rem] text-left text-sm">
      <caption className="sr-only">Base, conservative and stress scenario comparison</caption>
      <thead>
        <tr className="border-b border-border/70">
          <th scope="col" className="py-2 pr-2 font-medium text-muted-foreground">
            Metric
          </th>
          {DEAL_SCENARIO_KEYS.map((key) => (
            <th key={key} scope="col" className="px-2 py-2 font-medium">
              {DEAL_SCENARIO_LABELS[key]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border/50 last:border-0">
            <th scope="row" className="py-2 pr-2 font-normal text-muted-foreground">
              {row.label}
            </th>
            {DEAL_SCENARIO_KEYS.map((key) => (
              <td key={key} className={cn("px-2 py-2 tabular", row.emphasize && "font-medium")}>
                <span className="whitespace-nowrap">{row.values[key]}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StackedScenario({
  scenarioKey,
  decision,
}: {
  scenarioKey: DealScenarioKey;
  decision: DealDecisionResult | null;
}) {
  const fmt = useFormatters();
  const scenario = decision?.scenarios[scenarioKey];
  const rows = metricRows(decision, fmt);
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{DEAL_SCENARIO_LABELS[scenarioKey]}</p>
        {scenario ? <StatusBadge status={scenario.status} /> : null}
      </div>
      <dl className="mt-2 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
            <dt className="min-w-0 text-muted-foreground">{row.label}</dt>
            <dd className={cn("tabular", row.emphasize && "font-medium")}>{row.values[scenarioKey]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ScenarioEditPanel({
  scenarioKey,
  editing,
  onToggleEdit,
  onReset,
}: {
  scenarioKey: DealScenarioKey;
  editing: boolean;
  onToggleEdit: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{DEAL_SCENARIO_LABELS[scenarioKey]} assumptions</p>
          <AssumptionSummary scenarioKey={scenarioKey} />
        </div>
        <ScenarioEditButtons editing={editing} scenarioKey={scenarioKey} onToggleEdit={onToggleEdit} onReset={onReset} />
      </div>
      {editing ? <ScenarioEditor scenarioKey={scenarioKey} /> : null}
    </div>
  );
}

function ScenarioEditButtons({
  scenarioKey,
  editing,
  onToggleEdit,
  onReset,
}: {
  scenarioKey: DealScenarioKey;
  editing: boolean;
  onToggleEdit: () => void;
  onReset: () => void;
}) {
  const label = DEAL_SCENARIO_LABELS[scenarioKey];
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-expanded={editing}
        aria-controls={`${scenarioKey}-assumptions`}
        onClick={onToggleEdit}
      >
        {editing ? "Hide assumptions" : "Edit assumptions"}
      </Button>
      <Button type="button" size="sm" variant="ghost" aria-label={`Reset ${label} scenario to defaults`} onClick={onReset}>
        Reset scenario
      </Button>
    </div>
  );
}

function AssumptionSummary({ scenarioKey }: { scenarioKey: DealScenarioKey }) {
  const assumptions = useWatch<AnalysisFormValues, `decision.scenarios.${DealScenarioKey}`>({
    name: `decision.scenarios.${scenarioKey}`,
  });
  if (!assumptions) return null;
  return (
    <p className="mt-1 text-xs text-muted-foreground">{summarizeScenarioAssumptions(assumptions as ScenarioAssumptions)}</p>
  );
}

function StatusBadge({ status }: { status: ScenarioStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{SCENARIO_STATUS_LABEL[status]}</Badge>;
}

function metricRows(decision: DealDecisionResult | null, fmt: ReturnType<typeof useFormatters>) {
  const empty = "—";
  const value = (key: DealScenarioKey, read: (scenario: DealScenarioResult) => string | null) => {
    const scenario = decision?.scenarios[key];
    if (!scenario) return empty;
    return read(scenario) ?? empty;
  };
  return [
    {
      label: "Status",
      emphasize: true,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => SCENARIO_STATUS_LABEL[s.status])]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Monthly cash flow",
      emphasize: true,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => signedMonthly(fmt, s.monthlyCashflow))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective monthly rent",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => `${wholeMoney(fmt, s.monthlyRent)} / mo`)]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "All-in % ARV",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [
          key,
          value(key, (s) => (scenarioHasMeaningfulAllInPct(s) ? fmt.percent(s.allInPctConservativeArv as number, 1) : null)),
        ]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective vacancy",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => fmt.percent(s.vacancyPercent, 1))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective annual insurance",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => wholeMoney(fmt, s.annualInsurance))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective maintenance",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => fmt.percent(s.maintenancePercent, 1))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective CapEx",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => fmt.percent(s.capexPercent, 1))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective ARV",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [
          key,
          value(key, (s) => (s.conservativeArv > 0 ? wholeMoney(fmt, s.conservativeArv) : null)),
        ]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Effective rehab budget",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => wholeMoney(fmt, s.totalRehabBudget))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Annual cash flow",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [
          key,
          value(key, (s) => {
            const sign = s.annualCashflow < 0 ? "-" : s.annualCashflow > 0 ? "+" : "";
            return `${sign}${wholeMoney(fmt, Math.abs(s.annualCashflow))}`;
          }),
        ]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Cap rate",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [key, value(key, (s) => (s.capRate === null ? null : fmt.percent(s.capRate, 1)))]),
      ) as Record<DealScenarioKey, string>,
    },
    {
      label: "Cash-on-cash return",
      emphasize: false,
      values: Object.fromEntries(
        DEAL_SCENARIO_KEYS.map((key) => [
          key,
          value(key, (s) => (s.cashOnCash === null ? null : fmt.percent(s.cashOnCash, 1))),
        ]),
      ) as Record<DealScenarioKey, string>,
    },
  ];
}

function ScenarioEditor({ scenarioKey }: { scenarioKey: DealScenarioKey }) {
  const prefix = `decision.scenarios.${scenarioKey}` as const;
  const expenses = useWatch<AnalysisFormValues, "expenses">({ name: "expenses" });
  const fmt = useFormatters();
  const symbol = useCurrencySymbol();

  return (
    <div id={`${scenarioKey}-assumptions`} className="mt-3 space-y-4">
      <p className="text-xs text-muted-foreground">
        Percentage changes are versus the main deal. Inherit uses the live Acquisition / Expenses / Value inputs. Explicit
        0 is an override, not inherit.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          name={`${prefix}.rentAdjustmentPercent`}
          label="Rent change vs main"
          suffix="%"
          hint="0% means no change versus conservative rent."
        />
        <NumberField
          name={`${prefix}.rehabOverrunPercent`}
          label="Rehab change vs main"
          suffix="%"
          hint="0% means no change versus the main rehab budget."
        />
        <NumberField
          name={`${prefix}.arvAdjustmentPercent`}
          label="ARV change vs main"
          suffix="%"
          hint="0% means no change versus conservative ARV."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <NullableOverrideField
          name={`${prefix}.vacancyPercent`}
          label="Vacancy"
          suffix="%"
          inheritedValue={expenses?.vacancyPercent ?? 0}
          inheritedLabel={fmt.percent(expenses?.vacancyPercent ?? 0, 1)}
        />
        <NullableOverrideField
          name={`${prefix}.annualInsurance`}
          label="Annual insurance"
          prefix={symbol}
          inheritedValue={expenses?.insuranceAnnual ?? 0}
          inheritedLabel={wholeMoney(fmt, expenses?.insuranceAnnual ?? 0)}
        />
        <NullableOverrideField
          name={`${prefix}.maintenancePercent`}
          label="Maintenance"
          suffix="%"
          inheritedValue={expenses?.maintenancePercent ?? 0}
          inheritedLabel={fmt.percent(expenses?.maintenancePercent ?? 0, 1)}
        />
        <NullableOverrideField
          name={`${prefix}.capexPercent`}
          label="CapEx"
          suffix="%"
          inheritedValue={expenses?.capexPercent ?? 0}
          inheritedLabel={fmt.percent(expenses?.capexPercent ?? 0, 1)}
        />
      </div>
    </div>
  );
}

function NullableOverrideField({
  name,
  label,
  inheritedValue,
  inheritedLabel,
  prefix,
  suffix,
}: {
  name: `decision.scenarios.${DealScenarioKey}.${"vacancyPercent" | "annualInsurance" | "maintenancePercent" | "capexPercent"}`;
  label: string;
  inheritedValue: number;
  inheritedLabel: string;
  prefix?: string;
  suffix?: string;
}) {
  const id = useId();
  const { setValue } = useFormContext<AnalysisFormValues>();
  const value = useWatch({ name }) as number | null | undefined;
  const inherited = isInheritedAssumption(value);
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : inheritedValue;

  const inherit = () => setValue(name, null, { shouldDirty: true, shouldValidate: true });
  const override = () => setValue(name, inheritedValue, { shouldDirty: true, shouldValidate: true });

  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex rounded-lg border border-border" role="radiogroup" aria-label={`${label} source`}>
          <button
            type="button"
            role="radio"
            aria-checked={inherited}
            onClick={inherit}
            className={cn(
              "px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              inherited ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Inherit
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!inherited}
            onClick={override}
            className={cn(
              "px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              !inherited ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Override
          </button>
        </div>
      </div>
      <p className="sr-only">{inherited ? `${label} inherited from main deal` : `${label} override`}</p>
      {inherited ? (
        <p className="text-sm text-muted-foreground">
          Inherited from main deal: <span className="font-medium tabular text-foreground">{inheritedLabel}</span>
        </p>
      ) : (
        <NumberInput
          id={id}
          label={`${label} override`}
          prefix={prefix}
          suffix={suffix}
          value={numeric}
          onChange={(next) => {
            if (Number.isFinite(next)) setValue(name, next, { shouldDirty: true, shouldValidate: true });
          }}
        />
      )}
    </div>
  );
}
