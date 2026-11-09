"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Download, Globe2, Hash, Monitor, Moon, Palette, RotateCcw, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CountryCode, CurrencyCode, NumberFormatStyle, PaperSize, ThemePreference } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { useSettings } from "@/hooks/useSettings";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

const LOCALES: { value: string; label: string }[] = [
  { value: "en-US", label: "English (US) — 1,234.56" },
  { value: "en-GB", label: "English (UK) — 1,234.56" },
  { value: "en-AU", label: "English (AU) — 1,234.56" },
  { value: "en-CA", label: "English (CA) — 1,234.56" },
  { value: "de-DE", label: "German — 1.234,56" },
  { value: "fr-FR", label: "French — 1 234,56" },
];

export function SettingsView() {
  const { settings, updateSettings, resetSettings, formatters } = useSettings();
  const { properties, clearPortfolio } = usePortfolio();
  const [confirmClear, setConfirmClear] = useState(false);

  const sample = 1234567.891;

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Personalise currency, theme, defaults and export behaviour. Settings are stored locally."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              resetSettings();
              toast("Settings reset to defaults");
            }}
          >
            <RotateCcw /> Reset defaults
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard icon={Coins} title="Currency" description="Used for every monetary value across the app.">
          <Label htmlFor="currency">Display currency</Label>
          <Select value={settings.currency} onValueChange={(v) => updateSettings({ currency: v as CurrencyCode })}>
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} · {c.label} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Preview: <span className="font-semibold text-foreground tabular">{formatters.currency(sample)}</span>
          </p>
        </SettingsCard>

        <SettingsCard icon={Palette} title="Theme" description="Dark mode is the default investor experience.">
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {THEMES.map((t) => {
              const active = settings.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ theme: t.value })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card/40 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <t.icon className={cn("size-5", active && "text-primary")} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard icon={Globe2} title="Default Country" description="Pre-selected when you start a new analysis.">
          <Label htmlFor="country">Country</Label>
          <Select value={settings.defaultCountry} onValueChange={(v) => updateSettings({ defaultCountry: v as CountryCode })}>
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsCard>

        <SettingsCard icon={Hash} title="Number Formatting" description="Control locale, compact notation and decimals.">
          <Label htmlFor="locale">Locale</Label>
          <Select
            value={settings.numberFormatting.locale}
            onValueChange={(v) => updateSettings({ numberFormatting: { ...settings.numberFormatting, locale: v } })}
          >
            <SelectTrigger id="locale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="style">Style</Label>
              <Select
                value={settings.numberFormatting.style}
                onValueChange={(v) =>
                  updateSettings({ numberFormatting: { ...settings.numberFormatting, style: v as NumberFormatStyle } })
                }
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1,234,567)</SelectItem>
                  <SelectItem value="compact">Compact (1.2M)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="decimals">Decimals</Label>
              <Select
                value={String(settings.numberFormatting.decimals)}
                onValueChange={(v) =>
                  updateSettings({ numberFormatting: { ...settings.numberFormatting, decimals: Number(v) } })
                }
              >
                <SelectTrigger id="decimals">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview: <span className="font-semibold text-foreground tabular">{formatters.currency(sample)}</span> ·{" "}
            <span className="font-semibold text-foreground tabular">{formatters.percent(6.125, 2)}</span>
          </p>
        </SettingsCard>

        <SettingsCard icon={Download} title="Export Preferences" description="What goes into your PDF investment reports." className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle
              label="Include charts"
              description="Income, expenses, equity, appreciation and cashflow charts"
              checked={settings.exportPreferences.includeCharts}
              onChange={(v) => updateSettings({ exportPreferences: { ...settings.exportPreferences, includeCharts: v } })}
            />
            <Toggle
              label="Include AI summary"
              description="Analyst narrative and final recommendation"
              checked={settings.exportPreferences.includeSummary}
              onChange={(v) => updateSettings({ exportPreferences: { ...settings.exportPreferences, includeSummary: v } })}
            />
            <Toggle
              label="Include amortisation chart"
              description="Principal vs interest over the loan term"
              checked={settings.exportPreferences.includeAmortization}
              onChange={(v) =>
                updateSettings({ exportPreferences: { ...settings.exportPreferences, includeAmortization: v } })
              }
            />
            <div className="space-y-1.5">
              <Label htmlFor="paper">Paper size</Label>
              <Select
                value={settings.exportPreferences.paperSize}
                onValueChange={(v) => updateSettings({ exportPreferences: { ...settings.exportPreferences, paperSize: v as PaperSize } })}
              >
                <SelectTrigger id="paper">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="letter">US Letter (8.5 × 11 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={Trash2} title="Data" description="All PropertyIQ data is stored in this browser only." className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-semibold">Clear portfolio</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete {properties.length} saved propert{properties.length === 1 ? "y" : "ies"}.
              </p>
            </div>
            <Button variant="destructive" disabled={properties.length === 0} onClick={() => setConfirmClear(true)}>
              <Trash2 /> Clear portfolio
            </Button>
          </div>
        </SettingsCard>
      </div>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear entire portfolio?</DialogTitle>
            <DialogDescription>This removes every saved analysis from this browser. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearPortfolio();
                setConfirmClear(false);
                toast("Portfolio cleared");
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Sun;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={className}>
      <Card className="h-full">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card/40 p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
