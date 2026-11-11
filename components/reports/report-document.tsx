"use client";

import { forwardRef } from "react";
import type {
  AnalysisInput,
  AnalysisResults,
  ExportPreferences,
  InvestmentSummary as InvestmentSummaryType,
  UnderwritingPack,
} from "@/lib/types";
import { APP_NAME } from "@/lib/constants";
import { countryName, formatPropertySpecs, strategyLabel } from "@/lib/utils/labels";
import { getRegionName } from "@/data/market-data";
import { useFormatters } from "@/hooks/useSettings";
import { useProjectionAnalysis } from "@/hooks/useProjectionAnalysis";
import { PropertySummaryCard } from "@/components/analysis/property-summary-card";
import { DealScoreCard } from "@/components/analysis/deal-score-card";
import { StrategyPanel } from "@/components/analysis/strategy-panel";
import { ProjectionTable } from "@/components/analysis/projection-table";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { InvestmentSummary } from "@/components/reports/investment-summary";
import { ReportDecisionSummary } from "@/components/reports/report-decision-summary";
import { UnderwritingSummaryCard } from "@/components/analysis/underwriting-summary";
import { DownsideAnalysisPanel } from "@/components/analysis/downside-analysis";
import { useDealDecision } from "@/hooks/useDealDecision";
import {
  AmortizationChart,
  AppreciationChart,
  CashflowProjectionChart,
  ChartCard,
  EquityGrowthChart,
  ExpenseBreakdownChart,
  IncomeExpenseChart,
} from "@/components/charts";

interface ReportDocumentProps {
  input: AnalysisInput;
  results: AnalysisResults;
  summary: InvestmentSummaryType;
  preferences: ExportPreferences;
  underwriting?: UnderwritingPack | null;
}

/**
 * Full stacked report used for PDF export. Rendered off-screen at a fixed
 * width so charts and layout are deterministic regardless of viewport.
 */
export const ReportDocument = forwardRef<HTMLDivElement, ReportDocumentProps>(function ReportDocument(
  { input, results, summary, preferences, underwriting },
  ref,
) {
  const fmt = useFormatters();
  const charts = useProjectionAnalysis(results);
  const decision = useDealDecision(input);

  return (
    <div ref={ref} className="w-[1100px] space-y-5 bg-background p-8 text-foreground">
      <header className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{APP_NAME} Investment Report</p>
          <h1 className="mt-1 text-3xl font-bold">{input.property.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {strategyLabel(input.strategy, true)} · {formatPropertySpecs(input.property)} ·{" "}
            {getRegionName(input.location.country, input.location.region)}, {countryName(input.location.country)}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Generated {fmt.dateTime(results.generatedAt)}</p>
          <p>Currency shown in report settings</p>
        </div>
      </header>

      <PropertySummaryCard input={input} />
      {decision ? <ReportDecisionSummary decision={decision} /> : null}
      <KpiGrid results={results} />
      <DealScoreCard dealScore={results.dealScore} animated={false} />
      <StrategyPanel results={results} />

      {preferences.includeCharts && charts && (
        <div className="grid grid-cols-2 gap-4">
          <ChartCard title="Income vs Expenses" height={240}>
            <IncomeExpenseChart data={charts.incomeVsExpenses} />
          </ChartCard>
          <ChartCard title="Expense Breakdown" height={240}>
            <ExpenseBreakdownChart data={charts.expenseBreakdown} />
          </ChartCard>
          <ChartCard title="Five-Year Equity Growth" height={240}>
            <EquityGrowthChart data={charts.equityGrowth} years={5} />
          </ChartCard>
          <ChartCard title="Appreciation Forecast" height={240}>
            <AppreciationChart data={charts.appreciation} />
          </ChartCard>
          <ChartCard title="Cashflow Projection" height={240}>
            <CashflowProjectionChart data={charts.cashflow} />
          </ChartCard>
          {preferences.includeAmortization && (
            <ChartCard title="Mortgage Amortisation" height={240}>
              <AmortizationChart data={charts.amortization} />
            </ChartCard>
          )}
        </div>
      )}

      <ProjectionTable projections={results.projections} fiveYear={results.fiveYear} tenYear={results.tenYear} />

      {underwriting && (
        <>
          <DownsideAnalysisPanel downside={underwriting.downside} compact animated={false} />
          <UnderwritingSummaryCard summary={underwriting.summary} />
        </>
      )}

      {preferences.includeSummary && <InvestmentSummary summary={summary} animated={false} />}

      <footer className="border-t border-border pt-3 text-[10px] text-muted-foreground">
        {APP_NAME} · Report timestamp {new Date().toISOString()} · Figures are estimates derived from user inputs and bundled
        regional market data. Not financial advice.
      </footer>
    </div>
  );
});
