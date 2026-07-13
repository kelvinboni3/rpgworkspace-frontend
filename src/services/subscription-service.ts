import { apiClient } from "@/services/api-client";

export const SubscriptionStatus = {
  None: 1,
  Trialing: 2,
  Active: 3,
  PastDue: 4,
  Canceled: 5,
} as const;

export type SubscriptionStatusValue = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export type Subscription = {
  userId: string;
  status: SubscriptionStatusValue;
  plan: string | null;
  currentPeriodEnd: string | null;
  manualOverride: boolean;
  isActive: boolean;
};

export type StartCheckoutRequest = {
  plan: string;
};

export type CheckoutSession = {
  checkoutUrl: string;
};

/** Whole days left in an ongoing trial, or null when the subscription isn't an active trial. */
export function trialDaysLeft(subscription: Subscription | undefined): number | null {
  if (
    !subscription ||
    subscription.status !== SubscriptionStatus.Trialing ||
    subscription.manualOverride ||
    !subscription.currentPeriodEnd
  ) {
    return null;
  }

  const msLeft = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
  if (msLeft <= 0) return null;

  return Math.ceil(msLeft / 86_400_000);
}

export const SubscriptionService = {
  async getMine() {
    const response = await apiClient.get<Subscription>(`/subscriptions/me`);
    return response.data;
  },

  async startCheckout(data: StartCheckoutRequest) {
    const response = await apiClient.post<CheckoutSession>(`/subscriptions/checkout`, data);
    return response.data;
  },
};
