import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const movieTvSearchTool = tool({
  description: 'Search for a movie or TV show (disabled)',
  inputSchema: z.object({
    query: z.string().describe('The search query for movies/TV shows'),
  }),
  execute: async () => {
    return { result: null, disabled: true, message: 'TMDB is disabled.' } as any;
  },
});
