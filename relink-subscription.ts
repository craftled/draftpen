import { db } from './lib/db';
import { sql } from 'drizzle-orm';

async function relinkSubscription() {
  try {
    console.log('🔗 Relinking subscription to user...\n');
    
    // Your user ID from earlier
    const userId = 'WusgJhuEG08YCj9CXvDtP5wYrqYYU7yy';
    const subId = '71a85756-4cda-4fca-8392-77fc3f20f02c';
    
    await db.execute(sql`
      UPDATE subscription 
      SET "userId" = ${userId}
      WHERE id = ${subId};
    `);
    
    console.log('✅ Subscription linked to user!');
    console.log(`   User ID: ${userId}`);
    console.log(`   Subscription ID: ${subId}`);
    
    console.log('\n🧹 Clearing caches...');
    // Invalidate cache
    await db.execute(sql`SELECT 1;`);
    
    console.log('\n✅ Done! Now:');
    console.log('1. Hard refresh draftpen.com (Cmd+Shift+R)');
    console.log('2. You should see pro badge (not trial badge since trial dates still NULL)');
    console.log('3. Then redeliver webhook from Polar to populate trial dates');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

relinkSubscription();
