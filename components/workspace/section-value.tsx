"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { GuidelineAdditionalCosts } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import type { DealDecisionResult } from "@/lib/calculations/deal-decision";
import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalculatedValue } from "@/components/workspace/calculated-value";

const EXTRA_COST_OPTIONS: { key: keyof GuidelineAdditionalCosts; label: string }[] = [
  { key: "closingCosts", label: "Closing costs" },
  { key: "legalFees", label: "Legal fees" },
  { key: "inspectionCosts", label: "Inspection costs" },
  { key: "loanFees", label: "Loan fees" },
  { key: "otherAcquisitionCosts", label: "Other acquisition costs" },
  { key: "holdingCosts", label: "Holding costs (monthly × months)" },
];

interface SectionValueProps {
  decision: DealDecisionResult | null;
}

export function SectionValue({ decision }: SectionValueProps) {
  const { setValue, getValues } = useFormContext<AnalysisFormValues>();
  const strategy = useWatch<AnalysisFormValues, "strategy">({ name: "strategy" });
  const includeExtras = useWatch<AnalysisFormValues, "decision.includeAdditionalCostsInGuideline">({
    name: "decision.includeAdditionalCostsInGuideline",
  });
  const extras = useWatch<AnalysisFormValues, "decision.guidelineAdditionalCosts">({
    name: "decision.guidelineAdditionalCosts",
  });
  const symbol = useCurrencySymbol();
  const fmt = useFormatters();
  const guideline = decision?.guidelineMaxOffer;
  const allInPct = decision?.costs.allInPctConservativeArv;

  const syncAdvertised = (value: number) => {
    if (!Number.isFinite(value)) return;
    setValue("brrrr.afterRepairValue", value, { shouldDirty: true });
    if (getValues("strategy") === "fix-flip") {
      setValue("flip.expectedSalePrice", value, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <SectionTitle
          title="After-repair value"
          description="Conservative ARV is the figure the guideline, all-in percent and rehab headroom use."
        />
        <FieldGrid>
          <NumberField
            name="decision.advertisedArv"
            label="Advertised ARV"
            prefix={symbol}
            hint="The ARV on the listing or appraisal pack."
            onValueChange={syncAdvertised}
          />
          <NumberField
            name="decision.conservativeArv"
            label="Conservative ARV"
            prefix={symbol}
            hint="Your independent after-repair value. This drives the decision underwrite."
            className="sm:col-span-1"
          />
        </FieldGrid>
        <p className="mt-3 rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-sm text-foreground">
          Conservative ARV is the value you are willing to underwrite, not the seller’s best case. If it matches
          advertised ARV, you can still continue — that will be flagged later in assumption checks.
        </p>
      </div>

      <div>
        <SectionTitle
          title="Offer guideline"
          description="Configurable investor guideline, not a valuation rule. Separate from the Max Offer page, which searches on target returns."
        />
        <FieldGrid>
          <NumberField
            name="decision.targetArvPercent"
            label="Target percent of conservative ARV"
            suffix="%"
            hint="Default 70%. Guideline offer = conservative ARV × this percent − rehab − contingency."
          />
          <CalculatedValue
            label="Investor guideline max offer"
            value={guideline === null || guideline === undefined ? "Add conservative ARV" : fmt.currency(guideline)}
            hint={allInPct == null ? undefined : `All-in is currently ${fmt.percent(allInPct)} of conservative ARV.`}
            emphasize
          />
        </FieldGrid>
        <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Include extra costs in the guideline</p>
            <p className="text-xs text-muted-foreground">
              Off by default. When on, only the lines you tick are deducted.
            </p>
          </div>
          <Switch
            checked={Boolean(includeExtras)}
            onCheckedChange={(checked) =>
              setValue("decision.includeAdditionalCostsInGuideline", checked, { shouldDirty: true, shouldValidate: true })
            }
            aria-label="Include extra costs in the guideline"
          />
        </div>
        {includeExtras ? (
          <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">Extra costs to deduct from the guideline</legend>
            {EXTRA_COST_OPTIONS.map((option) => (
              <Label
                key={option.key}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm font-normal"
              >
                <Checkbox
                  checked={Boolean(extras?.[option.key])}
                  onCheckedChange={(checked) =>
                    setValue(`decision.guidelineAdditionalCosts.${option.key}`, checked === true, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                {option.label}
              </Label>
            ))}
          </fieldset>
        ) : null}
      </div>

      {strategy === "brrrr" ? (
        <div>
          <SectionTitle title="BRRRR refinance" description="Used by the existing refinance checks. Not mixed with the ARV guideline." />
          <FieldGrid>
            <NumberField name="brrrr.refinanceLtv" label="Refinance LTV" suffix="%" />
            <NumberField name="brrrr.refinanceRate" label="Refinance rate" suffix="%" />
            <NumberField name="brrrr.refinanceTermYears" label="Refinance term" suffix="yrs" />
            <NumberField name="brrrr.refinanceDscrMin" label="DSCR requirement" hint="Minimum DSCR for refinance to count as viable." />
          </FieldGrid>
        </div>
      ) : null}

      {strategy === "fix-flip" ? (
        <div>
          <SectionTitle title="Flip exit" description="Selling costs sit on the exit, not in all-in acquisition." />
          <FieldGrid>
            <NumberField name="flip.financingCosts" label="Financing costs" prefix={symbol} hint="Points, hard-money fees, bridging interest." />
            <NumberField name="flip.sellingCostsPercent" label="Selling costs" suffix="%" />
            <NumberField name="flip.realtorFeePercent" label="Realtor fee" suffix="%" />
          </FieldGrid>
        </div>
      ) : null}
    </div>
  );
}

export function valueStatus(input: {
  decision?: { conservativeArv?: number; advertisedArv?: number };
}): "ready" | "review" | "empty" {
  if ((input.decision?.conservativeArv ?? 0) > 0) return "ready";
  if ((input.decision?.advertisedArv ?? 0) > 0) return "review";
  return "empty";
}
