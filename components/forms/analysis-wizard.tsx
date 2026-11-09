"use client";

import { useState } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { STEP_FIELDS, type AnalysisFormValues } from "@/lib/utils/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StepIndicator, type WizardStep } from "@/components/forms/step-indicator";
import { LocationStep } from "@/components/forms/location-step";
import { PropertyStep } from "@/components/forms/property-step";
import { StrategyStep } from "@/components/forms/strategy-step";
import { FinancingStep } from "@/components/forms/financing-step";
import { IncomeExpensesStep } from "@/components/forms/income-expenses-step";

export const WIZARD_STEPS: WizardStep[] = [
  { id: "location", label: "Location", short: "Where" },
  { id: "property", label: "Property", short: "What" },
  { id: "strategy", label: "Strategy", short: "How" },
  { id: "financing", label: "Financing", short: "Loan" },
  { id: "income", label: "Income & Expenses", short: "Cash" },
];

interface AnalysisWizardProps {
  form: UseFormReturn<AnalysisFormValues>;
  onReset: () => void;
}

export function AnalysisWizard({ form, onReset }: AnalysisWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const errors = WIZARD_STEPS.map((_, index) =>
    STEP_FIELDS[index].some((field) => Boolean(form.formState.errors[field])),
  );

  const go = async (next: number) => {
    if (next > step) {
      const valid = await form.trigger(STEP_FIELDS[step]);
      if (!valid) return;
    }
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(WIZARD_STEPS.length - 1, next)));
  };

  return (
    <FormProvider {...form}>
      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b border-border/60 bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Step {step + 1} of {WIZARD_STEPS.length}
              </p>
              <h2 className="text-lg font-bold">{WIZARD_STEPS[step].label}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
              <RotateCcw /> Reset
            </Button>
          </div>
          <StepIndicator steps={WIZARD_STEPS} current={step} onSelect={go} errors={errors} />
        </CardHeader>

        <CardContent className="pt-5 sm:pt-6">
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <div className="relative min-h-[320px] overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {step === 0 && <LocationStep />}
                  {step === 1 && <PropertyStep />}
                  {step === 2 && <StrategyStep />}
                  {step === 3 && <FinancingStep />}
                  {step === 4 && <IncomeExpensesStep />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => go(step - 1)} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button onClick={() => go(step + 1)}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button variant="gradient" onClick={() => go(0)}>
                  Review from start <RotateCcw />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </FormProvider>
  );
}
