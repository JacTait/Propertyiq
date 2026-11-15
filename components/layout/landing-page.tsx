"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/underwriting/product-preview";
import { OfferRange } from "@/components/underwriting/offer-range";
import { StatusIndicator } from "@/components/underwriting/status-indicator";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { APP_NAME } from "@/lib/constants";

const FOOTER_LINKS = [
  { href: "/quick-underwrite", label: "Quick Underwrite" },
  { href: "/dashboard", label: "Standard Analysis" },
  { href: "/max-offer", label: "Max Offer" },
  { href: "/resilience", label: "Deal Resilience" },
  { href: "/downside", label: "Downside Analysis" },
  { href: "/portfolio", label: "Portfolio" },
] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/quick-underwrite">
              Underwrite a Property <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Property underwriting</p>
            <h1 className="mt-3 font-heading text-[34px] font-medium leading-[1.08] tracking-tight sm:text-[44px]">
              Know your number before you make the offer.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              PropertyIQ works backwards from the property, verified rent, rehab and financing to show what you can
              afford to pay, whether the refinance works, and what happens when the deal does not go to plan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/quick-underwrite">
                  Underwrite a Property <ArrowRight />
                </Link>
              </Button>
              <Link href="#how-it-works" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                See how it works
              </Link>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section id="how-it-works" className="border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">
              Underwrite the deal in the order it happens.
            </h2>
            <div className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
              {[
                ["Buy", "Purchase, rehab and all-in cost."],
                ["Operate", "Verified rent, expenses and actual cashflow."],
                ["Refinance", "Supported loan, payment, DSCR and cash recovery."],
              ].map(([title, copy], index) => (
                <div key={title} className="bg-card px-5 py-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Stage {index + 1}
                  </p>
                  <h3 className="mt-2 font-heading text-xl font-medium">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">Work backwards to your number.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Enter the rent, ARV, rehab and return requirements. PropertyIQ calculates the recommended and maximum
              offer, then shows which underwriting constraint sets the limit.
            </p>
          </div>
          <OfferRange excellent={82000} target={89000} maximum={96200} currentAsk={101000} />
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
            <div className="border border-border bg-card rounded-lg px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Refinance</p>
              <FinancialDataRow label="LTV-Based Loan" value="$165,000" />
              <FinancialDataRow label="DSCR-Supported Loan" value="$148,750" />
              <FinancialDataRow label="Payment" value="$990" />
              <FinancialDataRow label="Cash Recovered" value="$125,500" />
              <FinancialDataRow label="Cash Left In Deal" value="$0" emphasis />
            </div>
            <div>
              <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">See the refinance before you buy.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                PropertyIQ sizes the refinance using both LTV and rent-supported DSCR, then uses the lower amount.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">
              Find out what happens when the deal goes wrong.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Stress-test the assumptions and see whether the deal still works before committing capital.
            </p>
          </div>
          <div className="border border-border bg-card rounded-lg px-4 py-3">
            <FinancialDataRow label="Rent reduction" value="−15%" />
            <FinancialDataRow label="Rehab overrun" value="+20%" />
            <FinancialDataRow label="Increased vacancy" value="+10 pts" />
            <FinancialDataRow label="Higher insurance" value="+15%" />
            <FinancialDataRow label="Downside cashflow" value="+$74" tone="success" />
            <FinancialDataRow label="Downside DSCR" value="1.04x" />
          </div>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">Set your Buy Box once.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Every property is automatically checked against the criteria that matter to you.
            </p>
            <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {["Property type", "Bedrooms", "Locations", "Pricing", "Rent", "ARV", "Strategy"].map((item) => (
                <li key={item} className="border border-border bg-card px-4 py-3 text-sm">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">The decision, not just the data.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Each verdict lists the rules passed and failed. It is an underwriting checklist, not financial advice.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card px-4 py-5">
              <StatusIndicator level="pass">Worth Pursuing</StatusIndicator>
              <p className="mt-3 text-sm text-muted-foreground">The deal clears Buy Box, DSCR, cashflow and max-offer checks.</p>
            </div>
            <div className="border border-border bg-card px-4 py-5">
              <StatusIndicator level="warn">Investigate Further</StatusIndicator>
              <p className="mt-3 text-sm text-muted-foreground">Something needs verification before you commit capital.</p>
            </div>
            <div className="border border-border bg-card px-4 py-5">
              <StatusIndicator level="fail">Walk Away</StatusIndicator>
              <p className="mt-3 text-sm text-muted-foreground">A critical rule failed on the assumptions entered.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">Assumptions stay visible.</h2>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>Formulas are shown next to the figures they produce.</li>
              <li>Rent is user-controlled. Verification is never implied from a live feed.</li>
              <li>Operating expenses, refinance sizing and downside shocks are listed, not hidden.</li>
              <li>No sample values are injected into a new underwrite.</li>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-heading text-[28px] font-medium tracking-tight sm:text-[32px]">
            Underwrite the property before you make the offer.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/quick-underwrite">
                Start Quick Underwrite <ArrowRight />
              </Link>
            </Button>
            <Link href="/dashboard" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Explore the analysis tools
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-heading text-sm font-medium">{APP_NAME}</p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              PropertyIQ provides analysis based on the assumptions entered and does not provide financial, legal,
              lending or investment advice.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
