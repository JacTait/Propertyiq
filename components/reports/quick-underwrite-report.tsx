"use client";

import { forwardRef } from "react";
import type { AnalysisInput, QuickUnderwriteResults, UnderwritingPack } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";
import { countryName, formatPropertySpecs, strategyLabel } from "@/lib/utils/labels";
import { getRegionName } from "@/data/market-data";
import { useFormatters } from "@/hooks/useSettings";
import { RENT_VERIFICATION_STATUSES } from "@/lib/constants";

export const QuickUnderwriteReport = forwardRef<
  HTMLDivElement,
  { input: AnalysisInput; quick: QuickUnderwriteResults; underwriting?: UnderwritingPack | null }
>(function QuickUnderwriteReport({ input, quick, underwriting }, ref) {
  const fmt = useFormatters();
  const verifiedLabel =
    input.income.verificationStatus === "unverified"
      ? "Unverified — user-entered only"
      : RENT_VERIFICATION_STATUSES.find((item) => item.value === input.income.verificationStatus)?.label ?? "User-entered";
  const rentVerifiedClaim =
    input.income.verificationStatus === "third-party-verified"
      ? "Marked third-party verified by the user. This report did not receive a live provider feed."
      : input.income.verificationStatus === "user-verified"
        ? "Marked user verified. Not confirmed by a connected data provider."
        : "Local rent is not marked as verified.";

  return (
    <div ref={ref} className="w-[1100px] space-y-5 bg-background p-8 text-foreground">
      <header className="flex items-start justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{APP_NAME} Quick Underwrite</p>
          <h1 className="mt-1 text-3xl font-bold">{input.property.name || "Untitled property"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {strategyLabel(input.strategy, true)} · {formatPropertySpecs(input.property)} ·{" "}
            {[input.property.address, input.property.city, getRegionName(input.location.country, input.location.region), countryName(input.location.country)]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Generated {fmt.dateTime(quick.generatedAt)}</p>
          <p>Based on the assumptions entered. Not financial advice.</p>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-bold">Verdict</h2>
        <p className="mt-1 text-2xl font-black">{quick.verdict.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{quick.verdict.summary}</p>
      </section>

      <section>
        <h2 className="text-lg font-bold">Buy Box</h2>
        <p className="text-sm">
          {quick.buyBox.profileName ? `${quick.buyBox.profileName} · ` : ""}
          {quick.buyBox.status === "inside" ? "INSIDE BUY BOX" : quick.buyBox.status === "outside" ? "OUTSIDE BUY BOX" : "No active Buy Box"}
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {quick.buyBox.reasons.map((reason) => (
            <li key={reason.key}>{reason.message}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold">Rent source</h2>
        <p className="text-sm">{quick.rent.label}</p>
        <p className="text-sm">Verification: {verifiedLabel}</p>
        <p className="text-xs text-muted-foreground">{rentVerifiedClaim}</p>
        {input.income.rentSourceNotes ? <p className="mt-1 text-sm">{input.income.rentSourceNotes}</p> : null}
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-bold">Acquisition</h2>
          <p className="text-sm">Asking {fmt.currency(input.financing.askingPrice)}</p>
          <p className="text-sm">Proposed offer {fmt.currency(input.financing.proposedOffer)}</p>
          <p className="text-sm">Purchase used {quick.acquisitionPrice.value ? fmt.currency(quick.acquisitionPrice.value) : "—"} ({quick.acquisitionPrice.label})</p>
        </div>
        <div>
          <h2 className="text-lg font-bold">All-in cost</h2>
          {quick.allIn.total === null ? (
            <p className="text-sm">{quick.allIn.message}</p>
          ) : (
            <>
              <p className="text-sm">Adjusted rehab {fmt.currency(quick.allIn.adjustedRehabBudget)}</p>
              <p className="text-sm">Holding {fmt.currency(quick.allIn.holdingCostsUsed)}</p>
              <p className="text-sm font-semibold">Total {fmt.currency(quick.allIn.total)}</p>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">Refinance & DSCR</h2>
        <p className="text-sm">Limiting factor: {quick.refinance.limitingLabel}</p>
        <p className="text-sm">LTV loan {fmt.currency(quick.refinance.ltvBasedMaximumLoan)}</p>
        <p className="text-sm">
          DSCR-supported loan{" "}
          {quick.refinance.dscrSupportedMaximumLoan === null ? "Not applicable" : fmt.currency(quick.refinance.dscrSupportedMaximumLoan)}
        </p>
        <p className="text-sm">Supported loan {fmt.currency(quick.refinance.supportedRefinanceLoan)}</p>
        <p className="text-sm">Payment {fmt.currency(quick.refinance.monthlyPayment)}/mo</p>
        <p className="text-sm">Post-refi DSCR {quick.refinance.postRefiDscrLabel}</p>
      </section>

      <section>
        <h2 className="text-lg font-bold">Cash recovery</h2>
        {quick.cashRecovery ? (
          <>
            <p className="text-sm">Gross refinance loan {fmt.currency(quick.cashRecovery.grossRefinanceProceeds)}</p>
            <p className="text-sm">Net proceeds {fmt.currency(quick.cashRecovery.netRefinanceProceeds)}</p>
            <p className="text-sm">Cash recovered {fmt.currency(quick.cashRecovery.cashRecovered)}</p>
            <p className="text-sm">Excess cash out {fmt.currency(quick.cashRecovery.excessCashOut)}</p>
            <p className="text-sm">Cash left in deal {fmt.currency(quick.cashRecovery.cashLeftInDeal)}</p>
          </>
        ) : (
          <p className="text-sm">Cash recovery needs an acquisition price.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">Expected and stress</h2>
        {quick.downside ? (
          <>
            <p className="text-sm">Expected CF {fmt.signedCurrency(quick.downside.expectedCashflow)}/mo</p>
            <p className="text-sm">Stress CF {fmt.signedCurrency(quick.downside.stressCashflow)}/mo</p>
            <p className="text-sm">Survival {quick.downside.dealSurvivalScore}/100 · {quick.downside.primaryRisk}</p>
          </>
        ) : (
          <p className="text-sm">Stress snapshot unavailable until rent and ARV are entered.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">Warnings</h2>
        {quick.warnings.length === 0 ? (
          <p className="text-sm">None.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {quick.warnings.map((warning) => (
              <li key={warning.key}>
                {warning.title} {warning.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      {underwriting ? (
        <section>
          <h2 className="text-lg font-bold">Underwriting narrative</h2>
          {underwriting.summary.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-sm text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      <footer className="border-t border-border pt-3 text-[10px] text-muted-foreground">
        {APP_NAME} · {fmt.dateTime(quick.generatedAt)} · User-entered assumptions. Neighbourhood figures are not live market data
        unless a connected provider is marked. Not financial advice.
      </footer>
    </div>
  );
});
