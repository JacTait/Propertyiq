import { NextResponse } from "next/server";
import { z } from "zod";
import { decreaseLicenceUsage, maskLicenceIdentifier } from "@/lib/auth/propertyiq-access";

const BodySchema = z.object({
  licenceKey: z.string().min(1).max(128),
});

function supportToken(): string {
  const value = process.env.PROPERTYIQ_SUPPORT_RESET_TOKEN;
  return typeof value === "string" ? value.trim() : "";
}

function incomingToken(request: Request): string {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length).trim();
  return request.headers.get("x-propertyiq-support-token")?.trim() ?? "";
}

export async function POST(request: Request) {
  const expected = supportToken();
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  if (incomingToken(request) !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const result = await decreaseLicenceUsage(parsed.data.licenceKey);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  console.info("[propertyiq-access] support_usage_decreased", {
    licence: maskLicenceIdentifier(parsed.data.licenceKey),
  });

  return NextResponse.json({
    ok: true,
    licenceMask: maskLicenceIdentifier(parsed.data.licenceKey),
    uses: result.record.uses,
  });
}
