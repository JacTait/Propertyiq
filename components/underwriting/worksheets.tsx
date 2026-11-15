"use client";

import type { AnalysisInput, QuickOperatingStatement, QuickRefinanceResults, QuickRentResolution, QuickUnderwriteResults } from "@/lib/types";
import { RENT_SOURCE_KINDS, RENT_VERIFICATION_STATUSES } from "@/lib/constants";
import { useFormatters } from "@/hooks/useSettings";
import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { FinancialSection, SectionDivider } from "@/components/underwriting/financial-section";
import { StatusIndicator } from "@/components/underwriting/status-indicator";

export function BuyWorksheet({
  input,
  results,
}: {
  input: AnalysisInput;
  results: QuickUnderwriteResults;
}) {
  const fmt = useFormatters();
  const allIn = results.allIn;
  const asking = input.financing.askingPrice;
  const offer = input.financing.proposedOffer;
  const used = results.acquisitionPrice;
  const maxOffer = results.maximumOffer;
  const mos = results.marginOfSafetyPercent;

  return (
    <FinancialSection eyebrow="Stage 1" title="Buy">
      <FinancialDataRow label="Asking Price" value={asking > 0 ? fmt.currency(asking) : "—"} />
      <FinancialDataRow label="Proposed Offer" value={offer > 0 ? fmt.currency(offer) : "—"} />
      <FinancialDataRow
        label="Purchase Price Used"
        value={used.value ? fmt.currency(used.value) : "—"}
        detail={used.label}
      />
      <FinancialDataRow label="Rehab" value={fmt.currency(allIn.estimatedRehab)} />
      <FinancialDataRow label="Contingency" value={fmt.currency(allIn.rehabContingencyAmount)} />
      <FinancialDataRow
        label="Acquisition Costs"
        value={fmt.currency(allIn.closingCosts + allIn.inspectionCosts + allIn.legalFees + allIn.loanFees + allIn.otherAcquisitionCosts)}
      />
      <FinancialDataRow label="Holding Costs" value={fmt.currency(allIn.holdingCostsUsed)} />
      <SectionDivider />
      <FinancialDataRow
        label="All-In Cost"
        value={allIn.total === null ? "—" : fmt.currency(allIn.total)}
        emphasis
        tone="primary"
      />
      <FinancialDataRow
        label="Maximum Offer"
        value={maxOffer == null ? "—" : fmt.currency(maxOffer)}
        tone="primary"
      />
      <FinancialDataRow
        label="Margin of Safety"
        value={mos == null ? "—" : fmt.percent(mos)}
        tone={mos == null ? "muted" : mos >= 5 ? "success" : mos >= 0 ? "warning" : "danger"}
      />
    </FinancialSection>
  );
}

export function OperateWorksheet({
  rent,
  operating,
  cashflow,
}: {
  rent: QuickRentResolution;
  operating: QuickOperatingStatement;
  cashflow: number | null;
}) {
  const fmt = useFormatters();
  return (
    <FinancialSection eyebrow="Stage 2" title="Operate">
      <FinancialDataRow label="Listing Rent" value={rent.listing > 0 ? fmt.currency(rent.listing) : "—"} />
      <FinancialDataRow
        label="Verified Local Rent"
        value={rent.verified > 0 ? fmt.currency(rent.verified) : "—"}
        tone="primary"
        status={rent.verified > 0 ? "pass" : "info"}
      />
      <FinancialDataRow label="Conservative Rent" value={rent.conservative > 0 ? fmt.currency(rent.conservative) : "—"} />
      <SectionDivider />
      <FinancialDataRow label="Active Rent Basis" value={rent.basisLabel} tone="primary" emphasis />
      <FinancialDataRow label="Vacancy" value={fmt.currency(operating.vacancyAllowance)} />
      <FinancialDataRow label="Management" value={fmt.currency(operating.managementCost)} />
      <FinancialDataRow label="Maintenance" value={fmt.currency(operating.maintenanceReserve)} />
      <FinancialDataRow label="CapEx" value={fmt.currency(operating.capexReserve)} />
      <FinancialDataRow label="Tax" value={fmt.currency(operating.monthlyPropertyTax)} />
      <FinancialDataRow label="Insurance" value={fmt.currency(operating.monthlyInsurance)} />
      <FinancialDataRow
        label="Other Expenses"
        value={fmt.currency(operating.monthlyHoa + operating.monthlyUtilities + operating.otherMonthlyExpenses)}
      />
      <SectionDivider />
      <FinancialDataRow label="NOI" value={fmt.currency(operating.monthlyNoi)} emphasis />
      <FinancialDataRow
        label="Cashflow"
        value={cashflow == null ? "—" : fmt.signedCurrency(cashflow)}
        emphasis
        tone={cashflow == null ? "muted" : cashflow >= 0 ? "success" : "danger"}
      />
    </FinancialSection>
  );
}

export function RefinanceWorksheet({ results }: { results: QuickUnderwriteResults }) {
  const fmt = useFormatters();
  const refi = results.refinance;
  const recovery = results.cashRecovery;
  const limited = refi.limitingFactor === "dscr";

  return (
    <FinancialSection eyebrow="Stage 3" title="Refinance">
      <FinancialDataRow label="ARV" value={refi.arv > 0 ? fmt.currency(refi.arv) : "—"} />
      <FinancialDataRow label="Refinance LTV" value={fmt.percent(refi.refinanceLtv, 0)} />
      <FinancialDataRow label="LTV-Based Loan" value={fmt.currency(refi.ltvBasedMaximumLoan)} />
      <FinancialDataRow
        label="DSCR-Supported Loan"
        value={refi.dscrSupportedMaximumLoan == null ? "—" : fmt.currency(refi.dscrSupportedMaximumLoan)}
      />
      <SectionDivider />
      <FinancialDataRow label="Supported Loan" value={fmt.currency(refi.supportedRefinanceLoan)} emphasis tone="primary" />
      <FinancialDataRow
        label="Limiting Factor"
        value={refi.limitingLabel}
        tone={limited ? "warning" : "success"}
        emphasis
      />
      <FinancialDataRow label="Payment" value={fmt.currency(refi.monthlyPayment)} />
      <FinancialDataRow
        label="Post-Refi DSCR"
        value={refi.postRefiDscrLabel}
        tone={refi.postRefiDscr != null && refi.postRefiDscr + 1e-6 < refi.requiredDscr ? "danger" : "success"}
      />
      <FinancialDataRow
        label="Net Proceeds"
        value={recovery ? fmt.currency(recovery.netRefinanceProceeds) : "—"}
      />
      <FinancialDataRow label="Cash Recovered" value={recovery ? fmt.currency(recovery.cashRecovered) : "—"} />
      <FinancialDataRow
        label="Cash Left In Deal"
        value={recovery ? fmt.currency(recovery.cashLeftInDeal) : "—"}
        tone={recovery && recovery.cashLeftInDeal > 0 ? "warning" : "success"}
      />
      <FinancialDataRow label="Excess Cash Out" value={recovery ? fmt.currency(recovery.excessCashOut) : "—"} />
    </FinancialSection>
  );
}

export function RentBasisPanel({ rent, source }: { rent: QuickRentResolution; source: AnalysisInput["income"] }) {
  const fmt = useFormatters();
  const status = source.verificationStatus ?? "unverified";
  const kind = RENT_SOURCE_KINDS.find((item) => item.value === source.rentSourceKind)?.label;
  const statusLabel = RENT_VERIFICATION_STATUSES.find((item) => item.value === status)?.label;
  const verifiedDate = source.dateVerified?.trim();

  return (
    <FinancialSection title="Verified Rent">
      <FinancialDataRow label="Listing Rent" value={rent.listing > 0 ? fmt.currency(rent.listing) : "—"} />
      <FinancialDataRow
        label="Verified Local Rent"
        value={rent.verified > 0 ? `${fmt.currency(rent.verified)}` : "—"}
        status={rent.verified > 0 ? "pass" : "info"}
        tone="primary"
      />
      <FinancialDataRow label="Conservative Rent" value={rent.conservative > 0 ? fmt.currency(rent.conservative) : "—"} />
      <SectionDivider />
      <FinancialDataRow label="Underwriting Basis" value={rent.basisLabel} emphasis />
      {kind ? <FinancialDataRow label="Source" value={kind} /> : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusIndicator level={status === "unverified" ? "warn" : "pass"}>{statusLabel}</StatusIndicator>
        {verifiedDate ? <span className="text-xs text-muted-foreground">Verified {verifiedDate}</span> : null}
      </div>
    </FinancialSection>
  );
}

export function RefinanceSummary({ refi }: { refi: QuickRefinanceResults }) {
  const fmt = useFormatters();
  return (
    <FinancialSection title="Refinance Sizing">
      <FinancialDataRow label="LTV-Based Loan" value={fmt.currency(refi.ltvBasedMaximumLoan)} />
      <FinancialDataRow
        label="DSCR-Supported Loan"
        value={refi.dscrSupportedMaximumLoan == null ? "—" : fmt.currency(refi.dscrSupportedMaximumLoan)}
      />
      <FinancialDataRow label="Supported Loan" value={fmt.currency(refi.supportedRefinanceLoan)} emphasis />
      <FinancialDataRow label="Limiting Factor" value={refi.limitingLabel} />
      <FinancialDataRow label="Payment" value={fmt.currency(refi.monthlyPayment)} />
      <FinancialDataRow label="Post-Refi DSCR" value={refi.postRefiDscrLabel} />
    </FinancialSection>
  );
}

export function CashRecoverySummary({ results }: { results: QuickUnderwriteResults }) {
  const fmt = useFormatters();
  const recovery = results.cashRecovery;
  if (!recovery) {
    return (
      <FinancialSection title="Cash Recovery">
        <p className="text-sm text-muted-foreground">Enter ARV and refinance terms to size cash recovered versus cash left in the deal.</p>
      </FinancialSection>
    );
  }
  return (
    <FinancialSection title="Cash Recovery">
      <FinancialDataRow label="Capital Invested" value={fmt.currency(recovery.totalCapitalInvested)} />
      <FinancialDataRow label="Net Proceeds" value={fmt.currency(recovery.netRefinanceProceeds)} />
      <FinancialDataRow label="Cash Recovered" value={fmt.currency(recovery.cashRecovered)} emphasis />
      <FinancialDataRow label="Cash Left In Deal" value={fmt.currency(recovery.cashLeftInDeal)} />
      <FinancialDataRow label="Excess Cash Out" value={fmt.currency(recovery.excessCashOut)} />
    </FinancialSection>
  );
}
