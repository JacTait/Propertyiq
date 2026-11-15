import { cn } from "@/lib/utils/cn";

export type StatusLevel = "pass" | "fail" | "warn" | "info" | "neutral";

const COPY: Record<StatusLevel, { mark: string; label: string; className: string }> = {
  pass: { mark: "✓", label: "Pass", className: "text-success bg-[var(--success-muted)]" },
  fail: { mark: "✕", label: "Fail", className: "text-destructive bg-[var(--danger-muted)]" },
  warn: { mark: "!", label: "Attention", className: "text-warning bg-[var(--warning-muted)]" },
  info: { mark: "i", label: "Information", className: "text-muted-foreground bg-muted" },
  neutral: { mark: "–", label: "Neutral", className: "text-muted-foreground bg-muted" },
};

export function StatusIndicator({
  level,
  children,
  className,
}: {
  level: StatusLevel;
  children?: string;
  className?: string;
}) {
  const meta = COPY[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        meta.className,
        className,
      )}
    >
      <span aria-hidden>{meta.mark}</span>
      <span>{children ?? meta.label}</span>
    </span>
  );
}

export function DecisionStatus({
  verdict,
  label,
  className,
}: {
  verdict: "worth-pursuing" | "investigate" | "walk-away" | "insufficient-data" | string;
  label: string;
  className?: string;
}) {
  const level: StatusLevel =
    verdict === "worth-pursuing"
      ? "pass"
      : verdict === "investigate"
        ? "warn"
        : verdict === "walk-away"
          ? "fail"
          : "neutral";
  const color =
    level === "pass"
      ? "text-success"
      : level === "warn"
        ? "text-warning"
        : level === "fail"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Decision</p>
      <p className={cn("mt-1 font-heading text-2xl font-medium leading-tight sm:text-[28px]", color)}>{label}</p>
    </div>
  );
}
