"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const PREFETCH_HOVER_DELAY_MS = 200 as const;

// Client-safe, route-only prefetching (no server-only imports)
export function useChatPrefetch() {
  const router = useRouter();
  const prefetched = useRef<Set<string>>(new Set());

  const prefetchChatRoute = useCallback(
    (chatId: string) => {
      const path = `/search/${chatId}`;
      if (prefetched.current.has(path)) {
        return;
      }
      try {
        router.prefetch(path);
        prefetched.current.add(path);
      } catch (_err) {
        // Prefetch is best-effort; ignore failures silently
      }
    },
    [router]
  );

  const prefetchOnHover = useCallback(
    (chatId: string) => {
      const tid = setTimeout(
        () => prefetchChatRoute(chatId),
        PREFETCH_HOVER_DELAY_MS
      );
      return () => clearTimeout(tid);
    },
    [prefetchChatRoute]
  );

  const prefetchOnFocus = useCallback(
    (chatId: string) => {
      prefetchChatRoute(chatId);
    },
    [prefetchChatRoute]
  );

  const prefetchChats = useCallback(
    (chatIds: string[]) => {
      for (const id of chatIds) {
        prefetchChatRoute(id);
      }
    },
    [prefetchChatRoute]
  );

  return { prefetchChats, prefetchOnHover, prefetchOnFocus, prefetchChatRoute };
}
