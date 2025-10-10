import { tool } from 'ai';
import { z } from 'zod';
// Valyu removed

export const currencyConverterTool = tool({
  description: 'Convert currency from one to another (disabled)',
  inputSchema: z.object({
    from: z.string().describe('The source currency code.'),
    to: z.string().describe('The target currency code.'),
    amount: z.number().describe('The amount to convert. Default is 1.'),
  }),
  execute: async () => {
    return { disabled: true, message: 'Currency conversion is disabled.' } as any;
  },
});
