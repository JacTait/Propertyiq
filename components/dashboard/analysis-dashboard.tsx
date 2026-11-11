"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Shield, Umbrella } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput, RentSource } from "@/lib/types";
import { analysisSchema, type AnalysisFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { dashboardPath, downsidePath, resiliencePath } from "@/lib/utils/routes";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { identityFromAnalysis, seedUnsavedAnalysis } from "@/lib/property-identity";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useSettings } from "@/hooks/useSettings";
import { usePropertyAnalysis, sanitizeInput } from "@/hooks/usePropertyAnalysis";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { useUnderwriting } from "@/hooks/useUnderwriting";
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
  return typeof value === "object" && value !== null && "input" in value && "savedId" in value;
}

function readPropertyId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("id")?.trim();
  return raw ? raw : null;
}

export function AnalysisDashboardSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Deal Analyser"
        title="Property Analysis"
        description="Enter the deal, tune the assumptions, and PropertyIQ scores it in real time."
      />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-7 2xl:col-span-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    </>
  );
}

export function AnalysisDashboard() {
  const searchParams = useSearchParams();
  const propertyId = readPropertyId(searchParams);
  const { getById, hydrated: portfolioHydrated } = usePortfolio();
  const { settings, hydrated: settingsHydrated } = useSettings();
  const [draft, setDraft, draftHydrated] = useLocalStorage<AnalysisDraft | null>(STORAGE_KEYS.draft, null, isDraft);
  const hydrated = settingsHydrated && draftHydrated && portfolioHydrated;

  if (!hydrated) return <AnalysisDashboardSkeleton />;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;

  let initial: AnalysisDraft;
  if (fromPortfolio) {
    initial = { input: sanitizeInput(fromPortfolio.input), savedId: fromPortfolio.id };
  } else if (!propertyId && draft && draft.savedId === null) {
    initial = {
      input: seedUnsavedAnalysis(sanitizeInput(draft.input), settings.defaultCountry),
      savedId: null,
    };
  } else {
    initial = {
      input: seedUnsavedAnalysis(createDefaultAnalysis(settings.defaultCountry), settings.defaultCountry),
      savedId: null,
    };
  }

  return (
    <DashboardSession
      key={propertyId ?? "new"}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !fromPortfolio)}
      onDraftChange={setDraft}
    />
  );
}

interface DashboardSessionProps {
  initial: AnalysisDraft;
  requestedId: string | null;
  missing: boolean;
  onDraftChange: (value: AnalysisDraft | ((prev: AnalysisDraft | null) => AnalysisDraft | null)) => void;
}

function DashboardSession({ initial, requestedId, missing, onDraftChange }: DashboardSessionProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const { saveProperty, getById } = usePortfolio();
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(initial.savedId);
  const warnedMissing = useRef(false);

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: initial.input,
    mode: "onChange",
  });

  useEffect(() => {
    if (!missing || warnedMissing.current) return;
    warnedMissing.current = true;
    toast.error("Property not found", {
      description: "That saved analysis is no longer in your portfolio. Starting a new one.",
    });
    router.replace(dashboardPath());
  }, [missing, router]);

  const values = useWatch({ control: form.control });
  const input = useMemo(() => values as AnalysisInput, [values]);
  const identity = useMemo(
    () => (input?.property && input.location ? identityFromAnalysis(input) : null),
    [input],
  );
  usePersistPropertyIdentity(identity, !requestedId);
  const results = usePropertyAnalysis(input);
  const summary = useInvestmentSummary(input, results);
  const underwriting = useUnderwriting(input, results, { includeSensitivity: false });

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!input) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const next: AnalysisDraft = { input: sanitizeInput(input), savedId };
    persistTimer.current = setTimeout(() => {
      onDraftChange((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [input, savedId, onDraftChange]);

  const handleReset = useCallback(() => {
    const fresh = createDefaultAnalysis(settings.defaultCountry);
    form.reset(fresh);
    setSavedId(null);
    onDraftChange({ input: fresh, savedId: null });
    router.replace(dashboardPath());
    toast("Analysis reset", { description: "Inputs restored to defaults for your preferred country." });
  }, [form, settings.defaultCountry, onDraftChange, router]);

  const handleSave = (name: string, asNew: boolean) => {
    if (!input || !results) return;
    const clean = sanitizeInput({ ...input, property: { ...input.property, name } });
    const saved = saveProperty(clean, results, name, asNew ? undefined : (savedId ?? undefined), underwriting);
    form.setValue("property.name", name);
    setSavedId(saved.id);
    onDraftChange({ input: clean, savedId: saved.id });
    if (asNew || requestedId !== saved.id) {
      router.replace(dashboardPath(saved.id));
    }
    toast.success(asNew || !savedId ? "Saved to portfolio" : "Portfolio updated", {
      description: `${name} · Deal score ${results.dealScore.score}/100`,
    });
  };

  const existing = savedId ? getById(savedId) ?? findPortfolioProperty(savedId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Deal Analyser"
        title="Property Analysis"
        description="Enter the deal, tune the assumptions, and PropertyIQ scores it in real time."
        actions={
          results && input && summary ? (
            <>
              <Button variant="outline" asChild>
                <Link href={resiliencePath(requestedId)}>
                  <Shield /> Resilience
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={downsidePath(requestedId)}>
                  <Umbrella /> Downside
                </Link>
              </Button>
              <ExportPdfButton input={sanitizeInput(input)} results={results} summary={summary} underwriting={underwriting} />
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
            <AnalysisWizard form={form} onReset={handleReset} />
          </div>
        </div>
        <div className="min-w-0 xl:col-span-7 2xl:col-span-8">
          {results && summary ? (
            <ResultsPanel
              input={input}
              results={results}
              summary={summary}
              underwriting={underwriting}
              onRentSourceChange={(source: RentSource) => form.setValue("income.rentSource", source)}
            />
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
