"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccessStatusPayload {
  email: string;
  status: string;
  activatedAt: string;
  licenceMask: string;
}

function formatActivatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function AccessStatusCard() {
  const router = useRouter();
  const [status, setStatus] = useState<AccessStatusPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/access/status")
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (
          !cancelled &&
          isRecord(payload) &&
          payload.ok === true &&
          typeof payload.email === "string" &&
          typeof payload.status === "string" &&
          typeof payload.activatedAt === "string" &&
          typeof payload.licenceMask === "string"
        ) {
          setStatus({
            email: payload.email,
            status: payload.status,
            activatedAt: payload.activatedAt,
            licenceMask: payload.licenceMask,
          });
        }
      })
      .catch(() => {
        /* status is best-effort in Settings */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/access/logout", { method: "POST" });
      toast("Signed out of this browser. Local deals were not deleted.");
      router.replace("/access");
      router.refresh();
    } catch {
      toast("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <CardTitle>PropertyIQ access</CardTitle>
          <CardDescription>Licence status for this browser. Signing out does not delete Portfolio, Buy Boxes or drafts.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <StatusField label="Licensed email" value={status?.email ?? "—"} />
          <StatusField label="Access status" value={status?.status === "active" ? "Active" : "Checking…"} />
          <StatusField label="Activation date" value={status ? formatActivatedAt(status.activatedAt) : "—"} />
          <StatusField label="Licence" value={status?.licenceMask ?? "XXXX-XXXX-XXXX-————"} />
        </dl>
        <Button variant="outline" onClick={() => void signOut()} disabled={busy}>
          Sign out / deactivate this browser
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 tabular text-foreground">{value}</dd>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
