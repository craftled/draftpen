import { neon } from "@neondatabase/serverless";
import { upstashCache } from "drizzle-orm/cache/upstash";
import { drizzle } from "drizzle-orm/neon-http";
import { withReplicas } from "drizzle-orm/pg-core";
import { serverEnv } from "@/env/server";
import { schema } from "@/lib/db/schema";

const sql = neon(serverEnv.DATABASE_URL);
const sqlread1 = process.env.READ_DB_1 ? neon(process.env.READ_DB_1) : sql;
const sqlread2 = process.env.READ_DB_2 ? neon(process.env.READ_DB_2) : sql;

export const maindb = drizzle(sql, {
  schema,
  cache: upstashCache({
    url: serverEnv.UPSTASH_REDIS_REST_URL,
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    global: true,
    config: { ex: 600 },
  }),
});

const dbread1 = drizzle(sqlread1, {
  schema,
  cache: upstashCache({
    url: serverEnv.UPSTASH_REDIS_REST_URL,
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    global: true,
    config: { ex: 600 },
  }),
});

const dbread2 = drizzle(sqlread2, {
  schema,
  cache: upstashCache({
    url: serverEnv.UPSTASH_REDIS_REST_URL,
    token: serverEnv.UPSTASH_REDIS_REST_TOKEN,
    global: true,
    config: { ex: 600 },
  }),
});

export const db = withReplicas(maindb, [dbread1, dbread2]);
