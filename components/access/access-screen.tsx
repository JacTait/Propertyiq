"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, LoaderCircle, Ticket } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PurchaseOptions } from "@/components/access/purchase-options";
import { WhopLicenceClaim } from "@/components/access/whop-licence-claim";
import { accessQueryWithoutLicenceKey, licenceKeyFromAccessQuery } from "@/lib/auth/access-query";
import { ACCESS_ERROR_MESSAGES, type AccessClientError } from "@/lib/auth/messages";
import { getPurchaseUrls } from "@/lib/auth/purchase-urls";
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
  const prefilledKey = licenceKeyFromAccessQuery(searchParams);

  const [email, setEmail] = useState("");
  const [licenceKey, setLicenceKey] = useState(prefilledKey);
  const [state, setState] = useState<FormState>(reasonParam === "disabled" ? "disabled" : "idle");
  const [testerCode, setTesterCode] = useState("");
  const [testerEmail, setTesterEmail] = useState("");
  const [testerState, setTesterState] = useState<FormState>("idle");

  useEffect(() => {
    const cleaned = accessQueryWithoutLicenceKey(searchParams);
    if (!cleaned) return;
    router.replace(cleaned, { scroll: false });
  }, [router, searchParams]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setTesterState("idle");

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

  async function onTesterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTesterState("loading");
    setState("idle");

    try {
      const response = await fetch("/api/access/tester", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          testerCode,
          email: testerEmail.trim() ? testerEmail : undefined,
          from: redirectTo,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);
      if (isRecord(payload) && payload.ok === true && typeof payload.redirectTo === "string") {
        setTesterState("success");
        router.replace(payload.redirectTo);
        router.refresh();
        return;
      }

      const error =
        isRecord(payload) && typeof payload.error === "string" && isAccessClientError(payload.error)
          ? payload.error
          : "tester";
      setTesterState(error);
    } catch {
      setTesterState("tester");
    }
  }

  const busy = state === "loading" || state === "success";
  const testerBusy = testerState === "loading" || testerState === "success";
  const { gumroadUrl, payhipUrl, whopUrl } = getPurchaseUrls();
  const message =
    state === "success"
      ? "Access activated. Taking you to Quick Underwrite."
      : state !== "idle" && state !== "loading"
        ? ACCESS_ERROR_MESSAGES[state]
        : reasonParam === "expired"
          ? "Your PropertyIQ session expired. Activate access again."
          : null;
  const testerMessage =
    testerState === "success"
      ? "Tester access activated. Taking you to Quick Underwrite."
      : testerState !== "idle" && testerState !== "loading"
        ? ACCESS_ERROR_MESSAGES[testerState === "rate_limited" ? "rate_limited" : "tester"]
        : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo href="/" />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-lg flex-col overflow-x-hidden px-6 pb-20 pt-10">
        <h1 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">Access PropertyIQ</h1>
        <p className="mt-2 text-sm text-muted-foreground">Activate a licence you already own, or purchase lifetime access.</p>

        <Card className="mt-8">
          <CardHeader>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Existing customer</p>
            <h2 className="font-heading text-[22px] font-medium tracking-tight">Already purchased?</h2>
            <CardDescription>
              Enter the email address used for your purchase and your PropertyIQ licence key.
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
                  disabled={busy || testerBusy}
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
                  disabled={busy || testerBusy}
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

              <p className="text-xs text-muted-foreground">
                Purchased through Payhip or Gumroad? Your licence key is included with your purchase. Bought on Whop?
                Retrieve your key below, then activate here.
              </p>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={busy || testerBusy} className="w-full sm:flex-1">
                  {state === "loading" ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
                  {state === "loading" ? "Activating…" : "Activate Access"}
                </Button>
                <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/">
                    <ArrowLeft /> Return to Product Page
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 py-6" role="separator" aria-label="Or">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Or</span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        <PurchaseOptions gumroadUrl={gumroadUrl} payhipUrl={payhipUrl} whopUrl={whopUrl} />

        <WhopLicenceClaim
          disabled={busy || testerBusy}
          initialEmail={email}
          onClaimed={(claimed) => {
            setEmail(claimed.email);
            setLicenceKey(claimed.licenceKey);
          }}
        />

        <Card className="mt-6">
          <CardHeader>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Complimentary tester access
            </p>
            <h2 className="font-heading text-[22px] font-medium tracking-tight">Received a complimentary tester code?</h2>
            <CardDescription>
              Enter your tester code to activate temporary PropertyIQ access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onTesterSubmit} aria-busy={testerBusy}>
              <div className="space-y-2">
                <Label htmlFor="tester-code">Tester Code</Label>
                <Input
                  id="tester-code"
                  name="testerCode"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  placeholder="PIQ-TEST-XXXX-XXXX"
                  value={testerCode}
                  onChange={(event) => setTesterCode(event.target.value)}
                  disabled={testerBusy || busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tester-email">Tester email (optional)</Label>
                <Input
                  id="tester-email"
                  name="testerEmail"
                  type="email"
                  autoComplete="email"
                  value={testerEmail}
                  onChange={(event) => setTesterEmail(event.target.value)}
                  disabled={testerBusy || busy}
                />
                <p className="text-xs text-muted-foreground">
                  Only fill this in if you were asked to use a specific email address.
                </p>
              </div>

              {testerMessage && (
                <p
                  role="status"
                  data-state={testerState}
                  className={
                    testerState === "success"
                      ? "rounded-sm border border-border bg-primary/10 px-3 py-2 text-sm text-foreground"
                      : "rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground"
                  }
                >
                  {testerMessage}
                </p>
              )}

              <Button type="submit" disabled={testerBusy || busy} className="w-full">
                {testerState === "loading" ? <LoaderCircle className="animate-spin" /> : <Ticket />}
                {testerState === "loading" ? "Activating…" : "Activate Tester Access"}
              </Button>
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
