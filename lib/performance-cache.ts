// Performance cache with memory limits and automatic cleanup

import { db } from "@/lib/db";
import { subscription, user } from "./db/schema";

// Regex constants
const SESSION_TOKEN_RE = /better-auth\.session_token=([^;]+)/;

// Time constants
const ONE_MINUTE_MS = 60_000 as const;
const TWO_MINUTES_MS = 120_000 as const;
const FIVE_MINUTES_MS = 300_000 as const;
const FIFTEEN_MINUTES_MS = 900_000 as const;
const THIRTY_MINUTES_MS = 1_800_000 as const;

// Cache size defaults
const DEFAULT_MAX_SIZE = 1000 as const;
const SESSIONS_MAX = 500 as const;
const SUBSCRIPTIONS_MAX = 1000 as const;
const USAGE_COUNTS_MAX = 2000 as const;
const PRO_USER_MAX = 1000 as const;

type CacheEntry<T> = {
  data: T;
  cachedAt: number;
  accessCount: number;
  lastAccessed: number;
};

class PerformanceCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(
    maxSize: number = DEFAULT_MAX_SIZE,
    ttlMs: number = TWO_MINUTES_MS
  ) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;

    // Clean up periodically
    setInterval(() => this.cleanup(), FIVE_MINUTES_MS);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.cachedAt > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  set(key: string, data: T): void {
    // Enforce memory limits
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey = "";
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let _evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > this.ttl) {
        this.cache.delete(key);
        _evicted++;
      }
    }

    // Cleanup completed silently
  }
}

// Create cache instances with appropriate limits
export const sessionCache = new PerformanceCache<unknown>(
  SESSIONS_MAX,
  FIFTEEN_MINUTES_MS
); // 15 min, 500 sessions
export const subscriptionCache = new PerformanceCache<unknown>(
  SUBSCRIPTIONS_MAX,
  ONE_MINUTE_MS
); // 1 min, 1000 users
export const usageCountCache = new PerformanceCache<number>(
  USAGE_COUNTS_MAX,
  FIVE_MINUTES_MS
); // 5 min, 2000 users
export const proUserStatusCache = new PerformanceCache<boolean>(
  PRO_USER_MAX,
  THIRTY_MINUTES_MS
); // 30 min, 1000 users

// Cache key generators
export const createSessionKey = (token: string) => `session:${token}`;
export const createUserKey = (token: string) => `user:${token}`;
export const createSubscriptionKey = (userId: string) =>
  `subscription:${userId}`;
export const createMessageCountKey = (userId: string) => `msg-count:${userId}`;
export const createExtremeCountKey = (userId: string) =>
  `extreme-count:${userId}`;
export const createProUserKey = (userId: string) => `pro-user:${userId}`;

// Extract session token from headers
export function extractSessionToken(headers: Headers): string | null {
  const cookies = headers.get("cookie");
  if (!cookies) {
    return null;
  }

  const match = cookies.match(SESSION_TOKEN_RE);
  return match ? match[1] : null;
}

// Pro user status helpers with caching
export function getProUserStatus(userId: string): boolean | null {
  const cacheKey = createProUserKey(userId);
  return proUserStatusCache.get(cacheKey);
}

export function setProUserStatus(userId: string, isProUser: boolean): void {
  const cacheKey = createProUserKey(userId);
  proUserStatusCache.set(cacheKey, isProUser);
}

type MinimalSubscriptionData = {
  hasSubscription?: boolean;
  subscription?: { status?: string; currentPeriodEnd?: string | Date } | null;
};

export function computeAndCacheProUserStatus(
  userId: string,
  subscriptionData: MinimalSubscriptionData
): boolean {
  const sub = subscriptionData?.subscription;
  const now = new Date();
  let currentPeriodEnd: Date | null = null;
  if (sub?.currentPeriodEnd instanceof Date) {
    currentPeriodEnd = sub.currentPeriodEnd;
  } else if (sub?.currentPeriodEnd) {
    currentPeriodEnd = new Date(sub.currentPeriodEnd);
  } else {
    currentPeriodEnd = null;
  }
  const isProUser =
    Boolean(subscriptionData?.hasSubscription) &&
    Boolean(sub) &&
    (sub?.status === "active" || sub?.status === "trialing") &&
    Boolean(currentPeriodEnd && currentPeriodEnd > now);

  setProUserStatus(userId, isProUser);
  return isProUser;
}

// Cache invalidation helpers
export function invalidateUserCaches(userId: string) {
  subscriptionCache.delete(createSubscriptionKey(userId));
  usageCountCache.delete(createMessageCountKey(userId));
  usageCountCache.delete(createExtremeCountKey(userId));
  proUserStatusCache.delete(createProUserKey(userId));
  // Invalidate the db cache
  db.$cache.invalidate({ tables: [user, subscription] });
}

export function invalidateAllCaches() {
  sessionCache.clear();
  subscriptionCache.clear();
  usageCountCache.clear();
  proUserStatusCache.clear();
}
