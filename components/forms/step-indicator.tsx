"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface WizardStep {
  id: string;
  label: string;
  short: string;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  current: number;
  onSelect: (index: number) => void;
  errors?: boolean[];
}

export function StepIndicator({ steps, current, onSelect, errors = [] }: StepIndicatorProps) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-1">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const hasError = errors[index];
        return (
          <li key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "group flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors",
                active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative flex size-6 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                  hasError
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-success/60 bg-success/15 text-success"
                        : "border-border bg-card text-muted-foreground",
                )}
              >
                {done && !hasError ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                {active && (
                  <motion.span
                    layoutId="step-ring"
                    className="absolute -inset-1 rounded-full border border-primary/40"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.short}</span>
            </button>
            {index < steps.length - 1 && <span className="h-px w-3 bg-border sm:w-5" />}
          </li>
        );
      })}
    </ol>
  );
}
