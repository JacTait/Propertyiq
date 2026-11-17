"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatRow } from "@/components/dashboard/stat-row";
import { useFormatters } from "@/hooks/useSettings";
import { downsidePath, resiliencePath } from "@/lib/utils/routes";
import type { QuickDownsideSnapshot } from "@/lib/types";
import { formatDscr } from "@/lib/calculations/ratios";
import { DealSurvivalInfo, dealSurvivalInfoFromSnapshot } from "@/components/underwriting/deal-survival-info";

export function DownsideSnapshot({
  snapshot,
  propertyId,
}: {
  snapshot: QuickDownsideSnapshot | null;
  propertyId?: string | null;
}) {
  const fmt = useFormatters();
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Downside snapshot</CardTitle>
          <CardDescription>Reuses Deal Resilience and Downside Analysis. Compact view only.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={resiliencePath(propertyId)}>Resilience</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={downsidePath(propertyId)}>Downside</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {snapshot ? (
          <>
            <StatRow label="Expected cashflow" value={`${fmt.signedCurrency(snapshot.expectedCashflow)}/mo`} />
            <StatRow label="Resilience Stress Cashflow" value={`${fmt.signedCurrency(snapshot.stressCashflow)}/mo`} />
            <StatRow label="Downside Bad-Year Cashflow" value={`${fmt.signedCurrency(snapshot.badYearCashflow)}/mo`} />
            <StatRow label="Expected DSCR" value={formatDscr(snapshot.expectedDscr)} />
            <StatRow label="Resilience Stress DSCR" value={formatDscr(snapshot.stressDscr)} />
            <StatRow label="Downside Bad-Year DSCR" value={formatDscr(snapshot.badYearDscr)} />
            <StatRow label="Expected ROI" value={fmt.percent(snapshot.expectedRoi)} />
            <StatRow label="Resilience Stress ROI" value={fmt.percent(snapshot.stressRoi)} />
            <StatRow
              label="Deal Survival Score"
              value={`${snapshot.dealSurvivalScore}/100`}
              emphasis
              labelAccessory={<DealSurvivalInfo {...dealSurvivalInfoFromSnapshot(snapshot)} />}
            />
            <StatRow label="Primary risk" value={snapshot.primaryRisk} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Enter rent and ARV to run the downside snapshot.</p>
        )}
      </CardContent>
    </Card>
  );
}
