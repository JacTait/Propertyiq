import type { Metadata } from "next";
import { LandingPage } from "@/components/layout/landing-page";

export const metadata: Metadata = {
  title: "PropertyIQ — Know your number before you make the offer.",
};

export default function HomePage() {
  return <LandingPage />;
}
