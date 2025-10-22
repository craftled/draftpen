// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    AI_GATEWAY_API_KEY: z.string().min(1),

    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    REDIS_URL: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().min(1),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().min(1),
    EXA_API_KEY: z.string().min(1),
    YT_ENDPOINT: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    PARALLEL_API_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),
    SMITHERY_API_KEY: z.string().min(1),
    QSTASH_TOKEN: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SUPERMEMORY_API_KEY: z.string().min(1),
    SCREENSHOTONE_ACCESS_KEY: z.string().min(1).optional(),
    SCREENSHOTONE_SECRET_KEY: z.string().min(1).optional(),
    DATAFORSEO_LOGIN: z.string().min(1).optional(),
    DATAFORSEO_PASSWORD: z.string().min(1).optional(),
    SERPER_API_KEY: z.string().min(1).optional(),

    ALLOWED_ORIGINS: z.string().optional().default("http://localhost:3000"),
  },
  experimental__runtimeEnv: process.env,
});
