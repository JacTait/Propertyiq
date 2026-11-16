"use client";

import { Info } from "lucide-react";
import type {
  DownsideAnalysisResults,
  DownsideComponentScore,
  DownsideRiskCategory,
  DownsideShocks,
  QuickDownsideSnapshot,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { gradeDealSurvival } from "@/lib/calculations/downside-analysis";
import {
  DEAL_SURVIVAL_GRADE_BANDS,
  dealSurvivalCategories,
  describeDownsideShocks,
  formatWeightedContribution,
  liveBreakdownTotal,
  lowestScoringComponent,
  primaryRiskExplanation,
  primaryRiskLabel,
  resolveDealSurvivalCategory,
} from "@/lib/calculations/deal-survival-explain";

export interface DealSurvivalInfoProps {
  score?: number | null;
  gradeLabel?: string | null;
  components?: Array<Pick<DownsideComponentScore, "key" | "label" | "score" | "weight" | "contribution">>;
  primaryRisk?: DownsideRiskCategory | string | null;
  primaryRiskLabel?: string | null;
  shocks?: DownsideShocks;
  className?: string;
}

export function dealSurvivalInfoFromDownside(downside: DownsideAnalysisResults): DealSurvivalInfoProps {
  return {
    score: downside.score,
    gradeLabel: downside.gradeLabel,
    components: downside.components,
    primaryRisk: downside.primaryRisk,
    primaryRiskLabel: downside.primaryRiskLabel,
    shocks: downside.shocks,
  };
}

function gradeLabelForScore(score?: number | null): string | undefined {
  return typeof score === "number" && Number.isFinite(score) ? gradeDealSurvival(score).gradeLabel : undefined;
}

export function dealSurvivalInfoFromSnapshot(
  snapshot: Pick<QuickDownsideSnapshot, "dealSurvivalScore" | "primaryRisk" | "components">,
  extras?: Pick<DealSurvivalInfoProps, "gradeLabel" | "shocks">,
): DealSurvivalInfoProps {
  const lowest = lowestScoringComponent(snapshot.components);
  return {
    score: snapshot.dealSurvivalScore,
    gradeLabel: extras?.gradeLabel ?? gradeLabelForScore(snapshot.dealSurvivalScore),
    components: snapshot.components,
    primaryRisk: lowest?.key ?? snapshot.primaryRisk,
    primaryRiskLabel: snapshot.primaryRisk,
    shocks: extras?.shocks,
  };
}

export function dealSurvivalInfoFromScore(
  score?: number | null,
  primaryRisk?: string | null,
): DealSurvivalInfoProps {
  return {
    score: score ?? undefined,
    gradeLabel: gradeLabelForScore(score),
    primaryRiskLabel: primaryRisk,
    primaryRisk,
  };
}

export function DealSurvivalInfo({
  score,
  gradeLabel,
  components,
  primaryRisk,
  primaryRiskLabel: primaryRiskLabelProp,
  shocks,
  className,
}: DealSurvivalInfoProps) {
  const categories = dealSurvivalCategories();
  const shockItems = describeDownsideShocks(shocks);
  const live = (components ?? []).filter(
    (component) => Number.isFinite(component.score) && Number.isFinite(component.weight) && Number.isFinite(component.contribution),
  );
  const liveTotal = live.length > 0 ? liveBreakdownTotal(live) : null;
  const displayScore =
    typeof score === "number" && Number.isFinite(score)
      ? Math.round(score)
      : liveTotal !== null
        ? Math.round(liveTotal)
        : null;
  const resolvedRisk =
    resolveDealSurvivalCategory(primaryRisk) ??
    resolveDealSurvivalCategory(primaryRiskLabelProp) ??
    lowestScoringComponent(live)?.key ??
    null;
  const riskLabel = primaryRiskLabel(resolvedRisk, primaryRiskLabelProp ?? undefined);
  const hasLiveRisk = Boolean(resolvedRisk || primaryRiskLabelProp);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            "-my-1 size-7 shrink-0 text-muted-foreground hover:text-foreground",
            className,
          )}
          aria-label="Explain Deal Survival Score"
        >
          <Info className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(40rem,88vh)] max-w-lg gap-0 overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-heading text-base font-medium">How Deal Survival Works</DialogTitle>
          <DialogDescription>
            Deal Survival measures how well the property holds up when assumptions become less favourable. It combines
            stress-tested cashflow, DSCR, margin of safety, refinance viability and ROI durability.
          </DialogDescription>
        </DialogHeader>

        <section className="mt-5 space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Scoring categories</p>
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category.key}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">
                  {category.label}
                  <span className="ml-2 text-muted-foreground">{category.weightPercent}%</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Rating categories</p>
          <ul className="space-y-3">
            {DEAL_SURVIVAL_GRADE_BANDS.map((band) => (
              <li key={band.grade}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]">
                  {band.min}–{band.max}
                  <span className="ml-2">{band.gradeLabel}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{band.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 space-y-3 border-t border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Current deal breakdown</p>
          {live.length > 0 ? (
            <ul className="space-y-3">
              {live.map((component) => (
                <li key={component.key} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                  <div>
                    <p>{component.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {Math.round(component.weight * 100)}% weight
                    </p>
                  </div>
                  <div className="text-right font-figure tabular-nums">
                    <p>
                      {Math.round(component.score)}
                      <span className="text-muted-foreground"> / 100</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Weighted contribution: {formatWeightedContribution(component.contribution)} points
                    </p>
                  </div>
                </li>
              ))}
              <li className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-t border-border pt-3 text-sm font-medium">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                <div className="text-right">
                  <p className="font-figure tabular-nums">
                    {displayScore ?? Math.round(liveTotal ?? 0)}
                    <span className="text-muted-foreground"> / 100</span>
                  </p>
                  {gradeLabel ? (
                    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {gradeLabel}
                    </p>
                  ) : null}
                </div>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Open a scored deal to see the live weighted contribution of each category.
            </p>
          )}
        </section>

        <section className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Primary risk</p>
          <p className="text-sm">
            Primary Risk is the lowest-scoring component of the Deal Survival calculation.
          </p>
          {hasLiveRisk ? (
            <>
              <p className="font-medium">{riskLabel}</p>
              <p className="text-sm text-muted-foreground">{primaryRiskExplanation(resolvedRisk ?? primaryRisk)}</p>
            </>
          ) : null}
        </section>

        {shockItems.length > 0 ? (
          <section className="mt-5 space-y-3 border-t border-border pt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              What does PropertyIQ stress?
            </p>
            <ul className="space-y-1.5 text-sm">
              {shockItems.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-3">
                  <span>{item.label}</span>
                  <span className="font-figure tabular-nums text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function DealSurvivalTitle({
  title = "Deal Survival",
  className,
  ...info
}: DealSurvivalInfoProps & { title?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{title}</span>
      <DealSurvivalInfo {...info} />
    </span>
  );
}
