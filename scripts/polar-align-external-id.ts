import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { user as userTable } from '@/lib/db/schema';
import { Polar } from '@polar-sh/sdk';

async function main() {
  const args = process.argv.slice(2);
  const emailFlagIndex = args.indexOf('--email');
  if (emailFlagIndex === -1 || !args[emailFlagIndex + 1]) {
    console.error('Usage: bun run scripts/polar-align-external-id.ts --email <email>');
    process.exit(1);
  }
  const email = args[emailFlagIndex + 1];

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('POLAR_ACCESS_TOKEN is required in env');
    process.exit(1);
  }

  console.log(`\n🔎 Aligning Polar customer.externalId for: ${email}`);

  // 1) Look up user in our DB to get Better Auth user.id
  const user = await db.query.user.findFirst({
    where: eq(userTable.email, email),
    columns: { id: true, email: true, name: true },
  });

  if (!user) {
    console.error(`❌ No user found in DB for email: ${email}`);
    process.exit(1);
  }

  console.log(`✅ DB user id: ${user.id}`);

  // 2) Find Polar customer by email
  const polar = new Polar({ accessToken });

  const { result: customers } = await polar.customers.list({ email });
  const customer = customers.items[0];

  if (!customer) {
    console.error('❌ No Polar customer found by email. Make sure this user has visited checkout/portal.');
    process.exit(1);
  }

  console.log(`✅ Found Polar customer id=${customer.id}, externalId=${customer.externalId ?? 'NULL'}`);

  // 3) If externalId missing, set it to our Better Auth user.id
  if (!customer.externalId) {
    console.log('🛠️ Setting externalId on Polar customer...');
    const updated = await polar.customers.update({
      id: customer.id,
      customerUpdate: { externalId: user.id },
    });
    console.log(`✅ Updated Polar customer externalId -> ${updated.externalId}`);
  } else if (customer.externalId !== user.id) {
    console.warn('⚠️ Polar customer has a different externalId than our user.id');
    console.warn(`   externalId=${customer.externalId} vs user.id=${user.id}`);
    console.warn('   Per Polar: externalId cannot be changed once set. Options:');
    console.warn('   - Change our local user.id to match Polar (only safe at signup; risky post-signup)');
    console.warn('   - Contact Polar support or migrate data to align IDs');
    console.warn('   Skipping mutation.');
  } else {
    console.log('ℹ️ externalId already matches our user.id; no update needed.');
  }

  console.log('\n📣 Next step: Redeliver a subscription webhook for this customer');
  console.log('   In Polar Dashboard → Webhooks, pick a subscription.updated/active event for this customer and click Resend.');
  console.log('   This will upsert the subscription row with userId set, enabling Pro access (including trialing).');

  console.log('\n✅ Align step complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

