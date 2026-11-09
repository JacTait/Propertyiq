"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";

export function ThemeToggle() {
  const { updateSettings } = useSettings();
  const { resolvedTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      onClick={() => updateSettings({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
      className="relative overflow-hidden"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
