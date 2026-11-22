import { NextResponse } from "next/server";
import { handleWhopWebhookRequest } from "@/lib/auth/whop";

// Node.js is the App Router Route Handler default. `export const runtime`
// is incompatible with cacheComponents in this Next.js version.

export async function POST(request: Request) {
  const result = await handleWhopWebhookRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}
