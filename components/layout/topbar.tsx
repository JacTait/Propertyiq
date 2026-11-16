"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { CurrentDealIndicator } from "@/components/layout/current-deal-indicator";
import { useSettings } from "@/hooks/useSettings";

export function Topbar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <MobileNav />
        <Logo compact href="/quick-underwrite" />
        <span className="truncate text-sm font-medium">{current?.label ?? "PropertyIQ"}</span>
      </div>
      <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground lg:flex">
        <span>PropertyIQ</span>
        <span className="text-border-strong">/</span>
        <span className="font-medium text-foreground">{current?.label ?? "Home"}</span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-3">
        <CurrentDealIndicator />
        <span className="hidden font-figure text-xs tabular-nums text-muted-foreground sm:inline">{settings.currency}</span>
      </div>
    </header>
  );
}
