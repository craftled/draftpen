// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    XAI_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    GROQ_API_KEY: z.string().min(1).optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
    // DAYTONA_API_KEY removed
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    // GITHUB_* removed
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    // TWITTER_* removed
    REDIS_URL: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().min(1),
    // TAVILY_API_KEY removed
    EXA_API_KEY: z.string().min(1),
    // VALYU_API_KEY removed
    // TMDB_API_KEY removed
    YT_ENDPOINT: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    PARALLEL_API_KEY: z.string().min(1),
    // OPENWEATHER_API_KEY removed
    // GOOGLE_MAPS_API_KEY removed
    // AMADEUS_* removed
    CRON_SECRET: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    SMITHERY_API_KEY: z.string().min(1),
    // COINGECKO_API_KEY removed
    QSTASH_TOKEN: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SUPERMEMORY_API_KEY: z.string().min(1),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: process.env,
});
