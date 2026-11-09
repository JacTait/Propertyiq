"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTheme } from "next-themes";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/constants";
import { formattersFromSettings, type Formatters } from "@/lib/utils/format";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface SettingsContextValue {
  settings: AppSettings;
  hydrated: boolean;
  formatters: Formatters;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function isSettings(value: unknown): value is AppSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.currency === "string" && typeof v.theme === "string";
}

function mergeSettings(stored: AppSettings): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    exportPreferences: { ...DEFAULT_SETTINGS.exportPreferences, ...stored.exportPreferences },
    numberFormatting: { ...DEFAULT_SETTINGS.numberFormatting, ...stored.numberFormatting },
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored, hydrated] = useLocalStorage<AppSettings>(
    STORAGE_KEYS.settings,
    DEFAULT_SETTINGS,
    isSettings,
  );
  const settings = useMemo(() => mergeSettings(stored), [stored]);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (hydrated) setTheme(settings.theme);
  }, [hydrated, settings.theme, setTheme]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setStored((prev) => mergeSettings({ ...mergeSettings(prev), ...patch }));
    },
    [setStored],
  );

  const resetSettings = useCallback(() => setStored(DEFAULT_SETTINGS), [setStored]);

  const formatters = useMemo(() => formattersFromSettings(settings), [settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, hydrated, formatters, updateSettings, resetSettings }),
    [settings, hydrated, formatters, updateSettings, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function useFormatters(): Formatters {
  return useSettings().formatters;
}
