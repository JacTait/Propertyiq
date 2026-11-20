import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessScreen, AccessScreenSkeleton } from "@/components/access/access-screen";
import { requirePropertyIqAccess } from "@/lib/auth/propertyiq-access";
import { DEFAULT_POST_ACCESS_PATH, safeRedirectPath } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Access PropertyIQ" };

export default function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>;
}) {
  return (
    <Suspense fallback={<AccessScreenSkeleton />}>
      <AccessPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AccessPageBody({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const access = await requirePropertyIqAccess({ revalidate: false });
  if (access.ok && params.reason !== "disabled") {
    redirect(safeRedirectPath(params.from) || DEFAULT_POST_ACCESS_PATH);
  }

  return <AccessScreen />;
}
