import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { serverEnv } from "@/env/server";
import { maindb } from "@/lib/db";

export async function GET() {
  const start = Date.now();
  let connected = false;
  const tablesToCheck = [
    "verification",
    "user",
    "session",
    "account",
    "subscription",
  ] as const;
  const tables: Record<string, boolean> = {};
  let authEnv = { google: false, secret: false };

  try {
    // DB connectivity check
    // DB connectivity check via primary
    await maindb.execute(sql`select 1 as ok`);
    connected = true;

    // Schema presence check (read-only). If table doesn't exist, the query throws.
    await Promise.all(
      tablesToCheck.map(async (name) => {
        try {
          await maindb.execute(sql.raw(`select 1 from "${name}" limit 1`));
          tables[name] = true;
        } catch {
          tables[name] = false;
        }
      })
    );
  } catch (e) {
    connected = false;
  }

  try {
    authEnv = {
      google: !!(serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET),
      secret: !!process.env.BETTER_AUTH_SECRET,
    };
  } catch (_) {
    // If env parsing throws, keep defaults (false)
  }

  const ok =
    connected && tables.verification && authEnv.google && authEnv.secret;

  return NextResponse.json(
    {
      ok,
      db: { connected, tables },
      authEnv,
      elapsedMs: Date.now() - start,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
