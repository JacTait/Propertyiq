/**
 * Shared-utilities fallback for the deal-decision module.
 * Never add utilitiesMonthly on top of sharedUtilitiesMonthly.
 *
 * Fallback is based on missing/undefined, not truthiness:
 * an explicit 0 is a real value and must not fall back.
 */
export function effectiveSharedUtilities(expenses: {
  sharedUtilitiesMonthly?: number;
  utilitiesMonthly?: number;
}): number {
  if (expenses.sharedUtilitiesMonthly !== undefined) {
    return Number.isFinite(expenses.sharedUtilitiesMonthly) ? expenses.sharedUtilitiesMonthly : 0;
  }
  const legacy = expenses.utilitiesMonthly;
  return typeof legacy === "number" && Number.isFinite(legacy) ? legacy : 0;
}

function money(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Monthly utilities used by deal-decision: water + sewer + trash + effective shared. */
export function monthlyUtilitiesTotal(expenses: {
  waterMonthly?: number;
  sewerMonthly?: number;
  trashMonthly?: number;
  sharedUtilitiesMonthly?: number;
  utilitiesMonthly?: number;
}): number {
  return (
    money(expenses.waterMonthly) +
    money(expenses.sewerMonthly) +
    money(expenses.trashMonthly) +
    effectiveSharedUtilities(expenses)
  );
}
