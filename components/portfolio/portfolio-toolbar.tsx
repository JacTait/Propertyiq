"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from "lucide-react";
import type { InvestmentStrategy } from "@/lib/types";
import { STRATEGIES } from "@/lib/constants";
import type { PortfolioFilters, PortfolioSortKey } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SORT_OPTIONS: { value: PortfolioSortKey; label: string }[] = [
  { value: "date", label: "Date added" },
  { value: "score", label: "Deal score" },
  { value: "roi", label: "ROI" },
  { value: "cashflow", label: "Cashflow" },
  { value: "price", label: "Purchase price" },
  { value: "name", label: "Name" },
];

const SCORE_OPTIONS = [0, 60, 70, 80, 90];

interface PortfolioToolbarProps {
  filters: PortfolioFilters;
  onChange: (filters: PortfolioFilters) => void;
  resultCount: number;
}

export function PortfolioToolbar({ filters, onChange, resultCount }: PortfolioToolbarProps) {
  const set = <K extends keyof PortfolioFilters>(key: K, value: PortfolioFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const hasFilters = filters.search || filters.strategy !== "all" || filters.minScore > 0;

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, region or address…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
        <Select value={filters.strategy} onValueChange={(v) => set("strategy", v as InvestmentStrategy | "all")}>
          <SelectTrigger className="lg:w-44">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All strategies</SelectItem>
            {STRATEGIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.short}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(filters.minScore)} onValueChange={(v) => set("minScore", Number(v))}>
          <SelectTrigger className="lg:w-36">
            <SelectValue placeholder="Min score" />
          </SelectTrigger>
          <SelectContent>
            {SCORE_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s === 0 ? "Any score" : `Score ≥ ${s}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.sortKey} onValueChange={(v) => set("sortKey", v as PortfolioSortKey)}>
          <SelectTrigger className="lg:w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => set("sortDirection", filters.sortDirection === "asc" ? "desc" : "asc")}
          aria-label="Toggle sort direction"
        >
          {filters.sortDirection === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
          <span className="lg:hidden">{filters.sortDirection === "asc" ? "Ascending" : "Descending"}</span>
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground lg:justify-end">
        <span>{resultCount} result{resultCount === 1 ? "" : "s"}</span>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...filters, search: "", strategy: "all", minScore: 0 })}
          >
            <X /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
