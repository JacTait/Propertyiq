import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { AnalysisDashboard, AnalysisDashboardSkeleton } from "@/components/dashboard/analysis-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <AppShell>
      <PageTransition>
        <Suspense fallback={<AnalysisDashboardSkeleton />}>
          <AnalysisDashboard />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
