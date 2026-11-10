import { BarChart3, Briefcase, GitCompareArrows, Settings, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: "/dashboard" | "/portfolio" | "/compare" | "/max-offer" | "/settings";
  label: string;
  short?: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Analyse a property", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", description: "Saved analyses", icon: Briefcase },
  { href: "/compare", label: "Compare", description: "Side-by-side deals", icon: GitCompareArrows },
  { href: "/max-offer", label: "Max Offer", short: "Offer", description: "Maximum allowable bid", icon: Target },
  { href: "/settings", label: "Settings", description: "Preferences", icon: Settings },
];
