"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnderwritingWarning } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function DealKillerList({ warnings }: { warnings: UnderwritingWarning[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal warnings</CardTitle>
      </CardHeader>
      <CardContent>
        {warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warnings on the current assumptions.</p>
        ) : (
          <ul className="space-y-3">
            {warnings.map((warning) => (
              <li key={warning.key}>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    warning.severity === "critical" && "text-destructive",
                    warning.severity === "warning" && "text-warning",
                  )}
                >
                  {warning.title}
                </p>
                <p className="text-xs text-muted-foreground">{warning.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
