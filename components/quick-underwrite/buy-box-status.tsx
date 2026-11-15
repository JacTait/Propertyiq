"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { BuyBoxMatch, BuyBoxProfile } from "@/lib/types";
import { PROPERTY_TYPES, STRATEGIES } from "@/lib/constants";
import { formatZipList, parseZipList } from "@/lib/calculations/buy-box";
import { buyBoxSchema } from "@/lib/utils/schema";
import { emptyBuyBoxDraft } from "@/data/default-buy-box";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";
import { cn } from "@/lib/utils/cn";
import { BuyBoxStatusCard } from "@/components/analysis/buy-box-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Draft = Omit<BuyBoxProfile, "id" | "createdAt" | "updatedAt"> & { id?: string };

export function QuickBuyBoxPanel({ match }: { match: BuyBoxMatch }) {
  const { profiles, active, setActiveId, saveProfile } = useBuyBoxes();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyBuyBoxDraft());
  const [zipText, setZipText] = useState("");
  const [targetZipText, setTargetZipText] = useState("");

  const openCreate = () => {
    setDraft(emptyBuyBoxDraft());
    setZipText("");
    setTargetZipText("");
    setOpen(true);
  };

  const openEdit = () => {
    if (!active) {
      openCreate();
      return;
    }
    setDraft({
      id: active.id,
      name: active.name,
      propertyTypes: active.propertyTypes,
      minBedrooms: active.minBedrooms,
      maxPurchasePrice: active.maxPurchasePrice,
      minRent: active.minRent,
      minArv: active.minArv,
      maxArv: active.maxArv,
      zipCodes: active.zipCodes,
      targetZipCodes: active.targetZipCodes,
      strategies: active.strategies,
    });
    setZipText(formatZipList(active.zipCodes));
    setTargetZipText(formatZipList(active.targetZipCodes));
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      ...draft,
      name: draft.name.trim(),
      zipCodes: parseZipList(zipText),
      targetZipCodes: parseZipList(targetZipText),
    };
    const parsed = buyBoxSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Check the Buy Box fields", { description: parsed.error.issues[0]?.message });
      return;
    }
    const saved = saveProfile({ ...payload, ...parsed.data });
    setActiveId(saved.id);
    setOpen(false);
    toast.success(draft.id ? "Buy Box updated" : "Buy Box saved");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-10 min-w-[180px] flex-1 rounded-lg border border-input bg-background/60 px-3 text-sm"
          value={active?.id ?? ""}
          onChange={(event) => setActiveId(event.target.value || null)}
          aria-label="Active Buy Box"
        >
          <option value="">Continue without a Buy Box</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <Plus /> New
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openEdit} disabled={!active}>
          Edit
        </Button>
      </div>
      <BuyBoxStatusCard match={match} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Buy Box" : "New Buy Box"}</DialogTitle>
            <DialogDescription>Saved profiles are reused on every property. Empty lists mean any.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qu-box-name">Profile Name</Label>
              <Input id="qu-box-name" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PROPERTY_TYPES.map((type) => {
                const on = draft.propertyTypes.includes(type.value);
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        propertyTypes: on
                          ? prev.propertyTypes.filter((item) => item !== type.value)
                          : [...prev.propertyTypes, type.value],
                      }))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberBox label="Min bedrooms" value={draft.minBedrooms} onChange={(v) => setDraft((p) => ({ ...p, minBedrooms: v }))} />
              <NumberBox label="Max purchase" value={draft.maxPurchasePrice} onChange={(v) => setDraft((p) => ({ ...p, maxPurchasePrice: v }))} />
              <NumberBox label="Min rent" value={draft.minRent} onChange={(v) => setDraft((p) => ({ ...p, minRent: v }))} />
              <NumberBox label="Max ARV" value={draft.maxArv} onChange={(v) => setDraft((p) => ({ ...p, maxArv: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qu-zips">ZIP codes</Label>
              <Input id="qu-zips" value={zipText} onChange={(e) => setZipText(e.target.value)} placeholder="33602, 33606" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIES.map((strategy) => {
                const on = draft.strategies.includes(strategy.value);
                return (
                  <button
                    key={strategy.value}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        strategies: on
                          ? prev.strategies.filter((item) => item !== strategy.value)
                          : [...prev.strategies, strategy.value],
                      }))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs",
                      on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                    )}
                  >
                    {strategy.short}
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NumberBox({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="text"
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          onChange(raw === "" ? 0 : Number(raw));
        }}
      />
    </div>
  );
}
