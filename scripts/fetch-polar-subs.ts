import { config } from 'dotenv';
config({ path: '.env.local' });
import { Polar } from '@polar-sh/sdk';

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf('--email');
  const customerIdIdx = args.indexOf('--customer-id');
  if (emailIdx === -1 && customerIdIdx === -1) {
    console.error('Usage: bun run scripts/fetch-polar-subs.ts --customer-id <id> | --email <email>');
    process.exit(1);
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('POLAR_ACCESS_TOKEN is required');
    process.exit(1);
  }
  const polar = new Polar({ accessToken });

  let customerId: string | undefined = undefined;
  if (customerIdIdx !== -1 && args[customerIdIdx + 1]) {
    customerId = args[customerIdIdx + 1];
  }
  if (!customerId && emailIdx !== -1 && args[emailIdx + 1]) {
    const email = args[emailIdx + 1];
    const { result: customers } = await polar.customers.list({ email });
    const customer = customers.items[0];
    if (!customer) {
      console.error('No customer found for email');
      process.exit(1);
    }
    customerId = customer.id;
  }
  if (!customerId) {
    console.error('Provide --customer-id or --email');
    process.exit(1);
  }

  const { result } = await polar.subscriptions.list({ customerId });
  const subs = result.items || [];
  console.log(`Found ${subs.length} Polar subscription(s) for customer ${customerId}`);
  for (const s of subs) {
    console.log(`- id=${s.id} status=${s.status} currentPeriodEnd=${s.currentPeriodEnd} trial_start=${(s as any).trial_start} trial_end=${(s as any).trial_end}`);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

