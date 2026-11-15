import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyDataState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start border border-dashed border-border bg-card px-5 py-10", className)}>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <h3 className="mt-3 font-heading text-lg font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function NoLiveDataNotice({ className }: { className?: string }) {
  return (
    <p className={cn("border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground", className)}>
      No live neighbourhood data is connected. Figures come from the assumptions you enter.
    </p>
  );
}
