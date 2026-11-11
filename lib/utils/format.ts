import type { AppSettings, CurrencyCode, NumberFormatting } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export interface Formatters {
  currency: (value: number, options?: { decimals?: number; compact?: boolean }) => string;
  percent: (value: number, decimals?: number) => string;
  number: (value: number, decimals?: number) => string;
  ratio: (value: number, decimals?: number) => string;
  signedCurrency: (value: number) => string;
  date: (iso: string) => string;
  dateTime: (iso: string) => string;
}

export function createFormatters(
  currency: CurrencyCode = DEFAULT_SETTINGS.currency,
  formatting: NumberFormatting = DEFAULT_SETTINGS.numberFormatting,
): Formatters {
  const locale = formatting.locale || "en-US";

  const currencyFormatter = (decimals: number, compact: boolean) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: compact ? 1 : decimals,
      notation: compact ? "compact" : "standard",
    });

  const numberFormatter = (decimals: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const safe = (value: number): number => (Number.isFinite(value) ? value : 0);

  return {
    currency: (value, options) => {
      if (value === Infinity) return "∞";
      const compact = options?.compact ?? formatting.style === "compact";
      const decimals = options?.decimals ?? formatting.decimals;
      return currencyFormatter(decimals, compact).format(safe(value));
    },
    signedCurrency: (value) => {
      const v = safe(value);
      const formatted = currencyFormatter(formatting.decimals, formatting.style === "compact").format(
        Math.abs(v),
      );
      return v < 0 ? `-${formatted}` : `+${formatted}`;
    },
    percent: (value, decimals = 1) => {
      if (value === Infinity) return "∞";
      return `${numberFormatter(decimals).format(safe(value))}%`;
    },
    number: (value, decimals = 0) => numberFormatter(decimals).format(safe(value)),
    ratio: (value, decimals = 2) => {
      if (!Number.isFinite(value)) return "∞";
      return `${numberFormatter(decimals).format(safe(value))}x`;
    },
    date: (iso) =>
      new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(
        new Date(iso),
      ),
    dateTime: (iso) =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
  };
}

export function formattersFromSettings(settings: AppSettings): Formatters {
  return createFormatters(settings.currency, settings.numberFormatting);
}

export const defaultFormatters = createFormatters();

/** Compact axis label e.g. $1.2M / $450K. */
export function compactCurrency(value: number, currency: CurrencyCode = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
