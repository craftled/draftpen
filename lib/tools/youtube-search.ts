import { tool } from "ai";
import Exa from "exa-js";
import { getSubtitles, getVideoDetails } from "youtube-caption-extractor";
import { z } from "zod";
import { serverEnv } from "@/env/server";

type VideoDetails = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
};

type VideoResult = {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  timestamps?: string[];
  views?: string;
  likes?: string;
  summary?: string;
  publishedDate?: string;
};

type SubtitleFragment = {
  start: string; // seconds as string from API
  dur: string; // seconds as string from API
  text: string;
};

export const youtubeSearchTool = tool({
  description:
    "Search YouTube videos using Exa AI and get detailed video information.",
  inputSchema: z.object({
    query: z.string().describe("The search query for YouTube videos"),
    timeRange: z.enum(["day", "week", "month", "year", "anytime"]),
  }),
  execute: async ({
    query,
    timeRange,
  }: {
    query: string;
    timeRange: "day" | "week" | "month" | "year" | "anytime";
  }) => {
    const exa = new Exa(serverEnv.EXA_API_KEY as string);
    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();
    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    switch (timeRange) {
      case "day":
        startDate = formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
        endDate = formatDate(now);
        break;
      case "week":
        startDate = formatDate(
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        );
        endDate = formatDate(now);
        break;
      case "month":
        startDate = formatDate(
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        );
        endDate = formatDate(now);
        break;
      case "year":
        startDate = formatDate(
          new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        );
        endDate = formatDate(now);
        break;
      case "anytime":
        // Don't set dates for anytime - let Exa use its defaults
        break;
    }

    type ExaSearchOptions = {
      type?: "auto" | "neural" | "keyword" | "hybrid" | "fast";
      numResults?: number;
      includeDomains?: string[];
      startPublishedDate?: string;
      endPublishedDate?: string;
    };

    const searchOptions: ExaSearchOptions = {
      type: "auto",
      numResults: 5,
      includeDomains: ["youtube.com", "youtu.be", "m.youtube.com"],
    };

    if (startDate) {
      searchOptions.startPublishedDate = startDate;
    }
    if (endDate) {
      searchOptions.endPublishedDate = endDate;
    }

    const searchResult = await exa.searchAndContents(query, searchOptions);

    // Deduplicate videos by ID to avoid redundant API calls
    const uniqueResults = searchResult.results.reduce((acc, result) => {
      const videoIdMatch = result.url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/
      );
      const videoId = videoIdMatch?.[1];

      if (videoId && !acc.has(videoId)) {
        acc.set(videoId, result);
      }
      return acc;
    }, new Map());

    // Process videos in smaller batches to avoid overwhelming the API
    const batchSize = 5;

    const uniqueResultsArray = Array.from(uniqueResults.values());

    const batches = uniqueResultsArray.reduce(
      (acc: (typeof searchResult.results)[0][][], result, index) => {
        const batchIndex = Math.floor(index / batchSize);
        if (!acc[batchIndex]) {
          acc[batchIndex] = [];
        }
        acc[batchIndex].push(result);
        return acc;
      },
      [] as (typeof searchResult.results)[0][][]
    );
    batches.forEach((batch, _index) => {
      batch.forEach((video, _videoIndex) => {
        const _videoId = video.url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/
        )?.[1];
      });
    });

    const processedResults: VideoResult[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        const batchResults = await Promise.allSettled(
          batch.map(
            async (
              result: (typeof searchResult.results)[0]
            ): Promise<VideoResult | null> => {
              const videoIdMatch = result.url.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/
              );
              const videoId = videoIdMatch?.[1];

              if (!videoId) {
                return null;
              }

              const baseResult: VideoResult = {
                videoId,
                url: result.url,
                publishedDate: result.publishedDate,
              };

              try {
                // Fetch details and subtitles using youtube-caption-extractor
                const details = await getVideoDetails({
                  videoID: videoId,
                  lang: "en",
                }).catch((_e: unknown) => null);

                // Extract transcript text from subtitles (prefer details.subtitles, fallback to direct API)
                let transcriptText: string | undefined;
                if (
                  details &&
                  Array.isArray(details.subtitles) &&
                  details.subtitles.length > 0
                ) {
                  transcriptText = details.subtitles
                    .map((s) => s.text)
                    .join("\n");
                } else {
                  const subs = await getSubtitles({
                    videoID: videoId,
                    lang: "en",
                  }).catch((_e: unknown) => null);
                  if (subs && Array.isArray(subs) && subs.length > 0) {
                    transcriptText = subs.map((s) => s.text).join("\n");
                  }
                }

                // Derive chapters from description if available (lines like "0:00 Intro" or "1:02:30 Deep dive")
                const extractChaptersFromDescription = (
                  description: string | undefined
                ): string[] | undefined => {
                  if (!description) {
                    return;
                  }
                  const lines = description.split(/\r?\n/);
                  const chapterRegex =
                    /^\s*((?:\d+:)?\d{1,2}:\d{2})\s*[-|–|—]?\s*(.+)$/i;
                  const chapters: string[] = [];
                  for (const line of lines) {
                    const match = line.match(chapterRegex);
                    if (match) {
                      const time = match[1];
                      const title = match[2].trim();
                      if (time && title) {
                        chapters.push(`${time} - ${title}`);
                      }
                    }
                  }
                  return chapters.length > 0 ? chapters : undefined;
                };

                // Fallback: generate chapters from subtitles when description has no chapters
                const generateChaptersFromSubtitles = (
                  subs: SubtitleFragment[] | undefined,
                  targetCount = 30
                ): string[] | undefined => {
                  if (!subs || subs.length === 0) {
                    return;
                  }

                  const parseSeconds = (s: string) => {
                    const n = Number(s);
                    return Number.isFinite(n) ? n : 0;
                  };

                  const last = subs.at(-1);
                  if (!last) {
                    return;
                  }

                  const totalDurationSec = Math.max(
                    0,
                    parseSeconds(last.start) + parseSeconds(last.dur)
                  );
                  if (totalDurationSec <= 1) {
                    return;
                  }

                  const interval = Math.max(
                    10,
                    Math.floor(totalDurationSec / targetCount)
                  );

                  const formatTime = (secondsTotal: number) => {
                    const seconds = Math.max(1, Math.floor(secondsTotal)); // avoid 0:00 which UI filters out
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    const pad = (n: number) => n.toString().padStart(2, "0");
                    return h > 0
                      ? `${h}:${pad(m)}:${pad(s)}`
                      : `${m}:${pad(s)}`;
                  };

                  const chapters: string[] = [];
                  const usedTimes = new Set<number>();
                  for (let t = interval; t < totalDurationSec; t += interval) {
                    // find first subtitle starting at or after t
                    const idx = subs.findIndex(
                      (sf) => parseSeconds(sf.start) >= t
                    );
                    const chosen = idx >= 0 ? subs[idx] : subs.at(-1);
                    if (!chosen) {
                      continue;
                    }

                    const text = chosen.text?.replace(/\s+/g, " ").trim();
                    if (!text) {
                      continue;
                    }
                    const key = Math.floor(parseSeconds(chosen.start));
                    if (usedTimes.has(key)) {
                      continue;
                    }
                    usedTimes.add(key);
                    chapters.push(`${formatTime(key)} - ${text}`);
                    if (chapters.length >= targetCount) {
                      break;
                    }
                  }

                  return chapters.length > 0 ? chapters : undefined;
                };

                const timestampsFromDescription =
                  extractChaptersFromDescription(details?.description);
                let timestamps: string[] | undefined =
                  timestampsFromDescription;
                if (!timestamps) {
                  const subtitleSource: SubtitleFragment[] | undefined =
                    details?.subtitles as SubtitleFragment[] | undefined;
                  if (subtitleSource && subtitleSource.length > 0) {
                    timestamps = generateChaptersFromSubtitles(subtitleSource);
                  } else {
                    const subs = await getSubtitles({
                      videoID: videoId,
                      lang: "en",
                    }).catch(() => null);
                    timestamps = generateChaptersFromSubtitles(
                      subs ?? undefined
                    );
                  }
                }

                const processedVideo: VideoResult = {
                  ...baseResult,
                  details: {
                    title: details?.title,
                    thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    provider_name: "YouTube",
                    provider_url: "https://www.youtube.com",
                  },
                  captions: transcriptText,
                  timestamps,
                };
                return processedVideo;
              } catch (_error) {
                return baseResult;
              }
            }
          )
        );

        // Process batch results - even failed promises return a result
        const validBatchResults = batchResults
          .filter(
            (result) => result.status === "fulfilled" && result.value !== null
          )
          .map(
            (result) => (result as PromiseFulfilledResult<VideoResult>).value
          );

        const failedBatchResults = batchResults.filter(
          (result) => result.status === "rejected"
        );

        if (failedBatchResults.length > 0) {
        }

        processedResults.push(...validBatchResults);

        // Small delay between batches to be respectful to the API
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (batchError) {
        if (batchError instanceof Error) {
        }
      }
    }

    // Debug: Check what videos have content for UI filtering
    const _videosWithContent = processedResults.filter(
      (video) =>
        (video.timestamps && video.timestamps.length > 0) ||
        video.captions ||
        video.summary
    );

    processedResults.forEach((_video, _index) => {});

    return {
      results: processedResults,
    };
  },
});
