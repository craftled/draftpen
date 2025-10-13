import { db } from './lib/db';
import { subscription } from './lib/db/schema';
import { sql } from 'drizzle-orm';

async function testWebhookData() {
  try {
    console.log('🧪 SIMULATING WEBHOOK DATA LOCALLY\n');
    
    const subId = '71a85756-4cda-4fca-8392-77fc3f20f02c';
    const userId = 'WusgJhuEG08YCj9CXvDtP5wYrqYYU7yy';
    
    // Simulate what the webhook should do
    console.log('📝 Updating subscription with trial dates...');
    
    await db.execute(sql`
      UPDATE subscription 
      SET 
        "userId" = ${userId},
        "trialStart" = '2025-10-13T18:58:23.905292Z'::timestamp,
        "trialEnd" = '2025-10-20T18:58:20.237029Z'::timestamp
      WHERE id = ${subId};
    `);
    
    console.log('✅ Updated!');
    
    // Verify
    const result = await db.execute(sql`
      SELECT 
        id, "userId", status, "trialStart", "trialEnd"
      FROM subscription
      WHERE id = ${subId};
    `);
    
    const sub = result.rows[0] as any;
    
    console.log('\n📊 Current State:');
    console.log('─'.repeat(60));
    console.log(`  User ID: ${sub.userId || 'NULL'}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Trial Start: ${sub.trialStart || 'NULL'}`);
    console.log(`  Trial End: ${sub.trialEnd || 'NULL'}`);
    console.log('─'.repeat(60));
    
    if (sub.userId && sub.trialStart && sub.trialEnd) {
      const daysLeft = Math.ceil((new Date(sub.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`\n✅ Everything is set!`);
      console.log(`   Expected badge: "${daysLeft}d trial"`);
      console.log('\nNow:');
      console.log('1. Refresh draftpen.com');
      console.log('2. You should see trial countdown badge!');
    } else {
      console.log('\n⚠️  Still missing data');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testWebhookData();
