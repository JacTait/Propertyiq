import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBlankAnalysis, createDefaultAnalysis } from "@/data/default-analysis";
import { createDefaultMaxOffer } from "@/data/default-max-offer";
import { STORAGE_KEYS } from "@/lib/constants";
import { createBlankSharedDeal, dealContentHash, isDealPopulated, isSampleAnalysisName } from "@/lib/deal-draft/blank";
import {
  maxOfferToSharedDeal,
  sharedDealToDownside,
  sharedDealToMaxOffer,
  sharedDealToQuickUnderwrite,
  sharedDealToResilience,
  sharedDealToStandardAnalysis,
  quickUnderwriteToSharedDeal,
  resilienceToSharedDeal,
} from "@/lib/deal-draft/mappers";
import {
  mergeLegacyDrafts,
  migrateLegacyRent,
  sharedDealFromPortfolio,
} from "@/lib/deal-draft/migrate";
import { clearPersistedSharedDeal, persistSharedDeal, readPersistedSharedDeal } from "@/lib/deal-draft/persist";
import type { AnalysisInput, PortfolioProperty } from "@/lib/types";

function installMemoryStorage(): { writes: Map<string, number> } {
  const data = new Map<string, string>();
  const writes = new Map<string, number>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      writes.set(key, (writes.get(key) ?? 0) + 1);
      data.set(key, value);
    },
  };
  vi.stubGlobal("window", {
    localStorage: storage,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal("localStorage", storage);
  return { writes };
}

function userQuickUnderwrite(): AnalysisInput {
  const input = createBlankAnalysis("US");
  input.property.name = "12 Maple Street";
  input.property.address = "12 Maple Street";
  input.property.city = "Tampa";
  input.property.zipCode = "33602";
  input.financing.askingPrice = 275_000;
  input.financing.purchasePrice = 260_000;
  input.financing.closingCosts = 5_200;
  input.income.monthlyRent = 2_400;
  input.income.verifiedRent = 2_200;
  input.income.conservativeRent = 2_000;
  input.income.rentSource = "verified";
  input.expenses.propertyTaxAnnual = 3_600;
  input.expenses.insuranceAnnual = 1_800;
  input.expenses.managementPercent = 8;
  input.expenses.vacancyPercent = 7;
  input.brrrr.rehabCost = 28_000;
  input.brrrr.afterRepairValue = 340_000;
  input.decision.advertisedArv = 340_000;
  return input;
}

describe("cross-workflow shared deal", () => {
  it("TEST 1: Quick Underwrite property details appear in Max Offer", () => {
    const draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    const maxOffer = sharedDealToMaxOffer(draft);
    expect(maxOffer.property.name).toBe("12 Maple Street");
    expect(maxOffer.property.zipCode).toBe("33602");
    expect(maxOffer.property.askingPrice).toBe(275_000);
    expect(maxOffer.property.arv).toBe(340_000);
    expect(maxOffer.property.rehabBudget).toBe(28_000);
  });

  it("TEST 2: Quick Underwrite rent and expenses appear in Deal Resilience", () => {
    const draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    const resilience = sharedDealToResilience(draft);
    expect(resilience.income.verifiedRent).toBe(2_200);
    expect(resilience.income.monthlyRent).toBe(2_400);
    expect(resilience.expenses.propertyTaxAnnual).toBe(3_600);
    expect(resilience.expenses.insuranceAnnual).toBe(1_800);
    expect(resilience.expenses.vacancyPercent).toBe(7);
  });

  it("TEST 3: Max Offer rehab updates Quick Underwrite", () => {
    let draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    const maxOffer = sharedDealToMaxOffer(draft);
    maxOffer.property.rehabBudget = 41_500;
    draft = maxOfferToSharedDeal(draft, maxOffer);
    expect(sharedDealToQuickUnderwrite(draft).brrrr.rehabCost).toBe(41_500);
    expect(sharedDealToResilience(draft).brrrr.rehabCost).toBe(41_500);
  });

  it("TEST 4: changing active rent basis updates every workflow mapping", () => {
    let draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    draft = resilienceToSharedDeal(draft, {
      ...draft.input,
      income: { ...draft.input.income, rentSource: "listing" },
    });
    expect(sharedDealToMaxOffer(draft).property.expectedMonthlyRent).toBe(2_400);
    expect(sharedDealToQuickUnderwrite(draft).income.rentSource).toBe("listing");
    expect(sharedDealToStandardAnalysis(draft).income.rentSource).toBe("listing");
    expect(sharedDealToDownside(draft).income.rentSource).toBe("listing");
    expect(sharedDealToResilience(draft).income.verifiedRent).toBe(2_200);
    expect(sharedDealToResilience(draft).income.monthlyRent).toBe(2_400);
  });

  it("TEST 5: a saved Portfolio deal round-trips through every workflow", () => {
    const input = userQuickUnderwrite();
    const property: PortfolioProperty = {
      id: "prop_saved",
      name: input.property.name,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      country: "US",
      region: "FL",
      regionName: "Florida",
      strategy: "brrrr",
      input,
      snapshot: {
        purchasePrice: 260_000,
        roi: 8,
        cashOnCash: 6,
        capRate: 5,
        grossYield: 7,
        netYield: 5,
        monthlyCashflow: 200,
        annualCashflow: 2400,
        dscr: 1.2,
        appreciationRate: 4,
        dealScore: 70,
        grade: "good",
        recommendation: "Buy",
      },
      kind: "quick-underwrite",
      originWorkflow: "quick-underwrite",
      schemaVersion: 1,
    };
    const draft = sharedDealFromPortfolio(property, "US");
    expect(sharedDealToQuickUnderwrite(draft).property.name).toBe("12 Maple Street");
    expect(sharedDealToStandardAnalysis(draft).financing.purchasePrice).toBe(260_000);
    expect(sharedDealToMaxOffer(draft).property.arv).toBe(340_000);
    expect(sharedDealToResilience(draft).income.verifiedRent).toBe(2_200);
    expect(sharedDealToDownside(draft).brrrr.rehabCost).toBe(28_000);
    expect(draft.savedId).toBe("prop_saved");
  });

  it("TEST 8: sample defaults never overwrite user data", () => {
    const user = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    const sample = createDefaultAnalysis("US");
    expect(isSampleAnalysisName(sample.property.name)).toBe(true);
    const merged = mergeLegacyDrafts(
      { input: sample, savedId: null },
      { input: createDefaultMaxOffer("US"), savedId: null },
      "US",
    );
    expect(merged).toBeNull();
    expect(user.input.property.name).toBe("12 Maple Street");
    expect(user.input.income.verifiedRent).toBe(2_200);
    expect(user.input.financing.purchasePrice).not.toBe(sample.financing.purchasePrice);
  });

  it("TEST 9: older single-rent records migrate to verified local rent", () => {
    const legacy = createBlankAnalysis("US");
    const income = { ...legacy.income, monthlyRent: 1_850 };
    delete (income as { verifiedRent?: number }).verifiedRent;
    const migrated = migrateLegacyRent({ ...legacy, income });
    expect(migrated.income.verifiedRent).toBe(1_850);
    expect(migrated.income.monthlyRent).toBe(1_850);
    expect(migrated.income.verificationStatus).toBe("unverified");
    expect(migrated.income.rentSource).toBe("verified");
  });

  it("does not silently replace verified rent with listing or purchase with asking", () => {
    let draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    const maxOffer = sharedDealToMaxOffer(draft);
    maxOffer.property.expectedMonthlyRent = 2_050;
    maxOffer.property.askingPrice = 280_000;
    draft = maxOfferToSharedDeal(draft, maxOffer);
    expect(draft.input.income.verifiedRent).toBe(2_050);
    expect(draft.input.income.monthlyRent).toBe(2_400);
    expect(draft.input.financing.askingPrice).toBe(280_000);
    expect(draft.input.financing.purchasePrice).toBe(260_000);
  });
});

describe("shared deal persistence", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("TEST 6: refresh reads the same persisted draft", () => {
    const draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    persistSharedDeal(draft);
    const loaded = readPersistedSharedDeal();
    expect(loaded?.input.property.name).toBe("12 Maple Street");
    expect(loaded?.input.income.verifiedRent).toBe(2_200);
    expect(loaded?.input.brrrr.rehabCost).toBe(28_000);
  });

  it("TEST 7: starting a new deal clears fields without deleting Buy Boxes or Portfolio", () => {
    const buyBoxes = [{ id: "box_default", name: "Core" }];
    const portfolio = [{ id: "prop_keep", name: "Keep me" }];
    window.localStorage.setItem(STORAGE_KEYS.buyBoxes, JSON.stringify(buyBoxes));
    window.localStorage.setItem(STORAGE_KEYS.portfolio, JSON.stringify(portfolio));
    persistSharedDeal(quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite()));
    clearPersistedSharedDeal();
    expect(readPersistedSharedDeal()).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.buyBoxes) ?? "[]")).toEqual(buyBoxes);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.portfolio) ?? "[]")).toEqual(portfolio);
    expect(isDealPopulated(createBlankSharedDeal("US"))).toBe(false);
  });

  it("TEST 10: unchanged drafts do not write localStorage in a loop", () => {
    const { writes } = installMemoryStorage();
    const draft = quickUnderwriteToSharedDeal(createBlankSharedDeal("US"), userQuickUnderwrite());
    persistSharedDeal(draft);
    const sharedWrites = writes.get(STORAGE_KEYS.sharedDeal) ?? 0;
    persistSharedDeal(draft);
    persistSharedDeal(draft);
    expect(writes.get(STORAGE_KEYS.sharedDeal)).toBe(sharedWrites);
    expect(dealContentHash(draft)).toBe(dealContentHash(draft));
  });
});
