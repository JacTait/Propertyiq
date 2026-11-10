"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { MaxOfferInputs } from "@/lib/types";
import { maxOfferSchema, type MaxOfferFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { maxOfferPath } from "@/lib/utils/routes";
import { createDefaultMaxOffer, maxOfferToAnalysisInput } from "@/data/default-max-offer";
import { sanitizeMaxOffer } from "@/lib/calculations/max-offer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import { useMaxOfferAnalysis } from "@/hooks/useMaxOfferAnalysis";
import { usePropertyAnalysis } from "@/hooks/usePropertyAnalysis";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";
import { MaxOfferForm } from "@/components/max-offer/max-offer-form";
import { MaxOfferKpis } from "@/components/max-offer/max-offer-kpis";
import { OfferTiers } from "@/components/max-offer/offer-tiers";
import { DealVerdict } from "@/components/max-offer/deal-verdict";
import { ScenarioTable } from "@/components/max-offer/scenario-table";
import { MaxOfferCharts } from "@/components/max-offer/max-offer-charts";
import { BrrrrPanel } from "@/components/max-offer/brrrr-panel";
import { MaxOfferSummaryCard } from "@/components/max-offer/max-offer-summary";
import { BuyBoxStatusCard } from "@/components/analysis/buy-box-status";
import { DealKillerList } from "@/components/analysis/deal-killers";

export interface MaxOfferDraft {
  input: MaxOfferInputs;
  savedId: string | null;
}

function isDraft(value: unknown): value is MaxOfferDraft {
  return typeof value === "object" && value !== null && "input" in value && "savedId" in value;
}

function readPropertyId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("id")?.trim();
  return raw ? raw : null;
}

export function MaxOfferSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Offer Engine"
        title="Max Offer Analyzer"
        description="Work backwards from ARV, rent and rehab to the highest price you can pay."
      />
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-7 2xl:col-span-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </>
  );
}

export function MaxOfferView() {
  const searchParams = useSearchParams();
  const propertyId = readPropertyId(searchParams);
  const { getById, hydrated: portfolioHydrated } = usePortfolio();
  const { settings, hydrated: settingsHydrated } = useSettings();
  const [draft, setDraft, draftHydrated] = useLocalStorage<MaxOfferDraft | null>(
    STORAGE_KEYS.maxOfferDraft,
    null,
    isDraft,
  );
  const hydrated = settingsHydrated && draftHydrated && portfolioHydrated;

  if (!hydrated) return <MaxOfferSkeleton />;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;
  const savedInput = fromPortfolio?.maxOfferInput;

  let initial: MaxOfferDraft;
  if (savedInput) {
    initial = { input: savedInput, savedId: fromPortfolio.id };
  } else if (!propertyId && draft && draft.savedId === null) {
    initial = draft;
  } else {
    initial = { input: createDefaultMaxOffer(settings.defaultCountry), savedId: null };
  }

  return (
    <MaxOfferSession
      key={propertyId ?? "new"}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !savedInput)}
      onDraftChange={setDraft}
    />
  );
}

interface SessionProps {
  initial: MaxOfferDraft;
  requestedId: string | null;
  missing: boolean;
  onDraftChange: (value: MaxOfferDraft | ((prev: MaxOfferDraft | null) => MaxOfferDraft | null)) => void;
}

function MaxOfferSession({ initial, requestedId, missing, onDraftChange }: SessionProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const { saveMaxOffer, getById } = usePortfolio();
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(initial.savedId);
  const warnedMissing = useRef(false);

  const form = useForm<MaxOfferFormValues>({
    resolver: zodResolver(maxOfferSchema),
    defaultValues: initial.input,
    mode: "onChange",
  });

  useEffect(() => {
    if (!missing || warnedMissing.current) return;
    warnedMissing.current = true;
    toast.error("Max offer analysis not found", {
      description: "That saved run is no longer in your portfolio. Starting a new one.",
    });
    router.replace(maxOfferPath());
  }, [missing, router]);

  const values = useWatch({ control: form.control });
  const input = useMemo(() => values as MaxOfferInputs, [values]);
  const results = useMaxOfferAnalysis(input);
  const analysisInput = useMemo(
    () => (results ? maxOfferToAnalysisInput(sanitizeMaxOffer(input), results, settings.defaultCountry) : null),
    [input, results, settings.defaultCountry],
  );
  const analysisResults = usePropertyAnalysis(analysisInput);
  const underwriting = useUnderwriting(analysisInput, analysisResults, { includeSensitivity: false });

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!input) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const next: MaxOfferDraft = { input: sanitizeMaxOffer(input), savedId };
    persistTimer.current = setTimeout(() => {
      onDraftChange((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [input, savedId, onDraftChange]);

  const handleSave = (name: string, asNew: boolean) => {
    if (!input || !results) return;
    const clean = sanitizeMaxOffer({ ...input, property: { ...input.property, name } });
    const saved = saveMaxOffer(
      clean,
      results,
      settings.defaultCountry,
      name,
      asNew ? undefined : (savedId ?? undefined),
      underwriting,
    );
    form.setValue("property.name", name);
    setSavedId(saved.id);
    onDraftChange({ input: clean, savedId: saved.id });
    if (asNew || requestedId !== saved.id) {
      router.replace(maxOfferPath(saved.id));
    }
    toast.success(asNew || !savedId ? "Saved to portfolio" : "Portfolio updated", {
      description: `${name} · Max offer ${Math.round(results.maximumOffer).toLocaleString()}`,
    });
  };

  const existing = savedId ? getById(savedId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Offer Engine"
        title="Max Offer Analyzer"
        description="Work backwards from ARV, rent and rehab to the highest price you can pay while still hitting your investing criteria."
        actions={
          results ? (
            <Button variant="gradient" onClick={() => setSaveOpen(true)}>
              <Save /> {existing ? "Update in Portfolio" : "Save to Portfolio"}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
          <div className="min-w-0 xl:sticky xl:top-20">
            <MaxOfferForm form={form} />
          </div>
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-7 2xl:col-span-8">
          {results ? (
            <>
              <MaxOfferKpis results={results} />
              {underwriting && <BuyBoxStatusCard match={underwriting.buyBox} />}
              <DealVerdict results={results} />
              <OfferTiers results={results} />
              {underwriting && <DealKillerList warnings={underwriting.warnings} />}
            </>
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          )}
        </div>
      </div>

      {results && (
        <div className="mt-6 space-y-4">
          <MaxOfferCharts results={results} />
          <ScenarioTable results={results} />
          <BrrrrPanel form={form} results={results} />
          <MaxOfferSummaryCard input={sanitizeMaxOffer(input)} results={results} />
        </div>
      )}

      {input && (
        <SavePropertyDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          defaultName={input.property.name || "Max Offer Deal"}
          isUpdate={Boolean(existing)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
