"use client";

import type { MaxOfferResults } from "@/lib/types";
import { OfferRange } from "@/components/underwriting/offer-range";

export function OfferTiers({ results, askingPrice }: { results: MaxOfferResults; askingPrice?: number }) {
  return (
    <OfferRange
      excellent={results.excellentOffer}
      target={results.recommendedOffer}
      maximum={results.maximumOffer}
      currentAsk={askingPrice && askingPrice > 0 ? askingPrice : null}
    />
  );
}
