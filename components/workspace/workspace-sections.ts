export const WORKSPACE_SECTIONS = [
  {
    id: "acquisition",
    number: "1",
    title: "Acquisition",
    description: "Property, strategy and what it costs to get in.",
  },
  {
    id: "value",
    number: "2",
    title: "Value & Exit",
    description: "Conservative ARV drives the underwrite. The guideline is configurable, not a valuation rule.",
  },
  {
    id: "income",
    number: "3",
    title: "Income",
    description: "Advertised, current and conservative rent. Decision analysis uses conservative rent.",
  },
  {
    id: "expenses",
    number: "4",
    title: "Operating Expenses",
    description: "Tax, insurance, reserves and utilities. These sit in NOI, not in the mortgage payment.",
  },
  {
    id: "financing",
    number: "5",
    title: "Financing",
    description: "Loan terms only. Cash flow uses P&I; PITI is shown for context.",
  },
  {
    id: "analysis",
    number: "6",
    title: "Analysis",
    description: "Live summary, scenarios and what-breaks land here next.",
  },
] as const;

export type WorkspaceSectionId = (typeof WORKSPACE_SECTIONS)[number]["id"];
