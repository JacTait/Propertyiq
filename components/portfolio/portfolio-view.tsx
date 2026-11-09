"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Briefcase, GitCompareArrows, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import type { PortfolioProperty } from "@/lib/types";
import { STORAGE_KEYS, MAX_COMPARE } from "@/lib/constants";
import { writeStorage } from "@/lib/utils/storage";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { PortfolioToolbar } from "@/components/portfolio/portfolio-toolbar";
import { PortfolioStats } from "@/components/portfolio/portfolio-stats";
import type { AnalysisDraft } from "@/components/dashboard/analysis-dashboard";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function PortfolioView() {
  const router = useRouter();
  const { properties, filtered, filters, setFilters, hydrated, stats, deleteProperty } = usePortfolio();
  const [compareIds, setCompareIds] = useLocalStorage<string[]>(STORAGE_KEYS.compare, [], isStringArray);
  const [pendingDelete, setPendingDelete] = useState<PortfolioProperty | null>(null);

  const validCompareIds = compareIds.filter((id) => properties.some((p) => p.id === id));

  const openProperty = (property: PortfolioProperty) => {
    writeStorage<AnalysisDraft>(STORAGE_KEYS.draft, { input: property.input, savedId: property.id });
    router.push("/dashboard");
  };

  const toggleCompare = (property: PortfolioProperty) => {
    setCompareIds((prev) => {
      if (prev.includes(property.id)) return prev.filter((id) => id !== property.id);
      if (prev.length >= MAX_COMPARE) {
        toast.warning(`You can compare up to ${MAX_COMPARE} properties`);
        return prev;
      }
      return [...prev, property.id];
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteProperty(pendingDelete.id);
    setCompareIds((prev) => prev.filter((id) => id !== pendingDelete.id));
    toast("Property removed", { description: pendingDelete.name });
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Saved Properties"
        description="Every analysis you save lives here, stored locally in your browser."
        actions={
          <>
            <Button variant="outline" asChild disabled={validCompareIds.length < 2}>
              <Link href="/compare">
                <GitCompareArrows /> Compare ({validCompareIds.length}/{MAX_COMPARE})
              </Link>
            </Button>
            <Button variant="gradient" asChild>
              <Link href="/dashboard">
                <Plus /> New Analysis
              </Link>
            </Button>
          </>
        }
      />

      {!hydrated ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : properties.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Your portfolio is empty"
          description="Analyse a property on the dashboard and hit “Save to Portfolio” to start building your pipeline."
          action={
            <Button variant="gradient" asChild>
              <Link href="/dashboard">
                <Plus /> Analyse your first deal
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <PortfolioStats stats={stats} />
          <PortfolioToolbar filters={filters} onChange={setFilters} resultCount={filtered.length} />
          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matches"
              description="Try a different search term or clear the filters."
              className="py-12"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((p, i) => (
                  <PortfolioCard
                    key={p.id}
                    property={p}
                    index={i}
                    onOpen={openProperty}
                    onDelete={setPendingDelete}
                    selectable
                    selected={validCompareIds.includes(p.id)}
                    selectDisabled={validCompareIds.length >= MAX_COMPARE}
                    onToggleSelect={toggleCompare}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete property?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” will be permanently removed from your portfolio. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
