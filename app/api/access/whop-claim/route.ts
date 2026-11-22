import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import { claimWhopLicence } from "@/lib/auth/whop";
import { clientKeyFromRequest, licenceVerifyLimiter } from "@/lib/auth/rate-limit";

const ClaimBodySchema = z.object({
  email: z.string().min(1).max(320),
  paymentId: z.string().min(4).max(80),
});

export async function POST(request: Request) {
  const limit = licenceVerifyLimiter.consume(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: ACCESS_ERROR_MESSAGES.rate_limited },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid", message: ACCESS_ERROR_MESSAGES.invalid },
      { status: 400 },
    );
  }

  const parsed = ClaimBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid", message: ACCESS_ERROR_MESSAGES.invalid },
      { status: 400 },
    );
  }

  try {
    const { getPurchasedLicenceStore } = await import("@/lib/db/purchased-licence-store");
    const result = await claimWhopLicence(parsed.data.email, parsed.data.paymentId, getPurchasedLicenceStore());
    if (!result.ok) {
      const error = result.reason === "disabled" ? "disabled" : result.reason === "network" || result.reason === "misconfigured" ? "network" : "invalid";
      return NextResponse.json(
        { ok: false, error, message: ACCESS_ERROR_MESSAGES[error] },
        { status: error === "network" ? 503 : 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      licenceKey: result.licenceKey,
      email: result.email,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "network", message: ACCESS_ERROR_MESSAGES.network },
      { status: 503 },
    );
  }
}
