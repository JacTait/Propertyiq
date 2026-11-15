"use client";

import type { DealKillerWarning } from "@/lib/types";
import { RiskWarningList } from "@/components/underwriting/risk-warning-list";

export function DealKillerList({ warnings }: { warnings: DealKillerWarning[] }) {
  return <RiskWarningList warnings={warnings} title="Deal warnings" />;
}
