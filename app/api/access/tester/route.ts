import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_ERROR_MESSAGES } from "@/lib/auth/messages";
import { activateTesterAccess } from "@/lib/auth/propertyiq-access";
import { clientKeyFromRequest, licenceVerifyLimiter } from "@/lib/auth/rate-limit";

const TesterBodySchema = z.object({
  testerCode: z.string().min(1).max(64),
  email: z.string().max(320).optional(),
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
      { ok: false, error: "tester", message: ACCESS_ERROR_MESSAGES.tester },
      { status: 400 },
    );
  }

  const parsed = TesterBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "tester", message: ACCESS_ERROR_MESSAGES.tester },
      { status: 400 },
    );
  }

  const result = await activateTesterAccess({
    testerCode: parsed.data.testerCode,
    email: parsed.data.email,
    from: parsed.data.from,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "tester", message: ACCESS_ERROR_MESSAGES.tester },
      { status: result.reason === "network" || result.reason === "misconfigured" ? 503 : 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    redirectTo: result.redirectTo,
    status: result.session.status,
  });
}
