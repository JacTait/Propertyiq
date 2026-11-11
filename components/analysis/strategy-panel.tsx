"use client";

import { Hammer, Palmtree, Repeat } from "lucide-react";
import type { AnalysisResults } from "@/lib/types";
import { useFormatters } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatRow } from "@/components/dashboard/stat-row";

export function StrategyPanel({ results }: { results: AnalysisResults }) {
  const fmt = useFormatters();

  if (results.shortTermRental) {
    const s = results.shortTermRental;
    return (
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Palmtree className="size-5" />
          </span>
          <div>
            <CardTitle>Short-Term Rental Analysis</CardTitle>
            <CardDescription>{Math.round(s.occupiedNightsPerYear)} booked nights per year</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <StatRow label="Monthly Revenue" value={fmt.currency(s.monthlyRevenue)} />
            <StatRow label="Annual Revenue" value={fmt.currency(s.annualRevenue)} />
            <StatRow label="Platform Fees" value={`−${fmt.currency(s.platformFeesAnnual)}`} />
            <StatRow label="Cleaning" value={`−${fmt.currency(s.cleaningCostsAnnual)}`} />
            <StatRow label="Operating Expenses" value={`−${fmt.currency(s.operatingExpensesAnnual)}`} />
          </div>
          <div>
            <StatRow label="NOI" value={fmt.currency(s.noi)} />
            <StatRow label="Cap Rate" value={fmt.percent(s.capRate)} />
            <StatRow label="Monthly Cashflow" value={fmt.signedCurrency(s.monthlyCashflow)} />
            <StatRow label="Annual Profit" value={fmt.signedCurrency(s.annualProfit)} emphasis />
            <StatRow label="ROI (Cash-on-Cash)" value={fmt.percent(s.roi)} emphasis />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.fixFlip) {
    const f = results.fixFlip;
    const positive = f.profit >= 0;
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Hammer className="size-5" />
            </span>
            <div>
              <CardTitle>Fix & Flip Analysis</CardTitle>
              <CardDescription>{f.holdDurationMonths}-month hold</CardDescription>
            </div>
          </div>
          <Badge variant={positive ? "success" : "danger"}>{positive ? "Profitable" : "Loss"}</Badge>
        </CardHeader>
        <CardContent className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <StatRow label="Acquisition Costs" value={fmt.currency(f.acquisitionCosts)} />
            <StatRow label="Renovation" value={fmt.currency(f.renovationBudget)} />
            <StatRow label="Holding Costs" value={fmt.currency(f.holdingCosts)} />
            <StatRow label="Financing Costs" value={fmt.currency(f.financingCosts)} />
            <StatRow label="Selling Costs" value={fmt.currency(f.sellingCosts)} />
            <Separator className="my-1" />
            <StatRow label="Total Investment" value={fmt.currency(f.totalInvestment)} emphasis />
          </div>
          <div>
            <StatRow label="Cash Invested" value={fmt.currency(f.cashInvested)} />
            <StatRow label="Break-Even Sale Price" value={fmt.currency(f.breakEvenSalePrice)} />
            <StatRow label="Profit Margin" value={fmt.percent(f.profitMargin)} />
            <StatRow label="ROI" value={fmt.percent(f.roi)} />
            <StatRow label="Annualised ROI" value={fmt.percent(f.annualisedRoi)} />
            <Separator className="my-1" />
            <StatRow label="Projected Profit" value={fmt.signedCurrency(f.profit)} emphasis />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.brrrr) {
    const b = results.brrrr;
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success/15 text-success">
              <Repeat className="size-5" />
            </span>
            <div>
              <CardTitle>BRRRR Analysis</CardTitle>
              <CardDescription>Buy · Rehab · Rent · Refinance · Repeat</CardDescription>
            </div>
          </div>
          {b.infiniteReturn && <Badge variant="success">Infinite return</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <StatRow label="Total Project Cost" value={fmt.currency(b.totalProjectCost)} />
              <StatRow label="Total Capital Invested" value={fmt.currency(b.initialCashInvested)} />
              <StatRow label="Refinance Proceeds" value={fmt.currency(b.refinanceAmount)} />
              <StatRow label="Cash Pulled Out" value={fmt.currency(b.cashPulledOut)} />
              <StatRow label="Cash Left In Deal" value={fmt.currency(b.cashLeftInDeal)} emphasis />
            </div>
            <div>
              <StatRow label="New Mortgage Payment" value={`${fmt.currency(b.newMonthlyPayment)}/mo`} />
              <StatRow label="Equity After Refinance" value={fmt.currency(b.equityAfterRefinance)} />
              <StatRow label="Monthly Cashflow" value={fmt.signedCurrency(b.monthlyCashflow)} />
              <StatRow label="Annual Cashflow" value={fmt.signedCurrency(b.annualCashflow)} />
              <StatRow label="ROI on Cash Left" value={b.infiniteReturn ? "∞" : fmt.percent(b.roi)} emphasis />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">BRRRR Efficiency Score</span>
              <span className="font-bold tabular">{b.efficiencyScore}/100</span>
            </div>
            <Progress
              value={b.efficiencyScore}
              indicatorClassName={b.efficiencyScore >= 70 ? "bg-success" : b.efficiencyScore >= 45 ? "bg-warning" : "bg-destructive"}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Measures how much capital is recycled on refinance (70%) and post-refinance cashflow health (30%).
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
