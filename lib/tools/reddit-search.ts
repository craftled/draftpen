import { tool } from 'ai';
import { z } from 'zod';
// Tavily removed. Reddit search provider disabled for now.

export const redditSearchTool = tool({
  description: 'Search Reddit content (disabled).',
  inputSchema: z.object({
    query: z.string().describe('The exact search query from the user.').max(200),
    maxResults: z.number().describe('Maximum number of results to return. Default is 20.'),
    timeRange: z.enum(['day', 'week', 'month', 'year']).describe('Time range for Reddit search.'),
  }),
  execute: async () => {
    return {
      query: '',
      results: [],
      timeRange: 'week',
      disabled: true,
      message: 'Reddit search is currently disabled.',
    } as any;
  },
});
