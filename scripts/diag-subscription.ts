import { maindb } from '@/lib/db';
import { user, subscription } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';

async function main() {
  try {
    const emailArgIndex = process.argv.indexOf('--email');
    const email = emailArgIndex !== -1 ? process.argv[emailArgIndex + 1] : process.env.EMAIL;

    if (!email) {
      console.error('Usage: bun run scripts/diag-subscription.ts --email <user@example.com>');
      process.exit(1);
    }

    console.log(`\n🔎 Diagnosing subscription for: ${email}`);

    // 1) Find user by email
    const u = await maindb.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!u) {
      console.log('❌ No user found for that email');
      process.exit(0);
    }

    console.log(`✅ User found: id=${u.id}`);

    // 2) Fetch subscriptions linked to this userId
    const subs = await maindb
      .select({
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        userId: subscription.userId,
        productId: subscription.productId,
        checkoutId: subscription.checkoutId,
        createdAt: subscription.createdAt,
      })
      .from(subscription)
      .where(eq(subscription.userId, u.id))
      .orderBy(desc(subscription.createdAt));

    if (subs.length === 0) {
      console.log('❌ No subscription rows linked to this user (subscription.userId is not set for this user)');
      process.exit(0);
    }

    console.log(`\n📦 Found ${subs.length} subscription(s) linked to this user:`);
    for (const s of subs) {
      console.log(`- id=${s.id} status=${s.status} currentPeriodEnd=${s.currentPeriodEnd?.toISOString?.() ?? s.currentPeriodEnd}`);
    }

    // 3) Determine pro status similar to lightweight check
    const now = new Date();
    const activeLike = subs.find((s) => (s.status === 'active' || s.status === 'trialing'));
    const isCurrent = activeLike && sDate(activeLike.currentPeriodEnd) && sDate(activeLike.currentPeriodEnd)!.getTime() > now.getTime();
    const isPro = Boolean(activeLike) && Boolean(isCurrent);

    console.log(`\n🔐 Computed isProUser: ${isPro ? 'YES' : 'NO'}`);

    process.exit(0);
  } catch (err) {
    console.error('Error during diagnosis:', err);
    process.exit(1);
  }
}

function sDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

main();

