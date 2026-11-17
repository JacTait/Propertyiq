"use client";

import { useEffect, useRef } from "react";

/** Debounce draft writes, then flush the latest value on unmount so route changes keep data. */
export function useDebouncedDraftSync<T>(
  value: T,
  onChange: (value: T) => void,
  delay = 400,
  persistImmediately?: () => void,
): void {
  const latest = useRef(value);
  const onChangeRef = useRef(onChange);
  const persistRef = useRef(persistImmediately);

  useEffect(() => {
    latest.current = value;
    onChangeRef.current = onChange;
    persistRef.current = persistImmediately;
  }, [value, onChange, persistImmediately]);

  useEffect(() => {
    const id = setTimeout(() => onChangeRef.current(latest.current), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  useEffect(
    () => () => {
      onChangeRef.current(latest.current);
      persistRef.current?.();
    },
    [],
  );
}
