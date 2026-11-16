"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { CountryCode, MaxOfferInputs } from "@/lib/types";
import { maxOfferSchema, type MaxOfferFormValues } from "@/lib/utils/schema";
import { maxOfferPath } from "@/lib/utils/routes";
import { getMarketProfile } from "@/data/market-data";
import { sanitizeMaxOffer } from "@/lib/calculations/max-offer";
import { pendingMargin } from "@/lib/calculations/margin-of-safety";
import { identityFromMaxOffer } from "@/lib/property-identity";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useSettings } from "@/hooks/useSettings";
import { useMaxOfferAnalysis } from "@/hooks/useMaxOfferAnalysis";
import { usePropertyAnalysis } from "@/hooks/usePropertyAnalysis";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { useSharedDeal } from "@/hooks/useSharedDeal";
import { useDebouncedDraftSync } from "@/hooks/useDebouncedDraftSync";
import { maxOfferToSharedDeal, sharedDealFromPortfolio, sharedDealToMaxOffer, type MaxOfferDraft } from "@/lib/deal-draft";
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

export type { MaxOfferDraft };

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
  const { draft, hydrated: dealHydrated, revision, patchMaxOffer, adoptPortfolio } = useSharedDeal();
  const hydrated = settingsHydrated && dealHydrated && portfolioHydrated;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;
  useEffect(() => {
    if (!propertyId) return;
    const saved = getById(propertyId) ?? findPortfolioProperty(propertyId);
    if (saved) adoptPortfolio(saved, "max-offer");
  }, [adoptPortfolio, getById, propertyId]);

  if (!hydrated) return <MaxOfferSkeleton />;

  const source = fromPortfolio ? sharedDealFromPortfolio(fromPortfolio, settings.defaultCountry) : draft;
  const initial: MaxOfferDraft = {
    input: sharedDealToMaxOffer(source),
    savedId: source.savedId,
  };

  return (
    <MaxOfferSession
      key={`${propertyId ?? source.savedId ?? "draft"}-${revision}`}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !fromPortfolio)}
      onDraftChange={patchMaxOffer}
    />
  );
}

interface SessionProps {
  initial: MaxOfferDraft;
  requestedId: string | null;
  missing: boolean;
  onDraftChange: (input: MaxOfferInputs) => void;
}

function MaxOfferSession({ initial, requestedId, missing, onDraftChange }: SessionProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const { getById } = usePortfolio();
  const { saveDeal, draft } = useSharedDeal();
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
    () => maxOfferToSharedDeal(draft, sanitizeMaxOffer(input)).input,
    [draft, input],
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

  useDebouncedDraftSync(input, (next) => onDraftChange(sanitizeMaxOffer(next)));

  const handleSave = (name: string, asNew: boolean) => {
    if (!input || !results) return;
    onDraftChange(sanitizeMaxOffer({ ...input, property: { ...input.property, name } }));
    const saved = saveDeal(name, asNew, "max-offer");
    if (!saved) return;
    form.setValue("property.name", name);
    setSavedId(saved.id);
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
        title="Work backwards to the offer."
        description={
          askingPrice
            ? "The listing is scored against the target and maximum offers your return requirements allow."
            : "Enter rent, ARV, rehab and return requirements. No purchase price is required."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={askingPrice ? "primary" : "muted"}>{askingPrice ? "Evaluation" : "Discovery"}</Badge>
            {results ? (
              <Button onClick={() => setSaveOpen(true)}>
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
              <MaxOfferKpis results={results} askingPrice={askingPrice ?? 0} />
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
                  margin={underwriting?.margin ?? pendingMargin(results.recommendedOffer, results.maximumOffer, "supplied")}
                />
              </div>
              <DealVerdict results={results} evaluating={Boolean(askingPrice)} />
              <OfferTiers results={results} askingPrice={askingPrice ?? undefined} />
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
