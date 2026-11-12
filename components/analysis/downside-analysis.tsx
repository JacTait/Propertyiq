"use client";

import {
  AlertTriangle,
  CircleAlert,
  Percent,
  Scale,
  TrendingDown,
  Umbrella,
  Wallet,
} from "lucide-react";
import type { DealGrade, DownsideAnalysisResults } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { metricTone } from "@/lib/utils/labels";
import { useFormatters } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DealScoreGauge } from "@/components/analysis/deal-score-gauge";
import {
  ChartCard,
  RefinanceSensitivityChart,
  RehabSensitivityChart,
  RentSensitivityChart,
  ResilienceBreakdownChart,
  VacancySensitivityChart,
} from "@/components/charts";

const GRADE_TO_DEAL: Record<DownsideAnalysisResults["grade"], DealGrade> = {
  "very-defensive": "elite",
  defensive: "excellent",
  acceptable: "good",
  exposed: "average",
  "high-risk": "avoid",
};

const GRADE_TONE: Record<DownsideAnalysisResults["grade"], "success" | "primary" | "warning" | "danger"> = {
  "very-defensive": "success",
  defensive: "success",
  acceptable: "primary",
  exposed: "warning",
  "high-risk": "danger",
};

const VERDICT_TONE: Record<DownsideAnalysisResults["survival"]["verdict"], "success" | "warning" | "danger"> = {
  likely: "success",
  "significant-risk": "warning",
  unlikely: "danger",
};

const VERDICT_ICON: Record<DownsideAnalysisResults["survival"]["verdict"], string> = {
  likely: "✅",
  "significant-risk": "⚠",
  unlikely: "❌",
};

export function DownsideKpiGrid({ downside }: { downside: DownsideAnalysisResults }) {
  const fmt = useFormatters();
  const wc = downside.worstCase;
  const mos = downside.marginReady ? fmt.percent(downside.marginOfSafetyPercent, 1) : "Awaiting asking price";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <KpiCard
        index={0}
        label="Worst Case Cashflow"
        value={fmt.signedCurrency(wc.monthlyCashflow)}
        sub="pre-refinance, after downside shocks"
        icon={Wallet}
        tone={metricTone(wc.monthlyCashflow, { good: 1, ok: 0 })}
      />
      <KpiCard
        index={1}
        label="Bad-year total return"
        value={fmt.percent(wc.roi)}
        sub="Downside cash flow plus principal and the configured appreciation assumption."
        icon={TrendingDown}
        tone={metricTone(Number.isFinite(wc.roi) ? wc.roi : wc.roi === Infinity ? 100 : 0, { good: 8, ok: 5 })}
      />
      <KpiCard
        index={2}
        label="Worst Case DSCR"
        value={fmt.ratio(wc.dscr)}
        sub="pre-refinance coverage after downside shocks"
        icon={Scale}
        tone={metricTone(Number.isFinite(wc.dscr) ? wc.dscr : wc.dscr === Infinity ? 2 : 0, { good: 1.25, ok: 1 })}
      />
      <KpiCard
        index={3}
        label="Deal Survival Score"
        value={`${downside.score}/100`}
        sub={downside.gradeLabel}
        icon={Umbrella}
        tone={GRADE_TONE[downside.grade]}
      />
      <KpiCard
        index={4}
        label="Primary Risk"
        value={downside.primaryRiskLabel}
        sub="lowest-scoring category"
        icon={CircleAlert}
        tone="warning"
      />
      <KpiCard
        index={5}
        label="Margin Of Safety"
        value={mos}
        sub={downside.marginReady ? "(max offer − asking) / max offer" : "Enter asking price to calculate"}
        icon={Percent}
        tone={downside.marginReady ? metricTone(downside.marginOfSafetyPercent, { good: 15, ok: 5 }) : "muted"}
      />
    </div>
  );
}

export function DealSurvivalTestCard({ downside }: { downside: DownsideAnalysisResults }) {
  const fmt = useFormatters();
  const tone = VERDICT_TONE[downside.survival.verdict];
  const tests = [
    {
      label: "Pre-refi cashflow > 0",
      pass: downside.survival.cashflowPass,
      value: fmt.signedCurrency(downside.worstCase.monthlyCashflow),
    },
    {
      label: "Pre-refi DSCR ≥ 1.00x",
      pass: downside.survival.dscrPass,
      value: fmt.ratio(downside.worstCase.dscr),
    },
    {
      label: "Bad-year total return ≥ 5%",
      pass: downside.survival.roiPass,
      value: fmt.percent(downside.worstCase.roi),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Can This Deal Survive A Bad Year?</CardTitle>
          <CardDescription>
            Rent −15%, vacancy +10 pts, maintenance +20 pts, rehab +20%, tax +10%, insurance +15%.
          </CardDescription>
        </div>
        <Badge variant={tone}>
          {VERDICT_ICON[downside.survival.verdict]} {downside.survival.verdictLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {tests.map((test) => (
            <div
              key={test.label}
              className={cn(
                "rounded-xl border px-3 py-2.5",
                test.pass ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{test.label}</p>
              <p className={cn("mt-1 text-sm font-bold tabular", test.pass ? "text-success" : "text-destructive")}>
                {test.pass ? "Pass" : "Fail"} · {test.value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{downside.assessment}</p>
      </CardContent>
    </Card>
  );
}

export function DownsideScoreBreakdown({ downside }: { downside: DownsideAnalysisResults }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Survival Breakdown</CardTitle>
        <CardDescription>
          Cashflow 30% · DSCR 25% · Margin 20% · Refinance 15% · ROI 10%. Score {downside.score}/100.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {downside.components.map((component) => (
          <div key={component.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {component.label}
                  {component.key === downside.primaryRisk && (
                    <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-warning">Primary risk</span>
                  )}
                </p>
                <p className="tabular text-muted-foreground">
                  {component.score}/100 · {Math.round(component.weight * 100)}%
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    component.score >= 80 ? "bg-success" : component.score >= 60 ? "bg-warning" : "bg-destructive",
                  )}
                  style={{ width: `${component.score}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{component.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DownsideCharts({ downside }: { downside: DownsideAnalysisResults }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Rent Sensitivity" description="Cashflow and ROI as rent moves around the active rent.">
        <RentSensitivityChart data={downside.rentSensitivity} />
      </ChartCard>
      <ChartCard title="Vacancy Sensitivity" description="Added vacancy points on top of the current vacancy assumption.">
        <VacancySensitivityChart data={downside.vacancySensitivity} />
      </ChartCard>
      <ChartCard
        title="Rehab Overrun Sensitivity"
        description="Rehab overruns change cash required and remaining ARV-guideline headroom. They do not change rental monthly cash flow."
      >
        <RehabSensitivityChart data={downside.rehabSensitivity} />
      </ChartCard>
      <ChartCard title="Refinance Sensitivity" description="Post-refinance DSCR as refinance LTV moves around the current setting.">
        <RefinanceSensitivityChart data={downside.refinanceSensitivity} />
      </ChartCard>
      <ChartCard
        title="Deal Survival Breakdown"
        description="How cashflow, DSCR, margin, refinance and ROI produced the survival score."
        className="lg:col-span-2"
        height={240}
      >
        <ResilienceBreakdownChart components={downside.components} />
      </ChartCard>
    </div>
  );
}

export function DownsideAnalysisPanel({
  downside,
  compact = false,
  animated = true,
}: {
  downside: DownsideAnalysisResults;
  compact?: boolean;
  animated?: boolean;
}) {
  const tone = GRADE_TONE[downside.grade];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Downside Analysis</CardTitle>
            <CardDescription>Deal survival under a bad year — cashflow, DSCR, margin, refinance and ROI durability.</CardDescription>
          </div>
          <Badge variant={tone}>{downside.gradeLabel}</Badge>
        </CardHeader>
        <CardContent className={cn("grid gap-6", compact ? "lg:grid-cols-[auto_1fr]" : "xl:grid-cols-[auto_1fr]")}>
          <div className="flex flex-col items-center gap-2">
            <DealScoreGauge
              score={downside.score}
              grade={GRADE_TO_DEAL[downside.grade]}
              label="Survival"
              idPrefix="survival"
              size={compact ? 168 : 200}
              animated={animated}
            />
            <p className="text-sm font-semibold">{downside.score}/100 · {downside.gradeLabel}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5 text-warning" />
              Primary risk: {downside.primaryRiskLabel}
            </p>
          </div>
          <div className="space-y-4">
            <DownsideKpiGrid downside={downside} />
          </div>
        </CardContent>
      </Card>
      <DealSurvivalTestCard downside={downside} />
      <DownsideScoreBreakdown downside={downside} />
    </div>
  );
}
