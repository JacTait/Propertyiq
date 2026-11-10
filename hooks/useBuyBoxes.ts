"use client";

import { useCallback, useMemo } from "react";
import type { BuyBoxProfile } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { createId } from "@/lib/utils/storage";
import { DEFAULT_BUY_BOXES } from "@/data/default-buy-box";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";

function isBuyBoxes(value: unknown): value is BuyBoxProfile[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "object" && item !== null && "id" in item && "name" in item)
  );
}

export function useBuyBoxes() {
  const { settings, updateSettings } = useSettings();
  const [profiles, setProfiles, hydrated] = useLocalStorage<BuyBoxProfile[]>(
    STORAGE_KEYS.buyBoxes,
    DEFAULT_BUY_BOXES,
    isBuyBoxes,
  );

  const active = useMemo(() => {
    if (profiles.length === 0) return null;
    return profiles.find((p) => p.id === settings.activeBuyBoxId) ?? profiles[0] ?? null;
  }, [profiles, settings.activeBuyBoxId]);

  const setActiveId = useCallback(
    (id: string | null) => updateSettings({ activeBuyBoxId: id }),
    [updateSettings],
  );

  const saveProfile = useCallback(
    (draft: Omit<BuyBoxProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }): BuyBoxProfile => {
      const now = new Date().toISOString();
      const existing = draft.id ? profiles.find((p) => p.id === draft.id) : undefined;
      const saved: BuyBoxProfile = {
        ...draft,
        id: existing?.id ?? createId("box"),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      setProfiles((prev) => (prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]));
      if (!settings.activeBuyBoxId) updateSettings({ activeBuyBoxId: saved.id });
      return saved;
    },
    [profiles, setProfiles, settings.activeBuyBoxId, updateSettings],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (settings.activeBuyBoxId === id) {
        updateSettings({ activeBuyBoxId: null });
      }
    },
    [setProfiles, settings.activeBuyBoxId, updateSettings],
  );

  return { profiles, active, hydrated, setActiveId, saveProfile, deleteProfile };
}
