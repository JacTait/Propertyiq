"use client";

import { Award, Briefcase, TrendingUp, Wallet } from "lucide-react";
import { useFormatters } from "@/hooks/useSettings";
import { KpiCard } from "@/components/dashboard/kpi-card";

interface PortfolioStatsProps {
  stats: {
    count: number;
    totalValue: number;
    totalMonthlyCashflow: number;
    averageScore: number;
    averageRoi: number;
  };
}

export function PortfolioStats({ stats }: PortfolioStatsProps) {
  const fmt = useFormatters();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard index={0} label="Properties" value={String(stats.count)} sub="saved analyses" icon={Briefcase} tone="primary" />
      <KpiCard index={1} label="Portfolio Value" value={fmt.currency(stats.totalValue, { compact: true })} sub="combined purchase price" icon={Wallet} tone="muted" />
      <KpiCard
        index={2}
        label="Monthly Cashflow"
        value={fmt.signedCurrency(stats.totalMonthlyCashflow)}
        sub="across all properties"
        icon={TrendingUp}
        tone={stats.totalMonthlyCashflow >= 0 ? "success" : "danger"}
      />
      <KpiCard index={3} label="Avg Deal Score" value={stats.count ? Math.round(stats.averageScore).toString() : "–"} sub={`avg ROI ${fmt.percent(stats.averageRoi)}`} icon={Award} tone={stats.averageScore >= 70 ? "success" : stats.averageScore >= 60 ? "warning" : "danger"} />
    </div>
  );
}
