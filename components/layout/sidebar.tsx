"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_VERSION } from "@/lib/constants";
import { NAV_GROUPS } from "@/components/layout/nav-items";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Logo href="/quick-underwrite" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4 scrollbar-thin">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className="space-y-0.5">
            {group.label && (
              <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {active ? <span className="absolute inset-y-1 left-0 w-px bg-primary" aria-hidden /> : null}
                  <Icon className="size-[17px]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-3">
        <ThemeToggle />
        <Link
          href="/settings"
          className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </Link>
        <span className="font-figure text-[10px] tabular-nums text-muted-foreground">v{APP_VERSION}</span>
      </div>
    </aside>
  );
}
