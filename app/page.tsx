import type { Metadata } from "next";
import { LandingPage } from "@/components/layout/landing-page";

export const metadata: Metadata = {
  title: "PropertyIQ — AI-Powered Property Investment Analysis",
};

export default function HomePage() {
  return <LandingPage />;
}
