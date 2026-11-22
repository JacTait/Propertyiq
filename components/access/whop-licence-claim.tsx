"use client";

import { useState } from "react";
import { LoaderCircle, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCESS_ERROR_MESSAGES, type AccessClientError } from "@/lib/auth/messages";

type ClaimState = "idle" | "loading" | "success" | AccessClientError;

function isAccessClientError(value: string): value is AccessClientError {
  return value in ACCESS_ERROR_MESSAGES;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function WhopLicenceClaim({
  disabled,
  initialEmail,
  onClaimed,
}: {
  disabled?: boolean;
  initialEmail?: string;
  onClaimed: (result: { email: string; licenceKey: string }) => void;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [paymentId, setPaymentId] = useState("");
  const [state, setState] = useState<ClaimState>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch("/api/access/whop-claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, paymentId }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (
        isRecord(payload) &&
        payload.ok === true &&
        typeof payload.licenceKey === "string" &&
        typeof payload.email === "string"
      ) {
        setState("success");
        onClaimed({ email: payload.email, licenceKey: payload.licenceKey });
        return;
      }
      const error =
        isRecord(payload) && typeof payload.error === "string" && isAccessClientError(payload.error)
          ? payload.error
          : "invalid";
      setState(error);
    } catch {
      setState("network");
    }
  }

  const message =
    state === "success"
      ? "Your licence key has been filled in above. Select Activate Access."
      : state !== "idle" && state !== "loading"
        ? ACCESS_ERROR_MESSAGES[state]
        : null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Whop purchase</p>
        <h2 className="font-heading text-[22px] font-medium tracking-tight">Bought on Whop?</h2>
        <CardDescription>
          Enter the email and Whop payment ID from your receipt to retrieve your PropertyIQ licence key. The key is
          never shown from email alone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit} aria-busy={state === "loading"}>
          <div className="space-y-2">
            <Label htmlFor="whop-claim-email">Purchase Email</Label>
            <Input
              id="whop-claim-email"
              name="whopEmail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={disabled || state === "loading" || state === "success"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whop-payment-id">Whop payment ID</Label>
            <Input
              id="whop-payment-id"
              name="whopPaymentId"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              placeholder="pay_"
              value={paymentId}
              onChange={(event) => setPaymentId(event.target.value)}
              disabled={disabled || state === "loading" || state === "success"}
            />
            <p className="text-xs text-muted-foreground">
              Copy the payment ID from your Whop receipt. It starts with pay_.
            </p>
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
          <Button type="submit" disabled={disabled || state === "loading" || state === "success"} className="w-full">
            {state === "loading" ? <LoaderCircle className="animate-spin" /> : <Receipt />}
            {state === "loading" ? "Retrieving…" : "Retrieve Whop licence"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
