import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessSessionRefresher } from "@/components/access/access-session-refresher";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requirePropertyIqAccess } from "@/lib/auth/propertyiq-access";
import { ACCESS_PATH_HEADER, DEFAULT_POST_ACCESS_PATH, accessRedirectUrl } from "@/lib/auth/routes";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <GuardedAppShell>{children}</GuardedAppShell>
    </Suspense>
  );
}

async function GuardedAppShell({ children }: { children: ReactNode }) {
  await connection();
  const access = await requirePropertyIqAccess({ revalidate: "if_stale" });
  if (!access.ok) {
    const headerList = await headers();
    const from = headerList.get(ACCESS_PATH_HEADER) ?? DEFAULT_POST_ACCESS_PATH;
    const reason = access.reason === "disabled" ? "disabled" : access.reason === "expired" ? "expired" : "required";
    redirect(accessRedirectUrl(from, reason));
  }

  return (
    <div className="flex min-h-screen w-full">
      {access.needsRefresh ? <AccessSessionRefresher /> : null}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function AppShellFallback() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden w-[240px] border-r border-border bg-card md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-border" />
        <main className="relative flex-1 px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
        </main>
      </div>
    </div>
  );
}
