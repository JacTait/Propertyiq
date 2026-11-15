import type { AnalysisInput, BuyBoxMatch } from "@/lib/types";
import { formatPropertySpecs, strategyLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { StatusIndicator } from "@/components/underwriting/status-indicator";

export function PropertyContextHeader({
  input,
  buyBox,
  className,
}: {
  input: AnalysisInput;
  buyBox?: BuyBoxMatch | null;
  className?: string;
}) {
  const name = input.property.name?.trim() || "Untitled property";
  const street = input.property.address?.trim();
  const cityLine = [input.property.city, input.location.region, input.property.zipCode].filter(Boolean).join(", ");
  const specs = [
    formatPropertySpecs(input.property).replace(" bd / ", " BED · ").replace(" ba", " BATH"),
    strategyLabel(input.strategy, true),
  ]
    .join(" · ")
    .toUpperCase();

  return (
    <header className={cn("border-b border-border pb-4", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Property</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-[28px] font-medium leading-tight tracking-tight sm:text-[34px]">{name}</h1>
          {street ? <p className="mt-1 text-sm text-muted-foreground">{street}</p> : null}
          {cityLine ? <p className={cn("text-sm text-muted-foreground", !street && "mt-1")}>{cityLine}</p> : null}
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{specs}</p>
        </div>
        {buyBox ? (
          <StatusIndicator
            level={buyBox.status === "inside" ? "pass" : buyBox.status === "outside" ? "fail" : "neutral"}
          >
            {buyBox.status === "inside"
              ? "Inside Buy Box"
              : buyBox.status === "outside"
                ? "Outside Buy Box"
                : "No Buy Box"}
          </StatusIndicator>
        ) : null}
      </div>
    </header>
  );
}
