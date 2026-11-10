import { Suspense } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { MaxOfferView, MaxOfferSkeleton } from "@/components/max-offer/max-offer-view";

export const metadata: Metadata = { title: "Max Offer" };

export default function MaxOfferPage() {
  return (
    <AppShell>
      <PageTransition>
        <Suspense fallback={<MaxOfferSkeleton />}>
          <MaxOfferView />
        </Suspense>
      </PageTransition>
    </AppShell>
  );
}
