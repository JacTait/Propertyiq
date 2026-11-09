"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SettingsProvider } from "@/hooks/useSettings";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
