"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, FilePlus2, FolderOpen, Save, Trash2 } from "lucide-react";
import { useSharedDeal } from "@/hooks/useSharedDeal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SavePropertyDialog } from "@/components/portfolio/save-property-dialog";
import { Badge } from "@/components/ui/badge";

function statusLabel(status: ReturnType<typeof useSharedDeal>["persistStatus"]): string {
  switch (status) {
    case "saving":
      return "Saving…";
    case "unsaved":
      return "Unsaved changes";
    case "saved-portfolio":
      return "Saved to Portfolio";
    default:
      return "Saved locally";
  }
}

function locationLabel(city: string, region: string, zipCode: string): string {
  return [city, region, zipCode].filter((part) => part.trim()).join(", ");
}

export function CurrentDealIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  const { draft, persistStatus, dirty, populated, startNewDeal, clearDraft, loadDemoDeal, saveDeal } = useSharedDeal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirm, setConfirm] = useState<"new" | "clear" | "demo" | null>(null);

  const name = draft.input.property.name.trim() || "Untitled deal";
  const location = locationLabel(draft.input.property.city, draft.input.location.region, draft.input.property.zipCode);
  const saved = Boolean(draft.savedId);
  const stripQuery = () => router.replace(pathname);

  const runNewDeal = () => {
    startNewDeal();
    stripQuery();
  };

  const requestNewDeal = () => {
    setMenuOpen(false);
    if (dirty || populated) setConfirm("new");
    else runNewDeal();
  };

  const requestClear = () => {
    setMenuOpen(false);
    if (populated) setConfirm("clear");
    else {
      clearDraft();
      stripQuery();
    }
  };

  const requestDemo = () => {
    setMenuOpen(false);
    if (populated) setConfirm("demo");
    else loadDemoDeal();
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex max-w-[min(100%,22rem)] items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1 text-left hover:bg-accent"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-foreground">{name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{location || "No location yet"}</span>
          </span>
          <Badge variant={saved && !dirty ? "success" : dirty ? "warning" : "muted"}>
            {saved ? (dirty ? "Unsaved" : "Saved") : "Draft"}
          </Badge>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-lg"
          >
            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => { setMenuOpen(false); setSaveOpen(true); }}>
              <Save className="size-3.5" /> Save Deal
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => { setMenuOpen(false); setSaveOpen(true); }}>
              <FolderOpen className="size-3.5" /> Save As New
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={requestNewDeal}>
              <FilePlus2 className="size-3.5" /> Start New Deal
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={requestClear}>
              <Trash2 className="size-3.5" /> Clear Draft
            </button>
            <button type="button" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={requestDemo}>
              Load Demo Deal
            </button>
          </div>
        ) : null}
      </div>
      <span className="hidden text-[11px] text-muted-foreground sm:inline">{statusLabel(persistStatus)}</span>

      <SavePropertyDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        defaultName={name}
        isUpdate={saved}
        onSave={(nextName, asNew) => {
          const savedProperty = saveDeal(nextName, asNew);
          if (savedProperty) router.replace(`${pathname}?id=${encodeURIComponent(savedProperty.id)}`);
        }}
      />

      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "new" ? "Start a new deal?" : confirm === "clear" ? "Clear this draft?" : "Load the demo deal?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "demo"
                ? "This replaces the current draft with the sample property. Saved Portfolio deals and Buy Boxes are not deleted."
                : "This clears the current deal draft. Saved Portfolio properties and Buy Box profiles are not deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant={confirm === "demo" ? "default" : "destructive"}
              onClick={() => {
                if (confirm === "demo") loadDemoDeal();
                else if (confirm === "clear") {
                  clearDraft();
                  stripQuery();
                } else runNewDeal();
                setConfirm(null);
              }}
            >
              {confirm === "demo" ? "Load Demo Deal" : confirm === "clear" ? "Clear Draft" : "Start New Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
