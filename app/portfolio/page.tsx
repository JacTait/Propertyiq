import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { PortfolioView } from "@/components/portfolio/portfolio-view";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <AppShell>
      <PageTransition>
        <PortfolioView />
      </PageTransition>
    </AppShell>
  );
}
