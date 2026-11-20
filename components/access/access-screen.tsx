"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_ERROR_MESSAGES, type AccessClientError } from "@/lib/auth/messages";
import { DEFAULT_POST_ACCESS_PATH, isSafeInternalPath } from "@/lib/auth/routes";

type FormState = "idle" | "loading" | "success" | AccessClientError;

function isAccessClientError(value: string): value is AccessClientError {
  return value in ACCESS_ERROR_MESSAGES;
}

export function AccessScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const reasonParam = searchParams.get("reason");
  const redirectTo = fromParam && isSafeInternalPath(fromParam) ? fromParam : DEFAULT_POST_ACCESS_PATH;

  const [email, setEmail] = useState("");
  const [licenceKey, setLicenceKey] = useState("");
  const [state, setState] = useState<FormState>(reasonParam === "disabled" ? "disabled" : "idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");

    try {
      const response = await fetch("/api/access/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, licenceKey, from: redirectTo }),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (isRecord(payload) && payload.ok === true && typeof payload.redirectTo === "string") {
        setState("success");
        router.replace(payload.redirectTo);
        router.refresh();
        return;
      }

      const error =
        isRecord(payload) && typeof payload.error === "string" && isAccessClientError(payload.error)
          ? payload.error
          : "network";
      setState(error);
    } catch {
      setState("network");
    }
  }

  const busy = state === "loading" || state === "success";
  const message =
    state === "success"
      ? "Access activated. Taking you to Quick Underwrite."
      : state !== "idle" && state !== "loading"
        ? ACCESS_ERROR_MESSAGES[state]
        : reasonParam === "expired"
          ? "Your PropertyIQ session expired. Activate access again."
          : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo href="/" />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-lg flex-col px-6 pb-20 pt-10">
        <Card>
          <CardHeader>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Licensed access</p>
            <h1 className="font-heading text-[28px] font-medium tracking-tight">Access PropertyIQ</h1>
            <CardDescription>
              Enter the email address used for your purchase and the licence key supplied by Payhip.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit} aria-busy={busy}>
              <div className="space-y-2">
                <Label htmlFor="purchase-email">Purchase Email</Label>
                <Input
                  id="purchase-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licence-key">Licence Key</Label>
                <Input
                  id="licence-key"
                  name="licenceKey"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  value={licenceKey}
                  onChange={(event) => setLicenceKey(event.target.value)}
                  disabled={busy}
                />
              </div>

              {message && (
                <p
                  role="status"
                  data-state={state}
                  className={
                    state === "success"
                      ? "rounded-sm border border-border bg-primary/10 px-3 py-2 text-sm text-foreground"
                      : "rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground"
                  }
                >
                  {message}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={busy} className="sm:flex-1">
                  {state === "loading" ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                  {state === "loading" ? "Activating…" : "Activate Access"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/">
                    <ArrowLeft /> Return to Product Page
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function AccessScreenSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-6 pt-24">
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
