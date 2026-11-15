import { cn } from "@/lib/utils/cn";

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
}

export function ScoreBreakdown({
  title = "Deal Survival",
  score,
  grade,
  components,
  primaryRisk,
  className,
}: {
  title?: string;
  score: number;
  grade?: string;
  components: ScoreComponent[];
  primaryRisk?: string;
  className?: string;
}) {
  const tone = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive";
  const bar = score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive";

  return (
    <section className={cn("border border-border bg-card rounded-lg px-4 py-3", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={cn("font-figure text-[40px] font-medium leading-none tabular-nums", tone)}>
          {Math.round(score)}
          <span className="ml-1 text-base text-muted-foreground">/ 100</span>
        </p>
        {grade ? <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{grade}</p> : null}
      </div>
      <div className="mt-3 h-1 bg-muted">
        <div className={cn("h-full", bar)} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {components.map((component) => (
          <li key={component.key} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{component.label}</span>
                <span className="font-figure tabular-nums text-xs">{Math.round(component.score)}</span>
              </div>
              <div className="h-px bg-muted">
                <div
                  className={cn(
                    "h-px",
                    component.score >= 80 ? "bg-success" : component.score >= 60 ? "bg-warning" : "bg-destructive",
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, component.score))}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {primaryRisk ? (
        <p className="mt-4 border-t border-border pt-3 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Primary risk</span>
          <span className="mt-1 block">{primaryRisk}</span>
        </p>
      ) : null}
    </section>
  );
}
