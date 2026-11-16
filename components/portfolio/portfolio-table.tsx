"use client";

import Link from "next/link";
import { ExternalLink, LayoutGrid, List, Trash2 } from "lucide-react";
import type { PortfolioProperty } from "@/lib/types";
import { formatPropertySpecs, strategyLabel } from "@/lib/utils/labels";
import { analysisOpenPath } from "@/lib/utils/routes";
import { cn } from "@/lib/utils/cn";
import { useFormatters } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusIndicator } from "@/components/underwriting/status-indicator";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { DealSurvivalInfo } from "@/components/underwriting/deal-survival-info";

function verdictCopy(property: PortfolioProperty) {
  switch (property.snapshot.quickVerdict) {
    case "worth-pursuing":
      return { label: "Worth Pursuing", level: "pass" as const };
    case "investigate":
      return { label: "Investigate", level: "warn" as const };
    case "walk-away":
      return { label: "Walk Away", level: "fail" as const };
    case "insufficient-data":
      return { label: "Insufficient Data", level: "neutral" as const };
    default:
      return { label: property.snapshot.recommendation, level: "neutral" as const };
  }
}

export function PortfolioTable({
  properties,
  compareIds,
  onToggleSelect,
  selectDisabled,
  onDelete,
  view,
  onViewChange,
}: {
  properties: PortfolioProperty[];
  compareIds: string[];
  onToggleSelect: (property: PortfolioProperty) => void;
  selectDisabled: boolean;
  onDelete: (property: PortfolioProperty) => void;
  view: "list" | "cards";
  onViewChange: (view: "list" | "cards") => void;
}) {
  const fmt = useFormatters();

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-1">
        <Button
          variant={view === "list" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange("list")}
          aria-pressed={view === "list"}
        >
          <List /> List
        </Button>
        <Button
          variant={view === "cards" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onViewChange("cards")}
          aria-pressed={view === "cards"}
        >
          <LayoutGrid /> Cards
        </Button>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property, index) => (
            <PortfolioCard
              key={property.id}
              property={property}
              index={index}
              onDelete={onDelete}
              selectable
              selected={compareIds.includes(property.id)}
              selectDisabled={selectDisabled}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {[
                  "",
                  "Property",
                  "Location",
                  "Strategy",
                  "Buy Box",
                  "Offer",
                  "All-In",
                  "Verified Rent",
                  "Cashflow",
                  "DSCR",
                  "Cash Left",
                  "Survival",
                  "Verdict",
                  "Updated",
                  "",
                ].map((label, i) => (
                  <th key={`${label}-${i}`} className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {label === "Survival" ? <DealSurvivalInfo /> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => {
                const s = property.snapshot;
                const verdict = verdictCopy(property);
                const selected = compareIds.includes(property.id);
                const location = [property.input.property.city, property.regionName, property.input.property.zipCode]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={property.id} className={cn("border-b border-border last:border-0", selected && "bg-primary/5")}>
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selected}
                        disabled={selectDisabled && !selected}
                        onCheckedChange={() => onToggleSelect(property)}
                        aria-label={`Select ${property.name} for comparison`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={analysisOpenPath(property)} className="font-medium hover:text-primary">
                        {property.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{formatPropertySpecs(property.input.property)}</p>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{location || property.regionName}</td>
                    <td className="px-3 py-2">{strategyLabel(property.strategy, true)}</td>
                    <td className="px-3 py-2">
                      {s.buyBoxStatus === "inside" ? (
                        <StatusIndicator level="pass">Inside</StatusIndicator>
                      ) : s.buyBoxStatus === "outside" ? (
                        <StatusIndicator level="fail">Outside</StatusIndicator>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-figure tabular-nums">
                      {fmt.currency(s.proposedOffer ?? property.input.financing.proposedOffer ?? s.purchasePrice)}
                    </td>
                    <td className="px-3 py-2 font-figure tabular-nums">{s.allInCost ? fmt.currency(s.allInCost) : "—"}</td>
                    <td className="px-3 py-2 font-figure tabular-nums">
                      {s.verifiedRent ? fmt.currency(s.verifiedRent) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 font-figure tabular-nums",
                        s.monthlyCashflow >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {fmt.signedCurrency(s.monthlyCashflow)}
                    </td>
                    <td className="px-3 py-2 font-figure tabular-nums">{fmt.ratio(s.postRefinanceDscr ?? s.dscr)}</td>
                    <td className="px-3 py-2 font-figure tabular-nums">
                      {typeof s.cashLeftInDeal === "number" ? fmt.currency(s.cashLeftInDeal) : "—"}
                    </td>
                    <td className="px-3 py-2 font-figure tabular-nums">
                      {typeof s.dealSurvivalScore === "number" ? `${Math.round(s.dealSurvivalScore)}` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusIndicator level={verdict.level}>{verdict.label}</StatusIndicator>
                    </td>
                    <td className="px-3 py-2 font-figure text-xs text-muted-foreground">{fmt.date(property.updatedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" asChild aria-label={`Open ${property.name}`}>
                          <Link href={analysisOpenPath(property)}>
                            <ExternalLink />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${property.name}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(property)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
