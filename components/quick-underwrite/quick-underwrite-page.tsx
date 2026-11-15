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
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";
import { PropertyDetailsPanel } from "@/components/quick-underwrite/property-details-panel";
import { QuickBuyBoxPanel } from "@/components/quick-underwrite/buy-box-status";
import { AcquisitionInputs } from "@/components/quick-underwrite/acquisition-inputs";
import { RehabInputs } from "@/components/quick-underwrite/rehab-inputs";
import { RentValidationPanel } from "@/components/quick-underwrite/rent-validation-panel";
import { NeighbourhoodPanel } from "@/components/quick-underwrite/neighbourhood-panel";
import { OperatingExpenses } from "@/components/quick-underwrite/operating-expenses";
import { RefinanceInputs } from "@/components/quick-underwrite/refinance-inputs";
import { DownsideSnapshot } from "@/components/quick-underwrite/downside-snapshot";
import { DealKillerList } from "@/components/quick-underwrite/deal-killer-list";
import { AdvancedMetrics } from "@/components/quick-underwrite/advanced-metrics";
import { ExportQuickUnderwritePdfButton } from "@/components/reports/export-quick-underwrite-pdf";
import { PropertyContextHeader } from "@/components/underwriting/property-context-header";
import { MajorMetric } from "@/components/underwriting/major-metric";
import { BuyWorksheet, OperateWorksheet, RefinanceWorksheet } from "@/components/underwriting/worksheets";
import { DecisionRail } from "@/components/underwriting/decision-rail";
import { OfferRange } from "@/components/underwriting/offer-range";
import { BuyBoxBreakdown } from "@/components/underwriting/buy-box-breakdown";
import { ScoreBreakdown } from "@/components/underwriting/score-breakdown";
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
      <Skeleton className="h-24 w-full rounded-lg" />
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-lg xl:col-span-9" />
        <Skeleton className="h-96 rounded-lg xl:col-span-3" />
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

  const dirty = form.formState.isDirty;
  const primaryRisk = quick.downside?.primaryRisk;

  return (
    <>
      <FormProvider {...form}>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
            <PropertyContextHeader input={input} buyBox={quick.buyBox} className="border-0 pb-0" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {quick.buyBox.profileName ? (
                <span>
                  <span className="uppercase tracking-[0.14em]">Buy Box</span>{" "}
                  <span className="text-foreground">{quick.buyBox.profileName}</span>
                </span>
              ) : null}
              <span>
                <span className="uppercase tracking-[0.14em]">Status</span>{" "}
                <span className="text-foreground">{savedId && !dirty ? "Saved" : "Unsaved changes"}</span>
              </span>
              {existing?.updatedAt ? (
                <span>
                  <span className="uppercase tracking-[0.14em]">Updated</span>{" "}
                  <span className="font-figure text-foreground">{fmt.dateTime(existing.updatedAt)}</span>
                </span>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={dashboardPath(requestedId)}>Standard Analysis</Link>
                </Button>
                <ExportQuickUnderwritePdfButton input={sanitizeInput(input)} quick={quick} underwriting={underwriting} />
                {savedId ? (
                  <Button variant="outline" size="sm" onClick={handleDuplicate}>
                    <Copy /> Duplicate
                  </Button>
                ) : null}
                {savedId ? (
                  <Button variant="outline" size="sm" onClick={handleDelete}>
                    <Trash2 /> Delete
                  </Button>
                ) : null}
                <Button size="sm" onClick={() => setSaveOpen(true)}>
                  <Save /> {existing ? "Save" : "Save"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MajorMetric
              label="Buy Box"
              value={quick.buyBox.status === "inside" ? "Inside" : quick.buyBox.status === "outside" ? "Outside" : "Not set"}
              detail={quick.buyBox.profileName ?? "No active profile"}
              tone={quick.buyBox.status === "inside" ? "success" : quick.buyBox.status === "outside" ? "danger" : "muted"}
            />
            <MajorMetric
              label="Final Decision"
              value={quick.verdict.label}
              detail={quick.verdict.summary}
              tone={
                quick.verdict.verdict === "worth-pursuing"
                  ? "success"
                  : quick.verdict.verdict === "investigate"
                    ? "warning"
                    : quick.verdict.verdict === "walk-away"
                      ? "danger"
                      : "muted"
              }
            />
            <MajorMetric
              label="Maximum Offer"
              value={quick.maximumOffer == null ? "—" : fmt.currency(quick.maximumOffer)}
              detail={quick.marginOfSafetyPercent == null ? "Enter asking or purchase price" : `${fmt.percent(quick.marginOfSafetyPercent)} margin of safety`}
              tone="primary"
            />
            <MajorMetric
              label="Primary Risk"
              value={primaryRisk ?? "—"}
              detail={quick.downside ? `${quick.downside.dealSurvivalScore}/100 survival` : "Complete rent and ARV to score survival"}
              tone={primaryRisk ? "warning" : "muted"}
            />
          </div>

          <div className="xl:hidden">
            <DecisionRail results={quick} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
            <div className="grid gap-4 lg:grid-cols-3">
              <BuyWorksheet input={input} results={quick} />
              <OperateWorksheet rent={quick.rent} operating={quick.operating} cashflow={quick.monthlyCashflow} />
              <RefinanceWorksheet results={quick} />
            </div>
            <div className="hidden xl:block">
              <DecisionRail results={quick} sticky />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <OfferRange
              maximum={quick.maximumOffer}
              currentAsk={input.financing.askingPrice}
              proposedOffer={input.financing.proposedOffer}
            />
            <BuyBoxBreakdown match={quick.buyBox} />
            {quick.downside ? (
              <ScoreBreakdown
                score={quick.downside.dealSurvivalScore}
                grade={underwriting?.downside.gradeLabel}
                components={
                  underwriting?.downside.components.map((component) => ({
                    key: component.key,
                    label: component.label,
                    score: component.score,
                  })) ?? []
                }
                primaryRisk={quick.downside.primaryRisk}
              />
            ) : (
              <DownsideSnapshot snapshot={quick.downside} propertyId={requestedId} />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DownsideSnapshot snapshot={quick.downside} propertyId={requestedId} />
            <DealKillerList warnings={quick.warnings} />
          </div>
          <p className="text-sm text-muted-foreground">{quick.verdict.summary}</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <PropertyDetailsPanel onLocationChange={handleLocationChange} />
            <QuickBuyBoxPanel match={quick.buyBox} />
            <AcquisitionInputs usedPrice={quick.acquisitionPrice} />
            <RehabInputs allIn={quick.allIn} />
            <RentValidationPanel rent={quick.rent} />
            <OperatingExpenses operating={quick.operating} />
            <RefinanceInputs />
            <NeighbourhoodPanel />
          </div>

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
