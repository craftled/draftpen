// /components/reddit-search.tsx
/* eslint-disable @next/next/no-img-element */

import { RedditLogoIcon } from "@phosphor-icons/react";
import {
  ArrowUpRight,
  Calendar,
  Check,
  ExternalLink,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type RedditResult = {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  subreddit: string;
  isRedditPost: boolean;
  comments: string[];
  score?: number;
};

type RedditSearchResponse = {
  query: string;
  results: RedditResult[];
  timeRange: string;
};

type RedditSearchArgs = {
  query: string;
  maxResults: number;
  timeRange: string;
};

// Reddit Source Card Component
const RedditSourceCard: React.FC<{
  result: RedditResult;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formatSubreddit = (subreddit: string) =>
    subreddit.replace(/^r\//, "").toLowerCase();

  const subreddit = formatSubreddit(result.subreddit);
  const formattedScore = result.score
    ? isNaN(result.score)
      ? "0"
      : result.score.toString()
    : "0";

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "rounded-xl p-4 transition-all duration-200",
        "hover:border-neutral-300 hover:shadow-sm dark:hover:border-neutral-700",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-orange-50 dark:bg-orange-900/20">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          <Image
            alt=""
            className={cn("object-contain", !imageLoaded && "opacity-0")}
            height={24}
            onError={(e) => {
              setImageLoaded(true);
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23FF4500'%3E%3Cpath d='M10 0C4.478 0 0 4.478 0 10c0 5.523 4.478 10 10 10 5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm5.7 11.1c.1.1.1.1.1.2s0 .1-.1.2c-.599.901-1.899 1.4-3.6 1.4-1.3 0-2.5-.3-3.4-.9-.1-.1-.3-.1-.5-.2-.1 0-.1 0-.1-.1s-.1-.1-.1-.1c-.1-.1-.1-.1-.1-.2s0-.1.1-.2c.1-.1.2-.1.3-.1h.1c.9.5 2 .8 3.2.8 1.3 0 2.4-.3 3.3-.9h.1c.102-.1.202-.1.302-.1.099 0 .198 0 .298.1zm-9.6-2.3c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6zm6.8 0c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6z'/%3E%3C/svg%3E";
            }}
            onLoad={() => setImageLoaded(true)}
            src={"https://www.reddit.com/favicon.ico"}
            width={24}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 line-clamp-1 font-medium text-neutral-900 text-sm dark:text-neutral-100">
            {result.title}
          </h3>
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <Badge
              className="rounded-sm bg-orange-50 px-1.5 py-0 text-[10px] text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
              variant="secondary"
            >
              r/{subreddit}
            </Badge>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="mb-3 line-clamp-2 text-neutral-600 text-sm leading-relaxed dark:text-neutral-400">
        {result.content.length > 150
          ? result.content.substring(0, 150) + "..."
          : result.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between border-neutral-100 border-t pt-3 dark:border-neutral-800">
        {result.score !== undefined && (
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <ThumbsUp className="h-3 w-3" />
            <span>{formattedScore} upvotes</span>
          </div>
        )}
        {result.published_date && (
          <time className="flex items-center gap-1.5 text-neutral-500 text-xs dark:text-neutral-400">
            <Calendar className="h-3 w-3" />
            {new Date(result.published_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        )}
      </div>
    </div>
  );
};

// Reddit Sources Sheet Component
const RedditSourcesSheet: React.FC<{
  results: RedditResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ results, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper onOpenChange={onOpenChange} open={open}>
      <SheetContentWrapper
        className={cn(
          isMobile ? "h-[85vh]" : "w-[600px] sm:max-w-[600px]",
          "p-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-neutral-200 border-b px-6 py-5 dark:border-neutral-800">
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-md bg-orange-50 p-1.5 dark:bg-orange-900/20">
                <RedditLogoIcon className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                All Reddit Results
              </h2>
            </div>
            <p className="text-neutral-500 text-sm dark:text-neutral-400">
              {results.length} posts and comments
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3 p-6">
              {results.map((result, index) => (
                <a
                  className="block"
                  href={result.url}
                  key={index}
                  target="_blank"
                >
                  <RedditSourceCard result={result} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading state component
const SearchLoadingState = () => {
  return (
    <div className="w-full space-y-3">
      <Accordion
        className="w-full"
        collapsible
        defaultValue="search"
        type="single"
      >
        <AccordionItem className="border-none" value="search">
          <AccordionTrigger
            asChild
            className={cn(
              "rounded-xl px-4 py-3 hover:no-underline",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "data-[state=open]:rounded-b-none"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-orange-50 p-1.5 dark:bg-orange-900/20">
                  <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  variant="secondary"
                >
                  0
                </Badge>
                <Button
                  className="h-7 cursor-not-allowed px-2 text-xs opacity-50"
                  disabled
                  size="sm"
                  variant="ghost"
                >
                  View all
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                "space-y-3 p-3",
                "bg-white dark:bg-neutral-900",
                "border-neutral-200 border-x border-b dark:border-neutral-800",
                "rounded-b-xl"
              )}
            >
              {/* Query badges */}
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                <Badge
                  className="shrink-0 rounded-full bg-neutral-50 px-3 py-1 text-neutral-400 text-xs dark:bg-neutral-900"
                  variant="outline"
                >
                  <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching Reddit...
                </Badge>
              </div>

              {/* Skeleton cards */}
              <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    className="w-[320px] flex-shrink-0 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
                    key={i}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <RedditLogoIcon className="h-5 w-5 text-orange-500/30" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                      <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Main component
const RedditSearch: React.FC<{
  result: RedditSearchResponse;
  args: RedditSearchArgs;
}> = ({ result, args }) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1; // Small tolerance for edge detection
    const isAtRightEdge =
      container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!(isAtLeftEdge || isAtRightEdge)) {
      // In middle of scroll area - always handle
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      // At left edge, scrolling right - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      // At right edge, scrolling left - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
    // If at edge and scrolling in direction that would go beyond bounds, let the event continue but without propagation
  };

  if (!result) {
    return <SearchLoadingState />;
  }

  const formattedTimeRange =
    {
      day: "past 24 hours",
      week: "past week",
      month: "past month",
      year: "past year",
    }[result.timeRange] || result.timeRange;

  // Show first 5 results in preview
  const previewResults = result.results.slice(0, 5);

  return (
    <div className="my-4 w-full space-y-3">
      <Accordion
        className="w-full"
        collapsible
        defaultValue="reddit_search"
        type="single"
      >
        <AccordionItem className="border-none" value="reddit_search">
          <AccordionTrigger
            asChild
            className={cn(
              "rounded-xl px-4 py-3 hover:no-underline",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "data-[state=open]:rounded-b-none"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-orange-50 p-1.5 dark:bg-orange-900/20">
                  <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  variant="secondary"
                >
                  {result.results.length}
                </Badge>
                {result.results.length > 0 && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesSheetOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    View all
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                "space-y-3 p-3",
                "bg-white dark:bg-neutral-900",
                "border-neutral-200 border-x border-b dark:border-neutral-800",
                "rounded-b-xl"
              )}
            >
              {/* Query badges */}
              <div
                className="no-scrollbar flex gap-2 overflow-x-auto"
                onWheel={handleWheelScroll}
              >
                <Badge
                  className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs dark:bg-neutral-800"
                  variant="outline"
                >
                  <Check className="mr-1.5 h-3 w-3" />
                  {args.query}
                </Badge>
                <Badge
                  className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-orange-600 text-xs dark:bg-orange-900/20 dark:text-orange-400"
                  variant="outline"
                >
                  {formattedTimeRange}
                </Badge>
              </div>

              {/* Preview results */}
              <div
                className="no-scrollbar flex gap-3 overflow-x-auto pb-1"
                onWheel={handleWheelScroll}
              >
                {previewResults.map((post, index) => (
                  <a
                    className="block w-[320px] flex-shrink-0"
                    href={post.url}
                    key={index}
                    target="_blank"
                  >
                    <RedditSourceCard result={post} />
                  </a>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sources Sheet */}
      <RedditSourcesSheet
        onOpenChange={setSourcesSheetOpen}
        open={sourcesSheetOpen}
        results={result.results}
      />
    </div>
  );
};

export default RedditSearch;
