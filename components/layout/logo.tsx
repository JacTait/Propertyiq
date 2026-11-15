import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { APP_NAME } from "@/lib/constants";

export function Logo({
  className,
  compact = false,
  href = "/",
}: {
  className?: string;
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-8 items-center justify-center rounded-sm bg-primary text-[13px] font-medium text-primary-foreground">
        <span
          className="absolute inset-0 rounded-sm opacity-80"
          style={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)" }}
        />
        <span className="relative font-heading tracking-tight">P</span>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-[15px] font-medium tracking-tight">
            Property<span className="text-primary">IQ</span>
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Underwriting
          </span>
        </span>
      )}
      <span className="sr-only">{APP_NAME}</span>
    </Link>
  );
}
