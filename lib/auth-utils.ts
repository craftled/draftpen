import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db/queries";
import type { User } from "./db/schema";
import {
  createSessionKey,
  extractSessionToken,
  sessionCache,
} from "./performance-cache";

type AuthSession = {
  user?: {
    id?: string;
    [key: string]: unknown;
  } | null;
} | null;

export const getSession = async (): Promise<AuthSession> => {
  const requestHeaders = await headers();
  const sessionToken = extractSessionToken(requestHeaders);

  // Try cache first (only if we have a session token)
  if (sessionToken) {
    const cacheKey = createSessionKey(sessionToken);
    const cached = sessionCache.get(cacheKey) as AuthSession | null;
    if (cached) {
      return cached;
    }
  }

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  // Only cache valid sessions with users
  if (sessionToken && session?.user) {
    const cacheKey = createSessionKey(sessionToken);
    sessionCache.set(cacheKey, session);
  }

  return session ?? null;
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return await getUserById(userId);
};
