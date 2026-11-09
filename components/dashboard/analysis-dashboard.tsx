"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput } from "@/lib/types";
import { analysisSchema, type AnalysisFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import { usePropertyAnalysis, sanitizeInput } from "@/hooks/usePropertyAnalysis";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { AnalysisWizard } from "@/components/forms/analysis-wizard";
import { ResultsPanel } from "@/components/dashboard/results-panel";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";

export interface AnalysisDraft {
  input: AnalysisInput;
  savedId: string | null;
}

function isDraft(value: unknown): value is AnalysisDraft {
  return typeof value === "object" && value !== null && "input" in value;
}

export function AnalysisDashboard() {
  const { settings, hydrated: settingsHydrated } = useSettings();
  const { saveProperty, getById } = usePortfolio();
  const [draft, setDraft, draftHydrated] = useLocalStorage<AnalysisDraft | null>(STORAGE_KEYS.draft, null, isDraft);
  const [saveOpen, setSaveOpen] = useState(false);
  const initialised = useRef(false);
  const savedId = draft?.savedId ?? null;
  const hydrated = settingsHydrated && draftHydrated;

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: createDefaultAnalysis("US"),
    mode: "onChange",
  });

  /* Hydrate the form once from the saved draft (or defaults for the preferred country). */
  useEffect(() => {
    if (!hydrated || initialised.current) return;
    initialised.current = true;
    form.reset(draft ? draft.input : createDefaultAnalysis(settings.defaultCountry));
  }, [hydrated, draft, form, settings.defaultCountry]);

  /* Live values → analysis */
  const values = useWatch({ control: form.control });
  const input = useMemo(() => (hydrated ? (values as AnalysisInput) : null), [values, hydrated]);
  const results = usePropertyAnalysis(input);
  const summary = useInvestmentSummary(input, results);

  /* Persist draft (debounced) */
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || !initialised.current || !input) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const next: AnalysisDraft = { input: sanitizeInput(input), savedId };
    persistTimer.current = setTimeout(() => {
      setDraft((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [input, savedId, hydrated, setDraft]);

  const handleReset = useCallback(() => {
    const fresh = createDefaultAnalysis(settings.defaultCountry);
    form.reset(fresh);
    setDraft({ input: fresh, savedId: null });
    toast("Analysis reset", { description: "Inputs restored to defaults for your preferred country." });
  }, [form, settings.defaultCountry, setDraft]);

  const handleSave = (name: string, asNew: boolean) => {
    if (!input || !results) return;
    const clean = sanitizeInput({ ...input, property: { ...input.property, name } });
    const saved = saveProperty(clean, results, name, asNew ? undefined : (savedId ?? undefined));
    form.setValue("property.name", name);
    setDraft({ input: clean, savedId: saved.id });
    toast.success(asNew || !savedId ? "Saved to portfolio" : "Portfolio updated", {
      description: `${name} · Deal score ${results.dealScore.score}/100`,
    });
  };

  const existing = savedId ? getById(savedId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Deal Analyser"
        title="Property Analysis"
        description="Enter the deal, tune the assumptions, and PropertyIQ scores it in real time."
        actions={
          results && input && summary ? (
            <>
              <ExportPdfButton input={sanitizeInput(input)} results={results} summary={summary} />
              <Button variant="gradient" onClick={() => setSaveOpen(true)}>
                <Save /> {existing ? "Update in Portfolio" : "Save to Portfolio"}
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
          <div className="min-w-0 xl:sticky xl:top-20">
            {hydrated ? <AnalysisWizard form={form} onReset={handleReset} /> : <Skeleton className="h-[560px] w-full rounded-2xl" />}
          </div>
        </div>
        <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
          {input && results && summary ? (
            <ResultsPanel input={input} results={results} summary={summary} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          )}
        </div>
      </div>

      {input && (
        <SavePropertyDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          defaultName={input.property.name || "Untitled property"}
          isUpdate={Boolean(existing)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
