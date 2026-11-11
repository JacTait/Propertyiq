"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import type { AnalysisInput, CountryCode, RentSource } from "@/lib/types";
import { analysisSchema, type AnalysisFormValues } from "@/lib/utils/schema";
import { STORAGE_KEYS } from "@/lib/constants";
import { dashboardPath, downsidePath, resiliencePath } from "@/lib/utils/routes";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { getMarketProfile, toMarketData } from "@/data/market-data";
import { identityFromAnalysis, seedUnsavedAnalysis } from "@/lib/property-identity";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePersistPropertyIdentity } from "@/hooks/usePropertyIdentity";
import { useSettings } from "@/hooks/useSettings";
import { sanitizeInput, usePropertyAnalysis } from "@/hooks/usePropertyAnalysis";
import { findPortfolioProperty, usePortfolio } from "@/hooks/usePortfolio";
import { useUnderwriting } from "@/hooks/useUnderwriting";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { FieldGrid, NumberField, SectionTitle } from "@/components/forms/fields";
import { PropertyDetailsFields } from "@/components/forms/property-details-fields";
import { useCurrencySymbol } from "@/components/forms/use-currency-symbol";
import { BuyBoxStatusCard } from "@/components/analysis/buy-box-status";
import { RentSourceToggle } from "@/components/analysis/rent-source-toggle";
import { MarginOfSafetyCard } from "@/components/analysis/margin-of-safety";
import { DealKillerList } from "@/components/analysis/deal-killers";
import { UnderwritingSummaryCard } from "@/components/analysis/underwriting-summary";
import { DecisionContext } from "@/components/workspace/decision-context";
import { useDealDecision } from "@/hooks/useDealDecision";
import { DownsideAnalysisPanel, DownsideCharts } from "@/components/analysis/downside-analysis";
import type { AnalysisDraft } from "@/components/dashboard/analysis-dashboard";

function isDraft(value: unknown): value is AnalysisDraft {
  return typeof value === "object" && value !== null && "input" in value && "savedId" in value;
}

function readPropertyId(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("id")?.trim();
  return raw ? raw : null;
}

export function DownsideSkeleton() {
  return (
    <>
      <PageHeader
        eyebrow="Underwriting"
        title="Downside Analysis"
        description="What happens when the deal moves against you?"
      />
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </>
  );
}

export function DownsideView() {
  const searchParams = useSearchParams();
  const propertyId = readPropertyId(searchParams);
  const { getById, hydrated: portfolioHydrated } = usePortfolio();
  const { settings, hydrated: settingsHydrated } = useSettings();
  const [draft, setDraft, draftHydrated] = useLocalStorage<AnalysisDraft | null>(STORAGE_KEYS.draft, null, isDraft);
  const hydrated = settingsHydrated && draftHydrated && portfolioHydrated;

  if (!hydrated) return <DownsideSkeleton />;

  const fromPortfolio = propertyId ? (getById(propertyId) ?? findPortfolioProperty(propertyId)) : undefined;

  let initial: AnalysisDraft;
  if (fromPortfolio) {
    initial = { input: sanitizeInput(fromPortfolio.input), savedId: fromPortfolio.id };
  } else if (!propertyId && draft) {
    const clean = sanitizeInput(draft.input);
    initial = {
      input: draft.savedId === null ? seedUnsavedAnalysis(clean, settings.defaultCountry) : clean,
      savedId: draft.savedId,
    };
  } else {
    initial = {
      input: seedUnsavedAnalysis(createDefaultAnalysis(settings.defaultCountry), settings.defaultCountry),
      savedId: null,
    };
  }

  return (
    <DownsideSession
      key={propertyId ?? draft?.savedId ?? "draft"}
      initial={initial}
      requestedId={propertyId}
      missing={Boolean(propertyId && !fromPortfolio)}
      onDraftChange={setDraft}
    />
  );
}

function DownsideSession({
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
  const symbol = useCurrencySymbol();
  const warnedMissing = useRef(false);

  const form = useForm<AnalysisFormValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: initial.input,
    mode: "onChange",
  });

  useEffect(() => {
    if (!missing || warnedMissing.current) return;
    warnedMissing.current = true;
    toast.error("Property not found", { description: "Starting from your current analysis draft." });
    router.replace(downsidePath());
  }, [missing, router]);

  const values = useWatch({ control: form.control });
  const input = useMemo(() => values as AnalysisInput, [values]);
  const identity = useMemo(
    () => (input?.property && input.location ? identityFromAnalysis(input) : null),
    [input],
  );
  usePersistPropertyIdentity(identity, !requestedId && initial.savedId === null);
  const results = usePropertyAnalysis(input);
  const underwriting = useUnderwriting(input, results, { includeSensitivity: true });
  const decision = useDealDecision(input);

  const handleLocationChange = (country: CountryCode, region: string) => {
    const profile = getMarketProfile(country, region);
    if (!profile) return;
    const data = toMarketData(profile);
    form.setValue("location.market", data, { shouldDirty: true, shouldValidate: true });
    const price = form.getValues("financing.purchasePrice");
    if (Number.isFinite(price) && price > 0) {
      form.setValue("expenses.propertyTaxAnnual", Math.round(price * (data.propertyTaxRate / 100)), { shouldDirty: true });
    }
    form.setValue("expenses.insuranceAnnual", data.insuranceAnnual, { shouldDirty: true });
  };

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!input) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    const next: AnalysisDraft = { input: sanitizeInput(input), savedId: initial.savedId };
    persistTimer.current = setTimeout(() => {
      onDraftChange((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [input, initial.savedId, onDraftChange]);

  return (
    <>
      <PageHeader
        eyebrow="Underwriting"
        title="Downside Analysis"
        description="What happens when the deal moves against you? Score survival under a bad year."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={requestedId ? resiliencePath(requestedId) : resiliencePath()}>
                Deal Resilience <ArrowUpRight />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={requestedId ? dashboardPath(requestedId) : dashboardPath()}>
                Deal Workspace <ArrowUpRight />
              </Link>
            </Button>
          </div>
        }
      />

      <FormProvider {...form}>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <PropertyDetailsFields onLocationChange={handleLocationChange} />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle
                title="Deal assumptions"
                description="Shared with Deal Workspace. Changes save to the same draft."
              />
              <FieldGrid>
                <NumberField
                  name="financing.askingPrice"
                  label="Current Asking Price"
                  prefix={symbol}
                  hint="Required for Margin of Safety. Leave at 0 if not yet listed."
                />
                <NumberField
                  name="financing.purchasePrice"
                  label="Purchase Price"
                  prefix={symbol}
                />
                <NumberField name="income.monthlyRent" label="Listing Rent" prefix={symbol} />
                <NumberField name="income.verifiedRent" label="Verified Rent" prefix={symbol} />
                <NumberField name="income.conservativeRent" label="Conservative Rent" prefix={symbol} />
                <NumberField name="brrrr.rehabCost" label="Rehab Cost" prefix={symbol} />
                <NumberField name="brrrr.afterRepairValue" label="ARV" prefix={symbol} />
                <NumberField name="brrrr.refinanceLtv" label="Refinance LTV" suffix="%" />
                <NumberField name="brrrr.refinanceRate" label="Interest Rate" suffix="%" />
                <NumberField name="brrrr.refinanceDscrMin" label="DSCR Requirement" step={0.05} />
                <NumberField name="expenses.vacancyPercent" label="Vacancy" suffix="%" />
                <NumberField name="expenses.maintenancePercent" label="Maintenance" suffix="%" />
                <NumberField name="expenses.propertyTaxAnnual" label="Property Tax" prefix={symbol} />
                <NumberField name="expenses.insuranceAnnual" label="Insurance" prefix={symbol} />
              </FieldGrid>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-8">
            <DecisionContext
              decision={decision}
              purpose="downside"
              dashboardHref={requestedId ? dashboardPath(requestedId) : dashboardPath()}
            />
            {underwriting && results ? (
              <>
                <RentSourceToggle
                  rent={underwriting.rent}
                  onChange={(source: RentSource) => form.setValue("income.rentSource", source)}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <BuyBoxStatusCard match={underwriting.buyBox} />
                  <MarginOfSafetyCard margin={underwriting.margin} />
                </div>
                <DownsideAnalysisPanel downside={underwriting.downside} />
                <DealKillerList warnings={underwriting.warnings} />
              </>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            )}
          </div>
        </div>

        {underwriting && (
          <div className="mt-6 space-y-4">
            <DownsideCharts downside={underwriting.downside} />
            <UnderwritingSummaryCard summary={underwriting.summary} />
          </div>
        )}
      </FormProvider>
    </>
  );
}
