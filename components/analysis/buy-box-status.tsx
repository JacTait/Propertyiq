"use client";

import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import type { BuyBoxMatch } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function BuyBoxStatusCard({
  match,
  listingNote,
}: {
  match: BuyBoxMatch;
  listingNote?: string;
}) {
  const inside = match.status === "inside";
  const none = match.status === "no-profile";
  const Icon = none ? CircleDashed : inside ? CheckCircle2 : CircleAlert;

  return (
    <Card
      className={cn(
        "overflow-hidden",
        inside && "border-success/30",
        match.status === "outside" && "border-destructive/30",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              inside && "bg-success/15 text-success",
              match.status === "outside" && "bg-destructive/15 text-destructive",
              none && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buy Box</p>
              {match.profileName && <Badge variant="muted">{match.profileName}</Badge>}
            </div>
            <p
              className={cn(
                "mt-0.5 text-base font-bold",
                inside && "text-success",
                match.status === "outside" && "text-destructive",
              )}
            >
              {none ? "No active Buy Box" : inside ? "Inside Buy Box" : "Outside Buy Box"}
            </p>
            {listingNote ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{listingNote}</p> : null}
            <ul className="mt-2 space-y-1">
              {match.reasons.map((reason) => (
                <li
                  key={reason.key}
                  className={cn(
                    "text-xs",
                    reason.tone === "fail" && "text-destructive",
                    reason.tone === "warn" && "text-warning",
                    reason.tone === "pass" && "text-muted-foreground",
                  )}
                >
                  {reason.tone === "fail" ? "✗ " : reason.tone === "pass" ? "✓ " : "• "}
                  {reason.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
