export function stableEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function writeJsonIfChanged(key: string, value: unknown, write: (key: string, next: unknown) => void): boolean {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return false;
  const serialized = JSON.stringify(value);
  if (window.localStorage.getItem(key) === serialized) return false;
  write(key, value);
  return true;
}
