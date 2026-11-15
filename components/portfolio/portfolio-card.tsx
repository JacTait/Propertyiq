"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, MapPin, Trash2 } from "lucide-react";
import type { PortfolioProperty } from "@/lib/types";
import { formatPropertySpecs, gradeTone, metricTone, strategyLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { analysisOpenPath } from "@/lib/utils/routes";
import { useFormatters } from "@/hooks/useSettings";
import { readDecisionSnapshot } from "@/lib/calculations/portfolio-snapshot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface PortfolioCardProps {
  property: PortfolioProperty;
  index?: number;
  onDelete: (property: PortfolioProperty) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (property: PortfolioProperty) => void;
  selectDisabled?: boolean;
}

export function PortfolioCard({
  property,
  index = 0,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
  selectDisabled = false,
}: PortfolioCardProps) {
  const fmt = useFormatters();
  const s = property.snapshot;
  const tone = gradeTone(s.grade);
  const roiDisplay = s.roi >= 999 ? "∞" : fmt.percent(s.roi);
  const decision = readDecisionSnapshot(s);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/40",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border",
      )}
    >
      <div
        className={cn(
          "h-1.5 w-full",
          tone === "success" && "bg-success",
          tone === "primary" && "bg-primary",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-destructive",
        )}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{property.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {property.regionName}
              {property.input.property.zipCode ? ` · ${property.input.property.zipCode}` : ""}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {formatPropertySpecs(property.input.property)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectable && (
              <Checkbox
                checked={selected}
                disabled={selectDisabled && !selected}
                onCheckedChange={() => onToggleSelect?.(property)}
                aria-label={`Select ${property.name} for comparison`}
              />
            )}
            <div className="flex flex-col items-center rounded-xl border border-border bg-muted/30 px-2.5 py-1.5">
              <span
                className={cn(
                  "text-xl font-black tabular leading-none",
                  tone === "success" && "text-success",
                  tone === "primary" && "text-primary",
                  tone === "warning" && "text-warning",
                  tone === "danger" && "text-destructive",
                )}
              >
                {s.dealScore}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Score</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {property.kind === "max-offer" && <Badge variant="primary">Max Offer</Badge>}
          {property.kind === "quick-underwrite" && <Badge variant="primary">Quick Underwrite</Badge>}
          {s.quickVerdict === "worth-pursuing" && <Badge variant="success">Worth pursuing</Badge>}
          {s.quickVerdict === "investigate" && <Badge variant="warning">Investigate</Badge>}
          {s.quickVerdict === "walk-away" && <Badge variant="danger">Walk away</Badge>}
          {s.quickVerdict === "insufficient-data" && <Badge variant="muted">Insufficient data</Badge>}
          <Badge variant={property.kind === "max-offer" ? "muted" : "primary"}>{strategyLabel(property.strategy, true)}</Badge>
          <Badge variant={tone}>{s.recommendation}</Badge>
          {s.buyBoxStatus === "inside" && <Badge variant="success">Inside Buy Box</Badge>}
          {s.buyBoxStatus === "outside" && <Badge variant="danger">Outside Buy Box</Badge>}
          {s.refinanceStatus === "viable" && <Badge variant="success">Refi viable</Badge>}
          {s.refinanceStatus === "risk" && <Badge variant="warning">Refi risk</Badge>}
          {typeof s.resilienceScore === "number" && (
            <Badge variant="muted">Resilience {Math.round(s.resilienceScore)}</Badge>
          )}
          {typeof s.dealSurvivalScore === "number" && (
            <Badge variant={s.dealSurvivalScore >= 80 ? "success" : s.dealSurvivalScore >= 60 ? "warning" : "danger"}>
              Survival {Math.round(s.dealSurvivalScore)}
            </Badge>
          )}
          {s.primaryRisk && <Badge variant="muted">{s.primaryRisk}</Badge>}
          {decision.marginForErrorLabel ? <Badge variant="muted">{decision.marginForErrorLabel}</Badge> : null}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Metric label="Price" value={fmt.currency(s.purchasePrice, { compact: true })} />
          <Metric label="ROI" value={roiDisplay} tone={metricTone(s.roi, { good: 12, ok: 6 })} />
          <Metric
            label={decision.conservativeMonthlyCashflow === null ? "Cashflow" : "Conservative CF"}
            value={fmt.signedCurrency(decision.conservativeMonthlyCashflow ?? s.monthlyCashflow)}
            sub="/mo"
            tone={metricTone(decision.conservativeMonthlyCashflow ?? s.monthlyCashflow, { good: 300, ok: 0 })}
          />
        </div>
        {property.kind === "quick-underwrite" ? (
          <details className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Quick Underwrite details</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Metric label="All-in" value={s.allInCost ? fmt.currency(s.allInCost, { compact: true }) : "—"} />
              <Metric label="Verified rent" value={s.verifiedRent ? fmt.currency(s.verifiedRent, { compact: true }) : "—"} />
              <Metric
                label="Supported refi"
                value={s.supportedRefinanceLoan ? fmt.currency(s.supportedRefinanceLoan, { compact: true }) : "—"}
              />
              <Metric
                label="Post-refi DSCR"
                value={s.postRefinanceDscr == null || !Number.isFinite(s.postRefinanceDscr) ? "N/A" : fmt.ratio(s.postRefinanceDscr)}
              />
              <Metric
                label="Cash left in"
                value={typeof s.cashLeftInDeal === "number" ? fmt.currency(s.cashLeftInDeal, { compact: true }) : "—"}
              />
              <Metric
                label="Survival"
                value={typeof s.dealSurvivalScore === "number" ? `${Math.round(s.dealSurvivalScore)}/100` : "—"}
              />
            </div>
          </details>
        ) : null}
        {decision.allInCost !== null ? (
          <div className="grid grid-cols-3 gap-2">
            <Metric label="All-in" value={fmt.currency(decision.allInCost, { compact: true })} />
            <Metric
              label="Guideline"
              value={decision.guidelineMaxOffer === null ? "—" : fmt.currency(decision.guidelineMaxOffer, { compact: true })}
            />
            <Metric
              label="Stress CF"
              value={decision.stressMonthlyCashflow === null ? "—" : fmt.signedCurrency(decision.stressMonthlyCashflow)}
              sub={decision.stressMonthlyCashflow === null ? undefined : "/mo"}
              tone={
                decision.stressMonthlyCashflow === null
                  ? undefined
                  : metricTone(decision.stressMonthlyCashflow, { good: 1, ok: 0 })
              }
            />
          </div>
        ) : null}
        {typeof s.dealSurvivalScore === "number" && (
          <div className="grid grid-cols-3 gap-2">
            <Metric
              label="Survival"
              value={`${Math.round(s.dealSurvivalScore)}/100`}
              tone={metricTone(s.dealSurvivalScore, { good: 80, ok: 60 })}
            />
            <Metric
              label="WC Cashflow"
              value={fmt.signedCurrency(s.worstCaseCashflow ?? 0)}
              sub="/mo"
              tone={metricTone(s.worstCaseCashflow ?? 0, { good: 1, ok: 0 })}
            />
            <Metric
              label="WC DSCR"
              value={fmt.ratio(s.worstCaseDscr ?? 0)}
              tone={metricTone(s.worstCaseDscr ?? 0, { good: 1.25, ok: 1 })}
            />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            {fmt.date(property.createdAt)}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={() => onDelete(property)} className="text-muted-foreground hover:text-destructive">
              <Trash2 />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={analysisOpenPath(property)}>
                <ExternalLink /> Open
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: ReturnType<typeof metricTone> }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-sm font-bold tabular",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
        {sub && <span className="text-[10px] font-normal text-muted-foreground">{sub}</span>}
      </p>
    </div>
  );
}
