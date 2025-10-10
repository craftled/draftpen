import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const flightTrackerTool = tool({
  description: 'Track flight information (disabled)',
  inputSchema: z.object({
    carrierCode: z.string().describe('The 2-letter airline carrier code (e.g., UL for SriLankan Airlines)'),
    flightNumber: z.string().describe('The flight number without carrier code (e.g., 604)'),
    scheduledDepartureDate: z.string().describe('The scheduled departure date in YYYY-MM-DD format (e.g., 2025-07-01)'),
  }),
  execute: async () => {
    return { data: [], disabled: true, message: 'Flight tracking is disabled.' } as any;
  },
});
