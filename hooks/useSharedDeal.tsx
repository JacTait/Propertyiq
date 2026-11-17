"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnalysisInput, MaxOfferInputs, OriginWorkflow, PortfolioProperty } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { createDefaultAnalysis } from "@/data/default-analysis";
import { analyzeProperty } from "@/lib/calculations/analyze";
import { calculateMaxOffer } from "@/lib/calculations/max-offer";
import { calculateQuickUnderwrite } from "@/lib/calculations/quick-underwrite";
import { underwriteDeal } from "@/lib/calculations/underwrite";
import { identityFromAnalysis, defaultPropertyIdentity } from "@/lib/property-identity";
import { writeStorage } from "@/lib/utils/storage";
import { sanitizeInput } from "@/hooks/usePropertyAnalysis";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useSettings } from "@/hooks/useSettings";
import {
  analysisWorkflowToSharedDeal,
  clearPersistedSharedDeal,
  createBlankSharedDeal,
  hydrateSharedDeal,
  isDealPopulated,
  isDraftDirty,
  isSharedDealDraft,
  kindToOrigin,
  markSavedToPortfolio,
  maxOfferToSharedDeal,
  persistSharedDeal,
  readPersistedSharedDeal,
  sharedDealFromPortfolio,
  sharedDealToMaxOffer,
  stableEqual,
  type DraftPersistStatus,
  type SharedDealDraft,
} from "@/lib/deal-draft";

interface SharedDealContextValue {
  draft: SharedDealDraft;
  hydrated: boolean;
  persistStatus: DraftPersistStatus;
  revision: number;
  dirty: boolean;
  populated: boolean;
  patchAnalysis: (input: AnalysisInput, origin: OriginWorkflow) => void;
  patchMaxOffer: (input: MaxOfferInputs) => void;
  flushPending: () => void;
  adoptPortfolio: (property: PortfolioProperty, origin?: OriginWorkflow) => void;
  startNewDeal: () => void;
  clearDraft: () => void;
  detachSaved: () => void;
  loadDemoDeal: () => void;
  saveDeal: (name: string, asNew: boolean, origin?: OriginWorkflow) => PortfolioProperty | null;
}

const SharedDealContext = createContext<SharedDealContextValue | null>(null);

function applyDraft(next: SharedDealDraft, previous: SharedDealDraft | null): SharedDealDraft {
  if (previous && stableEqual(previous, next)) return previous;
  return next;
}

export function SharedDealProvider({ children }: { children: ReactNode }) {
  const { settings, hydrated: settingsHydrated } = useSettings();
  const { saveProperty, saveMaxOffer } = usePortfolio();
  const { active } = useBuyBoxes();
  const [stored, setStored] = useState<SharedDealDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [revision, setRevision] = useState(0);
  const [persistStatus, setPersistStatus] = useState<DraftPersistStatus>("saved-locally");
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<SharedDealDraft | null>(null);

  const blank = useMemo(
    () => createBlankSharedDeal(settings.defaultCountry, settings.activeBuyBoxId),
    [settings.defaultCountry, settings.activeBuyBoxId],
  );
  const draft = stored ?? blank;

  const didHydrate = useRef(false);
  useEffect(() => {
    if (!settingsHydrated || didHydrate.current) return;
    didHydrate.current = true;
    const loaded = hydrateSharedDeal(settings.defaultCountry, settings.activeBuyBoxId);
    setStored(loaded);
    setHydrated(true);
    setPersistStatus(loaded?.savedId ? "saved-portfolio" : "saved-locally");
  }, [settingsHydrated, settings.defaultCountry, settings.activeBuyBoxId]);

  useEffect(() => {
    const sync = (key: string | null) => {
      if (key && key !== STORAGE_KEYS.sharedDeal) return;
      const next = readPersistedSharedDeal();
      setStored((prev) => (next && prev && stableEqual(prev, next) ? prev : next));
    };
    const custom = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      sync(detail?.key ?? STORAGE_KEYS.sharedDeal);
    };
    const native = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEYS.sharedDeal) sync(event.key);
    };
    window.addEventListener("propertyiq:storage", custom);
    window.addEventListener("storage", native);
    return () => {
      window.removeEventListener("propertyiq:storage", custom);
      window.removeEventListener("storage", native);
    };
  }, []);

  const flushPending = useCallback(() => {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    persistSharedDeal(pending);
    writeStorage(STORAGE_KEYS.propertyIdentity, identityFromAnalysis(pending.input));
    if (pending.savedId && isDraftDirty(pending)) setPersistStatus("unsaved");
    else setPersistStatus(pending.savedId ? "saved-portfolio" : "saved-locally");
  }, []);

  useEffect(() => {
    const onHide = () => flushPending();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      flushPending();
    };
  }, [flushPending]);

  const commit = useCallback(
    (next: SharedDealDraft, options?: { persistImmediately?: boolean; bumpRevision?: boolean; portfolio?: boolean }) => {
      setStored((prev) => applyDraft(next, prev));
      if (options?.bumpRevision) setRevision((value) => value + 1);
      pendingRef.current = next;
      const flush = () => {
        const pending = pendingRef.current;
        if (!pending) return;
        setPersistStatus("saving");
        persistSharedDeal(pending);
        writeStorage(STORAGE_KEYS.propertyIdentity, identityFromAnalysis(pending.input));
        if (options?.portfolio) setPersistStatus("saved-portfolio");
        else if (pending.savedId && isDraftDirty(pending)) setPersistStatus("unsaved");
        else setPersistStatus("saved-locally");
      };
      if (options?.persistImmediately) {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        flush();
        return;
      }
      setPersistStatus(next.savedId ? "unsaved" : "saving");
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(flush, 400);
    },
    [],
  );

  const patchAnalysis = useCallback(
    (input: AnalysisInput, origin: OriginWorkflow) => {
      const current = pendingRef.current ?? stored ?? blank;
      const next = analysisWorkflowToSharedDeal(current, input, origin);
      if (stableEqual(current.input, next.input) && current.originWorkflow === next.originWorkflow) return;
      commit(next);
    },
    [blank, commit, stored],
  );

  const patchMaxOffer = useCallback(
    (input: MaxOfferInputs) => {
      const current = pendingRef.current ?? stored ?? blank;
      const next = maxOfferToSharedDeal(current, input);
      if (stableEqual(sharedDealToMaxOffer(current), sharedDealToMaxOffer(next))) return;
      commit(next);
    },
    [blank, commit, stored],
  );

  const adoptPortfolio = useCallback(
    (property: PortfolioProperty, origin?: OriginWorkflow) => {
      const current = pendingRef.current ?? stored;
      if (current?.savedId === property.id && isDraftDirty(current)) return;
      const next = sharedDealFromPortfolio(property, settings.defaultCountry);
      commit(
        { ...next, originWorkflow: origin ?? next.originWorkflow ?? kindToOrigin(property.kind) },
        { persistImmediately: true },
      );
    },
    [commit, settings.defaultCountry, stored],
  );

  const resetToBlank = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    pendingRef.current = null;
    clearPersistedSharedDeal();
    writeStorage(STORAGE_KEYS.propertyIdentity, defaultPropertyIdentity(settings.defaultCountry));
    const next = createBlankSharedDeal(settings.defaultCountry, settings.activeBuyBoxId);
    setStored(null);
    setRevision((value) => value + 1);
    setPersistStatus("saved-locally");
    persistSharedDeal(next);
  }, [settings.activeBuyBoxId, settings.defaultCountry]);

  const startNewDeal = useCallback(() => {
    resetToBlank();
  }, [resetToBlank]);

  const clearDraft = useCallback(() => {
    resetToBlank();
  }, [resetToBlank]);

  const detachSaved = useCallback(() => {
    const current = pendingRef.current ?? stored ?? blank;
    commit(
      { ...current, savedId: null, lastSavedAt: null, lastSavedHash: null },
      { persistImmediately: true },
    );
  }, [blank, commit, stored]);

  const loadDemoDeal = useCallback(() => {
    const sample = createDefaultAnalysis(settings.defaultCountry);
    const next = analysisWorkflowToSharedDeal(
      createBlankSharedDeal(settings.defaultCountry, settings.activeBuyBoxId),
      sample,
      "quick-underwrite",
    );
    commit(next, { persistImmediately: true, bumpRevision: true });
  }, [commit, settings.activeBuyBoxId, settings.defaultCountry]);

  const saveDeal = useCallback(
    (name: string, asNew: boolean, origin?: OriginWorkflow): PortfolioProperty | null => {
      const current = pendingRef.current ?? stored ?? blank;
      const clean = sanitizeInput({
        ...current.input,
        property: { ...current.input.property, name: name.trim() || current.input.property.name || "Untitled property" },
      });
      const results = analyzeProperty(clean);
      const underwriting = underwriteDeal(clean, results, active, { targets: current.targets });
      const quick = calculateQuickUnderwrite(clean, active, current.targets);
      const maxInput = sharedDealToMaxOffer({ ...current, input: clean });
      const maxResults = calculateMaxOffer(maxInput);
      const existingId = asNew ? undefined : (current.savedId ?? undefined);
      const resolvedOrigin = origin ?? current.originWorkflow;
      const saved =
        resolvedOrigin === "max-offer"
          ? saveMaxOffer(maxInput, maxResults, settings.defaultCountry, clean.property.name, existingId, underwriting, {
              analysisInput: clean,
              originWorkflow: resolvedOrigin,
              schemaVersion: current.schemaVersion,
              activeBuyBoxId: settings.activeBuyBoxId,
            })
          : saveProperty(clean, results, clean.property.name, existingId, underwriting, {
              kind: resolvedOrigin === "quick-underwrite" ? "quick-underwrite" : "analysis",
              quick,
              originWorkflow: resolvedOrigin,
              schemaVersion: current.schemaVersion,
              activeBuyBoxId: settings.activeBuyBoxId,
              maxOfferInput: maxInput,
            });
      const marked = markSavedToPortfolio({ ...current, input: clean, originWorkflow: resolvedOrigin }, saved.id, saved.updatedAt);
      commit(marked, { persistImmediately: true, portfolio: true });
      return saved;
    },
    [active, blank, commit, saveMaxOffer, saveProperty, settings.activeBuyBoxId, settings.defaultCountry, stored],
  );

  const value = useMemo<SharedDealContextValue>(
    () => ({
      draft,
      hydrated,
      persistStatus: stored && stored.savedId && !isDraftDirty(stored) ? "saved-portfolio" : persistStatus,
      revision,
      dirty: isDraftDirty(draft),
      populated: isDealPopulated(draft),
      patchAnalysis,
      patchMaxOffer,
      flushPending,
      adoptPortfolio,
      startNewDeal,
      clearDraft,
      detachSaved,
      loadDemoDeal,
      saveDeal,
    }),
    [
      adoptPortfolio,
      clearDraft,
      detachSaved,
      draft,
      hydrated,
      loadDemoDeal,
      patchAnalysis,
      flushPending,
      patchMaxOffer,
      persistStatus,
      revision,
      saveDeal,
      startNewDeal,
      stored,
    ],
  );

  return <SharedDealContext.Provider value={value}>{children}</SharedDealContext.Provider>;
}

export function useSharedDeal(): SharedDealContextValue {
  const ctx = useContext(SharedDealContext);
  if (!ctx) throw new Error("useSharedDeal must be used within SharedDealProvider");
  return ctx;
}

export function useOptionalSharedDeal(): SharedDealContextValue | null {
  return useContext(SharedDealContext);
}

export function isHydratedSharedDeal(value: unknown): value is SharedDealDraft {
  return isSharedDealDraft(value);
}
