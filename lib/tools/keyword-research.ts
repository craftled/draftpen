import { tool } from "ai";
import { z } from "zod";
import { serverEnv } from "@/env/server";

interface DFSKeywordItem {
  keyword: string;
  search_volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number; // convenience alias (maps to competition when available)
}

export const keywordResearchTool = tool({
  description:
    'Keyword research via DataForSEO (Google Ads Keywords for Keywords, live). You can provide a simple "query" like "best seo tools" or 1-5 seed keywords. Defaults: location_code=2840 (US), language_code="en".',
  inputSchema: z
    .object({
      query: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Simple topic/seed (e.g., "best seo tools"). If provided, seed_keywords is optional.'
        ),
      seed_keywords: z
        .array(z.string().min(1))
        .min(1)
        .max(5)
        .optional()
        .describe("1-5 seed keywords to generate ideas from"),
      location_code: z
        .number()
        .optional()
        .default(2840)
        .describe(
          "DataForSEO location_code. Defaults to 2840 (United States)."
        ),
      language_code: z
        .string()
        .optional()
        .default("en")
        .describe('ISO language code. Defaults to "en".'),
      limit: z
        .number()
        .min(1)
        .max(200)
        .default(100)
        .optional()
        .describe("Max number of keyword ideas to return (default 100)"),
      include_adult_keywords: z.boolean().optional().default(false),
    })
    .refine(
      (v) =>
        (v.query && v.query.length > 0) ||
        (Array.isArray(v.seed_keywords) && v.seed_keywords.length > 0),
      { message: 'Provide either "query" or "seed_keywords".' }
    ),
  execute: async ({
    query,
    seed_keywords,
    location_code = 2840,
    language_code = "en",
    limit = 100,
    include_adult_keywords = false,
  }: {
    query?: string;
    seed_keywords?: string[];
    location_code?: number;
    language_code?: string;
    limit?: number;
    include_adult_keywords?: boolean;
  }) => {
    const login = serverEnv.DATAFORSEO_LOGIN;
    const password = serverEnv.DATAFORSEO_PASSWORD;

    if (!(login && password)) {
      throw new Error(
        "DataForSEO credentials are not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the environment."
      );
    }

    const seeds =
      seed_keywords && seed_keywords.length > 0
        ? seed_keywords
        : query
          ? [query]
          : [];

    if (seeds.length === 0) {
      throw new Error(
        'Provide a non-empty "query" or at least one value in "seed_keywords".'
      );
    }

    const authHeader =
      "Basic " + Buffer.from(`${login}:${password}`).toString("base64");

    const payload = [
      {
        keywords: seeds,
        location_code,
        language_code,
        include_adult_keywords,
        limit,
      },
    ];

    const url =
      "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `DataForSEO error: ${res.status} ${res.statusText} ${text}`
      );
    }

    const json = await res.json();

    // Check for API errors
    if (json.status_code !== 20_000) {
      throw new Error(
        `DataForSEO API error: ${json.status_message || "Unknown error"}`
      );
    }

    // Expected structure: { tasks: [{ result: [...keyword objects...] }] }
    // Each result item is a keyword object directly
    const items: any[] =
      json?.tasks?.flatMap((t: any) => t?.result || []) || [];

    if (items.length === 0) {
      return {
        provider: "dataforseo",
        endpoint: "keywords_for_keywords/live",
        input: {
          query,
          seed_keywords: seeds,
          location_code,
          language_code,
          limit,
          include_adult_keywords,
        },
        count: 0,
        keywords: [],
        message: "No keyword results found for this query.",
      };
    }

    const normalized = items.slice(0, limit).map((it: any) => ({
      keyword: it.keyword,
      search_volume: it.search_volume ?? undefined,
      cpc: typeof it.cpc === "number" ? it.cpc : undefined,
      competition: it.competition ?? undefined,
      competition_index: it.competition_index ?? undefined,
      difficulty: it.competition_index ?? it.competition ?? undefined,
    }));

    return {
      provider: "dataforseo",
      endpoint: "keywords_for_keywords/live",
      input: {
        query,
        seed_keywords: seeds,
        location_code,
        language_code,
        limit,
        include_adult_keywords,
      },
      count: normalized.length,
      keywords: normalized,
    };
  },
});
