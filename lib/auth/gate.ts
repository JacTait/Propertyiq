import {
  ACCESS_COOKIE_NAME,
  accessRedirectUrl,
  isProtectedApiPath,
  isProtectedPath,
} from "@/lib/auth/routes";
import { parseAccessSession } from "@/lib/auth/session";

export type AccessGateResult =
  | { action: "allow"; pathname: string }
  | { action: "redirect"; location: string }
  | { action: "unauthorized"; reason: "required" | "expired" };

export function resolveAccessGate(
  pathname: string,
  search = "",
  token?: string,
  now = Date.now(),
): AccessGateResult {
  const destination = `${pathname}${search}`;
  const session = parseAccessSession(token, now);

  if (isProtectedPath(pathname)) {
    if (!session.ok) {
      const reason = session.reason === "expired" ? "expired" : "required";
      return { action: "redirect", location: accessRedirectUrl(destination, reason) };
    }
    return { action: "allow", pathname };
  }

  if (isProtectedApiPath(pathname) && !session.ok) {
    return { action: "unauthorized", reason: session.reason === "expired" ? "expired" : "required" };
  }

  return { action: "allow", pathname };
}

export function accessCookieFromHeader(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ACCESS_COOKIE_NAME) return rest.join("=");
  }
  return undefined;
}
