import { db } from './lib/db';
import { sql } from 'drizzle-orm';

async function debugSubscription() {
  try {
    console.log('🔍 COMPREHENSIVE SUBSCRIPTION DEBUG\n');
    console.log('═'.repeat(60));
    
    // 1. Check subscription in database
    console.log('\n1️⃣ DATABASE CHECK:');
    console.log('─'.repeat(60));
    const subResult = await db.execute(sql`
      SELECT 
        id, 
        "userId", 
        status, 
        amount,
        "trialStart", 
        "trialEnd",
        "currentPeriodStart",
        "currentPeriodEnd"
      FROM subscription
      WHERE id = '71a85756-4cda-4fca-8392-77fc3f20f02c';
    `);
    
    const sub = subResult.rows[0] as any;
    
    if (!sub) {
      console.log('❌ Subscription not found in database!');
      process.exit(1);
    }
    
    console.log(`  Subscription ID: ${sub.id}`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  User ID: ${sub.userId || '❌ NULL - NOT LINKED!'}`);
    console.log(`  Amount: $${sub.amount / 100}`);
    console.log(`  Trial Start: ${sub.trialStart || '❌ NULL'}`);
    console.log(`  Trial End: ${sub.trialEnd || '❌ NULL'}`);
    
    // 2. Check if user exists
    console.log('\n2️⃣ USER CHECK:');
    console.log('─'.repeat(60));
    
    if (sub.userId) {
      const userResult = await db.execute(sql`
        SELECT id, email, name FROM "user" WHERE id = ${sub.userId};
      `);
      
      const user = userResult.rows[0] as any;
      if (user) {
        console.log(`  ✅ User found: ${user.email} (${user.name})`);
        console.log(`  ✅ Subscription is linked to this user`);
      } else {
        console.log(`  ❌ User with ID ${sub.userId} not found!`);
      }
    } else {
      console.log(`  ❌ Subscription has no userId - NOT LINKED!`);
    }
    
    // 3. Check what isProUser logic would return
    console.log('\n3️⃣ PRO STATUS CHECK:');
    console.log('─'.repeat(60));
    
    const hasValidStatus = sub.status === 'active' || sub.status === 'trialing';
    const isLinked = !!sub.userId;
    const shouldBeProUser = hasValidStatus && isLinked;
    
    console.log(`  Status is valid? ${hasValidStatus ? '✅' : '❌'} (${sub.status})`);
    console.log(`  Linked to user? ${isLinked ? '✅' : '❌'}`);
    console.log(`  Should show as Pro? ${shouldBeProUser ? '✅ YES' : '❌ NO'}`);
    
    // 4. Check trial status
    console.log('\n4️⃣ TRIAL STATUS CHECK:');
    console.log('─'.repeat(60));
    
    if (sub.trialStart && sub.trialEnd) {
      const now = new Date();
      const trialEnd = new Date(sub.trialEnd);
      const isInTrial = now < trialEnd;
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`  ✅ Trial dates exist`);
      console.log(`  Currently in trial? ${isInTrial ? '✅ YES' : '❌ NO (expired)'}`);
      console.log(`  Days remaining: ${daysLeft}`);
      console.log(`  Should show trial badge? ${isInTrial ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`  ❌ Trial dates are NULL`);
      console.log(`  Badge will show: "pro" (not trial countdown)`);
    }
    
    // 5. Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('═'.repeat(60));
    
    if (!sub.userId) {
      console.log('❌ PROBLEM: Subscription not linked to user');
      console.log('   FIX: Run relink-subscription.ts');
    } else if (!sub.trialStart || !sub.trialEnd) {
      console.log('⚠️  Subscription is linked but missing trial dates');
      console.log('   REASON: Webhook was processed before code with trial_start/trial_end was deployed');
      console.log('   FIX: Redeliver webhook from Polar dashboard NOW (after this deploy)');
    } else {
      console.log('✅ Everything looks good!');
      console.log('   Expected badge: Trial countdown');
      console.log('   If not showing: Clear browser cache and hard refresh');
    }
    
    console.log('\n💡 NEXT STEPS:');
    if (!shouldBeProUser) {
      console.log('1. Fix the issues above first');
    } else {
      console.log('1. Hard refresh browser (Cmd+Shift+R)');
      console.log('2. Clear cookies for draftpen.com');
      console.log('3. Sign out and sign back in');
      console.log('4. Check navbar for badge');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

debugSubscription();
