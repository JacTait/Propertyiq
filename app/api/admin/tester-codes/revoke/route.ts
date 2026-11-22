import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeTesterAdmin, revokeTesterCodeForAdmin } from "@/lib/auth/tester-admin";
import { publicTesterCode } from "@/lib/auth/tester-codes";
import { getTesterCodeStore } from "@/lib/db/tester-store";

const RevokeBodySchema = z.object({
  id: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const auth = authorizeTesterAdmin(request);
  if (auth === "misconfigured") {
    return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 503 });
  }
  if (auth !== "ok") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = RevokeBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const record = await revokeTesterCodeForAdmin(getTesterCodeStore(), parsed.data.id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, record: publicTesterCode(record) });
}
