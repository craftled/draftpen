import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/lib/db';
import { subscription } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const args = process.argv.slice(2);
  const idIdx = args.indexOf('--user-id');
  if (idIdx === -1 || !args[idIdx + 1]) {
    console.error('Usage: bun run scripts/list-subs-for-user.ts --user-id <id>');
    process.exit(1);
  }
  const userId = args[idIdx + 1];

  const rows = await db
    .select({ id: subscription.id, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd })
    .from(subscription)
    .where(eq(subscription.userId, userId));
  if (!rows.length) {
    console.log('No subscriptions for user:', userId);
  } else {
    console.log(`Found ${rows.length} subscription(s) for user ${userId}:`);
    for (const r of rows) {
      console.log(`- id=${r.id} status=${r.status} currentPeriodEnd=${r.currentPeriodEnd}`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

