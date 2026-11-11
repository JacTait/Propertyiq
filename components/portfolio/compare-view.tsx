"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, GitCompareArrows, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { PortfolioProperty } from "@/lib/types";
import { MAX_COMPARE, STORAGE_KEYS } from "@/lib/constants";
import { dashboardPath } from "@/lib/utils/routes";
import { formatPropertySpecs, gradeTone, strategyLabel } from "@/lib/utils/labels";
import { cn } from "@/lib/utils/cn";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useFormatters } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CompareTable } from "@/components/portfolio/compare-table";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function CompareView() {
  const { properties, hydrated } = usePortfolio();
  const [compareIds, setCompareIds] = useLocalStorage<string[]>(STORAGE_KEYS.compare, [], isStringArray);
  const fmt = useFormatters();

  const selected = compareIds
    .map((id) => properties.find((p) => p.id === id))
    .filter((p): p is PortfolioProperty => Boolean(p));

  const toggle = (property: PortfolioProperty) => {
    setCompareIds((prev) => {
      if (prev.includes(property.id)) return prev.filter((id) => id !== property.id);
      if (prev.length >= MAX_COMPARE) {
        toast.warning(`Select up to ${MAX_COMPARE} properties`);
        return prev;
      }
      return [...prev, property.id];
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        title="Compare Properties"
        description={`Select up to ${MAX_COMPARE} saved properties to see which deal wins on each metric.`}
        actions={
          selected.length > 0 ? (
            <Button variant="outline" onClick={() => setCompareIds([])}>
              <X /> Clear selection
            </Button>
          ) : null
        }
      />

      {!hydrated ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : properties.length < 2 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="Save at least two properties to compare"
          description="Head to the dashboard, analyse a deal and save it. Once you have two or more, they will appear here."
          action={
            <Button variant="gradient" asChild>
              <Link href={dashboardPath()}>
                <Plus /> Analyse a property
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Choose properties</CardTitle>
              <CardDescription>
                {selected.length}/{MAX_COMPARE} selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p, i) => {
                  const active = compareIds.includes(p.id);
                  const disabled = !active && compareIds.length >= MAX_COMPARE;
                  return (
                    <motion.button
                      key={p.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => toggle(p)}
                      disabled={disabled}
                      aria-pressed={active}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-card/40 hover:border-primary/40 hover:bg-accent/40",
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatPropertySpecs(p.input.property)} · {p.regionName} · {strategyLabel(p.strategy, true)}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {fmt.currency(p.snapshot.purchasePrice, { compact: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={gradeTone(p.snapshot.grade)}>{p.snapshot.dealScore}</Badge>
                        <span
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full border",
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                          )}
                        >
                          {active && <Check className="size-3.5" strokeWidth={3} />}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selected.length >= 2 ? (
            <CompareTable properties={selected} />
          ) : (
            <EmptyState
              icon={GitCompareArrows}
              title="Pick at least two"
              description="Select two or three properties above to generate the comparison."
              className="py-12"
            />
          )}
        </div>
      )}
    </>
  );
}
