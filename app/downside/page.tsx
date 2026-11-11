import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { DownsideSkeleton, DownsideView } from "@/components/downside/downside-view";

export const metadata: Metadata = { title: "Downside Analysis" };

export default function DownsidePage() {
  return (
    <AppShell>
      <PageTransition>
        <Suspense fallback={<DownsideSkeleton />}>
          <DownsideView />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
