import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PROPERTYIQ_PRICE_LABEL } from "@/lib/auth/purchase-urls";

const UNAVAILABLE = "Purchase option temporarily unavailable.";

export function PurchaseOptions({
  gumroadUrl,
  payhipUrl,
}: {
  gumroadUrl: string | null;
  payhipUrl: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">New customer</p>
        <h2 className="font-heading text-[22px] font-medium tracking-tight">Don&apos;t have a licence?</h2>
        <CardDescription>
          Get lifetime access to PropertyIQ and start underwriting your own deals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="font-heading text-[40px] font-medium leading-none tracking-tight tabular">
            <span className="sr-only">Price </span>
            {PROPERTYIQ_PRICE_LABEL}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">One-off payment · Lifetime access</p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <MarketplaceButton href={gumroadUrl} label="Buy on Gumroad" />
          <MarketplaceButton href={payhipUrl} label="Buy on Payhip" />
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">How it works</p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1.</span> Purchase PropertyIQ through Gumroad or Payhip.
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> You&apos;ll receive a unique PropertyIQ licence key.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> Return to this page.
            </li>
            <li>
              <span className="font-medium text-foreground">4.</span> Enter the email address used for the purchase and
              the licence key you received.
            </li>
            <li>
              <span className="font-medium text-foreground">5.</span> Select Activate Access.
            </li>
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">Already have a licence? Use the activation form above.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceButton({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <p className="flex min-h-11 w-full min-w-0 items-center justify-center border border-dashed border-border px-3 py-2 text-center text-sm text-muted-foreground sm:flex-1">
        {UNAVAILABLE}
      </p>
    );
  }

  return (
    <Button variant="outline" size="lg" asChild className="w-full min-w-0 sm:flex-1">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
        <ExternalLink aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </Button>
  );
}
