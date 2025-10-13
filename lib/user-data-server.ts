import 'server-only';

import { eq, and } from 'drizzle-orm';
import { subscription, user, account } from './db/schema';
import { db, maindb } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';

import { getCustomInstructionsByUserId } from './db/queries';
import type { CustomInstructions } from './db/schema';



// Single comprehensive user data type
export type ComprehensiveUserData = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProUser: boolean;
  proSource: 'polar' | 'none';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none';
  polarSubscription?: {
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
  };

};

// Lightweight user auth type for fast checks
export type LightweightUserAuth = {
  userId: string;
  email: string;
  isProUser: boolean;
};

const userDataCache = new Map<string, { data: ComprehensiveUserData; expiresAt: number }>();
const lightweightAuthCache = new Map<string, { data: LightweightUserAuth; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LIGHTWEIGHT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes - shorter for lightweight checks

// Custom instructions cache (per-user)
const customInstructionsCache = new Map<
  string,
  {
    instructions: CustomInstructions | null;
    timestamp: number;
    ttl: number;
  }
>();
const CUSTOM_INSTRUCTIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(userId: string): ComprehensiveUserData | null {
  const cached = userDataCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    const data = cached.data;
    // If essential fields are empty, bypass cache to allow fresh resolution from session/provider
    const bad = !data?.email || data.email.trim() === '' || !data?.name || data.name.trim() === '';
    if (!bad) return data;
  }
  if (cached) {
    userDataCache.delete(userId);
  }
  return null;
}

function setCachedUserData(userId: string, data: ComprehensiveUserData): void {
  userDataCache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearUserDataCache(userId: string): void {
  userDataCache.delete(userId);
  // Also clear lightweight auth cache to avoid stale pro status
  lightweightAuthCache.delete(userId);
  // Clear any per-user custom instructions cache
  customInstructionsCache.delete(userId);
}

export function clearAllUserDataCache(): void {
  userDataCache.clear();
  lightweightAuthCache.clear();
  customInstructionsCache.clear();
}

function getCachedLightweightAuth(userId: string): LightweightUserAuth | null {
  const cached = lightweightAuthCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    lightweightAuthCache.delete(userId);
  }
  return null;
}

function setCachedLightweightAuth(userId: string, data: LightweightUserAuth): void {
  lightweightAuthCache.set(userId, {
    data,
    expiresAt: Date.now() + LIGHTWEIGHT_CACHE_TTL_MS,
  });
}

/**
 * Get custom instructions for a user with in-memory caching.
 * Falls back to DB via getCustomInstructionsByUserId when cache miss/expired.
 */
export async function getCachedCustomInstructionsByUserId(
  userId: string,
  options?: { ttlMs?: number },
): Promise<CustomInstructions | null> {
  const ttlMs = options?.ttlMs ?? CUSTOM_INSTRUCTIONS_CACHE_TTL_MS;
  const cached = customInstructionsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.instructions;
  }

  const instructions = await getCustomInstructionsByUserId({ userId });
  customInstructionsCache.set(userId, {
    instructions: instructions ?? null,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
  return instructions ?? null;
}

export function clearCustomInstructionsCache(userId?: string): void {
  if (userId) {
    customInstructionsCache.delete(userId);
  } else {
    customInstructionsCache.clear();
  }
}

/**
 * Lightweight authentication check that only fetches minimal user data.
 * This is much faster than getComprehensiveUserData() and should be used
 * for early auth checks before fetching full user details.
 *
 * @returns Lightweight user auth data or null if not authenticated
 */
export async function getLightweightUserAuth(): Promise<LightweightUserAuth | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check lightweight cache first
    const cached = getCachedLightweightAuth(userId);
    if (cached) {
      return cached;
    }

    // Check if full user data is cached (reuse it if available)
    const fullCached = getCachedUserData(userId);
    if (fullCached) {
      const lightweightData: LightweightUserAuth = {
        userId: fullCached.id,
        email: fullCached.email,
        isProUser: fullCached.isProUser,
      };
      setCachedLightweightAuth(userId, lightweightData);
      return lightweightData;
    }

    // Optimized query: Use simple user query first (JOIN was causing issues with null subscriptions)
    // CRITICAL: Use maindb (not replicas) to avoid replication lag for auth checks
    const [userRecord] = await maindb
      .select({
        userId: user.id,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, userId));

    if (!userRecord) {
      return null;
    }

    // Now check for subscription separately
    const [subscriptionRecord] = await maindb
      .select({
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })
      .from(subscription)
      .where(eq(subscription.userId, userId));

    const result = [{
      userId: userRecord.userId,
      email: userRecord.email,
      subscriptionStatus: subscriptionRecord?.status || null,
      subscriptionEnd: subscriptionRecord?.currentPeriodEnd || null,
    }];

    if (!result || result.length === 0) {
      return null;
    }

    // Check for active Polar subscription (includes trialing)
    const hasActivePolarSub = result.some((row) => 
      row.subscriptionStatus === 'active' || row.subscriptionStatus === 'trialing'
    );

    const lightweightData: LightweightUserAuth = {
      userId: result[0].userId,
      email: result[0].email,
      isProUser: hasActivePolarSub,
    };

    // Cache the result
    setCachedLightweightAuth(userId, lightweightData);

    return lightweightData;
  } catch (error) {
    console.error('Error in lightweight auth check:', error);
    return null;
  }
}

export async function getComprehensiveUserData(): Promise<ComprehensiveUserData | null> {
  try {
    // Get session once
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check cache first
    const cached = getCachedUserData(userId);
    if (cached) {
      return cached;
    }

    // OPTIMIZED: Use JOIN query to reduce DB round trips
    // Fetch user + subscriptions in a single query
    const userWithSubscriptions = await maindb
      .select({
        // User fields
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        userCreatedAt: user.createdAt,
        userUpdatedAt: user.updatedAt,
        // Subscription fields (will be null if no subscription)
        subscriptionId: subscription.id,
        subscriptionCreatedAt: subscription.createdAt,
        subscriptionStatus: subscription.status,
        subscriptionAmount: subscription.amount,
        subscriptionCurrency: subscription.currency,
        subscriptionRecurringInterval: subscription.recurringInterval,
        subscriptionCurrentPeriodStart: subscription.currentPeriodStart,
        subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd,
        subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        subscriptionCanceledAt: subscription.canceledAt,
        subscriptionTrialStart: subscription.trialStart,
        subscriptionTrialEnd: subscription.trialEnd,
        subscriptionProductId: subscription.productId,
      })
      .from(user)
      .leftJoin(subscription, eq(subscription.userId, user.id))
      .where(eq(user.id, userId));

    if (!userWithSubscriptions || userWithSubscriptions.length === 0) {
      return null;
    }

    const userData = userWithSubscriptions[0];


    // Try to enrich from provider account token (e.g., Google id_token)
    let providerClaims: { email?: string; name?: string; picture?: string } = {};
    try {
      const acct = await maindb.query.account.findFirst({
        where: and(eq(account.userId, userId), eq(account.providerId, 'google')),
        columns: { idToken: true },
      });
      const idToken = acct?.idToken;
      if (idToken && idToken.includes('.')) {
        const payloadB64 = idToken.split('.')[1];
        const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(normalized, 'base64').toString('utf8');
        const payload = JSON.parse(json);
        providerClaims.email = payload.email || undefined;
        providerClaims.name = payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(' ') || undefined;
        providerClaims.picture = payload.picture || undefined;
      }
    } catch (e) {
      // Non-fatal; continue with whatever we have
      console.warn('Provider claims decode failed (non-fatal):', e);
    }

    // Optionally backfill empty DB fields if we discovered trustworthy values
    try {
      const updates: Partial<typeof user.$inferInsert> = {} as any;
      if ((userData.email?.trim?.() === '' || !userData.email) && (providerClaims.email)) {
        (updates as any).email = providerClaims.email;
      }
      if ((userData.name?.trim?.() === '' || !userData.name) && (providerClaims.name)) {
        (updates as any).name = providerClaims.name;
      }
      if ((userData.image == null || userData.image === '') && (providerClaims.picture)) {
        (updates as any).image = providerClaims.picture;
      }
      if (Object.keys(updates).length > 0) {
        await maindb.update(user).set({ ...(updates as any), updatedAt: new Date() }).where(eq(user.id, userId));
      }
    } catch (e) {
      console.warn('Backfill of user profile fields failed (non-fatal):', e);
    }

    // Process Polar subscriptions from the joined data
    const polarSubscriptions = userWithSubscriptions
      .filter((row) => row.subscriptionId !== null)
      .map((row) => ({
        id: row.subscriptionId!,
        createdAt: row.subscriptionCreatedAt!,
        status: row.subscriptionStatus!,
        amount: row.subscriptionAmount!,
        currency: row.subscriptionCurrency!,
        recurringInterval: row.subscriptionRecurringInterval!,
        currentPeriodStart: row.subscriptionCurrentPeriodStart!,
        currentPeriodEnd: row.subscriptionCurrentPeriodEnd!,
        cancelAtPeriodEnd: row.subscriptionCancelAtPeriodEnd!,
        canceledAt: row.subscriptionCanceledAt,
        trialStart: row.subscriptionTrialStart,
        trialEnd: row.subscriptionTrialEnd,
        productId: row.subscriptionProductId!,
      }));

    // Process Polar subscription (includes trialing)
    const activePolarSubscription = polarSubscriptions
      .filter((sub) => sub.status === 'active' || sub.status === 'trialing')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Determine overall Pro status and source
    let isProUser = false;
    let proSource: 'polar' | 'none' = 'none';
    let subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none' = 'none';

    if (activePolarSubscription) {
      isProUser = true;
      proSource = 'polar';
      subscriptionStatus = activePolarSubscription.status === 'trialing' ? 'active' : 'active';
    } else {
      // Check for expired/canceled Polar subscriptions
      const latestPolarSubscription = polarSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestPolarSubscription) {
        const now = new Date();
        const isExpired = new Date(latestPolarSubscription.currentPeriodEnd) < now;
        const isCanceled = latestPolarSubscription.status === 'canceled';

        if (isCanceled) {
          subscriptionStatus = 'canceled';
        } else if (isExpired) {
          subscriptionStatus = 'expired';
        }
      }
    }

    // Prefer provider/session values when DB fields are empty strings
    const sessionUser = session?.user as { name?: string | null; email?: string | null; image?: string | null } | null;
    const resolvedName = (userData.name && userData.name.trim())
      ? userData.name
      : (sessionUser?.name?.trim() || providerClaims.name || (userData.email ? userData.email.split('@')[0] : ''));
    const resolvedEmail = (userData.email && userData.email.trim())
      ? userData.email
      : (sessionUser?.email?.trim() || providerClaims.email || '');
    const resolvedImage = userData.image ?? sessionUser?.image ?? providerClaims.picture ?? null;

    // Build comprehensive user data
    const comprehensiveData: ComprehensiveUserData = {
      id: userData.userId,
      email: resolvedEmail,
      emailVerified: userData.emailVerified,
      name: resolvedName,
      image: resolvedImage,
      createdAt: userData.userCreatedAt,
      updatedAt: userData.userUpdatedAt,
      isProUser,
      proSource,
      subscriptionStatus,
    };

    // Add Polar subscription details if exists
    if (activePolarSubscription) {
      comprehensiveData.polarSubscription = {
        id: activePolarSubscription.id,
        productId: activePolarSubscription.productId,
        status: activePolarSubscription.status,
        amount: activePolarSubscription.amount,
        currency: activePolarSubscription.currency,
        recurringInterval: activePolarSubscription.recurringInterval,
        currentPeriodStart: activePolarSubscription.currentPeriodStart,
        currentPeriodEnd: activePolarSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activePolarSubscription.cancelAtPeriodEnd,
        canceledAt: activePolarSubscription.canceledAt,
      };
    }

    // Cache the result
    setCachedUserData(userId, comprehensiveData);

    return comprehensiveData;
  } catch (error) {
    console.error('Error getting comprehensive user data:', error);
    return null;
  }
}

// Helper functions for backward compatibility and specific use cases
export async function isUserPro(): Promise<boolean> {
  const userData = await getComprehensiveUserData();
  return userData?.isProUser || false;
}

export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  const userData = await getComprehensiveUserData();
  return userData?.subscriptionStatus || 'none';
}

export async function getProSource(): Promise<'polar' | 'none'> {
  const userData = await getComprehensiveUserData();
  return userData?.proSource || 'none';
}
