import { db } from './lib/db';
<parameter name="sql">import { sql } from 'drizzle-orm';

async function verifySubscription() {
  try {
    console.log('🔍 Checking production subscription data...\n');
    
    const result = await db.execute(sql`
      SELECT 
        id, 
        "userId", 
        status, 
        amount,
        "trialStart", 
        "trialEnd",
        "currentPeriodStart",
        "currentPeriodEnd",
        "createdAt"
      FROM subscription
      WHERE id = '71a85756-4cda-4fca-8392-77fc3f20f02c';
    `);
    
    const sub = result.rows[0] as any;
    
    if (!sub) {
      console.log('❌ Subscription not found!');
      process.exit(1);
    }
    
    console.log('📦 Subscription Details:');
    console.log('─'.repeat(60));
    console.log(`  ID: ${sub.id}`);
    console.log(`  User ID: ${sub.userId || '(not linked)'}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Amount: $${sub.amount / 100}`);
    console.log('─'.repeat(60));
    console.log(`  Trial Start: ${sub.trialStart || '❌ NULL'}`);
    console.log(`  Trial End:   ${sub.trialEnd || '❌ NULL'}`);
    console.log('─'.repeat(60));
    console.log(`  Period Start: ${sub.currentPeriodStart}`);
    console.log(`  Period End:   ${sub.currentPeriodEnd}`);
    console.log(`  Created:      ${sub.createdAt}`);
    console.log('─'.repeat(60));
    
    if (sub.trialStart && sub.trialEnd) {
      console.log('\n✅ Trial dates are populated!');
      const daysLeft = Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`   Days left in trial: ${daysLeft}`);
    } else {
      console.log('\n⚠️  Trial dates are NULL');
      console.log('   This means webhook with trial_start/trial_end has not been processed yet.');
      console.log('   After deploying, redeliver the webhook from Polar dashboard.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

verifySubscription();
