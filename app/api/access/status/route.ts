import { NextResponse } from "next/server";
import { getAccessSession, publicAccessStatus } from "@/lib/auth/propertyiq-access";

export async function GET() {
  const access = await getAccessSession({ revalidate: "if_stale" });
  if (!access.ok) {
    const reason = access.reason === "disabled" ? "disabled" : "required";
    return NextResponse.json({ ok: false, error: reason }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    ...publicAccessStatus(access.session),
  });
}
