"use client";

import { Controller, useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { Building2, Hammer, Home, Palmtree, Repeat, type LucideIcon } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { InvestmentStrategy } from "@/lib/types";
import { STRATEGIES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { SectionTitle } from "@/components/forms/fields";

const ICONS: Record<InvestmentStrategy, LucideIcon> = {
  "buy-hold": Home,
  "short-term-rental": Palmtree,
  brrrr: Repeat,
  "fix-flip": Hammer,
  "commercial-lease": Building2,
};

const INPUT_HINTS: Record<InvestmentStrategy, string[]> = {
  "buy-hold": ["Monthly rent", "Operating expenses", "Vacancy & management"],
  "short-term-rental": ["Nightly rate", "Occupancy %", "Cleaning & platform fees"],
  brrrr: ["Rehab cost", "After repair value", "Refinance LTV & rent"],
  "fix-flip": ["Renovation budget", "Holding & selling costs", "Expected sale price"],
  "commercial-lease": ["Lease income", "Operating expenses", "Vacancy allowance"],
};

export function StrategyStep() {
  const { control } = useFormContext<AnalysisFormValues>();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Choose your investment strategy"
        description="The strategy changes which inputs appear in the next steps and how the deal is scored."
      />
      <Controller
        control={control}
        name="strategy"
        render={({ field }) => (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
            {STRATEGIES.map((s, index) => {
              const Icon = ICONS[s.value];
              const active = field.value === s.value;
              return (
                <motion.button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => field.onChange(s.value)}
                  className={cn(
                    "relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10 glow-primary"
                      : "border-border bg-card/40 hover:border-primary/40 hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    {active && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {INPUT_HINTS[s.value].map((h) => (
                      <li
                        key={h}
                        className="rounded-md border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
