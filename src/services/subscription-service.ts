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
