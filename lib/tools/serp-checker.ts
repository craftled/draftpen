import { tool } from "ai";
import { z } from "zod";
import { serverEnv } from "@/env/server";

type SerpResult = {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position: number;
  sitelinks?: Array<{ title: string; link: string }>;
};

type PeopleAlsoAsk = {
  question: string;
  snippet: string;
  title: string;
  link: string;
};

type RelatedSearch = {
  query: string;
};

export const serpCheckerTool = tool({
  description:
    "Get top SERP results for a keyword using Serper.dev API. Returns organic search results (up to 20), People Also Ask questions, and related searches. Perfect for content research and competitive analysis.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe("The search keyword/query to get SERP results for"),
    num: z
      .number()
      .min(1)
      .max(100)
      .default(20)
      .optional()
      .describe("Number of organic results to return (default 20, max 100)"),
    country: z
      .string()
      .default("us")
      .optional()
      .describe(
        'Country code (e.g., "us", "uk", "de", "fr"). Defaults to "us".'
      ),
    language: z
      .string()
      .default("en")
      .optional()
      .describe('Language code (e.g., "en", "es", "fr"). Defaults to "en".'),
  }),
  execute: async ({
    query,
    num = 20,
    country = "us",
    language = "en",
  }: {
    query: string;
    num?: number;
    country?: string;
    language?: string;
  }) => {
    const apiKey = serverEnv.SERPER_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Serper API key is not configured. Please set SERPER_API_KEY in the environment."
      );
    }

    const url = "https://google.serper.dev/search";

    const desired = Math.max(1, Math.min(num, 100));
    const resultsPerPage = 10; // Serper returns 10 organic results per page
    const totalPages = Math.ceil(desired / resultsPerPage);

    const makePayload = (page: number) => ({
      q: query,
      gl: country,
      hl: language,
      autocorrect: true,
      ...(page > 1 ? { page } : {}),
    });

    // First page (also contains PAA and Related Searches)
    const firstRes = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(makePayload(1)),
    });

    if (!firstRes.ok) {
      const text = await firstRes.text().catch(() => "");
      throw new Error(
        `Serper API error: ${firstRes.status} ${firstRes.statusText} ${text}`
      );
    }

    const firstJson = await firstRes.json();

    const organicPages: Array<{ page: number; items: SerpResult[] }> = [];

    const mapOrganic = (json: any, page: number): SerpResult[] =>
      (json.organic || []).map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        date: result.date,
        // Convert page-local position (1..10) to global position
        position: (page - 1) * resultsPerPage + (result.position ?? 0),
        sitelinks: result.sitelinks,
      }));

    organicPages.push({ page: 1, items: mapOrganic(firstJson, 1) });

    // Fetch remaining pages if needed (page 2..N)
    if (totalPages > 1) {
      const fetches = [] as Promise<{ page: number; json: any }>[];
      for (let p = 2; p <= totalPages; p++) {
        fetches.push(
          fetch(url, {
            method: "POST",
            headers: {
              "X-API-KEY": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(makePayload(p)),
          }).then(async (res) => {
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              throw new Error(
                `Serper API error (page ${p}): ${res.status} ${res.statusText} ${text}`
              );
            }
            return { page: p, json: await res.json() };
          })
        );
      }

      const pagesJson = await Promise.all(fetches);
      for (const { page, json } of pagesJson) {
        organicPages.push({ page, items: mapOrganic(json, page) });
      }
    }

    // Combine and trim to desired count
    const combinedOrganic = organicPages
      .sort((a, b) => a.page - b.page)
      .flatMap((p) => p.items)
      .slice(0, desired);

    // Extract PAA and Related from the first page only
    const peopleAlsoAsk = (firstJson.peopleAlsoAsk || []).map((paa: any) => ({
      question: paa.question,
      snippet: paa.snippet,
      title: paa.title,
      link: paa.link,
    })) as PeopleAlsoAsk[];

    const relatedSearches = (firstJson.relatedSearches || []).map(
      (rs: any) => ({
        query: rs.query,
      })
    ) as RelatedSearch[];

    return {
      provider: "serper",
      endpoint: "google.serper.dev/search",
      input: { query, num: desired, country, language },
      organic: {
        count: combinedOrganic.length,
        results: combinedOrganic,
      },
      peopleAlsoAsk: {
        count: peopleAlsoAsk.length,
        questions: peopleAlsoAsk,
      },
      relatedSearches: {
        count: relatedSearches.length,
        queries: relatedSearches,
      },
      credits: totalPages, // 1 credit per page
    };
  },
});
