import type { DealScenarioKey, GuidelineAdditionalCosts, ScenarioAssumptions } from "@/lib/types";

export const DEFAULT_TARGET_ARV_PERCENT = 70;

export const DEFAULT_GUIDELINE_ADDITIONAL_COSTS: GuidelineAdditionalCosts = {
  closingCosts: false,
  legalFees: false,
  inspectionCosts: false,
  loanFees: false,
  otherAcquisitionCosts: false,
  holdingCosts: false,
};

export const DEFAULT_SCENARIO_ASSUMPTIONS: Record<DealScenarioKey, ScenarioAssumptions> = {
  base: {
    rentAdjustmentPercent: 0,
    vacancyPercent: null,
    annualInsurance: null,
    maintenancePercent: null,
    capexPercent: null,
    rehabOverrunPercent: 0,
    arvAdjustmentPercent: 0,
  },
  conservative: {
    rentAdjustmentPercent: -5,
    vacancyPercent: null,
    annualInsurance: null,
    maintenancePercent: null,
    capexPercent: null,
    rehabOverrunPercent: 10,
    arvAdjustmentPercent: -5,
  },
  stress: {
    rentAdjustmentPercent: -15,
    vacancyPercent: null,
    annualInsurance: null,
    maintenancePercent: null,
    capexPercent: null,
    rehabOverrunPercent: 20,
    arvAdjustmentPercent: -10,
  },
};
