import type { FormatOption } from "@mendable/firecrawl-js";
import FirecrawlApp from "@mendable/firecrawl-js";
import { generateId, tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { serverEnv } from "@/env/server";
import { getUser } from "@/lib/auth-utils";
import { calculateWordCount } from "@/lib/content-analysis";
import { maindb } from "@/lib/db";
import { extractedPage } from "@/lib/db/schema";

const HTTP_PREFIX_RE = /^https?:\/\//;
const MS_PER_SECOND = 1000 as const;
const MAX_CONTENT_PREVIEW = 3000 as const; // For display/context

// Extract H1 from markdown content
function extractH1(markdown: string): string | undefined {
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  return h1Match ? h1Match[1].trim() : undefined;
}

type ExtractedPage = {
  url: string;
  title: string;
  metaDescription?: string;
  h1?: string;
  content: string; // Full markdown, no truncation
  contentPreview: string; // First 3000 chars for display
  metadata: {
    author?: string;
    publishedDate?: string;
    image?: string;
    favicon?: string;
    language?: string;
  };
};

type SerpExtractOutput = {
  extractionId: string;
  summary: {
    totalPages: number;
    successCount: number;
    failedUrls: string[];
    source: "exa" | "firecrawl" | "mixed";
  };
};

export const serpExtractTool = tool({
  description:
    "Extract full markdown content from SERP ranking pages. When user says 'extract' or 'extract all', extract ALL URLs from the previous serp_checker tool output (from organic.results array, each result has a 'link' field). Accepts up to 20 URLs directly in an array. Returns page title, meta description, H1 heading, and full content for each page.",
  inputSchema: z.object({
    urls: z
      .array(z.string().url())
      .min(1)
      .max(20)
      .describe(
        "Array of URLs to extract content from. Can be from SERP results or manually provided. Maximum 20 URLs. IMPORTANT: When extracting from previous SERP results, include ALL URLs from the organic.results array (typically 20 URLs)."
      ),
  }),
  execute: async ({ urls }: { urls: string[] }): Promise<SerpExtractOutput> => {
    const start = Date.now();
    const exa = new Exa(serverEnv.EXA_API_KEY as string);
    const firecrawl = new FirecrawlApp({
      apiKey: serverEnv.FIRECRAWL_API_KEY,
    });

    const extracted: ExtractedPage[] = [];
    const failedUrls: string[] = [];
    let usedExa = false;
    let usedFirecrawl = false;

    // First, try Exa for all URLs (batch)
    try {
      const exaResult = await exa.getContents(urls, {
        text: true, // Get full text, no character limit for storage
        livecrawl: "preferred",
      });

      // Process Exa results
      for (const item of exaResult.results) {
        if (item.text?.trim()) {
          const h1 = extractH1(item.text);
          const contentPreview = item.text.slice(0, MAX_CONTENT_PREVIEW);

          extracted.push({
            url: item.url,
            title:
              item.title || item.url.split("/").pop() || "Retrieved Content",
            metaDescription:
              (item as { summary?: string }).summary || undefined,
            h1,
            content: item.text, // Full content, no truncation
            contentPreview,
            metadata: {
              author: item.author || undefined,
              publishedDate: item.publishedDate || undefined,
              image: item.image || undefined,
              favicon:
                item.favicon ||
                `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=128`,
              language: "en",
            },
          });
          usedExa = true;
        } else {
          failedUrls.push(item.url);
        }
      }

      // Add any URLs that weren't returned by Exa to the failed list
      const exaUrls = exaResult.results.map((r) => r.url);
      const missingUrls = urls.filter((url) => !exaUrls.includes(url));
      failedUrls.push(...missingUrls);
    } catch (_exaError) {
      // If Exa fails completely, try Firecrawl for all URLs
      failedUrls.push(...urls);
    }

    // Use Firecrawl as fallback for failed URLs
    if (failedUrls.length > 0) {
      // Use individual scrapes (consistent with existing codebase pattern)
      for (const url of failedUrls.slice()) {
        try {
          const urlWithoutHttps = url.replace(HTTP_PREFIX_RE, "");
          const isReddit = url.includes("reddit.com");

          // Reddit URLs need special handling - they're JavaScript-heavy SPAs
          const scrapeOptions = {
            formats: ["markdown"] as FormatOption[],
            proxy: "auto" as const,
            storeInCache: true,
            parsers: ["pdf"],
            // For Reddit, add wait time for JavaScript rendering
            ...(isReddit ? { waitFor: 3000 } : {}),
          };

          const scrapeResponse = await firecrawl.scrape(
            urlWithoutHttps,
            scrapeOptions
          );

          if (scrapeResponse.markdown) {
            const h1 = extractH1(scrapeResponse.markdown);
            const contentPreview = scrapeResponse.markdown.slice(
              0,
              MAX_CONTENT_PREVIEW
            );

            extracted.push({
              url,
              title:
                scrapeResponse.metadata?.title ||
                url.split("/").pop() ||
                "Retrieved Content",
              metaDescription:
                scrapeResponse.metadata?.description || undefined,
              h1,
              content: scrapeResponse.markdown, // Full content, no truncation
              contentPreview,
              metadata: {
                author:
                  (scrapeResponse.metadata?.author as string) || undefined,
                publishedDate:
                  (scrapeResponse.metadata?.publishedDate as string) ||
                  undefined,
                image:
                  (scrapeResponse.metadata?.image as string) ||
                  (scrapeResponse.metadata?.ogImage as string) ||
                  undefined,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
                language: (scrapeResponse.metadata?.language as string) || "en",
              },
            });
            usedFirecrawl = true;

            // Remove from failed list
            const index = failedUrls.indexOf(url);
            if (index > -1) {
              failedUrls.splice(index, 1);
            }
          }
        } catch (_scrapeError) {
          // URL failed, keep it in failedUrls
        }
      }
    }

    // Log warning if not all URLs were extracted
    if (extracted.length < urls.length) {
      console.warn(
        `SERP Extract: Only extracted ${extracted.length} out of ${urls.length} URLs. Failed: ${failedUrls.join(", ")}`
      );
    }

    // Generate extraction ID
    const extractionId = generateId();

    // Get user ID from auth context
    const user = await getUser();
    if (!user) {
      throw new Error("User must be authenticated to extract SERP content");
    }
    const userId = user.id;

    // Save all extracted pages to DB
    for (const page of extracted) {
      await maindb.insert(extractedPage).values({
        extractionId,
        userId,
        url: page.url,
        title: page.title,
        metaDescription: page.metaDescription,
        h1: page.h1,
        content: page.content,
        wordCount: calculateWordCount(page.content),
        metadata: page.metadata,
      });
    }

    const duration = (Date.now() - start) / MS_PER_SECOND;
    console.log(
      `[serp-extract] Completed in ${duration.toFixed(2)}s, extraction ID: ${extractionId}`
    );

    return {
      extractionId,
      summary: {
        totalPages: extracted.length,
        successCount: extracted.length,
        failedUrls,
        source:
          usedExa && usedFirecrawl
            ? "mixed"
            : usedFirecrawl
              ? "firecrawl"
              : "exa",
      },
    };
  },
});
