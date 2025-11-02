// /lib/utils.ts

import {
  AtomicPowerIcon,
  Camera01Icon,
  ChattingIcon,
  ConnectIcon,
  Database02Icon,
  GlobalSearchIcon,
  MicroscopeIcon,
  NewTwitterIcon,
  RedditIcon,
  Search02Icon,
  YoutubeIcon,
} from "@hugeicons/core-free-icons";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchGroupId =
  | "web"
  | "x"
  | "academic"
  | "youtube"
  | "reddit"
  | "chat"
  | "extreme"
  | "memory"
  | "connectors"
  | "screenshot"
  | "keywords"
  | "serp"
  | "serp-extract"
  | "content-brief";

// Search provider information for dynamic descriptions
export const searchProviderInfo = {
  parallel: "Parallel AI",
  exa: "Exa",
  firecrawl: "Firecrawl",
} as const;

export type SearchProvider = keyof typeof searchProviderInfo;

// Function to get dynamic web search description based on selected provider
export function getWebSearchDescription(
  provider: SearchProvider = "parallel"
): string {
  const providerName = searchProviderInfo[provider];
  return `Search across the entire internet powered by ${providerName}`;
}

// Function to get search groups with dynamic descriptions
export function getSearchGroups(searchProvider: SearchProvider = "parallel") {
  return [
    {
      id: "web" as const,
      name: "Web",
      description: getWebSearchDescription(searchProvider),
      icon: GlobalSearchIcon,
      show: true,
    },
    {
      id: "x" as const,
      name: "X",
      description: "Search X posts",
      icon: NewTwitterIcon,
      show: true,
    },
    {
      id: "connectors" as const,
      name: "Connectors",
      description: "Search Google Drive, Notion and OneDrive documents",
      icon: ConnectIcon,
      show: true,
      requireAuth: true,
      requirePro: true,
    },
    {
      id: "screenshot" as const,
      name: "Screenshot",
      description: "Capture live webpage screenshots with ScreenshotOne",
      icon: Camera01Icon,
      show: true,
      requireAuth: true,
      requirePro: true,
    },
    {
      id: "keywords" as const,
      name: "Keywords",
      description:
        "Keyword research with search volume and difficulty via DataForSEO",
      icon: Search02Icon,
      show: true,
    },
    {
      id: "serp" as const,
      name: "SERP",
      description: "Top 20 results with PAA & related (Serper.dev)",
      icon: Search02Icon,
      show: true,
    },
    {
      id: "serp-extract" as const,
      name: "SERP Extract",
      description: "Extract full content from SERP ranking pages",
      icon: Search02Icon,
      show: true,
    },
    {
      id: "content-brief" as const,
      name: "Content Brief",
      description: "Generate content briefs from SERP analysis",
      icon: Search02Icon,
      show: true,
    },

    {
      id: "academic" as const,
      name: "Academic",
      description: "Search academic papers powered by Exa",
      icon: MicroscopeIcon,
      show: true,
    },
    {
      id: "chat" as const,
      name: "Chat",
      description: "Talk to the model directly.",
      icon: ChattingIcon,
      show: true,
    },
    {
      id: "extreme" as const,
      name: "Extreme",
      description: "Deep research with multiple sources and analysis",
      icon: AtomicPowerIcon,
      show: true,
      requireAuth: true,
    },
    {
      id: "memory" as const,
      name: "Memory",
      description: "Your personal memory companion",
      icon: Database02Icon,
      show: true,
      requireAuth: true,
    },
    {
      id: "reddit" as const,
      name: "Reddit",
      description: "Search Reddit posts",
      icon: RedditIcon,
      show: true,
    },

    {
      id: "youtube" as const,
      name: "YouTube",
      description: "Search YouTube videos powered by Exa",
      icon: YoutubeIcon,
      show: true,
    },
  ] as const;
}

// Keep the static searchGroups for backward compatibility
export const searchGroups = getSearchGroups();

export type SearchGroup = (typeof searchGroups)[number];

export function invalidateChatsCache() {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("invalidate-chats-cache");
    window.dispatchEvent(event);
  }
}
