import type { AnalysisInput, AnalysisResults, InvestmentSummary } from "@/lib/types";

export interface SummaryContext {
  input: AnalysisInput;
  results: AnalysisResults;
  regionName: string;
  formatCurrency: (value: number) => string;
  formatPercent: (value: number, decimals?: number) => string;
}

/**
 * Contract for any investment-summary provider.
 * The default implementation is rule-based and runs locally; an LLM-backed
 * provider (e.g. OpenAI) can implement the same interface later.
 */
export interface InvestmentSummaryProvider {
  readonly id: string;
  readonly label: string;
  generate(context: SummaryContext): Promise<InvestmentSummary>;
}
