import { NextResponse } from "next/server";
import { renewAccessSession } from "@/lib/auth/propertyiq-access";

export async function POST() {
  const access = await renewAccessSession({});
  if (!access.ok) {
    const error = access.reason === "disabled" ? "disabled" : access.reason === "expired" ? "expired" : "required";
    return NextResponse.json({ ok: false, error }, { status: 401 });
  }

  return NextResponse.json({ ok: true, status: access.session.status });
}
