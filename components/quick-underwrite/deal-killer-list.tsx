"use client";

import type { UnderwritingWarning } from "@/lib/types";
import { RiskWarningList } from "@/components/underwriting/risk-warning-list";

export function DealKillerList({ warnings }: { warnings: UnderwritingWarning[] }) {
  return <RiskWarningList warnings={warnings} />;
}
