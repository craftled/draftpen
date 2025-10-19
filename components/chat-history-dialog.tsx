"use client";

import { SearchList02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInMonths,
  differenceInSeconds,
  differenceInWeeks,
  differenceInYears,
  isThisMonth,
  isThisWeek,
  isToday,
  isYesterday,
  subWeeks,
} from "date-fns";
import {
  ArrowUpRight,
  Calendar,
  Check,
  Globe,
  Hash,
  History,
  Lock,
  Pencil,
  Search,
  Trash,
  X,
} from "lucide-react";
import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteChat,
  getUserChats,
  loadMoreChats,
  updateChatTitle,
} from "@/app/actions";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatPrefetch } from "@/hooks/use-chat-prefetch";
import type { User } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./ui/button";

// Constants
const SCROLL_THRESHOLD = 0.8;
const INTERSECTION_ROOT_MARGIN = "100px";
const FOCUS_DELAY = 100;

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  visibility: "public" | "private";
}

interface ChatHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

// Search modes for different filtering strategies
type SearchMode = "all" | "title" | "date" | "visibility";

// Helper function to validate chat ID format
function isValidChatId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}

// Helper function to categorize chats by date
function categorizeChatsByDate(chats: Chat[]) {
  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const thisWeek: Chat[] = [];
  const lastWeek: Chat[] = [];
  const thisMonth: Chat[] = [];
  const older: Chat[] = [];

  const oneWeekAgo = subWeeks(new Date(), 1);

  chats.forEach((chat) => {
    const chatDate = new Date(chat.createdAt);

    if (isToday(chatDate)) {
      today.push(chat);
    } else if (isYesterday(chatDate)) {
      yesterday.push(chat);
    } else if (isThisWeek(chatDate)) {
      thisWeek.push(chat);
    } else if (chatDate >= oneWeekAgo && !isThisWeek(chatDate)) {
      lastWeek.push(chat);
    } else if (isThisMonth(chatDate)) {
      thisMonth.push(chat);
    } else {
      older.push(chat);
    }
  });

  return { today, yesterday, thisWeek, lastWeek, thisMonth, older };
}

// Format time in a compact way with memoization
const formatCompactTime = (() => {
  const cache = new Map<string, { result: string; timestamp: number }>();
  const CACHE_DURATION = 30_000; // 30 seconds cache duration

  return (date: Date): string => {
    const now = new Date();
    const dateKey = date.getTime().toString();
    const cached = cache.get(dateKey);

    // Check if cache is valid (less than 30 seconds old)
    if (cached && now.getTime() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }

    const seconds = differenceInSeconds(now, date);

    let result: string;
    if (seconds < 60) {
      result = `${seconds}s ago`;
    } else {
      const minutes = differenceInMinutes(now, date);
      if (minutes < 60) {
        result = `${minutes}m ago`;
      } else {
        const hours = differenceInHours(now, date);
        if (hours < 24) {
          result = `${hours}h ago`;
        } else {
          const days = differenceInDays(now, date);
          if (days < 7) {
            result = `${days}d ago`;
          } else {
            const weeks = differenceInWeeks(now, date);
            if (weeks < 4) {
              result = `${weeks}w ago`;
            } else {
              const months = differenceInMonths(now, date);
              if (months < 12) {
                result = `${months}mo ago`;
              } else {
                const years = differenceInYears(now, date);
                result = `${years}y ago`;
              }
            }
          }
        }
      }
    }

    // Keep cache size reasonable
    if (cache.size > 1000) {
      cache.clear();
    }

    cache.set(dateKey, { result, timestamp: now.getTime() });
    return result;
  };
})();

// Custom fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest priority
  if (textLower.includes(queryLower)) return true;

  // Fuzzy matching - check if all characters in query appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

// Function to parse DD/MM/YY date format
function parseDateQuery(dateStr: string): Date | null {
  // Check if the string matches DD/MM/YY format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
  const match = dateStr.match(dateRegex);

  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = Number.parseInt(dayStr, 10);
  const month = Number.parseInt(monthStr, 10) - 1; // Month is 0-indexed in Date
  const year = 2000 + Number.parseInt(yearStr, 10); // Convert YY to YYYY (assuming 20XX)

  // Validate the date components
  if (day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }

  const date = new Date(year, month, day);

  // Check if the date is valid (handles cases like 31/02/25)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}

// Function to check if two dates are on the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

// Advanced search function with multiple criteria
function advancedSearch(chat: Chat, query: string, mode: SearchMode): boolean {
  if (!query) return true;

  // Handle special search prefixes
  if (query.startsWith("public:")) {
    return (
      chat.visibility === "public" && fuzzySearch(query.slice(7), chat.title)
    );
  }

  if (query.startsWith("private:")) {
    return (
      chat.visibility === "private" && fuzzySearch(query.slice(8), chat.title)
    );
  }

  if (query.startsWith("today:")) {
    return (
      isToday(new Date(chat.createdAt)) &&
      fuzzySearch(query.slice(6), chat.title)
    );
  }

  if (query.startsWith("week:")) {
    return (
      isThisWeek(new Date(chat.createdAt)) &&
      fuzzySearch(query.slice(5), chat.title)
    );
  }

  if (query.startsWith("month:")) {
    return (
      isThisMonth(new Date(chat.createdAt)) &&
      fuzzySearch(query.slice(6), chat.title)
    );
  }

  // Handle date: prefix with DD/MM/YY format
  if (query.startsWith("date:")) {
    const dateQuery = query.slice(5).trim();
    const parsedDate = parseDateQuery(dateQuery);
    if (parsedDate) {
      return isSameDay(new Date(chat.createdAt), parsedDate);
    }
    // If not a valid DD/MM/YY format, fall back to fuzzy search on the date query
    return fuzzySearch(
      dateQuery,
      new Date(chat.createdAt).toLocaleDateString()
    );
  }

  // Regular search based on mode
  switch (mode) {
    case "title":
      return fuzzySearch(query, chat.title);
    case "date": {
      // In date mode, first try to parse as DD/MM/YY format
      const parsedDate = parseDateQuery(query.trim());
      if (parsedDate) {
        return isSameDay(new Date(chat.createdAt), parsedDate);
      }
      // If not DD/MM/YY format, fall back to fuzzy search on date string
      const dateStr = new Date(chat.createdAt).toLocaleDateString();
      return fuzzySearch(query, dateStr);
    }
    case "visibility":
      return fuzzySearch(query, chat.visibility);
    case "all":
    default:
      return (
        fuzzySearch(query, chat.title) ||
        fuzzySearch(query, chat.visibility) ||
        fuzzySearch(query, new Date(chat.createdAt).toLocaleDateString())
      );
  }
}

// Main component
export function ChatHistoryDialog({
  open,
  onOpenChange,
  user,
}: ChatHistoryDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const rawChatId = pathname?.startsWith("/search/")
    ? pathname.split("/")[2]
    : null;
  const currentChatId =
    rawChatId && isValidChatId(rawChatId) ? rawChatId : null;

  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [navigating, setNavigating] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [, forceUpdate] = useState({});

  // Use the new prefetching system
  const { prefetchChats, prefetchOnHover, prefetchOnFocus, prefetchChatRoute } =
    useChatPrefetch();

  // Focus search input on dialog open
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use infinite query for pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["chats", user?.id],
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return { chats: [], hasMore: false };

      if (pageParam) {
        // Load more chats using the last chat ID as cursor
        return await loadMoreChats(user.id, pageParam, 20);
      }
      // Initial load
      return await getUserChats(user.id, 20);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.chats.length === 0) return;
      return lastPage.chats[lastPage.chats.length - 1].id;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30_000, // 30 seconds
    initialPageParam: undefined,
    // Initialize with empty array when user is null
    initialData: user
      ? undefined
      : { pages: [{ chats: [], hasMore: false }], pageParams: [undefined] },
    // Don't keep data in cache when logged out
    gcTime: user ? 5 * 60 * 1000 : 0,
  });

  // Flatten all chats from all pages
  const allChats = data?.pages.flatMap((page) => page.chats) || [];

  // Clear delete confirmation state when dialog closes
  useEffect(() => {
    if (!open) {
      setDeletingChatId(null);
      setEditingChatId(null);
      setEditingTitle("");
      setSearchQuery("");
      setSearchMode("all");
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      // Clear update timer when dialog closes
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus the search input after a small delay to ensure the dialog is fully rendered
      focusTimeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, FOCUS_DELAY);
    }
    // Reset search query when dialog opens
    if (open) {
      setSearchQuery("");
      setSearchMode("all");
    }

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [open]);

  // Periodic update for real-time timestamps
  useEffect(() => {
    if (!open) return;

    const updateTimes = () => {
      // Force a re-render to update the displayed times
      forceUpdate({});

      // Schedule next update
      updateTimerRef.current = setTimeout(updateTimes, 30_000); // Update every 30 seconds
    };

    // Start the update cycle
    updateTimerRef.current = setTimeout(updateTimes, 30_000);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [open]);

  // Filter chats based on search query and mode with memoization
  const filteredChats = useMemo(
    () =>
      allChats.filter((chat) => advancedSearch(chat, searchQuery, searchMode)),
    [allChats, searchQuery, searchMode]
  );

  // Categorize filtered chats with memoization
  const categorizedChats = useMemo(
    () => categorizeChatsByDate(filteredChats),
    [filteredChats]
  );

  // Explicitly refetch when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      refetch();
    }
  }, [open, user?.id, refetch]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidation = () => {
      if (user?.id) {
        refetch();
      }
    };

    window.addEventListener("invalidate-chats-cache", handleCacheInvalidation);
    return () => {
      window.removeEventListener(
        "invalidate-chats-cache",
        handleCacheInvalidation
      );
    };
  }, [user?.id, refetch]);

  // Handle mutations with React Query
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteChat(id);
    },
    onSuccess: (_, id) => {
      toast.success("Chat deleted");
      // Update cache after successful deletion
      queryClient.setQueryData(["chats", user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            chats: page.chats.filter((chat: Chat) => chat.id !== id),
          })),
        };
      });
    },
    onError: (error) => {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat. Please try again.");
      queryClient.invalidateQueries({ queryKey: ["chats", user?.id] });
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) =>
      await updateChatTitle(id, title),
    onSuccess: (updatedChat, { id, title }) => {
      if (updatedChat) {
        toast.success("Title updated");
        // Update cache after successful title update
        queryClient.setQueryData(["chats", user?.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              chats: page.chats.map((chat: Chat) =>
                chat.id === id ? { ...chat, title } : chat
              ),
            })),
          };
        });
      } else {
        toast.error("Failed to update title. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Failed to update chat title:", error);
      toast.error("Failed to update title. Please try again.");
    },
  });

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      const scrolledPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Load more when user scrolls to threshold
      if (
        scrolledPercentage > SCROLL_THRESHOLD &&
        hasNextPage &&
        !isFetchingNextPage &&
        !isLoading
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]
  );

  // Intersection Observer for more precise infinite scroll with proper cleanup
  useEffect(() => {
    const currentTrigger = loadMoreTriggerRef.current;
    const currentList = listRef.current;

    if (!(currentTrigger && currentList)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          fetchNextPage();
        }
      },
      {
        root: currentList,
        rootMargin: INTERSECTION_ROOT_MARGIN,
        threshold: 0.1,
      }
    );

    observer.observe(currentTrigger);

    return () => {
      observer.unobserve(currentTrigger);
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // Enhanced prefetching with data prefetching
  useEffect(() => {
    if (open && allChats.length > 0) {
      // Prefetch the first 10 chats with high priority (visible ones)
      const visibleChats = allChats.slice(0, 10);

      // Prefetch route and data for visible chats
      visibleChats.forEach((chat) => {
        prefetchChatRoute(chat.id);
      });

      // Prefetch data for remaining chats with lower priority
      if (allChats.length > 10) {
        const remainingChats = allChats.slice(10, 20); // Next 10 chats
        const remainingChatIds = remainingChats.map((chat) => chat.id);
        prefetchChats(remainingChatIds);
      }
    }
  }, [open, allChats, prefetchChats, prefetchChatRoute]);

  // Handle chat selection

  // Handle chat deletion with inline confirmation
  const handleDeleteChat = useCallback(
    (e: React.MouseEvent | KeyboardEvent, id: string) => {
      e.stopPropagation();
      console.log("SETTING DELETING CHAT ID:", id);
      setDeletingChatId(id);
    },
    []
  );

  // Confirm deletion with improved logic
  const confirmDeleteChat = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeletingChatId(null);

      try {
        await deleteMutation.mutateAsync(id);

        // Smart redirect logic: only redirect to home if deleting current chat
        if (currentChatId === id) {
          redirect("/");
        }
        // If not current chat, stay in the dialog
      } catch (error) {
        // Error handling is done in mutation callbacks, but we should reset state
        console.error("Delete chat error:", error);
        toast.error("Failed to delete chat. Please try again.");
      }
    },
    [deleteMutation, currentChatId]
  );

  // Cancel deletion
  const cancelDeleteChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("CANCELING DELETION");
    setDeletingChatId(null);
  }, []);

  // Handle chat title editing
  const handleEditTitle = useCallback(
    (e: React.MouseEvent | KeyboardEvent, id: string, currentTitle: string) => {
      e.stopPropagation();

      // Prevent editing if chat is in deleting state
      if (deletingChatId === id) {
        console.warn("Cannot edit title while chat is in deleting state");
        return;
      }

      setEditingChatId(id);
      setEditingTitle(currentTitle || "");
    },
    [deletingChatId]
  );

  // Save edited title
  const saveEditedTitle = useCallback(
    async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
      e.stopPropagation();

      if (!editingTitle.trim()) {
        toast.error("Title cannot be empty");
        return;
      }

      if (editingTitle.trim().length > 100) {
        toast.error("Title is too long (max 100 characters)");
        return;
      }

      try {
        await updateTitleMutation.mutateAsync({
          id,
          title: editingTitle.trim(),
        });
        setEditingChatId(null);
        setEditingTitle("");
      } catch (error) {
        // Error handling is done in mutation callbacks
        console.error("Save title error:", error);
      }
    },
    [editingTitle, updateTitleMutation]
  );

  // Cancel title editing
  const cancelEditTitle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle("");
  }, []);

  // Handle key press in title input
  const handleTitleKeyPress = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === "Enter") {
        saveEditedTitle(e, id);
      } else if (e.key === "Escape") {
        cancelEditTitle(e as any);
      }
    },
    [saveEditedTitle, cancelEditTitle]
  );

  // Get search mode icon and label
  const getSearchModeInfo = (mode: SearchMode) => {
    switch (mode) {
      case "title":
        return { icon: Hash, label: "Title" };
      case "date":
        return { icon: Calendar, label: "Date" };
      case "visibility":
        return { icon: Globe, label: "Visibility" };
      case "all":
      default:
        return { icon: Search, label: "All" };
    }
  };

  const currentModeInfo = getSearchModeInfo(searchMode);
  const IconComponent = currentModeInfo.icon;

  // Function to cycle search modes
  const cycleSearchMode = useCallback(() => {
    const modes: SearchMode[] = ["all", "title", "date", "visibility"];
    const currentIndex = modes.indexOf(searchMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setSearchMode(nextMode);
  }, [searchMode]);

  // Helper function to render a chat item
  const renderChatItem = (chat: Chat) => {
    const isCurrentChat = currentChatId === chat.id;
    const isPublic = chat.visibility === "public";
    const isDeleting = deletingChatId === chat.id;
    const isEditing = editingChatId === chat.id;
    const displayTitle = chat.title || "Untitled Conversation";

    // Prefetch on hover
    const handleMouseEnter = () => {
      if (!(isDeleting || isEditing)) {
        prefetchOnHover(chat.id);
      }
    };

    // Prefetch on focus (keyboard navigation)
    const handleFocus = () => {
      if (!(isDeleting || isEditing)) {
        prefetchOnFocus(chat.id);
      }
    };

    return (
      <CommandItem
        aria-label={
          isDeleting
            ? `Delete ${displayTitle}? Press Enter to confirm, Escape to cancel`
            : isEditing
              ? `Editing title: ${displayTitle}`
              : `Open chat: ${displayTitle}`
        }
        className={cn(
          "mx-1 my-0.5 flex items-center rounded-md px-3 py-2.5 transition-all duration-200 ease-in-out",
          isDeleting &&
            "border border-red-200 bg-red-50 shadow-sm hover:bg-red-100 dark:border-red-800 dark:bg-red-950/20 dark:hover:bg-red-900/30",
          isEditing &&
            "border border-muted-foreground/20 bg-muted/30 shadow-sm dark:bg-muted/20",
          !(isDeleting || isEditing) &&
            "border border-transparent hover:bg-muted/50"
        )}
        data-chat-id={chat.id}
        disabled={navigating === chat.id}
        key={chat.id}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onSelect={() => {
          if (!(isDeleting || isEditing)) {
            setNavigating(chat.id);
            router.push(`/search/${chat.id}`);
          }
        }}
        role="option"
        value={chat.id}
      >
        <Link className="w-full" href={`/search/${chat.id}`} prefetch>
          <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3">
            {/* Icon with visibility indicator */}
            <div className="relative flex w-5 items-center justify-center">
              {navigating === chat.id ? (
                <Spinner className="h-4 w-4 shrink-0" />
              ) : isPublic ? (
                <Globe
                  aria-label="Public chat"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isCurrentChat
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-blue-500/70 dark:text-blue-500/70"
                  )}
                />
              ) : (
                <Lock
                  aria-label="Private chat"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isCurrentChat ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              )}
            </div>

            {/* Title - editable when in edit mode */}
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <input
                  autoFocus
                  className="w-full rounded border border-muted-foreground/10 bg-background px-2 py-1 text-sm focus:border-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-muted-foreground/20"
                  maxLength={100}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => handleTitleKeyPress(e, chat.id)}
                  placeholder="Enter title..."
                  type="text"
                  value={editingTitle}
                />
              ) : (
                <span
                  className={cn(
                    "block truncate",
                    isCurrentChat && "font-medium",
                    isDeleting && "font-medium text-red-700 dark:text-red-300",
                    isEditing && "text-muted-foreground"
                  )}
                >
                  {isDeleting ? `Delete "${displayTitle}"?` : displayTitle}
                </span>
              )}
            </div>

            {/* Meta information and actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isDeleting ? (
                // Delete confirmation actions
                <>
                  <Button
                    aria-label="Confirm delete"
                    className="h-7 w-7 flex-shrink-0 text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
                    disabled={deleteMutation.isPending}
                    onClick={(e) => confirmDeleteChat(e, chat.id)}
                    size="icon"
                    variant="ghost"
                  >
                    {deleteMutation.isPending ? (
                      <Spinner className="h-4 w-4 text-red-600" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    aria-label="Cancel delete"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
                    onClick={cancelDeleteChat}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : isEditing ? (
                // Edit confirmation actions
                <>
                  <Button
                    aria-label="Save title"
                    className="h-7 w-7 flex-shrink-0 text-foreground hover:bg-muted hover:text-foreground"
                    disabled={updateTitleMutation.isPending}
                    onClick={(e) => saveEditedTitle(e, chat.id)}
                    size="icon"
                    variant="ghost"
                  >
                    {updateTitleMutation.isPending ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    aria-label="Cancel edit"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
                    onClick={cancelEditTitle}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                // Normal state actions
                <>
                  {/* Timestamp - more compact */}
                  <span className="w-16 whitespace-nowrap text-right text-muted-foreground text-xs">
                    {formatCompactTime(new Date(chat.createdAt))}
                  </span>

                  {/* Actions - contextual based on states */}
                  <Button
                    aria-label={`Edit title of ${displayTitle}`}
                    className={cn(
                      "h-7 w-7 flex-shrink-0 transition-colors",
                      isCurrentChat
                        ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      (deleteMutation.isPending ||
                        updateTitleMutation.isPending ||
                        !!deletingChatId ||
                        !!editingChatId) &&
                        "pointer-events-none opacity-50"
                    )}
                    disabled={
                      navigating === chat.id ||
                      deleteMutation.isPending ||
                      updateTitleMutation.isPending ||
                      !!deletingChatId ||
                      !!editingChatId
                    }
                    onClick={(e) => handleEditTitle(e, chat.id, chat.title)}
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${displayTitle}`}
                    className={cn(
                      "h-7 w-7 flex-shrink-0 transition-colors",
                      isCurrentChat
                        ? "text-red-600/70 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                        : "text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30",
                      (deleteMutation.isPending ||
                        updateTitleMutation.isPending ||
                        !!deletingChatId ||
                        !!editingChatId) &&
                        "pointer-events-none opacity-50"
                    )}
                    disabled={
                      navigating === chat.id ||
                      deleteMutation.isPending ||
                      updateTitleMutation.isPending ||
                      !!deletingChatId ||
                      !!editingChatId
                    }
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  <div className="flex w-6 justify-end">
                    {isCurrentChat ? (
                      <span className="rounded-sm bg-primary px-1.5 py-0.5 text-primary-foreground text-xs">
                        Current
                      </span>
                    ) : (
                      <ArrowUpRight className="h-3 w-3" />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Link>
      </CommandItem>
    );
  };

  // Redirect to sign in page
  const handleSignIn = () => {
    onOpenChange(false);
    redirect("/sign-in");
  };

  // Show sign in prompt if user is not logged in
  if (!user) {
    return (
      <CommandDialog onOpenChange={onOpenChange} open={open}>
        <Empty className="min-h-[250px]">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <History className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Access Your Chat History</EmptyTitle>
            <EmptyDescription>
              Sign in to view, search, and manage all your previous
              conversations seamlessly.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button className="w-full max-w-[200px]" onClick={handleSignIn}>
              Sign In
            </Button>
            <p className="text-muted-foreground text-xs">
              Your conversations are automatically saved when you are signed in.
            </p>
          </EmptyContent>
        </Empty>
      </CommandDialog>
    );
  }

  return (
    <>
      <CommandDialog onOpenChange={onOpenChange} open={open}>
        <div className="relative">
          {/* Custom search input with mode indicator */}
          <div className="flex h-12 items-center gap-2 border-b px-3 pr-16 sm:pr-20">
            <IconComponent className="size-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 pr-2 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Tab" &&
                  !e.shiftKey &&
                  !e.ctrlKey &&
                  !e.metaKey
                ) {
                  e.preventDefault();
                  // Cycle through search modes only with plain Tab
                  cycleSearchMode();
                }
              }}
              placeholder={`Search ${currentModeInfo.label.toLowerCase()}...`}
              ref={inputRef}
              value={searchQuery}
            />
            <div className="absolute top-3 right-12 flex items-center gap-1">
              <Button
                className="h-6 bg-muted px-1.5 text-xs hover:bg-muted/80 sm:px-2"
                onClick={cycleSearchMode}
                size="sm"
                variant="ghost"
              >
                {currentModeInfo.label}
              </Button>
            </div>
          </div>

          <CommandList
            aria-label="Chat history"
            className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent max-h-[520px] min-h-[520px] flex-1 [&>[cmdk-list-sizer]]:space-y-6! [&>[cmdk-list-sizer]]:py-2!"
            onScroll={handleScroll}
            ref={listRef}
            role="listbox"
          >
            {isLoading ? (
              <div>
                <CommandGroup heading="Recent Conversations">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <CommandItem
                        className="flex items-center justify-between gap-2! rounded-md p-2! px-3!"
                        disabled
                        key={`skeleton-${i}`}
                      >
                        <div className="flex min-w-0 flex-grow items-center gap-2">
                          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                          <Skeleton className="h-4 w-[180px]" />
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-3 w-[70px]" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </div>
            ) : (
              <>
                {allChats.length > 0 ? (
                  <>
                    {[
                      { key: "today", heading: "Today" },
                      { key: "yesterday", heading: "Yesterday" },
                      { key: "thisWeek", heading: "This Week" },
                      { key: "lastWeek", heading: "Last Week" },
                      { key: "thisMonth", heading: "This Month" },
                      { key: "older", heading: "Older" },
                    ].map(({ key, heading }) => {
                      const chats =
                        categorizedChats[key as keyof typeof categorizedChats];
                      return (
                        chats.length > 0 && (
                          <CommandGroup
                            className="mb-0! py-1! [&_[cmdk-group-heading]]:py-0.5!"
                            heading={heading}
                            key={key}
                          >
                            {chats.map((chat) => renderChatItem(chat))}
                          </CommandGroup>
                        )
                      );
                    })}

                    {/* Infinite scroll trigger and loading indicator */}
                    {hasNextPage && (
                      <div
                        className="flex items-center justify-center px-3 py-2"
                        ref={loadMoreTriggerRef}
                      >
                        {isFetchingNextPage ? (
                          <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <Spinner />
                            Loading more...
                          </div>
                        ) : (
                          <div className="h-1" />
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <CommandEmpty>
                    <Empty className="border-0">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <History className="size-6" />
                        </EmptyMedia>
                        <EmptyTitle>No conversations found</EmptyTitle>
                        {searchQuery ? (
                          <EmptyDescription>
                            Try a different search term or change search mode
                          </EmptyDescription>
                        ) : (
                          <EmptyDescription>
                            Start a new chat to begin
                          </EmptyDescription>
                        )}
                      </EmptyHeader>
                      {searchQuery ? (
                        <EmptyContent>
                          <div className="space-y-1.5 text-muted-foreground/80 text-xs">
                            <p className="font-medium">Search tips:</p>
                            <div className="space-y-0.5">
                              <p>
                                •{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  public:
                                </code>{" "}
                                or{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  private:
                                </code>{" "}
                                for visibility
                              </p>
                              <p>
                                •{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  today:
                                </code>
                                ,{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  week:
                                </code>
                                ,{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  month:
                                </code>{" "}
                                for dates
                              </p>
                              <p>
                                •{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  date:22/05/25
                                </code>{" "}
                                for specific date (DD/MM/YY)
                              </p>
                              <p>
                                • Switch to Date mode and type{" "}
                                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                  22/05/25
                                </code>
                              </p>
                            </div>
                          </div>
                        </EmptyContent>
                      ) : (
                        <EmptyContent>
                          <Button
                            className="w-full max-w-[200px]"
                            onClick={() => onOpenChange(false)}
                          >
                            Start a new search
                          </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>

          {/* Mobile hints */}
          <div className="right-0 bottom-0 left-0 block border-border border-t bg-background/90 p-3 text-center text-muted-foreground text-xs sm:hidden">
            <div className="flex items-center justify-center gap-3">
              <span>Tap to open</span>
              <span>•</span>
              <span>Edit to rename</span>
              <span>•</span>
              <span>Trash to delete</span>
            </div>
          </div>

          {/* Desktop keyboard shortcuts */}
          <div className="right-0 bottom-0 left-0 hidden border-border border-t bg-background/90 p-3 text-center text-muted-foreground text-xs sm:block">
            <div className="flex items-center justify-between px-2">
              {/* Important navigation shortcuts on the left */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Kbd className="rounded font-mono">⏎</Kbd> open
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd className="rounded">↑</Kbd>
                  <Kbd className="rounded">↓</Kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd className="rounded">Tab</Kbd> toggle mode
                </span>
              </div>

              {/* Less critical shortcuts on the right */}
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground/80">
                  Click edit to rename • Click trash to delete
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd className="rounded">Esc</Kbd> close
                </span>
              </div>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}

// Navigation Button component for navbar
export function ChatHistoryButton({
  onClickAction,
}: {
  onClickAction: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label="Chat History"
          className={`${buttonVariants({ variant: "ghost", size: "icon" })} !p-0 !m-0 size-6 rounded-full hover:bg-muted`}
          onClick={onClickAction}
          type="button"
        >
          <HugeiconsIcon className="size-6" icon={SearchList02Icon} />
          <span className="sr-only">Chat History</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        Chat History
      </TooltipContent>
    </Tooltip>
  );
}
