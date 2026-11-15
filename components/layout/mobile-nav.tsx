"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_VERSION } from "@/lib/constants";
import { NAV_GROUPS } from "@/components/layout/nav-items";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,280px)] flex-col border-r border-border bg-sidebar">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Logo href="/quick-underwrite" />
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
              {NAV_GROUPS.map((group, index) => (
                <div key={group.label ?? `group-${index}`} className="space-y-0.5">
                  {group.label ? (
                    <p className="px-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </p>
                  ) : null}
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "relative flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm",
                          active ? "bg-surface-3 text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {active ? <span className="absolute inset-y-1 left-0 w-px bg-primary" aria-hidden /> : null}
                        <Icon className="size-[17px]" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="flex items-center justify-between border-t border-border px-3 py-3">
              <ThemeToggle />
              <span className="font-figure text-[10px] tabular-nums text-muted-foreground">v{APP_VERSION}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
