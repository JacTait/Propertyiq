"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput, CountryCode } from "@/lib/types";
import { analysisSchema, type AnalysisFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { dashboardPath, quickUnderwritePath } from "@/lib/utils/routes";
import { createBlankAnalysis } from "@/data/default-analysis";
import { getMarketProfile, toMarketData } from "@/data/market-data";
import { identityFromAnalysis, seedUnsavedAnalysis } from "@/lib/property-identity";
import { calculateQuickUnderwrite } from "@/lib/calculations/quick-underwrite";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useFormatters, useSettings } from "@/hooks/useSettings";
import { usePropertyAnalysis, sanitizeInput } from "@/hooks/usePropertyAnalysis";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";
import { StatRow } from "@/components/dashboard/stat-row";
import { PropertyDetailsPanel } from "@/components/quick-underwrite/property-details-panel";
import { QuickBuyBoxPanel } from "@/components/quick-underwrite/buy-box-status";
import { AcquisitionInputs } from "@/components/quick-underwrite/acquisition-inputs";
import { RehabInputs } from "@/components/quick-underwrite/rehab-inputs";
import { RentValidationPanel } from "@/components/quick-underwrite/rent-validation-panel";
import { NeighbourhoodPanel } from "@/components/quick-underwrite/neighbourhood-panel";
import { OperatingExpenses } from "@/components/quick-underwrite/operating-expenses";
import { RefinanceInputs } from "@/components/quick-underwrite/refinance-inputs";
import { AcquisitionRefinanceComparison } from "@/components/quick-underwrite/acquisition-refinance-comparison";
import { QuickUnderwriteVerdictCard } from "@/components/quick-underwrite/quick-underwrite-verdict";
import { CashRecoveryCard } from "@/components/quick-underwrite/cash-recovery-card";
import { DownsideSnapshot } from "@/components/quick-underwrite/downside-snapshot";
import { DealKillerList } from "@/components/quick-underwrite/deal-killer-list";
import { AdvancedMetrics } from "@/components/quick-underwrite/advanced-metrics";
import { DecisionNumbers } from "@/components/quick-underwrite/decision-numbers";
import { ExportQuickUnderwritePdfButton } from "@/components/reports/export-quick-underwrite-pdf";
import type { AnalysisDraft } from "@/components/dashboard/analysis-dashboard";

function isDraft(value: unknown): value is AnalysisDraft {
  return typeof value === "object" && value !== null && "input" in value && "savedId" in value;
}

function readPropertyId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("id")?.trim();
  return raw ? raw : null;
}

function isSampleDraft(input: AnalysisInput): boolean {
  return input.property.name === "Sample Investment Property";
}

export function QuickUnderwriteSkeleton() {
  return (
    <>
      <PageHeader eyebrow="Quick Underwrite" title="Underwrite the deal on one screen." />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-2xl xl:col-span-7" />
        <Skeleton className="h-96 rounded-2xl xl:col-span-5" />
      </div>
    </>
  );
}

export function QuickUnderwritePage() {
  const searchParams = useSearchParams();
  const propertyId = readPropertyId(searchParams);
  const { getById, hydrated: portfolioHydrated } = usePortfolio();
  const { settings, hydrated: settingsHydrated } = useSettings();
  const [draft, setDraft, draftHydrated] = useLocalStorage<AnalysisDraft | null>(STORAGE_KEYS.draft, null, isDraft);
  const hydrated = settingsHydrated && draftHydrated && portfolioHydrated;

  if (!hydrated) return <QuickUnderwriteSkeleton />;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;

  let initial: AnalysisDraft;
  if (fromPortfolio) {
    initial = { input: sanitizeInput(fromPortfolio.input), savedId: fromPortfolio.id };
  } else if (!propertyId && draft && draft.savedId === null && !isSampleDraft(draft.input)) {
    initial = {
      input: seedUnsavedAnalysis(sanitizeInput(draft.input), settings.defaultCountry),
      savedId: null,
    };
  } else {
    initial = {
      input: seedUnsavedAnalysis(createBlankAnalysis(settings.defaultCountry), settings.defaultCountry),
      savedId: null,
    };
  }

  return (
    <QuickSession
      key={propertyId ?? "new"}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !fromPortfolio)}
      onDraftChange={setDraft}
    />
  );
}

function QuickSession({
  initial,
  requestedId,
  missing,
  onDraftChange,
}: {
  initial: AnalysisDraft;
  requestedId: string | null;
  missing: boolean;
  onDraftChange: (value: AnalysisDraft | ((prev: AnalysisDraft | null) => AnalysisDraft | null)) => void;
}) {
  const router = useRouter();
  const fmt = useFormatters();
  const { saveProperty, getById, deleteProperty } = usePortfolio();
  const { active } = useBuyBoxes();
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
    toast.error("Property not found", { description: "That saved analysis is no longer in your portfolio." });
    router.replace(quickUnderwritePath());
  }, [missing, router]);

  const values = useWatch({ control: form.control });
  const input = useMemo(() => values as AnalysisInput, [values]);
  const identity = useMemo(
    () => (input?.property && input.location ? identityFromAnalysis(input) : null),
    [input],
  );
  usePersistPropertyIdentity(identity, !requestedId);

  const quick = useMemo(() => calculateQuickUnderwrite(sanitizeInput(input), active), [input, active]);
  const analysisInput = useMemo(() => {
    const clean = sanitizeInput(input);
    if (quick.acquisitionPrice.value) {
      return { ...clean, financing: { ...clean.financing, purchasePrice: quick.acquisitionPrice.value } };
    }
    return clean;
  }, [input, quick.acquisitionPrice.value]);
  const results = usePropertyAnalysis(quick.acquisitionPrice.value ? analysisInput : null);
  const underwriting = useUnderwriting(analysisInput, results, { includeSensitivity: false });

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

  const handleLocationChange = (country: CountryCode, region: string) => {
    const profile = getMarketProfile(country, region);
    if (!profile) return;
    form.setValue("location.market", toMarketData(profile), { shouldDirty: true, shouldValidate: true });
  };

  const handleSave = (name: string, asNew: boolean) => {
    const clean = sanitizeInput({
      ...input,
      property: { ...input.property, name: name.trim() || input.property.name || "Untitled property" },
    });
    const toSave = results ?? analyzeProperty(clean);
    const saved = saveProperty(clean, toSave, clean.property.name, asNew ? undefined : (savedId ?? undefined), underwriting, {
      kind: "quick-underwrite",
      quick,
    });
    form.setValue("property.name", saved.name);
    setSavedId(saved.id);
    onDraftChange({ input: clean, savedId: saved.id });
    if (asNew || requestedId !== saved.id) router.replace(quickUnderwritePath(saved.id));
    toast.success(asNew || !savedId ? "Saved to portfolio" : "Portfolio updated");
  };

  const handleDuplicate = () => {
    const clean = sanitizeInput({
      ...input,
      property: { ...input.property, name: `${input.property.name || "Untitled property"} copy` },
    });
    const toSave = results ?? analyzeProperty(clean);
    const saved = saveProperty(clean, toSave, clean.property.name, undefined, underwriting, {
      kind: "quick-underwrite",
      quick,
    });
    setSavedId(saved.id);
    onDraftChange({ input: clean, savedId: saved.id });
    router.replace(quickUnderwritePath(saved.id));
    toast.success("Deal duplicated");
  };

  const handleDelete = () => {
    if (!savedId) return;
    deleteProperty(savedId);
    setSavedId(null);
    onDraftChange({ input: sanitizeInput(input), savedId: null });
    router.replace(quickUnderwritePath());
    toast("Deal deleted");
  };

  const existing = savedId ? getById(savedId) ?? findPortfolioProperty(savedId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Quick Underwrite"
        title="Underwrite the deal on one screen."
        description="Fit, rent, all-in cost, refinance and a clear pursue / investigate / walk-away call."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={dashboardPath(requestedId)}>Standard Analysis</Link>
            </Button>
            <ExportQuickUnderwritePdfButton input={sanitizeInput(input)} quick={quick} underwriting={underwriting} />
            {savedId ? (
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy /> Duplicate
              </Button>
            ) : null}
            {savedId ? (
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 /> Delete
              </Button>
            ) : null}
            <Button variant="gradient" onClick={() => setSaveOpen(true)}>
              <Save /> {existing ? "Update Saved Deal" : "Save Quick Underwrite"}
            </Button>
          </div>
        }
      />

      <FormProvider {...form}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-7">
              <PropertyDetailsPanel onLocationChange={handleLocationChange} />
            </div>
            <div className="space-y-4 xl:col-span-5">
              <QuickBuyBoxPanel match={quick.buyBox} />
              <QuickUnderwriteVerdictCard verdict={quick.verdict} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-7">
              <AcquisitionInputs usedPrice={quick.acquisitionPrice} />
              <RehabInputs allIn={quick.allIn} />
            </div>
            <div className="space-y-4 xl:col-span-5">
              <RefinanceInputs />
              <Card>
                <CardHeader>
                  <CardTitle>All-in cost</CardTitle>
                </CardHeader>
                <CardContent>
                  {quick.allIn.total === null ? (
                    <p className="text-sm text-muted-foreground">{quick.allIn.message}</p>
                  ) : (
                    <>
                      <StatRow label="Acquisition price used" value={`${fmt.currency(quick.allIn.acquisitionPriceUsed ?? 0)} · ${quick.allIn.acquisitionPriceSource.label}`} />
                      <StatRow label="Adjusted rehab" value={fmt.currency(quick.allIn.adjustedRehabBudget)} />
                      <StatRow label="Other rehab" value={fmt.currency(quick.allIn.otherRehabCosts)} />
                      <StatRow label="Closing + inspection + legal + loan fees" value={fmt.currency(quick.allIn.closingCosts + quick.allIn.inspectionCosts + quick.allIn.legalFees + quick.allIn.loanFees)} />
                      <StatRow label="Holding costs used" value={fmt.currency(quick.allIn.holdingCostsUsed)} />
                      <StatRow label="Other acquisition" value={fmt.currency(quick.allIn.otherAcquisitionCosts)} />
                      <StatRow label="All-in cost" value={fmt.currency(quick.allIn.total)} emphasis />
                    </>
                  )}
                </CardContent>
              </Card>
              <CashRecoveryCard results={quick} />
            </div>
            <div className="space-y-4 xl:col-span-7">
              <RentValidationPanel rent={quick.rent} />
              <OperatingExpenses operating={quick.operating} />
              <NeighbourhoodPanel />
            </div>
          </div>

          <AcquisitionRefinanceComparison input={input} results={quick} />
          <DecisionNumbers input={input} results={quick} />
          <DownsideSnapshot snapshot={quick.downside} propertyId={requestedId} />
          <DealKillerList warnings={quick.warnings} />
          <AdvancedMetrics results={quick} analysis={results} />
        </div>
      </FormProvider>

      <SavePropertyDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultName={input.property.name || "Untitled property"}
        isUpdate={Boolean(existing)}
        onSave={handleSave}
      />
    </>
  );
}
