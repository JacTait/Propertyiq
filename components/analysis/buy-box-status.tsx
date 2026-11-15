"use client";

import type { BuyBoxMatch } from "@/lib/types";
import { BuyBoxBreakdown } from "@/components/underwriting/buy-box-breakdown";

export function BuyBoxStatusCard({
  match,
  listingNote,
}: {
  match: BuyBoxMatch;
  listingNote?: string;
}) {
  return (
    <div className="space-y-2">
      <BuyBoxBreakdown match={match} />
      {listingNote ? <p className="px-1 text-xs text-muted-foreground">{listingNote}</p> : null}
    </div>
  );
}
