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
import { dashboardPath, downsidePath, resiliencePath } from "@/lib/utils/routes";
import { identityFromAnalysis } from "@/lib/property-identity";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useSettings } from "@/hooks/useSettings";
import { usePropertyAnalysis, sanitizeInput } from "@/hooks/usePropertyAnalysis";
import { useInvestmentSummary } from "@/hooks/useInvestmentSummary";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { useSharedDeal } from "@/hooks/useSharedDeal";
import { useDebouncedDraftSync } from "@/hooks/useDebouncedDraftSync";
import { sharedDealFromPortfolio, sharedDealToStandardAnalysis, type AnalysisDraft } from "@/lib/deal-draft";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { DealWorkspace } from "@/components/workspace/deal-workspace";
import { ExportPdfButton } from "@/components/reports/export-pdf-button";
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";

export type { AnalysisDraft };

function readPropertyId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("id")?.trim();
  return raw ? raw : null;
}

export function AnalysisDashboardSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Deal Workspace"
        title="Standard Analysis"
        description="Guided underwrite in the order the deal happens: buy, operate, refinance."
      />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-7">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <div className="min-w-0 xl:col-span-5">
          <Skeleton className="h-64 w-full rounded-2xl" />
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
  const { draft, hydrated: dealHydrated, revision, patchAnalysis, adoptPortfolio } = useSharedDeal();
  const hydrated = settingsHydrated && dealHydrated && portfolioHydrated;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;
  useEffect(() => {
    if (!propertyId) return;
    const saved = getById(propertyId) ?? findPortfolioProperty(propertyId);
    if (saved) adoptPortfolio(saved, "standard-analysis");
  }, [adoptPortfolio, getById, propertyId]);

  if (!hydrated) return <AnalysisDashboardSkeleton />;

  const source = fromPortfolio ? sharedDealFromPortfolio(fromPortfolio, settings.defaultCountry) : draft;
  const initial: AnalysisDraft = {
    input: sharedDealToStandardAnalysis(source),
    savedId: source.savedId,
  };

  return (
    <DashboardSession
      key={`${propertyId ?? source.savedId ?? "draft"}-${revision}`}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !fromPortfolio)}
      onDraftChange={(input) => patchAnalysis(input, "standard-analysis")}
    />
  );
}

interface DashboardSessionProps {
  initial: AnalysisDraft;
  requestedId: string | null;
  missing: boolean;
  onDraftChange: (input: AnalysisInput) => void;
}

function DashboardSession({ initial, requestedId, missing, onDraftChange }: DashboardSessionProps) {
  const router = useRouter();
  const { getById } = usePortfolio();
  const { saveDeal, startNewDeal } = useSharedDeal();
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

  useDebouncedDraftSync(input, (next) => {
    if (next) onDraftChange(sanitizeInput(next));
  });

  const handleReset = useCallback(() => {
    startNewDeal();
    setSavedId(null);
    router.replace(dashboardPath());
    toast("Analysis reset", { description: "Started a new blank deal. Saved Portfolio properties were not deleted." });
  }, [router, startNewDeal]);

  const handleSave = (name: string, asNew: boolean) => {
    if (!input || !results) return;
    const saved = saveDeal(name, asNew, "standard-analysis");
    if (!saved) return;
    form.setValue("property.name", name);
    setSavedId(saved.id);
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
        eyebrow="Deal Workspace"
        title="Standard Analysis"
        description="Guided underwrite in the order the deal happens: buy, operate, refinance."
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
              <Button onClick={() => setSaveOpen(true)}>
                <Save /> {existing ? "Update in Portfolio" : "Save to Portfolio"}
              </Button>
            </>
          ) : null
        }
      />

      <DealWorkspace
        form={form}
        onReset={handleReset}
        input={input}
        results={results}
        summary={summary}
        underwriting={underwriting}
        onRentSourceChange={(source: RentSource) => form.setValue("income.rentSource", source)}
      />

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
