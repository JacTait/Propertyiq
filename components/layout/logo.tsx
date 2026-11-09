import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/constants";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
        <TrendingUp className="size-5 text-white" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight">
            Property<span className="text-primary">IQ</span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Investor Suite
          </span>
        </span>
      )}
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
