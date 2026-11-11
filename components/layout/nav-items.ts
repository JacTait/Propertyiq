import { BarChart3, Briefcase, GitCompareArrows, Settings, Shield, Target, Umbrella, type LucideIcon } from "lucide-react";

export type NavHref = "/dashboard" | "/portfolio" | "/compare" | "/max-offer" | "/resilience" | "/downside" | "/settings";

export interface NavItem {
  href: NavHref;
  label: string;
  short?: string;
  description: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Analysis",
    items: [
      { href: "/dashboard", label: "Standard Analysis", short: "Analyse", description: "Full deal underwrite", icon: BarChart3 },
      { href: "/max-offer", label: "Max Offer", short: "Offer", description: "Maximum allowable bid", icon: Target },
      { href: "/resilience", label: "Deal Resilience", short: "Stress", description: "Stress-test the deal", icon: Shield },
      { href: "/downside", label: "Downside Analysis", short: "Downside", description: "Deal survival under stress", icon: Umbrella },
    ],
  },
  {
    items: [
      { href: "/portfolio", label: "Portfolio", description: "Saved analyses", icon: Briefcase },
      { href: "/compare", label: "Compare", description: "Side-by-side deals", icon: GitCompareArrows },
      { href: "/settings", label: "Settings", description: "Preferences & buy box", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
