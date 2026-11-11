import type {
  AcquisitionCostMode,
  AnalysisInput,
  DealDecisionInputs,
  DealScenarioKey,
  GuidelineAdditionalCosts,
  InsuranceSource,
  RentEntryMode,
  RentSource,
  RentUnit,
  ScenarioAssumptions,
} from "@/lib/types";
import {
  DEFAULT_GUIDELINE_ADDITIONAL_COSTS,
  DEFAULT_SCENARIO_ASSUMPTIONS,
  DEFAULT_TARGET_ARV_PERCENT,
} from "@/lib/constants/deal-workspace";
import { clamp } from "@/lib/calculations/ratios";

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundRent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value / 25) * 25;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(obj: unknown, key: string): boolean {
  return isRecord(obj) && Object.prototype.hasOwnProperty.call(obj, key);
}

function hasOwnFinite(obj: unknown, key: string): boolean {
  if (!hasOwn(obj, key)) return false;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value);
}

function cleanObject<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "number") {
      out[key] = Number.isFinite(value) ? value : 0;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = cleanObject(value as object);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

function normalizeUnits(value: unknown): RentUnit[] {
  if (!Array.isArray(value)) return [];
  return value.map((unit, index) => {
    const record = isRecord(unit) ? unit : {};
    const id = typeof record.id === "string" && record.id.trim() ? record.id : `unit-${index + 1}`;
    const label = typeof record.label === "string" && record.label.trim() ? record.label : `Unit ${index + 1}`;
    return { id, label, monthlyRent: Math.max(0, finite(record.monthlyRent)) };
  });
}

function normalizeScenario(raw: unknown, fallback: ScenarioAssumptions): ScenarioAssumptions {
  if (!isRecord(raw)) return { ...fallback };
  const nullablePercent = (key: keyof ScenarioAssumptions): number | null => {
    if (!hasOwn(raw, key)) return fallback[key] as number | null;
    const value = raw[key];
    if (value === null) return null;
    return typeof value === "number" && Number.isFinite(value) ? value : (fallback[key] as number | null);
  };
  return {
    rentAdjustmentPercent: hasOwnFinite(raw, "rentAdjustmentPercent")
      ? (raw.rentAdjustmentPercent as number)
      : fallback.rentAdjustmentPercent,
    vacancyPercent: nullablePercent("vacancyPercent"),
    annualInsurance: nullablePercent("annualInsurance"),
    maintenancePercent: nullablePercent("maintenancePercent"),
    capexPercent: nullablePercent("capexPercent"),
    rehabOverrunPercent: hasOwnFinite(raw, "rehabOverrunPercent")
      ? (raw.rehabOverrunPercent as number)
      : fallback.rehabOverrunPercent,
    arvAdjustmentPercent: hasOwnFinite(raw, "arvAdjustmentPercent")
      ? (raw.arvAdjustmentPercent as number)
      : fallback.arvAdjustmentPercent,
  };
}

function normalizeGuidelineCosts(raw: unknown): GuidelineAdditionalCosts {
  const base = { ...DEFAULT_GUIDELINE_ADDITIONAL_COSTS };
  if (!isRecord(raw)) return base;
  const flag = (key: keyof GuidelineAdditionalCosts): boolean =>
    hasOwn(raw, key) ? Boolean(raw[key]) : base[key];
  return {
    closingCosts: flag("closingCosts"),
    legalFees: flag("legalFees"),
    inspectionCosts: flag("inspectionCosts"),
    loanFees: flag("loanFees"),
    otherAcquisitionCosts: flag("otherAcquisitionCosts"),
    holdingCosts: flag("holdingCosts"),
  };
}

function legacyArv(input: AnalysisInput): number {
  const brrrrArv = finite(input.brrrr?.afterRepairValue);
  if (brrrrArv > 0) return brrrrArv;
  const sale = finite(input.flip?.expectedSalePrice);
  return sale > 0 ? sale : 0;
}

function normalizeInsuranceSource(raw: unknown): InsuranceSource {
  if (raw === "quote" || raw === "estimate" || raw === "previous") return raw;
  return "estimate";
}

function normalizeRentEntryMode(raw: unknown): RentEntryMode {
  return raw === "units" ? "units" : "total";
}

function normalizeDecision(rawInput: AnalysisInput, clean: AnalysisInput): DealDecisionInputs {
  const rawDecision = (rawInput as { decision?: unknown }).decision;
  const record = isRecord(rawDecision) ? rawDecision : {};
  const existingArv = legacyArv(clean);
  const advertisedArv = hasOwnFinite(record, "advertisedArv") ? finite(record.advertisedArv) : existingArv;
  const conservativeArv = hasOwnFinite(record, "conservativeArv") ? finite(record.conservativeArv) : existingArv;
  const rehabContingencyPercent = hasOwnFinite(record, "rehabContingencyPercent")
    ? Math.max(0, finite(record.rehabContingencyPercent))
    : 0;
  const targetArvPercent = hasOwnFinite(record, "targetArvPercent")
    ? clamp(finite(record.targetArvPercent), 0, 100)
    : DEFAULT_TARGET_ARV_PERCENT;
  const rawScenarios = isRecord(record.scenarios) ? record.scenarios : {};
  const scenarioKeys: DealScenarioKey[] = ["base", "conservative", "stress"];
  const scenarios = Object.fromEntries(
    scenarioKeys.map((key) => [key, normalizeScenario(rawScenarios[key], DEFAULT_SCENARIO_ASSUMPTIONS[key])]),
  ) as Record<DealScenarioKey, ScenarioAssumptions>;

  return {
    advertisedArv,
    conservativeArv,
    rehabContingencyPercent,
    targetArvPercent,
    includeAdditionalCostsInGuideline: hasOwn(record, "includeAdditionalCostsInGuideline")
      ? Boolean(record.includeAdditionalCostsInGuideline)
      : false,
    guidelineAdditionalCosts: normalizeGuidelineCosts(record.guidelineAdditionalCosts),
    acquisitionCostMode: "itemised" satisfies AcquisitionCostMode,
    scenarios,
  };
}

/**
 * Fill workspace fields added in v1.3 and replace NaN so legacy drafts keep working.
 * Does not bump localStorage keys. Repeated calls are idempotent.
 */
export function normalizeAnalysisInput(input: AnalysisInput): AnalysisInput {
  const raw = input as AnalysisInput & { decision?: unknown };
  const clean = cleanObject(raw);
  const listing = Math.max(0, finite(clean.income.monthlyRent));
  const verifiedRaw = finite(clean.income.verifiedRent);
  const conservativeRaw = finite(clean.income.conservativeRent);
  const fallbackVerified =
    clean.strategy === "brrrr" && finite(clean.brrrr.expectedRent) > 0 ? finite(clean.brrrr.expectedRent) : listing;
  const verified = verifiedRaw > 0 ? verifiedRaw : fallbackVerified;
  const conservative = conservativeRaw > 0 ? conservativeRaw : roundRent(verified * 0.9);
  const source: RentSource =
    clean.income.rentSource === "listing" || clean.income.rentSource === "conservative"
      ? clean.income.rentSource
      : "verified";
  const dscrMin = finite(clean.brrrr.refinanceDscrMin);
  const currentMonthlyRent = hasOwnFinite(raw.income, "currentMonthlyRent")
    ? Math.max(0, finite(raw.income.currentMonthlyRent))
    : verified;
  const utilitiesMonthly = Math.max(0, finite(clean.expenses.utilitiesMonthly));
  const sharedUtilitiesMonthly = hasOwn(raw.expenses, "sharedUtilitiesMonthly")
    ? Math.max(0, finite((raw.expenses as { sharedUtilitiesMonthly?: unknown }).sharedUtilitiesMonthly))
    : utilitiesMonthly;

  return {
    ...clean,
    property: {
      ...clean.property,
      zipCode: typeof clean.property.zipCode === "string" ? clean.property.zipCode : "",
    },
    income: {
      ...clean.income,
      monthlyRent: listing,
      verifiedRent: verified,
      conservativeRent: conservative,
      currentMonthlyRent,
      rentEntryMode: normalizeRentEntryMode((raw.income as { rentEntryMode?: unknown } | undefined)?.rentEntryMode),
      units: normalizeUnits((raw.income as { units?: unknown } | undefined)?.units),
      rentSource: source,
    },
    financing: {
      ...clean.financing,
      askingPrice: Math.max(0, finite(clean.financing.askingPrice)),
      otherAcquisitionCosts: hasOwnFinite(raw.financing, "otherAcquisitionCosts")
        ? Math.max(0, finite(raw.financing.otherAcquisitionCosts))
        : 0,
    },
    expenses: {
      ...clean.expenses,
      insuranceSource: normalizeInsuranceSource(
        (raw.expenses as { insuranceSource?: unknown } | undefined)?.insuranceSource,
      ),
      capexPercent: hasOwnFinite(raw.expenses, "capexPercent") ? Math.max(0, finite(raw.expenses.capexPercent)) : 0,
      waterMonthly: hasOwnFinite(raw.expenses, "waterMonthly") ? Math.max(0, finite(raw.expenses.waterMonthly)) : 0,
      sewerMonthly: hasOwnFinite(raw.expenses, "sewerMonthly") ? Math.max(0, finite(raw.expenses.sewerMonthly)) : 0,
      trashMonthly: hasOwnFinite(raw.expenses, "trashMonthly") ? Math.max(0, finite(raw.expenses.trashMonthly)) : 0,
      sharedUtilitiesMonthly,
      utilitiesMonthly,
    },
    brrrr: {
      ...clean.brrrr,
      refinanceDscrMin: dscrMin > 0 ? clamp(dscrMin, 0, 5) : 1.25,
    },
    decision: normalizeDecision(raw, clean),
  };
}
