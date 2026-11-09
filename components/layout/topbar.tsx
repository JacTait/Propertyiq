"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useSettings } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.href));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        <Logo compact />
        <span className="text-sm font-semibold">{current?.label ?? "PropertyIQ"}</span>
      </div>
      <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
        <span>PropertyIQ</span>
        <span>/</span>
        <span className="font-medium text-foreground">{current?.label ?? "Home"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="muted" className="hidden sm:inline-flex">
          {settings.currency}
        </Badge>
        <ThemeToggle />
      </div>
    </header>
  );
}
