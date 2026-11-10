"use client";

import { TriangleAlert } from "lucide-react";
import type { DealKillerWarning } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DealKillerList({ warnings }: { warnings: DealKillerWarning[] }) {
  if (warnings.length === 0) {
    return (
      <Card className="border-success/30">
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-success">No deal-killer flags on the current underwrite.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rent, rehab, refinance and stress cashflow all clear the automated gates.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert className="size-4 text-warning" /> Deal killer warnings
        </CardTitle>
        <CardDescription>Automated alerts from rent, rehab, refinance and stress tests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map((warning) => (
          <div
            key={warning.key}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              warning.severity === "critical" && "border-destructive/30 bg-destructive/8",
              warning.severity === "warning" && "border-warning/30 bg-warning/8",
              warning.severity === "info" && "border-border bg-muted/30",
            )}
          >
            <p className="text-sm font-semibold">⚠ {warning.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{warning.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
