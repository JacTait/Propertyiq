"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  height?: number;
}

export function ChartCard({ title, description, children, className, action, height = 280 }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("h-full", className)}
    >
      <Card className="flex h-full flex-col">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-sm">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
        <CardContent className="flex-1">
          <div style={{ height }} className="w-full">
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export const CHART_THEME = {
  grid: "var(--chart-grid)",
  text: "var(--chart-text)",
  tooltip: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.4)",
  },
  tooltipLabel: { color: "var(--muted-foreground)", fontWeight: 600, marginBottom: 4 },
} as const;
