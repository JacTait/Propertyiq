"use client";

import { useMemo, useState } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { RotateCcw } from "lucide-react";
import type { AnalysisFormValues } from "@/lib/utils/schema";
import type { AnalysisInput, AnalysisResults, InvestmentSummary, RentSource, UnderwritingPack } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useDealDecision } from "@/hooks/useDealDecision";
import { Button } from "@/components/ui/button";
import { WORKSPACE_SECTIONS, type WorkspaceSectionId } from "@/components/workspace/workspace-sections";
import { WorkspaceSection, type SectionStatus } from "@/components/workspace/workspace-section";
import { LiveSummary } from "@/components/workspace/live-summary";
import { MobileSummaryBar } from "@/components/workspace/mobile-summary-bar";
import { SectionAcquisition, acquisitionStatus } from "@/components/workspace/section-acquisition";
import { SectionValue, valueStatus } from "@/components/workspace/section-value";
import { SectionIncome, incomeStatus } from "@/components/workspace/section-income";
import { SectionExpenses, expensesStatus } from "@/components/workspace/section-expenses";
import { SectionFinancing, financingStatus } from "@/components/workspace/section-financing";
import { SectionAnalysis } from "@/components/workspace/section-analysis";

interface DealWorkspaceProps {
  form: UseFormReturn<AnalysisFormValues>;
  onReset: () => void;
  input: AnalysisInput;
  results: AnalysisResults | null;
  summary: InvestmentSummary | null;
  underwriting: UnderwritingPack | null;
  onRentSourceChange: (source: RentSource) => void;
}

const DEFAULT_OPEN: Record<WorkspaceSectionId, boolean> = {
  acquisition: true,
  value: true,
  income: true,
  expenses: true,
  financing: true,
  analysis: false,
};

export function DealWorkspace({
  form,
  onReset,
  input,
  results,
  summary,
  underwriting,
  onRentSourceChange,
}: DealWorkspaceProps) {
  const decision = useDealDecision(input);
  const [open, setOpen] = useState(DEFAULT_OPEN);

  const statuses = useMemo<Record<WorkspaceSectionId, SectionStatus>>(
    () => ({
      acquisition: acquisitionStatus(input),
      value: valueStatus(input),
      income: incomeStatus(input),
      expenses: expensesStatus(input),
      financing: financingStatus(input),
      analysis: results ? "review" : "empty",
    }),
    [input, results],
  );

  const jumpTo = (id: WorkspaceSectionId) => {
    setOpen((current) => ({ ...current, [id]: true }));
    window.setTimeout(() => {
      const preferred = id === "analysis" ? document.getElementById("decision-summary") : null;
      (preferred ?? document.getElementById(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const toggle = (id: WorkspaceSectionId, next: boolean) => {
    setOpen((current) => ({ ...current, [id]: next }));
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-4 pb-16 xl:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Deal sections" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {WORKSPACE_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  open[section.id]
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {section.number} {section.title}
              </button>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <RotateCcw /> Reset
          </Button>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-12">
          <div className="min-w-0 space-y-4 xl:col-span-7">
            <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-4">
              {WORKSPACE_SECTIONS.map((section) => (
                <WorkspaceSection
                  key={section.id}
                  id={section.id}
                  number={section.number}
                  title={section.title}
                  description={section.description}
                  status={statuses[section.id]}
                  open={open[section.id]}
                  onOpenChange={(next) => toggle(section.id, next)}
                >
                  {section.id === "acquisition" ? <SectionAcquisition decision={decision} /> : null}
                  {section.id === "value" ? <SectionValue decision={decision} /> : null}
                  {section.id === "income" ? <SectionIncome /> : null}
                  {section.id === "expenses" ? <SectionExpenses /> : null}
                  {section.id === "financing" ? <SectionFinancing /> : null}
                  {section.id === "analysis" ? (
                    <SectionAnalysis
                      decision={decision}
                      input={input}
                      results={results}
                      summary={summary}
                      underwriting={underwriting}
                      onRentSourceChange={onRentSourceChange}
                    />
                  ) : null}
                </WorkspaceSection>
              ))}
            </form>
          </div>
          <div className="hidden min-w-0 xl:col-span-5 xl:block">
            <div className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
              <LiveSummary decision={decision} />
              <button
                type="button"
                onClick={() => jumpTo("analysis")}
                className="text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
              >
                Open assumption check, scenarios and break-even limits
              </button>
            </div>
          </div>
        </div>
        <MobileSummaryBar decision={decision} onViewSummary={() => jumpTo("analysis")} />
      </div>
    </FormProvider>
  );
}
