"use client";

import {
  Calendar,
  Clock,
  Eye,
  FileText,
  PlayIcon,
  Search,
  ThumbsUp,
  User2,
  YoutubeIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchLoadingState } from "./tool-invocation-list-view";

// Helper function to parse captions that might be JSON-encoded
const parseCaptions = (captions: string | undefined): string | undefined => {
  if (!captions) return;

  try {
    // Try to parse as JSON in case the API returns nested JSON
    const parsed = JSON.parse(captions);
    return parsed.captions || captions;
  } catch {
    // If parsing fails, return the raw text
    return captions;
  }
};

// Updated interfaces to match the optimized tool output
interface VideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
}

interface VideoResult {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  timestamps?: string[];
  views?: string;
  likes?: string;
  summary?: string;
  publishedDate?: string;
}

interface YouTubeSearchResponse {
  results: VideoResult[];
}

interface YouTubeCardProps {
  video: VideoResult;
  index: number;
}

interface YouTubeSearchResultsProps {
  results: YouTubeSearchResponse;
  isLoading?: boolean;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video, index }) => {
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");

  // Format timestamp for accessibility and URL generation
  const formatTimestamp = (timestamp: string) => {
    console.log(`🕐 Parsing timestamp: "${timestamp}"`);
    // Match the format: "0:06 - [Music]" or "0:10 - good morning gamers"
    const match = timestamp.match(/^(\d+:\d+(?::\d+)?) - (.+)$/);
    if (match) {
      const [_, time, description] = match;
      console.log(
        `✅ Parsed timestamp - time: "${time}", description: "${description}"`
      );
      return { time, description };
    }
    console.warn(`⚠️ Failed to parse timestamp: "${timestamp}"`);
    return { time: "", description: timestamp };
  };

  // Parse captions properly
  const parsedCaptions = parseCaptions(video?.captions);

  // Filter transcript based on search
  const filteredTranscript = useMemo(() => {
    if (!(parsedCaptions && transcriptSearch.trim())) return parsedCaptions;

    const searchTerm = transcriptSearch.toLowerCase();
    const lines = parsedCaptions.split("\n");

    return lines
      .filter((line) => line.toLowerCase().includes(searchTerm))
      .join("\n");
  }, [parsedCaptions, transcriptSearch]);

  // Filter chapters based on search (both time and content)
  const filteredChapters = useMemo(() => {
    if (!(video?.timestamps && chapterSearch.trim()))
      return video?.timestamps || [];

    const searchTerm = chapterSearch.toLowerCase();
    return video.timestamps.filter((timestamp: string) => {
      const { time, description } = formatTimestamp(timestamp);
      return (
        time.toLowerCase().includes(searchTerm) ||
        description.toLowerCase().includes(searchTerm)
      );
    });
  }, [video?.timestamps, chapterSearch]);

  if (!video) return null;

  // Convert timestamp to seconds for YouTube URL
  const timestampToSeconds = (time: string): number => {
    console.log(`⏱️ Converting time to seconds: "${time}"`);
    const parts = time.split(":").map((part) => Number.parseInt(part, 10));
    let seconds = 0;

    if (parts.length === 2) {
      // MM:SS format (e.g., "0:06" or "10:30")
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format (e.g., "1:10:30")
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    console.log(`📊 Time "${time}" converted to ${seconds} seconds`);
    return seconds;
  };

  // Format view count
  const formatViewCount = (views: string): string => {
    const num = Number.parseInt(views.replace(/[^0-9]/g, ""), 10);
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M views`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  // Format like count
  const formatLikeCount = (likes: string): string => {
    const num = Number.parseInt(likes.replace(/[^0-9]/g, ""), 10);
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return likes;
  };

  return (
    <div
      className="relative mr-4 h-[350px] w-[280px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xs transition-shadow duration-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Video Thumbnail */}
      <Link
        aria-label={`Watch ${video.details?.title || "YouTube video"}`}
        className="relative block aspect-video overflow-hidden bg-neutral-100 dark:bg-neutral-800"
        href={video.url}
        target="_blank"
      >
        {video.details?.thumbnail_url ? (
          <Image
            alt={
              video.details.title
                ? `${video.details.title} thumbnail`
                : "YouTube video thumbnail"
            }
            className="object-cover"
            fill
            loading="lazy"
            sizes="280px"
            src={video.details.thumbnail_url}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <YoutubeIcon className="h-8 w-8 text-red-500" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity hover:opacity-100">
          <div className="absolute right-2 bottom-2 left-2 line-clamp-2 font-medium text-white text-xs">
            {video.details?.title || "YouTube Video"}
          </div>
          <div className="rounded-full bg-white/90 p-2">
            <PlayIcon className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </Link>

      {/* Video Info */}
      <div className="p-3 pb-16">
        <div>
          <Link
            className="line-clamp-2 font-medium text-sm transition-colors hover:text-red-500 dark:text-neutral-100"
            href={video.url}
            target="_blank"
          >
            {video.details?.title || "YouTube Video"}
          </Link>

          {/* Channel Info */}
          {video.details?.author_name && (
            <Link
              aria-label={`Channel: ${video.details.author_name}`}
              className="group mt-2 flex w-fit items-center gap-2"
              href={video.details.author_url || video.url}
              target="_blank"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                <User2 className="h-3 w-3 text-red-500" />
              </div>
              <span className="truncate text-neutral-600 text-xs transition-colors group-hover:text-red-500 dark:text-neutral-400">
                {video.details.author_name}
              </span>
            </Link>
          )}

          {/* Published Date */}
          {video.publishedDate && (
            <div className="mt-2 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-neutral-400" />
              <span className="text-neutral-500 text-xs dark:text-neutral-400">
                {new Date(video.publishedDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {/* Stats */}
          {(video.views || video.likes) && (
            <div className="mt-2 flex items-center gap-3">
              {video.views && (
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-neutral-400" />
                  <span className="text-neutral-500 text-xs dark:text-neutral-400">
                    {formatViewCount(video.views)}
                  </span>
                </div>
              )}
              {video.likes && (
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="h-3 w-3 text-neutral-400" />
                  <span className="text-neutral-500 text-xs dark:text-neutral-400">
                    {formatLikeCount(video.likes)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {video.summary && (
            <div className="mt-3 rounded border bg-neutral-50 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-800">
              <div className="mb-2 flex items-baseline gap-2">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Summary
                </span>
              </div>
              <p className="text-neutral-600 leading-relaxed dark:text-neutral-400">
                {video.summary}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {((video.timestamps && video.timestamps?.length > 0) ||
          parsedCaptions) && (
          <div className="absolute right-3 bottom-3 left-3 flex gap-2">
            {/* Timestamps Dialog */}
            {video.timestamps && video.timestamps.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className="h-7 gap-1.5 border-neutral-200 px-2 text-xs hover:border-red-300 dark:border-neutral-700 dark:hover:border-red-600"
                    size="sm"
                    variant="outline"
                  >
                    <Clock className="h-3 w-3" />
                    Chapters ({video.timestamps.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-4 w-4 text-red-500" />
                      Video Chapters
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-neutral-400" />
                        <Input
                          className="border-neutral-200 pl-9 focus:border-red-300 dark:border-neutral-700 dark:focus:border-red-600"
                          onChange={(e) => setChapterSearch(e.target.value)}
                          placeholder="Search chapters by time or content..."
                          value={chapterSearch}
                        />
                      </div>
                      {chapterSearch && (
                        <Button
                          className="px-3"
                          onClick={() => setChapterSearch("")}
                          size="sm"
                          variant="outline"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="text-neutral-600 text-sm dark:text-neutral-400">
                      {chapterSearch.trim()
                        ? `${filteredChapters.length} of ${video.timestamps?.length || 0} chapters found`
                        : 'Search by time (e.g., "1:30") or content to find specific moments'}
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {(chapterSearch.trim()
                          ? filteredChapters
                          : video.timestamps || []
                        )
                          .map((timestamp: string, i: number) => {
                            const { time, description } =
                              formatTimestamp(timestamp);
                            const seconds = timestampToSeconds(time);

                            if (!time || seconds === 0) return null;

                            return (
                              <Link
                                className="group flex items-start gap-4 rounded-lg border border-neutral-200 p-3 transition-all duration-200 hover:border-red-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-red-600 dark:hover:bg-neutral-800/50"
                                href={`${video.url}&t=${seconds}`}
                                key={i}
                                target="_blank"
                              >
                                <div className="flex h-8 min-w-[60px] items-center justify-center rounded bg-neutral-100 font-medium font-mono text-neutral-700 text-sm transition-colors group-hover:bg-red-50 group-hover:text-red-600 dark:bg-neutral-800 dark:text-neutral-300 dark:group-hover:bg-red-950/30 dark:group-hover:text-red-400">
                                  {chapterSearch.trim() &&
                                  time
                                    .toLowerCase()
                                    .includes(chapterSearch.toLowerCase())
                                    ? (() => {
                                        const searchTerm =
                                          chapterSearch.toLowerCase();
                                        const lowerTime = time.toLowerCase();
                                        const index =
                                          lowerTime.indexOf(searchTerm);

                                        if (index !== -1) {
                                          return (
                                            <>
                                              {time.substring(0, index)}
                                              <mark className="rounded bg-yellow-200 px-1 py-0.5 dark:bg-yellow-900/50">
                                                {time.substring(
                                                  index,
                                                  index + searchTerm.length
                                                )}
                                              </mark>
                                              {time.substring(
                                                index + searchTerm.length
                                              )}
                                            </>
                                          );
                                        }
                                        return time;
                                      })()
                                    : time}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-neutral-800 text-sm leading-relaxed group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-neutral-100">
                                    {chapterSearch.trim()
                                      ? (() => {
                                          const searchTerm =
                                            chapterSearch.toLowerCase();
                                          const lowerDescription =
                                            description.toLowerCase();
                                          const index =
                                            lowerDescription.indexOf(
                                              searchTerm
                                            );

                                          if (index !== -1) {
                                            return (
                                              <>
                                                {description.substring(
                                                  0,
                                                  index
                                                )}
                                                <mark className="rounded bg-yellow-200 px-1 py-0.5 dark:bg-yellow-900/50">
                                                  {description.substring(
                                                    index,
                                                    index + searchTerm.length
                                                  )}
                                                </mark>
                                                {description.substring(
                                                  index + searchTerm.length
                                                )}
                                              </>
                                            );
                                          }
                                          return description;
                                        })()
                                      : description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })
                          .filter(Boolean)}
                        {chapterSearch.trim() &&
                          filteredChapters.length === 0 && (
                            <div className="py-8 text-center text-neutral-500">
                              No chapters found for &quot;{chapterSearch}&quot;
                            </div>
                          )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Transcript Dialog */}
            {parsedCaptions && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className="h-7 gap-1.5 border-neutral-200 px-2 text-xs hover:border-red-300 dark:border-neutral-700 dark:hover:border-red-600"
                    size="sm"
                    variant="outline"
                  >
                    <FileText className="h-3 w-3" />
                    Transcript
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] max-w-3xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-4 w-4 text-red-500" />
                      Video Transcript
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-neutral-400" />
                        <Input
                          className="focus:!outline-0 focus:!ring-0 border-neutral-200 pl-9 focus:border-red-300 dark:border-neutral-700 dark:focus:border-red-600"
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          placeholder="Search transcript..."
                          value={transcriptSearch}
                        />
                      </div>
                      {transcriptSearch && (
                        <Button
                          className="px-3"
                          onClick={() => setTranscriptSearch("")}
                          size="sm"
                          variant="outline"
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[400px]">
                      <div className="rounded-lg bg-neutral-50 p-4 text-sm leading-relaxed dark:bg-neutral-900">
                        {transcriptSearch.trim() ? (
                          filteredTranscript ? (
                            <div className="space-y-3">
                              {filteredTranscript
                                .split("\n")
                                .map((line, idx) => {
                                  if (!line.trim()) return null;
                                  const searchTerm =
                                    transcriptSearch.toLowerCase();
                                  const lowerLine = line.toLowerCase();
                                  const index = lowerLine.indexOf(searchTerm);

                                  if (index === -1) return null;

                                  return (
                                    <div
                                      className="rounded border bg-white p-2 dark:border-neutral-700 dark:bg-neutral-800"
                                      key={idx}
                                    >
                                      <span className="text-neutral-600 dark:text-neutral-400">
                                        {line.substring(0, index)}
                                      </span>
                                      <mark className="rounded bg-yellow-200 px-1 py-0.5 dark:bg-yellow-900/50">
                                        {line.substring(
                                          index,
                                          index + searchTerm.length
                                        )}
                                      </mark>
                                      <span className="text-neutral-600 dark:text-neutral-400">
                                        {line.substring(
                                          index + searchTerm.length
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="py-8 text-center text-neutral-500">
                              No matches found for &quot;{transcriptSearch}
                              &quot;
                            </div>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                            {parsedCaptions}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoized YouTube Card for performance
const MemoizedYouTubeCard = React.memo(
  YouTubeCard,
  (prevProps, nextProps) =>
    prevProps.video.videoId === nextProps.video.videoId &&
    prevProps.index === nextProps.index &&
    prevProps.video.url === nextProps.video.url &&
    JSON.stringify(prevProps.video.details) ===
      JSON.stringify(nextProps.video.details) &&
    prevProps.video.views === nextProps.video.views &&
    prevProps.video.likes === nextProps.video.likes
);

MemoizedYouTubeCard.displayName = "MemoizedYouTubeCard";

// Loading component

// Empty state component
const YouTubeEmptyState: React.FC = () => (
  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 text-center shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
        <YoutubeIcon className="h-6 w-6 text-red-600" />
      </div>
      <div className="text-center">
        <h2 className="mb-1 font-medium text-base text-neutral-900 dark:text-neutral-100">
          No Content Available
        </h2>
        <p className="text-neutral-500 text-sm dark:text-neutral-400">
          The videos found don&apos;t contain any timestamps, transcripts, or
          summaries.
        </p>
      </div>
    </div>
  </div>
);

// Main YouTube Search Results Component
export const YouTubeSearchResults: React.FC<YouTubeSearchResultsProps> = ({
  results,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <SearchLoadingState
        color="red"
        icon={YoutubeIcon}
        text="Searching YouTube"
      />
    );
  }

  if (!(results && results.results && Array.isArray(results.results))) {
    return <YouTubeEmptyState />;
  }

  // Filter out videos with no meaningful content - using parseCaptions for proper filtering
  const filteredVideos = results.results.filter((video) => {
    if (!video) return false;

    const hasTimestamps =
      video.timestamps &&
      Array.isArray(video.timestamps) &&
      video.timestamps.length > 0;
    const hasCaptions =
      video.captions &&
      (typeof video.captions === "string"
        ? video.captions.trim().length > 0
        : !!parseCaptions(video.captions));
    const hasSummary =
      video.summary &&
      typeof video.summary === "string" &&
      video.summary.trim().length > 0;

    return hasTimestamps || hasCaptions || hasSummary;
  });

  console.log("📊 YouTube Results Summary:", {
    totalResults: results.results.length,
    filteredResults: filteredVideos.length,
    videoIds: filteredVideos.map((v) => v.videoId),
  });

  // Debug each video's content
  results.results.forEach((video, index) => {
    if (!video) return;

    const hasTimestamps =
      video.timestamps &&
      Array.isArray(video.timestamps) &&
      video.timestamps.length > 0;
    const hasCaptions =
      video.captions &&
      (typeof video.captions === "string"
        ? video.captions.trim().length > 0
        : !!parseCaptions(video.captions));
    const hasSummary =
      video.summary &&
      typeof video.summary === "string" &&
      video.summary.trim().length > 0;

    console.log(`🎥 Video ${index + 1} (${video.videoId}):`, {
      title: video.details?.title?.substring(0, 50) + "...",
      hasTimestamps,
      timestampCount: Array.isArray(video.timestamps)
        ? video.timestamps.length
        : 0,
      hasCaptions,
      captionsLength:
        typeof video.captions === "string"
          ? video.captions.length
          : parseCaptions(video.captions)?.length || 0,
      hasSummary,
      captionsType: typeof video.captions,
      timestampsType: typeof video.timestamps,
      rawCaptions: video.captions
        ? typeof video.captions === "string"
          ? video.captions.substring(0, 100) + "..."
          : "NOT STRING"
        : "NULL",
      rawTimestamps: Array.isArray(video.timestamps)
        ? video.timestamps.slice(0, 2)
        : video.timestamps,
      willShowInUI: hasTimestamps || hasCaptions || hasSummary,
    });

    if (hasTimestamps && video.timestamps) {
      console.log(
        `📝 Sample timestamps for ${video.videoId}:`,
        video.timestamps.slice(0, 3)
      );
    }
  });

  if (filteredVideos.length === 0) {
    return <YouTubeEmptyState />;
  }

  return (
    <div className="my-4 w-full">
      <Accordion collapsible defaultValue="videos" type="single">
        <AccordionItem
          className="rounded-xl border bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
          value="videos"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
                <YoutubeIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-left font-medium text-base text-neutral-900 dark:text-neutral-100">
                  YouTube Results
                </h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge
                    className="h-5 bg-neutral-100 px-2 py-0 font-medium text-neutral-600 text-xs dark:bg-neutral-800 dark:text-neutral-400"
                    variant="secondary"
                  >
                    {filteredVideos.length} videos with content
                  </Badge>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="relative">
              <div className="w-full overflow-x-scroll">
                <div className="flex pl-4">
                  {filteredVideos.map((video, index) => (
                    <div className="last:mr-12" key={video.videoId}>
                      <MemoizedYouTubeCard index={index} video={video} />
                    </div>
                  ))}
                </div>
                {filteredVideos.length > 3 && (
                  <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent dark:from-neutral-900" />
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Export types for external use
export type {
  VideoDetails,
  VideoResult,
  YouTubeSearchResponse,
  YouTubeSearchResultsProps,
};
