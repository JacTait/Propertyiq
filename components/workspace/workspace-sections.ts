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
    description: "Advertised ARV, conservative ARV and the investor guideline max offer.",
  },
  {
    id: "income",
    number: "3",
    title: "Income",
    description: "Advertised/projected rent, current rent and conservative rent. The underwrite uses conservative rent.",
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
    description: "Assumption quality, scenarios and the limits of the current underwrite.",
  },
] as const;

export type WorkspaceSectionId = (typeof WORKSPACE_SECTIONS)[number]["id"];
