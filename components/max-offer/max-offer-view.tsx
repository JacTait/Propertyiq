"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { CountryCode, MaxOfferInputs } from "@/lib/types";
import { maxOfferSchema, type MaxOfferFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { maxOfferPath } from "@/lib/utils/routes";
import { createDefaultMaxOffer, maxOfferToAnalysisInput } from "@/data/default-max-offer";
import { getMarketProfile } from "@/data/market-data";
import { sanitizeMaxOffer } from "@/lib/calculations/max-offer";
import { pendingMargin } from "@/lib/calculations/margin-of-safety";
import { identityFromMaxOffer, seedUnsavedMaxOffer } from "@/lib/property-identity";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useSettings } from "@/hooks/useSettings";
import { useMaxOfferAnalysis } from "@/hooks/useMaxOfferAnalysis";
import { usePropertyAnalysis } from "@/hooks/usePropertyAnalysis";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { Badge } from "@/components/ui/badge";
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
import { OfferEvaluationCard } from "@/components/max-offer/offer-evaluation";
import { DownsideAnalysisPanel, DownsideCharts } from "@/components/analysis/downside-analysis";
import { UnderwritingSummaryCard } from "@/components/analysis/underwriting-summary";

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
    initial = { input: seedUnsavedMaxOffer(sanitizeMaxOffer(draft.input), settings.defaultCountry), savedId: null };
  } else {
    initial = {
      input: seedUnsavedMaxOffer(createDefaultMaxOffer(settings.defaultCountry), settings.defaultCountry),
      savedId: null,
    };
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
  const identity = useMemo(
    () => (input?.property && input.location ? identityFromMaxOffer(sanitizeMaxOffer(input), settings.defaultCountry) : null),
    [input, settings.defaultCountry],
  );
  usePersistPropertyIdentity(identity, !requestedId);
  const results = useMaxOfferAnalysis(input);
  const analysisInput = useMemo(
    () => (results ? maxOfferToAnalysisInput(sanitizeMaxOffer(input), results, settings.defaultCountry) : null),
    [input, results, settings.defaultCountry],
  );
  const analysisResults = usePropertyAnalysis(analysisInput);
  const askingPrice =
    Number.isFinite(input.property?.askingPrice) && input.property.askingPrice > 0 ? input.property.askingPrice : null;
  const marginOffers = results
    ? { recommendedOffer: results.recommendedOffer, maximumOffer: results.maximumOffer }
    : null;
  const underwriting = useUnderwriting(analysisInput, analysisResults, {
    includeSensitivity: false,
    includeDownsideSensitivity: true,
    desiredMonthlyCashflow: input.targets?.desiredMonthlyCashflow,
    marginPrice: askingPrice,
    marginOffers,
  });

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

  const handleLocationChange = (country: CountryCode, region: string) => {
    const profile = getMarketProfile(country, region);
    if (!profile) return;
    const arv = form.getValues("property.arv");
    if (Number.isFinite(arv) && arv > 0) {
      form.setValue("expenses.propertyTaxAnnual", Math.round(arv * (profile.propertyTaxRate / 100)), { shouldDirty: true });
    }
    form.setValue("expenses.insuranceAnnual", profile.insuranceAnnual, { shouldDirty: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Offer Engine"
        title="Max Offer Analyzer"
        description={
          askingPrice
            ? "Asking price is in. Score the listing against the recommended and maximum offers your targets allow."
            : "Find what you can pay before you offer. ARV, rent, rehab, expenses and targets are enough — no purchase price required."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={askingPrice ? "primary" : "muted"}>{askingPrice ? "Evaluation" : "Discovery"}</Badge>
            {results ? (
              <Button variant="gradient" onClick={() => setSaveOpen(true)}>
                <Save /> {existing ? "Update in Portfolio" : "Save to Portfolio"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 2xl:col-span-4">
          <div className="min-w-0 xl:sticky xl:top-20">
            <MaxOfferForm form={form} onLocationChange={handleLocationChange} />
          </div>
        </div>
        <div className="min-w-0 space-y-4 xl:col-span-7 2xl:col-span-8">
          {results ? (
            <>
              <MaxOfferKpis results={results} />
              <div className="grid gap-4 lg:grid-cols-2">
                {underwriting && (
                  <BuyBoxStatusCard
                    match={underwriting.buyBox}
                    listingNote={
                      underwriting.buyBox.inside && askingPrice && askingPrice > results.maximumOffer
                        ? "The property fits the active Buy Box characteristics, but the current listing price does not meet your return targets."
                        : undefined
                    }
                  />
                )}
                <OfferEvaluationCard
                  askingPrice={askingPrice}
                  results={results}
                  margin={underwriting?.margin ?? pendingMargin(results.recommendedOffer, results.maximumOffer)}
                />
              </div>
              <DealVerdict results={results} evaluating={Boolean(askingPrice)} />
              <OfferTiers results={results} />
              {underwriting && <DealKillerList warnings={underwriting.warnings} />}
              {underwriting && <DownsideAnalysisPanel downside={underwriting.downside} compact />}
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
          {underwriting && <DownsideCharts downside={underwriting.downside} />}
          <MaxOfferSummaryCard input={sanitizeMaxOffer(input)} results={results} />
          {underwriting && <UnderwritingSummaryCard summary={underwriting.summary} />}
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
