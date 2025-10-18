/* eslint-disable @next/next/no-img-element */
"use client";

import { XLogoIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { ExternalLink, MessageCircle, Users } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Tweet } from "react-tweet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Citation {
  url: string;
  title: string;
  description?: string;
  tweet_id?: string;
  author?: string;
  created_at?: string;
}

interface Source {
  text: string;
  link: string;
  title?: string;
}

interface XSearchResponse {
  content: string;
  citations: Citation[];
  sources: Source[];
  query: string;
  dateRange: string;
  handles: string[];
}

interface XSearchArgs {
  query: string;
  startDate: string;
  endDate: string;
  includeXHandles?: string[];
  excludeXHandles?: string[];
  postFavoritesCount?: number;
  postViewCount?: number;
  maxResults?: number;
}

interface XSearchProps {
  result: XSearchResponse;
  args: XSearchArgs;
}

const XSearchLoadingState = () => (
  <Card className="my-4 w-full border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className="animate-pulse rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
          <XLogoIcon className="h-4 w-4 text-neutral-400" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-3 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          className="animate-pulse rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          key={i}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-3 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

const XSearch: React.FC<XSearchProps> = ({ result, args }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Extract tweet IDs from citations
  const tweetCitations = useMemo(() => {
    return result.citations
      .filter((citation) => {
        // Handle both string URLs and objects with url property
        const url = typeof citation === "string" ? citation : citation.url;
        return url && url.includes("x.com");
      })
      .map((citation) => {
        // Handle both string URLs and objects with url property
        const url = typeof citation === "string" ? citation : citation.url;
        const match = url.match(/\/status\/(\d+)/);
        let title = typeof citation === "object" ? citation.title : "";

        // If no title from citation, try to get it from sources with generated titles
        if (!title && result.sources) {
          const matchingSource = result.sources.find(
            (source) => source.link === url
          );
          title = matchingSource?.title || "";
        }

        return {
          url,
          title,
          description: typeof citation === "object" ? citation.description : "",
          tweet_id: match ? match[1] : null,
        };
      })
      .filter((citation) => citation.tweet_id);
  }, [result.citations, result.sources]);

  const displayedTweets = useMemo(
    () => tweetCitations.slice(0, 3),
    [tweetCitations]
  );

  const remainingTweets = useMemo(
    () => tweetCitations.slice(3),
    [tweetCitations]
  );

  if (!result) {
    return <XSearchLoadingState />;
  }

  const formatDateRange = (dateRange: string) => {
    const [start, end] = dateRange.split(" to ");
    return {
      start: new Date(start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      end: new Date(end).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  };

  const { start, end } = formatDateRange(result.dateRange);

  return (
    <div className="my-3 w-full">
      <Accordion
        className="w-full rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        collapsible
        defaultValue="x_search"
        type="single"
      >
        <AccordionItem value="x_search">
          <AccordionTrigger className="w-full px-3 py-2.75 hover:no-underline [&>svg]:flex [&>svg]:items-center [&>svg]:justify-center [&>svg]:self-center [&[data-state=open]]:border-neutral-200 [&[data-state=open]]:border-b [&[data-state=open]]:dark:border-neutral-800">
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <div className="flex-shrink-0 rounded-md bg-black p-1.5 dark:bg-white">
                  <XLogoIcon className="h-3.5 w-3.5 text-white dark:text-black" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h3 className="font-medium text-sm">X Search Results</h3>
                  <p className="truncate text-neutral-500 text-xs dark:text-neutral-400">
                    {result.query} • {start} - {end}
                  </p>
                </div>
              </div>
              <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                {(args.includeXHandles ||
                  args.excludeXHandles ||
                  result.handles.length > 0) && (
                  <Badge
                    className="hidden rounded-full px-2 py-0.5 text-xs sm:flex"
                    variant="secondary"
                  >
                    <Users className="mr-1 h-2.5 w-2.5" />
                    {args.includeXHandles?.length ||
                      args.excludeXHandles?.length ||
                      result.handles.length}
                  </Badge>
                )}
                <Badge
                  className="rounded-full px-2 py-0.5 text-xs"
                  variant="secondary"
                >
                  <MessageCircle className="mr-1 h-2.5 w-2.5" />
                  {tweetCitations.length}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="mb-0 pt-3 pb-0">
            <div className="space-y-3">
              {/* Horizontal Tweets Row */}
              {tweetCitations.length > 0 && (
                <div className="space-y-3 px-3">
                  <div className="scrollbar-none flex gap-3 overflow-x-auto rounded-[8px] sm:gap-4">
                    {displayedTweets.map((citation, index) => (
                      <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-[280px] flex-shrink-0 sm:w-[320px] md:w-[350px]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        key={citation.tweet_id}
                        transition={{ delay: index * 0.05 }}
                      >
                        {citation.tweet_id && (
                          <div className="tweet-wrapper">
                            <Tweet id={citation.tweet_id} />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Show More in Sheet */}
                    {remainingTweets.length > 0 && (
                      <Sheet onOpenChange={setIsSheetOpen} open={isSheetOpen}>
                        <SheetTrigger asChild>
                          <div className="group flex min-h-[180px] w-[280px] flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-neutral-200 border-dashed transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-50 sm:w-[320px] md:w-[350px] dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/30">
                            <div className="px-4 text-center">
                              <div className="mb-2">
                                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 transition-transform group-hover:scale-105 dark:bg-neutral-800">
                                  <MessageCircle className="h-4 w-4 text-neutral-500" />
                                </div>
                              </div>
                              <p className="mb-1 font-medium text-neutral-700 text-sm dark:text-neutral-300">
                                +{remainingTweets.length} more posts
                              </p>
                              <p className="text-neutral-500 text-xs dark:text-neutral-500">
                                Click to view all
                              </p>
                            </div>
                          </div>
                        </SheetTrigger>
                        <SheetContent
                          className="w-full p-0 sm:w-[500px] sm:max-w-[90vw] md:w-[600px] lg:w-[650px]"
                          side="right"
                        >
                          <div className="flex h-full flex-col">
                            <SheetHeader className="border-neutral-200 border-b px-4 py-4 sm:px-6 dark:border-neutral-800">
                              <SheetTitle className="flex items-center gap-2.5">
                                <div className="rounded-md bg-black p-1.5 dark:bg-white">
                                  <XLogoIcon className="h-3.5 w-3.5 text-white dark:text-black" />
                                </div>
                                <span>All Posts ({tweetCitations.length})</span>
                              </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                              <div className="mx-auto max-w-full space-y-6 sm:max-w-[550px]">
                                {tweetCitations.map((citation, index) => (
                                  <motion.div
                                    animate={{ opacity: 1, y: 0 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    key={citation.tweet_id}
                                    transition={{ delay: index * 0.02 }}
                                  >
                                    {citation.tweet_id && (
                                      <div className="tweet-wrapper-sheet">
                                        <Tweet id={citation.tweet_id} />
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    )}
                  </div>
                </div>
              )}

              {/* Compact No Tweets Found */}
              {tweetCitations.length === 0 && (
                <div className="py-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-neutral-100 p-2 dark:bg-neutral-800">
                      <MessageCircle className="h-4 w-4 text-neutral-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-neutral-900 text-sm dark:text-neutral-100">
                        No posts found
                      </h4>
                      <p className="mt-0.5 text-neutral-500 text-xs dark:text-neutral-400">
                        Try adjusting your search parameters
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact External Links */}
              {result.citations.length > tweetCitations.length && (
                <div className="mt-3 border-neutral-200 border-t pt-3 dark:border-neutral-800">
                  <h4 className="mb-2 font-medium text-neutral-700 text-xs uppercase tracking-wide dark:text-neutral-300">
                    Related Sources
                  </h4>
                  <div className="space-y-1">
                    {result.citations
                      .filter((citation) => {
                        const url =
                          typeof citation === "string"
                            ? citation
                            : citation.url;
                        return url && !url.includes("x.com");
                      })
                      .slice(0, 3)
                      .map((citation, index) => {
                        const url =
                          typeof citation === "string"
                            ? citation
                            : citation.url;
                        const title =
                          typeof citation === "object" ? citation.title : url;
                        return (
                          <a
                            className="group flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                            href={url}
                            key={index}
                            target="_blank"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-neutral-900 text-xs group-hover:text-blue-600 dark:text-neutral-100 dark:group-hover:text-blue-400">
                                {title}
                              </p>
                            </div>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 text-neutral-400 group-hover:text-blue-500" />
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default XSearch;
