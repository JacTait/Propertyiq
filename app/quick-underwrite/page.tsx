import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { QuickUnderwritePage, QuickUnderwriteSkeleton } from "@/components/quick-underwrite/quick-underwrite-page";

export const metadata: Metadata = { title: "Quick Underwrite" };

export default function QuickUnderwriteRoute() {
  return (
    <AppShell>
      <PageTransition>
        <Suspense fallback={<QuickUnderwriteSkeleton />}>
          <QuickUnderwritePage />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
