import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";

export interface OfferRangeProps {
  excellent?: number | null;
  target?: number | null;
  maximum?: number | null;
  currentAsk?: number | null;
  proposedOffer?: number | null;
  className?: string;
  orientation?: "vertical" | "horizontal";
}

function position(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export function OfferRange({
  excellent,
  target,
  maximum,
  currentAsk,
  proposedOffer,
  className,
  orientation = "vertical",
}: OfferRangeProps) {
  const fmt = useFormatters();
  const marks = [
    excellent != null && excellent > 0 ? { key: "excellent", label: "Excellent", value: excellent, tone: "text-success" } : null,
    target != null && target > 0 ? { key: "target", label: "Target", value: target, tone: "text-primary" } : null,
    maximum != null && maximum > 0 ? { key: "maximum", label: "Maximum", value: maximum, tone: "text-warning" } : null,
    currentAsk != null && currentAsk > 0 ? { key: "ask", label: "Current Ask", value: currentAsk, tone: "text-foreground" } : null,
    proposedOffer != null && proposedOffer > 0
      ? { key: "offer", label: "Proposed Offer", value: proposedOffer, tone: "text-foreground" }
      : null,
  ].filter((item): item is { key: string; label: string; value: number; tone: string } => Boolean(item));

  if (marks.length === 0) {
    return (
      <div className={cn("border border-border bg-card rounded-lg px-4 py-3", className)}>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Offer Range</p>
        <p className="mt-2 text-sm text-muted-foreground">Enter rent, ARV and return targets to calculate an offer range.</p>
      </div>
    );
  }

  const values = marks.map((m) => m.value);
  const ceiling = maximum && maximum > 0 ? maximum * 1.18 : Math.max(...values) * 1.08;
  const floor = Math.min(...values, excellent && excellent > 0 ? excellent * 0.92 : Math.min(...values) * 0.92);
  const ask = currentAsk && currentAsk > 0 ? currentAsk : proposedOffer;
  const overMax = maximum != null && maximum > 0 && ask != null && ask > maximum;

  return (
    <div className={cn("border border-border bg-card rounded-lg px-4 py-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">PropertyIQ Offer Range</p>
      <div className={cn("mt-3", orientation === "horizontal" ? "space-y-3" : "grid gap-4 sm:grid-cols-[1fr_auto]")}>
        <div className="relative h-2 rounded-sm bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-sm bg-success/70" style={{ width: `${position(excellent ?? floor, floor, ceiling)}%` }} />
          <div
            className="absolute inset-y-0 rounded-sm bg-primary/80"
            style={{
              left: `${position(excellent ?? floor, floor, ceiling)}%`,
              width: `${Math.max(2, position(target ?? maximum ?? ceiling, floor, ceiling) - position(excellent ?? floor, floor, ceiling))}%`,
            }}
          />
          <div
            className="absolute inset-y-0 rounded-sm bg-warning/80"
            style={{
              left: `${position(target ?? excellent ?? floor, floor, ceiling)}%`,
              width: `${Math.max(2, position(maximum ?? ceiling, floor, ceiling) - position(target ?? excellent ?? floor, floor, ceiling))}%`,
            }}
          />
          {overMax ? (
            <div
              className="absolute inset-y-0 rounded-sm bg-destructive/80"
              style={{
                left: `${position(maximum ?? floor, floor, ceiling)}%`,
                width: `${Math.max(2, position(ask ?? ceiling, floor, ceiling) - position(maximum ?? floor, floor, ceiling))}%`,
              }}
            />
          ) : null}
          {ask != null && ask > 0 ? (
            <span
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-background bg-foreground"
              style={{ left: `${position(ask, floor, ceiling)}%` }}
              aria-hidden
            />
          ) : null}
        </div>
        <ul className="space-y-1.5">
          {marks.map((mark) => (
            <li key={mark.key} className="flex items-baseline justify-between gap-6 text-sm">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{mark.label}</span>
              <span className={cn("font-figure tabular-nums", mark.tone)}>{fmt.currency(mark.value)}</span>
            </li>
          ))}
        </ul>
      </div>
      {overMax && ask != null && maximum != null ? (
        <p className="mt-3 text-xs text-destructive">
          The current asking price exceeds the maximum offer by {fmt.currency(ask - maximum)}.
        </p>
      ) : null}
    </div>
  );
}
