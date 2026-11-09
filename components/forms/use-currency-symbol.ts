"use client";

import { CURRENCIES } from "@/lib/constants";
import { useSettings } from "@/hooks/useSettings";

export function useCurrencySymbol(): string {
  const { settings } = useSettings();
  return CURRENCIES.find((c) => c.code === settings.currency)?.symbol ?? "$";
}
