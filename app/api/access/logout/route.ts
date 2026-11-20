import { NextResponse } from "next/server";
import { logoutAccess } from "@/lib/auth/propertyiq-access";

export async function POST() {
  await logoutAccess({});
  return NextResponse.json({ ok: true });
}
