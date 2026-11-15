import type { DealKillerSeverity, UnderwritingWarning } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const LABEL: Record<DealKillerSeverity, string> = {
  critical: "Critical",
  warning: "Attention",
  info: "Information",
};

const TONE: Record<DealKillerSeverity, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
};

export function RiskWarningList({
  warnings,
  className,
  title = "Warnings",
}: {
  warnings: UnderwritingWarning[];
  className?: string;
  title?: string;
}) {
  const ordered = [...warnings].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity];
  });

  return (
    <section className={cn("border border-border bg-card rounded-lg px-4 py-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      {ordered.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No warnings on the current assumptions.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {ordered.map((warning) => (
            <li key={warning.key} className="border-t border-border pt-3 first:border-0 first:pt-0">
              <p className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", TONE[warning.severity])}>
                {LABEL[warning.severity]}
              </p>
              <p className="mt-1 text-sm font-medium">{warning.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{warning.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
