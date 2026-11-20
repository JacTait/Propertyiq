import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_ERROR_MESSAGES,
  activateAccess,
  clientErrorReason,
} from "@/lib/auth/propertyiq-access";
import { clientKeyFromRequest, licenceVerifyLimiter } from "@/lib/auth/rate-limit";

const VerifyBodySchema = z.object({
  email: z.string().min(1).max(320),
  licenceKey: z.string().min(1).max(128),
  from: z.string().max(500).optional(),
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

  const parsed = VerifyBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid", message: ACCESS_ERROR_MESSAGES.invalid },
      { status: 400 },
    );
  }

  const result = await activateAccess({
    email: parsed.data.email,
    licenceKey: parsed.data.licenceKey,
    from: parsed.data.from,
  });

  if (!result.ok) {
    const error = clientErrorReason(result.reason);
    const status = error === "network" ? 503 : 403;
    return NextResponse.json(
      { ok: false, error, message: ACCESS_ERROR_MESSAGES[error] },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: result.redirectTo,
    status: result.session.status,
  });
}
