export const PUBLIC_PATHS = ["/", "/access", "/privacy", "/terms"] as const;

export const PROTECTED_PATHS = [
  "/quick-underwrite",
  "/dashboard",
  "/max-offer",
  "/resilience",
  "/downside",
  "/portfolio",
  "/compare",
  "/settings",
] as const;

export const PROTECTED_API_PREFIXES = ["/api/access/status", "/api/access/logout"] as const;

export const DEFAULT_POST_ACCESS_PATH = "/quick-underwrite";

export const ACCESS_COOKIE_NAME = "propertyiq_access";

export const ACCESS_PATH_HEADER = "x-propertyiq-pathname";

export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

export function isPublicPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return PUBLIC_PATHS.some((publicPath) => path === publicPath);
}

export function isProtectedPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return PROTECTED_PATHS.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`));
}

export function isProtectedApiPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === "/api/access/verify" || path === "/api/access/support-reset") {
    return false;
  }
  if (path.startsWith("/api/access/")) {
    return true;
  }
  return path.startsWith("/api/") && !path.startsWith("/api/access/");
}

export function isSafeInternalPath(candidate: string): boolean {
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("://")) {
    return false;
  }
  if (candidate.includes("\\") || candidate.includes("\n") || candidate.includes("\r")) {
    return false;
  }
  const pathOnly = candidate.split("?")[0] ?? candidate;
  return isProtectedPath(pathOnly);
}

export function safeRedirectPath(from: string | null | undefined): string {
  if (!from || !isSafeInternalPath(from)) {
    return DEFAULT_POST_ACCESS_PATH;
  }
  return from;
}

export function accessRedirectUrl(fromPath: string, reason?: AccessRedirectReason): string {
  const params = new URLSearchParams();
  params.set("from", fromPath);
  if (reason) params.set("reason", reason);
  return `/access?${params.toString()}`;
}

export type AccessRedirectReason = "required" | "disabled" | "expired";
