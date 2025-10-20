"use client";

import { MemoryIcon } from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarIcon, Loader2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  deleteMemory,
  getAllMemories,
  type MemoryItem,
  searchMemories,
} from "@/lib/memory-actions";
import { cn } from "@/lib/utils";

export function MemoryDialog() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Infinite query for memories with pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["memories"],
      queryFn: async ({ pageParam }) => {
        const pageNumber = pageParam as number;
        return await getAllMemories(pageNumber);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const hasMore = lastPage.memories.length >= 20;
        return hasMore ? Number(lastPage.memories.at(-1)?.id) : undefined;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  // Search query
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: performSearch,
  } = useQuery({
    queryKey: ["memories", "search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return { memories: [], total: 0 };
      }
      return await searchMemories(searchQuery);
    },
    enabled: false, // Don't run automatically, only when search is triggered
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("MemoryIcon successfully deleted");
    },
    onError: (_error) => {
      toast.error("Failed to delete memory");
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await performSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["memories", "search"] });
  };

  const handleDeleteMemory = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Format date in a more readable way
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) {
      return "Unknown date";
    }
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Get memory content based on the response type
  const getMemoryContent = (memory: MemoryItem): string => {
    if (memory.memory) {
      return memory.memory;
    }
    if (memory.name) {
      return memory.name;
    }
    return "No content available";
  };

  // Determine which memories to display
  const displayedMemories =
    searchQuery.trim() && searchResults
      ? searchResults.memories
      : data?.pages.flatMap((page) => page.memories) || [];

  // Calculate total memories
  const totalMemories =
    searchQuery.trim() && searchResults
      ? searchResults.total
      : data?.pages.reduce((acc, page) => acc + page.memories.length, 0) || 0;

  return (
    <DialogContent className="flex max-h-[85vh] flex-col p-6 sm:max-w-[650px]">
      <DialogHeader className="pb-4">
        <DialogTitle className="flex items-center gap-2 text-xl">
          <MemoryIcon className="h-5 w-5" />
          Your Memories
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          View and manage your saved memories
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <form className="flex gap-2" onSubmit={handleSearch}>
          <Input
            className="flex-1"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            value={searchQuery}
          />
          <Button
            disabled={isSearching || !searchQuery.trim()}
            size="icon"
            type="submit"
            variant="secondary"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            {totalMemories} {totalMemories === 1 ? "memory" : "memories"} found
          </span>
          {searchQuery.trim() && (
            <Button
              className="h-7 px-2 text-xs"
              onClick={handleClearSearch}
              size="sm"
              variant="ghost"
            >
              Clear search
            </Button>
          )}
        </div>

        <ScrollArea className="-mr-4 h-[400px] pr-4">
          {isLoading && !displayedMemories.length ? (
            <div className="flex h-[400px] flex-col items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground text-sm">
                Loading memories...
              </p>
            </div>
          ) : displayedMemories.length === 0 ? (
            <div className="m-1 flex h-[350px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 px-4 py-12">
              <MemoryIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No memories found</p>
              {searchQuery && (
                <p className="mt-1 text-muted-foreground text-xs">
                  Try a different search term
                </p>
              )}
              {!searchQuery && (
                <p className="mt-1 text-muted-foreground text-xs">
                  Memories will appear here when you save them
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedMemories.map((memory: MemoryItem) => (
                <div
                  className="group relative rounded-lg border bg-card p-4 transition-all hover:shadow-sm"
                  key={memory.id}
                >
                  <div className="flex flex-col gap-2">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {getMemoryContent(memory)}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(memory.createdAt)}</span>
                      </div>
                      <Button
                        className={cn(
                          "h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                          "opacity-0 transition-opacity group-hover:opacity-100"
                        )}
                        onClick={() => handleDeleteMemory(memory.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {hasNextPage && !searchQuery.trim() && (
                <div className="flex justify-center pt-2 pb-4">
                  <Button
                    className="h-8 w-full py-1 text-xs"
                    disabled={!hasNextPage || isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    variant="outline"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </DialogContent>
  );
}
