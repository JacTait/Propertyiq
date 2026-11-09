import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { CompareView } from "@/components/portfolio/compare-view";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <AppShell>
      <PageTransition>
        <CompareView />
      </PageTransition>
    </AppShell>
  );
}
