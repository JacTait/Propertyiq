import { FinancialDataRow } from "@/components/underwriting/financial-data-row";
import { StatusIndicator } from "@/components/underwriting/status-indicator";

/** Isolated marketing composition. Hardcoded demonstration figures only. */
export function ProductPreview() {
  return (
    <div
      aria-hidden
      className="border border-border bg-card rounded-[10px] p-4 sm:p-5"
      data-demo="propertyiq-preview"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Property</p>
          <p className="mt-1 font-heading text-xl font-medium">Memphis Single Family</p>
          <p className="mt-1 text-xs text-muted-foreground">123 Test Street · Memphis, TN 38109</p>
        </div>
        <StatusIndicator level="pass">Inside</StatusIndicator>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Decision</p>
          <p className="mt-1 font-heading text-2xl font-medium text-success">Worth Pursuing</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Maximum Offer</p>
          <p className="mt-1 font-figure text-[32px] font-medium leading-none tabular-nums">$96,200</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-px border border-border bg-border">
        {[
          ["DSCR", "1.31x"],
          ["Cashflow", "+$327"],
          ["Buy Box", "Inside"],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-3 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-1 font-figure text-lg tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <FinancialDataRow label="Asking Price" value="$101,000" />
        <FinancialDataRow label="All-In Cost" value="$125,500" emphasis />
        <FinancialDataRow label="Supported Loan" value="$148,750" />
        <FinancialDataRow label="Primary Risk" value="Rehab Overrun" tone="warning" />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Demonstration figures. Not connected to your saved deals.</p>
    </div>
  );
}
