import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

interface DFSKeywordItem {
  keyword: string;
  search_volume?: number;
  cpc?: number;
  competition?: number;
}

export const keywordResearchTool = tool({
  description:
    'Perform keyword research with DataForSEO Google Ads Keywords for Keywords (live). Provide 1-5 seed keywords, a location_code, and a language_code. Returns suggestions with volume, CPC, and competition.',
  inputSchema: z.object({
    seed_keywords: z
      .array(z.string().min(1))
      .min(1)
      .max(5)
      .describe('1-5 seed keywords to generate ideas from'),
    location_code: z
      .number()
      .describe('DataForSEO location_code (e.g., 2840 for United States). Use /v3/locations endpoint to discover codes.'),
    language_code: z.string().describe('ISO language code supported by DataForSEO (e.g., "en")'),
    limit: z
      .number()
      .min(1)
      .max(200)
      .default(100)
      .optional()
      .describe('Max number of keyword ideas to return (default 100)'),
    include_adult_keywords: z.boolean().optional().default(false),
  }),
  execute: async ({
    seed_keywords,
    location_code,
    language_code,
    limit = 100,
    include_adult_keywords = false,
  }: {
    seed_keywords: string[];
    location_code: number;
    language_code: string;
    limit?: number;
    include_adult_keywords?: boolean;
  }) => {
    const login = serverEnv.DATAFORSEO_LOGIN;
    const password = serverEnv.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      throw new Error(
        'DataForSEO credentials are not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the environment.'
      );
    }

    const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

    const payload = [
      {
        keywords: seed_keywords,
        location_code,
        language_code,
        include_adult_keywords,
        limit,
      },
    ];

    const url = 'https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`DataForSEO error: ${res.status} ${res.statusText} ${text}`);
    }

    const json = await res.json();

    // Expected structure: { tasks: [{ result: [{ items: [...] }] }] }
    const items: DFSKeywordItem[] =
      json?.tasks?.flatMap((t: any) => t?.result || [])
        ?.flatMap((r: any) => r?.items || []) || [];

    const normalized = items
      .slice(0, limit)
      .map((it: any) => ({
        keyword: it.keyword,
        search_volume: it.search_volume ?? it.avg_monthly_searches ?? undefined,
        cpc: typeof it.cpc === 'number' ? it.cpc : it.cpc?.usd ?? undefined,
        competition: it.competition ?? it.keyword_competition ?? undefined,
      })) as DFSKeywordItem[];

    return {
      provider: 'dataforseo',
      endpoint: 'keywords_for_keywords/live',
      input: { seed_keywords, location_code, language_code, limit, include_adult_keywords },
      count: normalized.length,
      keywords: normalized,
    };
  },
});

