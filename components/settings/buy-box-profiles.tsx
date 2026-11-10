"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BuyBoxProfile, InvestmentStrategy, PropertyType } from "@/lib/types";
import { PROPERTY_TYPES, STRATEGIES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { formatZipList, parseZipList } from "@/lib/calculations/buy-box";
import { buyBoxSchema } from "@/lib/utils/schema";
import { emptyBuyBoxDraft } from "@/data/default-buy-box";
import { useBuyBoxes } from "@/hooks/useBuyBoxes";
import { useFormatters } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Draft = Omit<BuyBoxProfile, "id" | "createdAt" | "updatedAt"> & { id?: string };

export function BuyBoxProfiles() {
  const { profiles, active, saveProfile, deleteProfile, setActiveId } = useBuyBoxes();
  const fmt = useFormatters();
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

  const openEdit = (profile: BuyBoxProfile) => {
    setDraft({
      id: profile.id,
      name: profile.name,
      propertyTypes: profile.propertyTypes,
      minBedrooms: profile.minBedrooms,
      maxPurchasePrice: profile.maxPurchasePrice,
      minRent: profile.minRent,
      minArv: profile.minArv,
      maxArv: profile.maxArv,
      zipCodes: profile.zipCodes,
      targetZipCodes: profile.targetZipCodes,
      strategies: profile.strategies,
    });
    setZipText(formatZipList(profile.zipCodes));
    setTargetZipText(formatZipList(profile.targetZipCodes));
    setOpen(true);
  };

  const toggleType = (value: PropertyType) => {
    setDraft((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(value)
        ? prev.propertyTypes.filter((t) => t !== value)
        : [...prev.propertyTypes, value],
    }));
  };

  const toggleStrategy = (value: InvestmentStrategy) => {
    setDraft((prev) => ({
      ...prev,
      strategies: prev.strategies.includes(value)
        ? prev.strategies.filter((s) => s !== value)
        : [...prev.strategies, value],
    }));
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) {
      toast.error("Give the Buy Box a name");
      return;
    }
    const payload = {
      ...draft,
      name,
      zipCodes: parseZipList(zipText),
      targetZipCodes: parseZipList(targetZipText),
      maxPurchasePrice: Math.max(0, draft.maxPurchasePrice),
      minRent: Math.max(0, draft.minRent),
      minArv: Math.max(0, draft.minArv),
      maxArv: Math.max(0, draft.maxArv),
      minBedrooms: Math.max(0, draft.minBedrooms),
    };
    const parsed = buyBoxSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Check the Buy Box fields", { description: parsed.error.issues[0]?.message });
      return;
    }
    const saved = saveProfile({ ...payload, ...parsed.data });
    setActiveId(saved.id);
    setOpen(false);
    toast.success(draft.id ? "Buy Box updated" : "Buy Box saved", { description: saved.name });
  };

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Buy Box Profiles</CardTitle>
            <CardDescription>
              Saved filters used automatically when you analyse a property. The active profile is the one that runs on every deal.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus /> New profile
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No Buy Boxes yet. Create one to filter deals by type, beds, price, rent, ARV and ZIP.
            </p>
          ) : (
            profiles.map((profile) => {
              const isActive = active?.id === profile.id;
              return (
                <div
                  key={profile.id}
                  className={cn(
                    "rounded-2xl border p-4",
                    isActive ? "border-primary/40 bg-primary/8" : "border-border bg-card/40",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{profile.name}</p>
                        {isActive && <Badge variant="primary">Active</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {profile.minBedrooms}+ beds · max {fmt.currency(profile.maxPurchasePrice, { compact: true })} · min rent{" "}
                        {fmt.currency(profile.minRent, { compact: true })}
                        {profile.maxArv > 0 ? ` · ARV to ${fmt.currency(profile.maxArv, { compact: true })}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.propertyTypes.map((t) => (
                          <Badge key={t} variant="muted">
                            {PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t}
                          </Badge>
                        ))}
                        {profile.strategies.map((s) => (
                          <Badge key={s} variant="outline">
                            {STRATEGIES.find((x) => x.value === s)?.short ?? s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isActive && (
                        <Button variant="outline" size="sm" onClick={() => setActiveId(profile.id)}>
                          <Check /> Set active
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEdit(profile)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${profile.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteProfile(profile.id);
                          toast("Buy Box removed");
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Buy Box" : "New Buy Box"}</DialogTitle>
            <DialogDescription>Empty lists mean “any” for property type, strategy and ZIP codes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="box-name">Profile Name</Label>
              <Input id="box-name" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Property Type</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPES.map((t) => {
                  const on = draft.propertyTypes.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleType(t.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberBox label="Minimum Bedrooms" value={draft.minBedrooms} onChange={(v) => setDraft((p) => ({ ...p, minBedrooms: v }))} />
              <NumberBox label="Maximum Purchase Price" value={draft.maxPurchasePrice} onChange={(v) => setDraft((p) => ({ ...p, maxPurchasePrice: v }))} />
              <NumberBox label="Minimum Rent" value={draft.minRent} onChange={(v) => setDraft((p) => ({ ...p, minRent: v }))} />
              <NumberBox label="Minimum ARV" value={draft.minArv} onChange={(v) => setDraft((p) => ({ ...p, minArv: v }))} />
              <NumberBox label="Maximum ARV" value={draft.maxArv} onChange={(v) => setDraft((p) => ({ ...p, maxArv: v }))} className="col-span-2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zips">ZIP Codes</Label>
              <Input id="zips" value={zipText} onChange={(e) => setZipText(e.target.value)} placeholder="33602, 33606" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-zips">Target ZIP Codes</Label>
              <Input
                id="target-zips"
                value={targetZipText}
                onChange={(e) => setTargetZipText(e.target.value)}
                placeholder="Preferred ZIPs, comma separated"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Investment Strategy</Label>
              <div className="flex flex-wrap gap-1.5">
                {STRATEGIES.map((s) => {
                  const on = draft.strategies.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleStrategy(s.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                      )}
                    >
                      {s.short}
                    </button>
                  );
                })}
              </div>
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
    </>
  );
}

function NumberBox({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
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
