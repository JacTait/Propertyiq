import type { MarginForErrorLabel } from "@/lib/calculations/deal-decision";
import type { Formatters } from "@/lib/utils/format";

export const MARGIN_BADGE_VARIANT: Record<MarginForErrorLabel, "success" | "warning" | "danger" | "primary"> = {
  "Stronger margin": "success",
  "Moderate margin": "primary",
  "Thin margin": "warning",
  "Negative underwrite": "danger",
};

export function wholeMoney(fmt: Formatters, value: number): string {
  return fmt.currency(value, { decimals: 0 });
}

export function signedMonthly(fmt: Formatters, value: number): string {
  const amount = fmt.currency(Math.abs(value), { decimals: 0 });
  if (value < 0) return `-${amount} / mo`;
  if (value > 0) return `+${amount} / mo`;
  return `${amount} / mo`;
}

export function cashflowTone(value: number): "positive" | "negative" | "zero" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "zero";
}
