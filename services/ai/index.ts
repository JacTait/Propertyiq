import { LocalSummaryProvider } from "@/services/ai/local-summary-provider";
import type { InvestmentSummaryProvider } from "@/services/ai/types";

export type { InvestmentSummaryProvider, SummaryContext } from "@/services/ai/types";
export { buildLocalSummary, LocalSummaryProvider } from "@/services/ai/local-summary-provider";

/**
 * Resolve the active summary provider.
 * Swap in an LLM-backed provider here (e.g. OpenAI) without touching UI code.
 */
export function getSummaryProvider(): InvestmentSummaryProvider {
  return new LocalSummaryProvider();
}
