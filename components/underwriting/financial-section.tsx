import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function FinancialSection({
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  featured = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <section
      className={cn(
        "border border-border bg-card",
        featured ? "rounded-[10px]" : "rounded-lg",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h2 className="font-heading text-[17px] font-medium leading-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="px-4 py-3 sm:px-5">{children}</div>
    </section>
  );
}

export function SectionDivider({ className }: { className?: string }) {
  return <div className={cn("my-1 h-px bg-border", className)} role="separator" />;
}
