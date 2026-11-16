import type {
  AnalysisInput,
  CurrentDealPrice,
  PriceSource,
  PriceVsMaximumOffer,
  UnderwrittenPrice,
  UnderwrittenPriceSource,
} from "@/lib/types";

const SOURCE_LABEL: Record<UnderwrittenPriceSource, string> = {
  purchase: "Purchase Price",
  proposed: "Proposed Offer",
  asking: "Current Asking Price",
};

function finitePositive(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function underwrittenPriceLabel(source: UnderwrittenPriceSource | null): string {
  return source ? SOURCE_LABEL[source] : "No price entered yet";
}

export function basedOnUnderwrittenSource(source: UnderwrittenPriceSource | null): string {
  return source ? `Based on ${SOURCE_LABEL[source]}` : "No price entered yet.";
}

/**
 * Single underwritten price for every workflow.
 * Purchase Price > 0 → Proposed Offer > 0 → Current Asking Price > 0 → null.
 * Zero is never a valid property price.
 */
export function resolveUnderwrittenPrice(
  input: Pick<AnalysisInput, "financing"> | { financing?: AnalysisInput["financing"] | null } | null | undefined,
): UnderwrittenPrice {
  const financing = input?.financing;
  const purchase = finitePositive(financing?.purchasePrice);
  if (purchase > 0) {
    return { value: purchase, source: "purchase", label: SOURCE_LABEL.purchase };
  }
  const proposed = finitePositive(financing?.proposedOffer);
  if (proposed > 0) {
    return { value: proposed, source: "proposed", label: SOURCE_LABEL.proposed };
  }
  const asking = finitePositive(financing?.askingPrice);
  if (asking > 0) {
    return { value: asking, source: "asking", label: SOURCE_LABEL.asking };
  }
  return { value: null, source: null, label: "No price entered yet" };
}

export function toPriceSource(resolved: UnderwrittenPrice): PriceSource {
  if (resolved.source === "purchase") {
    return { value: resolved.value, source: "purchase", label: resolved.label };
  }
  if (resolved.source === "proposed") {
    return { value: resolved.value, source: "proposed-offer", label: resolved.label };
  }
  if (resolved.source === "asking") {
    return { value: resolved.value, source: "asking", label: resolved.label };
  }
  return { value: null, source: "none", label: resolved.label };
}

export function toCurrentDealPrice(resolved: UnderwrittenPrice): CurrentDealPrice | null {
  if (resolved.value === null || resolved.source === null) return null;
  return { price: resolved.value, source: resolved.source, label: resolved.label };
}

/** Engine copy only — never persist. Leaves stored purchase at 0 when no price is entered. */
export function applyUnderwrittenPrice(input: AnalysisInput): AnalysisInput {
  const resolved = resolveUnderwrittenPrice(input);
  const nextPrice = resolved.value ?? 0;
  if (input.financing.purchasePrice === nextPrice) return input;
  return {
    ...input,
    financing: {
      ...input.financing,
      purchasePrice: nextPrice,
    },
  };
}

export function comparePriceToMaximumOffer(
  price: number,
  maximumOffer: number | null,
  emptyStatusLabel: string,
): {
  entered: boolean;
  difference: number | null;
  status: PriceVsMaximumOffer["status"];
  statusLabel: string;
} {
  const entered = finitePositive(price) > 0;
  const max = typeof maximumOffer === "number" && Number.isFinite(maximumOffer) && maximumOffer > 0 ? maximumOffer : null;
  if (!entered) {
    return { entered: false, difference: null, status: "not-entered", statusLabel: emptyStatusLabel };
  }
  if (max === null) {
    return { entered: true, difference: null, status: "not-entered", statusLabel: "Maximum offer not calculated" };
  }
  const difference = max - price;
  if (difference < -0.5) {
    return { entered: true, difference, status: "above-maximum", statusLabel: "Above Maximum" };
  }
  if (difference > 0.5) {
    return { entered: true, difference, status: "below-maximum", statusLabel: "Below Maximum" };
  }
  return { entered: true, difference: 0, status: "at-maximum", statusLabel: "At Maximum" };
}

export function buildPriceComparisons(
  input: Pick<AnalysisInput, "financing">,
  maximumOffer: number | null,
): PriceVsMaximumOffer[] {
  const asking = finitePositive(input.financing?.askingPrice);
  const proposed = finitePositive(input.financing?.proposedOffer);
  const purchase = finitePositive(input.financing?.purchasePrice);
  const askingCmp = comparePriceToMaximumOffer(asking, maximumOffer, "Not Entered");
  const proposedCmp = comparePriceToMaximumOffer(proposed, maximumOffer, "Not Entered");
  const purchaseCmp = comparePriceToMaximumOffer(purchase, maximumOffer, "Not Purchased / Not Entered");
  return [
    {
      key: "asking",
      label: "Current Asking Price",
      differenceLabel: "Asking Price Difference",
      price: asking,
      maximumOffer,
      ...askingCmp,
    },
    {
      key: "proposed",
      label: "Proposed Offer",
      differenceLabel: "Offer Headroom",
      price: proposed,
      maximumOffer,
      ...proposedCmp,
    },
    {
      key: "purchase",
      label: "Purchase Price",
      differenceLabel: "Purchase Price Difference",
      price: purchase,
      maximumOffer,
      ...purchaseCmp,
    },
  ];
}

export function formatMoneyAmount(value: number): string {
  return `$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
}

export function formatMoneyDelta(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMoneyAmount(value)}`;
}
