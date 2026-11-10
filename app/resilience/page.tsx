import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { ResilienceSkeleton, ResilienceView } from "@/components/resilience/resilience-view";

export const metadata: Metadata = { title: "Deal Resilience" };

export default function ResiliencePage() {
  return (
    <AppShell>
      <PageTransition>
        <Suspense fallback={<ResilienceSkeleton />}>
          <ResilienceView />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
