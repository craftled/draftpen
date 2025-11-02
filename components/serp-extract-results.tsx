"use client";

import { useState } from "react";
import {
  DEFAULT_FAVICON_FALLBACK,
  InlineFavicon,
} from "@/components/ui/inline-favicon";

type ExtractedPage = {
  url: string;
  title: string;
  metaDescription?: string;
  h1?: string;
  content: string;
  contentPreview: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    image?: string;
    favicon?: string;
    language?: string;
  };
};

type SerpExtractOutput = {
  extracted: ExtractedPage[];
  summary: {
    totalPages: number;
    totalChars: number;
    successCount: number;
    failedUrls: string[];
    source: "exa" | "firecrawl" | "mixed";
  };
};

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Favicon({ url, alt }: { url: string; alt: string }) {
  const host = hostFromUrl(url);
  const src = `https://www.google.com/s2/favicons?sz=16&domain=${host}`;
  return (
    <InlineFavicon
      alt={`${alt} favicon`}
      className="size-3 shrink-0 rounded-sm"
      fallbackSrc={DEFAULT_FAVICON_FALLBACK}
      size={16}
      src={src}
    />
  );
}

function ExtractedPageRow({ page, index }: { page: ExtractedPage; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const host = hostFromUrl(page.url);
  const hasMoreContent = page.content.length > page.contentPreview.length;

  return (
    <div className="py-4">
      <div className="flex gap-2 text-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200/60 bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs tabular-nums dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-300">
              {index + 1}
            </span>
            <a
              className="line-clamp-1 font-medium text-[15px] hover:underline sm:text-base"
              href={page.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {page.title}
            </a>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <a
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              href={page.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Favicon alt={host} url={page.url} />
              {host}
            </a>
            {page.metadata.publishedDate && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs dark:bg-neutral-800 dark:text-neutral-300">
                {page.metadata.publishedDate}
              </span>
            )}
            {page.metadata.author && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700 text-xs dark:bg-neutral-800 dark:text-neutral-300">
                {page.metadata.author}
              </span>
            )}
          </div>
          {page.metaDescription && (
            <div className="mt-2 line-clamp-2 text-muted-foreground text-sm">
              {page.metaDescription}
            </div>
          )}
          {page.h1 && (
            <div className="mt-2 font-semibold text-neutral-700 text-sm dark:text-neutral-300">
              H1: {page.h1}
            </div>
          )}
          {page.contentPreview && (
            <div className="mt-3">
              <div className="whitespace-pre-wrap break-words text-neutral-700 text-sm leading-relaxed dark:text-neutral-300">
                {isExpanded ? page.content : page.contentPreview}
                {hasMoreContent && !isExpanded && (
                  <span className="text-muted-foreground">...</span>
                )}
              </div>
              {hasMoreContent && (
                <button
                  className="mt-2 text-blue-600 text-xs transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => setIsExpanded(!isExpanded)}
                  type="button"
                >
                  {isExpanded ? "Show less" : "Show full content"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SerpExtractResults({
  output,
}: {
  output: SerpExtractOutput;
}) {
  const { extracted, summary } = output;

  return (
    <div className="my-2 rounded-md border border-neutral-200/60 bg-white/50 backdrop-blur-sm dark:border-neutral-700/60 dark:bg-neutral-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-neutral-200/60 border-b px-3 py-2 dark:border-neutral-800/60">
        <div className="font-medium text-sm">Extracted Content</div>
        <div className="text-muted-foreground text-xs">
          {summary.successCount} page{summary.successCount !== 1 ? "s" : ""}
          {summary.totalChars > 0 && (
            <span className="ml-1">
              · {Math.round(summary.totalChars / 1000)}k chars
            </span>
          )}
          {summary.source && (
            <span className="ml-1">· {summary.source}</span>
          )}
        </div>
      </div>

      {/* Extracted Pages */}
      <div className="px-3 py-2">
        {extracted.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No content extracted.
            {summary.failedUrls.length > 0 && (
              <div className="mt-2 text-xs">
                Failed URLs: {summary.failedUrls.length}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
            {extracted.map((page, index) => (
              <ExtractedPageRow key={`${page.url}-${index}`} index={index} page={page} />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {summary.failedUrls.length > 0 && (
        <div className="border-neutral-200/60 border-t px-3 py-2 dark:border-neutral-800/60">
          <div className="text-muted-foreground text-xs">
            Failed to extract: {summary.failedUrls.length} URL
            {summary.failedUrls.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

