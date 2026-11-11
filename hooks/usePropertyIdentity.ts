"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CountryCode, PropertyIdentity } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { isPropertyIdentity, resolvePropertyIdentity } from "@/lib/property-identity";
import { useLocalStorage } from "@/hooks/useLocalStorage";

function isStoredIdentity(value: unknown): value is PropertyIdentity {
  return isPropertyIdentity(value);
}

export function usePropertyIdentity(fallbackCountry: CountryCode = "US") {
  const [stored, setStored, hydrated] = useLocalStorage<PropertyIdentity | null>(
    STORAGE_KEYS.propertyIdentity,
    null,
    (value): value is PropertyIdentity | null => value === null || isStoredIdentity(value),
  );

  const identity = useMemo(() => {
    if (stored) return stored;
    if (!hydrated) return null;
    return resolvePropertyIdentity(fallbackCountry);
  }, [stored, hydrated, fallbackCountry]);

  const setIdentity = useCallback(
    (next: PropertyIdentity) => {
      if (!isPropertyIdentity(next)) return;
      setStored(next);
    },
    [setStored],
  );

  return { identity, setIdentity, hydrated };
}

/** Write identity fields from a live form into the shared record (unsaved workflows only). */
export function usePersistPropertyIdentity(identity: PropertyIdentity | null, enabled: boolean) {
  const { setIdentity } = usePropertyIdentity();
  const serialized = enabled && identity ? JSON.stringify(identity) : null;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!serialized) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setIdentity(JSON.parse(serialized) as PropertyIdentity);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [serialized, setIdentity]);
}
