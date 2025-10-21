// Client-safe subscription utility functions
// These can be imported in both client and server components

export type ClientSubscriptionLike = {
  trialEnd?: string | Date | null;
  status?: string | null;
};

const MS_PER_DAY = 86_400_000 as const;

// Helper to check if subscription is in trial period
export function isInTrial(subscription: ClientSubscriptionLike): boolean {
  if (!subscription?.trialEnd) {
    return false;
  }
  return new Date() < new Date(subscription.trialEnd);
}

// Helper to get subscription type
export function getSubscriptionType(
  subscription: ClientSubscriptionLike
): "trial" | "paid" | "none" {
  if (
    !subscription ||
    (subscription.status !== "active" && subscription.status !== "trialing")
  ) {
    return "none";
  }
  return isInTrial(subscription) ? "trial" : "paid";
}

// Helper to get days remaining in trial
export function getDaysLeftInTrial(
  subscription: ClientSubscriptionLike
): number {
  if (!subscription?.trialEnd) {
    return 0;
  }
  const now = new Date();
  const trialEnd = new Date(subscription.trialEnd);
  if (now >= trialEnd) {
    return 0;
  }
  return Math.ceil((trialEnd.getTime() - now.getTime()) / MS_PER_DAY);
}
