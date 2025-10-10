import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const coinDataTool = tool({
  description: 'Get coin data (disabled)',
  inputSchema: z.object({
    coinId: z.string().describe('The coin ID (e.g., bitcoin, ethereum, solana)'),
    localization: z.boolean().optional().describe('Include all localized languages in response (default: true)'),
    tickers: z.boolean().optional().describe('Include tickers data (default: true)'),
    marketData: z.boolean().optional().describe('Include market data (default: true)'),
    communityData: z.boolean().optional().describe('Include community data (default: true)'),
    developerData: z.boolean().optional().describe('Include developer data (default: true)'),
  }),
  execute: async () => {
    return { success: false, disabled: true, message: 'Coin data is disabled.' } as any;
  },
});

export const coinDataByContractTool = tool({
  description: 'Get coin data by contract (disabled)',
  inputSchema: z.object({
    platformId: z.string().describe('The platform ID (e.g., ethereum, binance-smart-chain, polygon-pos)'),
    contractAddress: z.string().describe('The contract address of the token'),
    localization: z.boolean().optional().describe('Include all localized languages in response (default: true)'),
    tickers: z.boolean().optional().describe('Include tickers data (default: true)'),
    marketData: z.boolean().optional().describe('Include market data (default: true)'),
    communityData: z.boolean().optional().describe('Include community data (default: true)'),
    developerData: z.boolean().optional().describe('Include developer data (default: true)'),
  }),
  execute: async () => {
    return { success: false, disabled: true, message: 'Contract coin data is disabled.' } as any;
  },
});

export const coinOhlcTool = tool({
  description: 'Get coin OHLC (disabled)',
  inputSchema: z.object({
    coinId: z.string().describe('The coin ID (e.g., bitcoin, ethereum, solana)'),
    vsCurrency: z.string().optional().describe('The target currency of market data (usd, eur, jpy, etc.)'),
    days: z.number().optional().describe('Data up to number of days ago (1/7/14/30/90/180/365/max)'),
  }),
  execute: async () => {
    return { success: false, disabled: true, message: 'Coin OHLC is disabled.' } as any;
  },
});
