import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTesterAdmin, createTesterCodeForAdmin, listTesterCodesForAdmin } from "@/lib/auth/tester-admin";
import { getTesterCodeStore } from "@/lib/db/tester-store";

const CreateBodySchema = z.object({
  label: z.string().min(1).max(200),
  days: z.number().int().min(1).max(365).optional(),
  expiresAt: z.string().min(1).optional(),
  maximumActivations: z.number().int().min(1).max(100).optional(),
  emailRestriction: z.string().email().max(320).optional(),
  notes: z.string().max(2000).optional(),
});

function adminError(status: "misconfigured" | "unauthorized") {
  if (status === "misconfigured") {
    return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 503 });
  }
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const auth = authorizeTesterAdmin(request);
  if (auth !== "ok") return adminError(auth);

  const codes = await listTesterCodesForAdmin(getTesterCodeStore());
  return NextResponse.json({ ok: true, codes });
}

export async function POST(request: Request) {
  const auth = authorizeTesterAdmin(request);
  if (auth !== "ok") return adminError(auth);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = CreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const now = Date.now();
  const expiresAt = parsed.data.expiresAt
    ? Date.parse(parsed.data.expiresAt)
    : now + (parsed.data.days ?? 7) * 24 * 60 * 60 * 1000;

  const created = await createTesterCodeForAdmin(getTesterCodeStore(), {
    label: parsed.data.label,
    expiresAt,
    maximumActivations: parsed.data.maximumActivations,
    emailRestriction: parsed.data.emailRestriction,
    notes: parsed.data.notes,
    now,
  });

  return NextResponse.json({
    ok: true,
    code: created.code,
    record: created.record,
    warning: "Copy this code now. It will not be shown again.",
  });
}
