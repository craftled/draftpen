import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const trendingTvTool = tool({
  description: 'Get trending TV shows (disabled)',
  inputSchema: z.object({}),
  execute: async () => {
    return { results: [], disabled: true, message: 'TMDB trending is disabled.' } as any;
  },
});
