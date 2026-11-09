/**
 * Billing service contract.
 *
 * Designed so a Stripe (or Paddle / LemonSqueezy) adapter can be dropped in
 * without UI changes. Only interfaces and a local placeholder live here.
 */

export type PlanId = "free" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  features: string[];
  limits: {
    savedProperties: number;
    pdfExports: number;
    aiSummaries: number;
  };
}

export interface Subscription {
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  renewsAt: string | null;
}

export interface BillingProvider {
  readonly id: string;
  listPlans(): Promise<Plan[]>;
  getSubscription(userId: string): Promise<Subscription | null>;
  createCheckoutSession(userId: string, planId: PlanId): Promise<{ url: string }>;
  createPortalSession(userId: string): Promise<{ url: string }>;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter",
    priceMonthly: 0,
    features: ["3 saved properties", "Core metrics", "Deal score"],
    limits: { savedProperties: 3, pdfExports: 1, aiSummaries: 3 },
  },
  {
    id: "pro",
    name: "Investor Pro",
    priceMonthly: 29,
    features: ["Unlimited properties", "PDF reports", "AI summaries", "Portfolio compare"],
    limits: { savedProperties: Infinity, pdfExports: Infinity, aiSummaries: Infinity },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 99,
    features: ["Team workspaces", "API access", "Priority support"],
    limits: { savedProperties: Infinity, pdfExports: Infinity, aiSummaries: Infinity },
  },
];

export class LocalBillingProvider implements BillingProvider {
  readonly id = "local";

  async listPlans(): Promise<Plan[]> {
    return PLANS;
  }

  async getSubscription(): Promise<Subscription | null> {
    return { planId: "pro", status: "active", renewsAt: null };
  }

  async createCheckoutSession(): Promise<{ url: string }> {
    return { url: "/settings" };
  }

  async createPortalSession(): Promise<{ url: string }> {
    return { url: "/settings" };
  }
}

export function getBillingProvider(): BillingProvider {
  return new LocalBillingProvider();
}
