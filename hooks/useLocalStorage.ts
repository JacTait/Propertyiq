"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import { isBrowser, writeStorage } from "@/lib/utils/storage";

const STORAGE_EVENT = "propertyiq:storage";

/** Snapshot cache keyed by storage key so identical raw strings yield stable references. */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function readSnapshot<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  const raw = isBrowser() ? window.localStorage.getItem(key) : null;
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;

  let value: T = fallback;
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!validate || validate(parsed)) value = parsed as T;
    } catch {
      value = fallback;
    }
  }
  snapshotCache.set(key, { raw, value });
  return value;
}

function subscribe(key: string, callback: () => void): () => void {
  const custom = (event: Event) => {
    const detail = (event as CustomEvent<{ key: string }>).detail;
    if (!detail || detail.key === key) callback();
  };
  const native = (event: StorageEvent) => {
    if (event.key === null || event.key === key) callback();
  };
  window.addEventListener(STORAGE_EVENT, custom);
  window.addEventListener("storage", native);
  return () => {
    window.removeEventListener(STORAGE_EVENT, custom);
    window.removeEventListener("storage", native);
  };
}

const noopSubscribe = () => () => undefined;

/** True once rendering on the client (false during SSR and hydration). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * SSR-safe localStorage state built on useSyncExternalStore.
 * Returns the fallback on the server and hydrates to the stored value on the client.
 */
export function useLocalStorage<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const fallbackRef = useRef(fallback);
  const validateRef = useRef(validate);

  const value = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(key, cb), [key]),
    () => readSnapshot(key, fallbackRef.current, validateRef.current),
    () => fallbackRef.current,
  );
  const hydrated = useHydrated();

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = readSnapshot(key, fallbackRef.current, validateRef.current);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(current) : next;
      writeStorage(key, resolved);
    },
    [key],
  );

  return [value, update, hydrated];
}
