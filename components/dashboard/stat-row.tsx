import type { ReactNode } from "react";
import { FinancialDataRow, type DataRowTone } from "@/components/underwriting/financial-data-row";

interface StatRowProps {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  className?: string;
  tone?: DataRowTone;
  detail?: ReactNode;
  labelAccessory?: ReactNode;
}

export function StatRow({ label, value, emphasis = false, className, tone, detail, labelAccessory }: StatRowProps) {
  return (
    <FinancialDataRow
      label={label}
      value={value}
      emphasis={emphasis}
      className={className}
      tone={tone}
      detail={detail}
      labelAccessory={labelAccessory}
    />
  );
}
