"use client";

import { BarChart3, Bot, Landmark, LineChart, Shield, Target } from "lucide-react";
import type { AnalysisInput, AnalysisResults, InvestmentSummary as InvestmentSummaryType, RentSource, UnderwritingPack } from "@/lib/types";
import { useProjectionAnalysis } from "@/hooks/useProjectionAnalysis";
import { useFormatters } from "@/hooks/useSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { StatRow } from "@/components/dashboard/stat-row";
import { DealScoreCard } from "@/components/analysis/deal-score-card";
import { StrategyPanel } from "@/components/analysis/strategy-panel";
import { ProjectionTable } from "@/components/analysis/projection-table";
import { PropertySummaryCard } from "@/components/analysis/property-summary-card";
import { InvestmentSummary } from "@/components/reports/investment-summary";
import { BuyBoxStatusCard } from "@/components/analysis/buy-box-status";
import { RentSourceToggle } from "@/components/analysis/rent-source-toggle";
import { DealResiliencePanel } from "@/components/analysis/deal-resilience";
import { RefinanceValidator } from "@/components/analysis/refinance-validator";
import { MarginOfSafetyCard } from "@/components/analysis/margin-of-safety";
import { DealKillerList } from "@/components/analysis/deal-killers";
import { UnderwritingSummaryCard } from "@/components/analysis/underwriting-summary";
import {
  AmortizationChart,
  AppreciationChart,
  CashflowProjectionChart,
  ChartCard,
  EquityGrowthChart,
  ExpenseBreakdownChart,
  IncomeExpenseChart,
} from "@/components/charts";

interface ResultsPanelProps {
  input: AnalysisInput;
  results: AnalysisResults;
  summary: InvestmentSummaryType;
  underwriting?: UnderwritingPack | null;
  onRentSourceChange?: (source: RentSource) => void;
}

export function ResultsPanel({ input, results, summary, underwriting, onRentSourceChange }: ResultsPanelProps) {
  const charts = useProjectionAnalysis(results);
  const fmt = useFormatters();
  const hasStrategyPanel = Boolean(results.shortTermRental || results.fixFlip || results.brrrr);

  return (
    <div className="space-y-4">
      <PropertySummaryCard input={input} />
      <DealScoreCard dealScore={results.dealScore} />
      {underwriting && onRentSourceChange && <RentSourceToggle rent={underwriting.rent} onChange={onRentSourceChange} />}
      {underwriting && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BuyBoxStatusCard match={underwriting.buyBox} />
          <MarginOfSafetyCard margin={underwriting.margin} />
        </div>
      )}
      {underwriting && <DealKillerList warnings={underwriting.warnings} />}

      <Tabs defaultValue="overview">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">
            <BarChart3 /> Overview
          </TabsTrigger>
          <TabsTrigger value="projections">
            <LineChart /> Projections
          </TabsTrigger>
          <TabsTrigger value="financing">
            <Landmark /> Financing
          </TabsTrigger>
          {hasStrategyPanel && (
            <TabsTrigger value="strategy">
              <Target /> Strategy
            </TabsTrigger>
          )}
          {underwriting && (
            <TabsTrigger value="underwrite">
              <Shield /> Underwrite
            </TabsTrigger>
          )}
          <TabsTrigger value="summary">
            <Bot /> AI Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <KpiGrid results={results} />
          {charts && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Income vs Expenses" description="Monthly view of income, operating costs, debt and net cashflow">
                <IncomeExpenseChart data={charts.incomeVsExpenses} />
              </ChartCard>
              <ChartCard title="Expense Breakdown" description="Annual operating expenses and mortgage">
                <ExpenseBreakdownChart data={charts.expenseBreakdown} />
              </ChartCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          {charts && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Five-Year Equity Growth" description="Property value, loan balance and equity">
                <EquityGrowthChart data={charts.equityGrowth} years={5} />
              </ChartCard>
              <ChartCard title="Appreciation Forecast" description={`${fmt.percent(input.location.market.appreciationRate)} annual growth over 10 years`}>
                <AppreciationChart data={charts.appreciation} />
              </ChartCard>
              <ChartCard title="Cashflow Projection" description="Annual and cumulative cashflow" className="lg:col-span-2" height={300}>
                <CashflowProjectionChart data={charts.cashflow} />
              </ChartCard>
            </div>
          )}
          <ProjectionTable projections={results.projections} fiveYear={results.fiveYear} tenYear={results.tenYear} />
        </TabsContent>

        <TabsContent value="financing" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Mortgage Summary</CardTitle>
                <CardDescription>True amortisation schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <StatRow label="Loan Amount" value={fmt.currency(results.mortgage.loanAmount)} />
                <StatRow label="Deposit" value={fmt.currency(results.mortgage.depositAmount)} />
                <StatRow label="Interest Rate" value={fmt.percent(results.mortgage.interestRate, 2)} />
                <StatRow label="Term" value={`${results.mortgage.termYears} years`} />
                <StatRow label="Monthly Payment" value={fmt.currency(results.mortgage.monthlyPayment)} emphasis />
                <StatRow label="Total Interest" value={fmt.currency(results.mortgage.totalInterest)} />
                <StatRow label="Total Paid" value={fmt.currency(results.mortgage.totalPaid)} />
                <StatRow label="Cash To Close" value={fmt.currency(results.cashToClose)} emphasis />
                <StatRow label="Break-Even Occupancy" value={fmt.percent(results.breakEvenOccupancy, 0)} />
              </CardContent>
            </Card>
            {charts && (
              <ChartCard title="Mortgage Amortisation" description="Principal vs interest by year with remaining balance" className="lg:col-span-2" height={340}>
                <AmortizationChart data={charts.amortization} />
              </ChartCard>
            )}
          </div>
          <AmortizationTable results={results} />
        </TabsContent>

        {hasStrategyPanel && (
          <TabsContent value="strategy">
            <StrategyPanel results={results} />
          </TabsContent>
        )}

        {underwriting && (
          <TabsContent value="underwrite" className="space-y-4">
            <DealResiliencePanel resilience={underwriting.resilience} compact />
            <RefinanceValidator validation={underwriting.refinance} />
            <UnderwritingSummaryCard summary={underwriting.summary} />
          </TabsContent>
        )}

        <TabsContent value="summary">
          <InvestmentSummary summary={summary} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AmortizationTable({ results }: { results: AnalysisResults }) {
  const fmt = useFormatters();
  if (results.mortgage.yearly.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yearly Amortisation Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-auto scrollbar-thin rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-xs sm:text-sm">
            <thead className="sticky top-0 bg-muted text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Year</th>
                <th className="px-3 py-2 text-right font-semibold">Principal</th>
                <th className="px-3 py-2 text-right font-semibold">Interest</th>
                <th className="px-3 py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {results.mortgage.yearly.map((y) => (
                <tr key={y.year} className="border-t border-border/60 tabular hover:bg-accent/30">
                  <td className="px-3 py-1.5">Year {y.year}</td>
                  <td className="px-3 py-1.5 text-right">{fmt.currency(y.principal)}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt.currency(y.interest)}</td>
                  <td className="px-3 py-1.5 text-right">{fmt.currency(y.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
