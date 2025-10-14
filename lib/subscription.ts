import { eq } from 'drizzle-orm';
import { subscription } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import {
  subscriptionCache,
  createSubscriptionKey,
  getProUserStatus,
  setProUserStatus,
} from './performance-cache';

// Re-export client-safe utilities
export { isInTrial, getSubscriptionType, getDaysLeftInTrial } from './subscription-utils';

export type SubscriptionDetails = {
  id: string;
  productId: string;
  status: string;
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart?: Date | null;
  trialEnd?: Date | null;
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

// Combined function to check Pro status from Polar subscriptions
async function getComprehensiveProStatus(
  userId: string,
): Promise<{ isProUser: boolean; source: 'polar' | 'none' }> {
  try {
    // Check Polar subscriptions
    const userSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .$withCache();
    const now = new Date();
const activeSubscription = userSubscriptions.find(
  (sub) =>
    (sub.status === 'active' || sub.status === 'trialing') &&
    new Date(sub.currentPeriodEnd) > now,
);

    if (activeSubscription) {
      return { isProUser: true, source: 'polar' };
    }

    return { isProUser: false, source: 'none' };
  } catch (error) {
    console.error('Error getting comprehensive pro status:', error);
    return { isProUser: false, source: 'none' };
  }
}

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    // Check cache first
    const cacheKey = createSubscriptionKey(session.user.id);
    const cached = subscriptionCache.get(cacheKey);
    if (cached) {
      // Update pro user status with comprehensive check
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return cached;
    }

    const userSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, session.user.id))
      .$withCache();

    if (!userSubscriptions.length) {
      const proStatus = await getComprehensiveProStatus(session.user.id);
      const result = { hasSubscription: false };
      subscriptionCache.set(cacheKey, result);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return result;
    }

    // Get the most recent active subscription
    const now = new Date();
    const activeSubscription = userSubscriptions
      .filter(
        (sub) =>
          (sub.status === 'active' || sub.status === 'trialing') &&
          new Date(sub.currentPeriodEnd) > now,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!activeSubscription) {
      // Check for canceled or expired subscriptions
      const latestSubscription = userSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = new Date(latestSubscription.currentPeriodEnd) < now;
        const isCanceled = latestSubscription.status === 'canceled';

        const result = {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId,
            status: latestSubscription.status,
            amount: latestSubscription.amount,
            currency: latestSubscription.currency,
            recurringInterval: latestSubscription.recurringInterval,
            currentPeriodStart: latestSubscription.currentPeriodStart,
            currentPeriodEnd: latestSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt,
            trialStart: latestSubscription.trialStart,
            trialEnd: latestSubscription.trialEnd,
            organizationId: null,
          },
          error: isCanceled
            ? 'Subscription has been canceled'
            : isExpired
              ? 'Subscription has expired'
              : 'Subscription is not active',
          errorType: (isCanceled ? 'CANCELED' : isExpired ? 'EXPIRED' : 'GENERAL') as
            | 'CANCELED'
            | 'EXPIRED'
            | 'GENERAL',
        };
        subscriptionCache.set(cacheKey, result);
        const proStatus = await getComprehensiveProStatus(session.user.id);
        setProUserStatus(session.user.id, proStatus.isProUser);
        return result;
      }

      const fallbackResult = { hasSubscription: false };
      subscriptionCache.set(cacheKey, fallbackResult);
      // Cache comprehensive pro user status
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return fallbackResult;
    }

    const result = {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        recurringInterval: activeSubscription.recurringInterval,
        currentPeriodStart: activeSubscription.currentPeriodStart,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt,
        trialStart: activeSubscription.trialStart,
        trialEnd: activeSubscription.trialEnd,
        organizationId: null,
      },
    };
    subscriptionCache.set(cacheKey, result);
    // Cache pro user status as true for active Polar subscription
    setProUserStatus(session.user.id, true);
    return result;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return {
      hasSubscription: false,
      error: 'Failed to load subscription details',
      errorType: 'GENERAL',
    };
  }
}

// Simple helper to check if user has an active Polar subscription
export async function isUserSubscribed(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return false;
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);
    return proStatus.isProUser;
  } catch (error) {
    console.error('Error checking user subscription status:', error);
    return false;
  }
}

// Fast pro user status check using cache
export async function isUserProCached(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return false;
  }

  // Try cache first
  const cached = getProUserStatus(session.user.id);
  if (cached !== null) {
    return cached;
  }

  const proStatus = await getComprehensiveProStatus(session.user.id);
  setProUserStatus(session.user.id, proStatus.isProUser);
  return proStatus.isProUser;
}

// Helper to check if user has access to a specific product/tier
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  const result = await getSubscriptionDetails();
  const sub = result.subscription;
  const now = new Date();
  return (
    result.hasSubscription &&
    sub?.productId === productId &&
    (sub?.status === 'active' || sub?.status === 'trialing') &&
    new Date(sub.currentPeriodEnd) > now
  );
}

// Helper to get user's current subscription status
export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return 'none';
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);

    // For Polar subscriptions, get detailed status
    const result = await getSubscriptionDetails();

    if (!result.hasSubscription) {
      return proStatus.isProUser ? 'active' : 'none';
    }

    if (
      result.subscription &&
      (result.subscription.status === 'active' || result.subscription.status === 'trialing') &&
      new Date(result.subscription.currentPeriodEnd) > new Date()
    ) {
      return 'active';
    }

    if (result.errorType === 'CANCELED') {
      return 'canceled';
    }

    if (result.errorType === 'EXPIRED') {
      return 'expired';
    }

    return 'none';
  } catch (error) {
    console.error('Error getting user subscription status:', error);
    return 'none';
  }
}


// Export the comprehensive pro status function for UI components that need to know the source
export async function getProStatusWithSource(): Promise<{
  isProUser: boolean;
  source: 'polar' | 'none';
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { isProUser: false, source: 'none' };
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);
    return proStatus;
  } catch (error) {
    console.error('Error getting pro status with source:', error);
    return { isProUser: false, source: 'none' };
  }
}
