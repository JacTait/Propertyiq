import type { BuyBoxMatch } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { StatusIndicator } from "@/components/underwriting/status-indicator";

export function BuyBoxBreakdown({ match, className }: { match: BuyBoxMatch; className?: string }) {
  const passed = match.reasons.filter((r) => r.tone === "pass").length;
  const total = match.reasons.length;
  const none = match.status === "no-profile";

  return (
    <section className={cn("border border-border bg-card rounded-lg px-4 py-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Buy Box</p>
          <p className="mt-1 font-heading text-lg font-medium">
            {none ? "No active Buy Box" : (match.profileName ?? "Buy Box")}
          </p>
        </div>
        <StatusIndicator level={none ? "neutral" : match.inside ? "pass" : "fail"}>
          {none ? "Not set" : match.inside ? "Pass" : "Outside"}
        </StatusIndicator>
      </div>
      {none ? (
        <p className="mt-2 text-sm text-muted-foreground">Select or create a Buy Box in Settings to check every deal against your criteria.</p>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            {passed} of {total} criteria matched
          </p>
          <ul className="mt-3 space-y-1.5">
            {match.reasons.map((reason) => (
              <li
                key={reason.key}
                className={cn(
                  "flex gap-2 text-sm",
                  reason.tone === "fail" && "text-destructive",
                  reason.tone === "warn" && "text-warning",
                  reason.tone === "pass" && "text-muted-foreground",
                )}
              >
                <span className="font-figure w-3 shrink-0" aria-hidden>
                  {reason.tone === "fail" ? "✕" : reason.tone === "pass" ? "✓" : "!"}
                </span>
                <span>{reason.message}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
