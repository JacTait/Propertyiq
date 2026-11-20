import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_PATH_HEADER } from "@/lib/auth/routes";
import { resolveAccessGate } from "@/lib/auth/gate";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const gate = resolveAccessGate(pathname, search, token);

  if (gate.action === "redirect") {
    return NextResponse.redirect(new URL(gate.location, request.url));
  }

  if (gate.action === "unauthorized") {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set(ACCESS_PATH_HEADER, `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/quick-underwrite/:path*",
    "/dashboard/:path*",
    "/max-offer/:path*",
    "/resilience/:path*",
    "/downside/:path*",
    "/portfolio/:path*",
    "/compare/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
