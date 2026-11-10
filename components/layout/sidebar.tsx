"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_GROUPS } from "@/components/layout/nav-items";
import { Logo } from "@/components/layout/logo";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar/80 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-primary/12 ring-1 ring-primary/30"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative size-[18px] transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="relative flex flex-col leading-tight">
                    <span>{item.label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4">
        <div className="glass relative overflow-hidden rounded-2xl p-4">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/25 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Analyst Engine</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Deal scoring, projections and AI-style summaries run locally in your browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
