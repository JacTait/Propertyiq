"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

export type SectionStatus = "ready" | "review" | "empty";

interface WorkspaceSectionProps {
  id: string;
  number: string;
  title: string;
  description: string;
  status?: SectionStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

const STATUS_LABEL: Record<SectionStatus, string> = {
  ready: "Ready",
  review: "In progress",
  empty: "Needs input",
};

export function WorkspaceSection({
  id,
  number,
  title,
  description,
  status = "review",
  open,
  onOpenChange,
  children,
}: WorkspaceSectionProps) {
  const panelId = `${id}-panel`;
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-border bg-card shadow-sm shadow-black/5 dark:shadow-black/30">
      <h2 className="text-base font-semibold">
        <button
          type="button"
          className="flex w-full items-start gap-3 px-5 py-4 text-left sm:px-6"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onOpenChange(!open)}
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary">
            {number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold tracking-tight">{title}</span>
              <Badge variant={status === "ready" ? "success" : status === "empty" ? "muted" : "outline"}>
                {STATUS_LABEL[status]}
              </Badge>
            </span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{description}</span>
          </span>
          <ChevronDown
            className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </h2>
      {open ? (
        <div id={panelId} className="border-t border-border/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          {children}
        </div>
      ) : (
        <div id={panelId} hidden />
      )}
    </section>
  );
}
