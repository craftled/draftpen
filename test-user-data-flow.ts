import { getComprehensiveUserData } from './lib/user-data-server';
import { isInTrial, getDaysLeftInTrial } from './lib/subscription-utils';

async function testUserDataFlow() {
  try {
    console.log('🧪 TESTING USER DATA FLOW\n');
    console.log('═'.repeat(60));
    
    // This simulates what the UI sees
    const userData = await getComprehensiveUserData();
    
    if (!userData) {
      console.log('❌ No user data returned (not logged in)');
      process.exit(1);
    }
    
    console.log('\n1️⃣ USER DATA:');
    console.log('─'.repeat(60));
    console.log(`  Email: ${userData.email}`);
    console.log(`  isProUser: ${userData.isProUser}`);
    console.log(`  proSource: ${userData.proSource}`);
    console.log(`  subscriptionStatus: ${userData.subscriptionStatus}`);
    
    console.log('\n2️⃣ POLAR SUBSCRIPTION:');
    console.log('─'.repeat(60));
    
    if (userData.polarSubscription) {
      const sub = userData.polarSubscription;
      console.log(`  ✅ Exists`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  Amount: $${sub.amount / 100}`);
      console.log(`  Trial Start: ${sub.trialStart || '❌ NULL'}`);
      console.log(`  Trial End: ${sub.trialEnd || '❌ NULL'}`);
      
      console.log('\n3️⃣ TRIAL CALCULATIONS:');
      console.log('─'.repeat(60));
      
      const inTrial = isInTrial(sub);
      const daysLeft = getDaysLeftInTrial(sub);
      
      console.log(`  isInTrial(): ${inTrial}`);
      console.log(`  getDaysLeftInTrial(): ${daysLeft}`);
      
      console.log('\n4️⃣ EXPECTED UI:');
      console.log('─'.repeat(60));
      
      if (inTrial && daysLeft > 0) {
        console.log(`  ✅ Badge should show: "${daysLeft}d trial"`);
        console.log(`  ✅ Tooltip: "Trial - ${daysLeft} days remaining"`);
      } else if (sub.status === 'active' || sub.status === 'trialing') {
        console.log(`  ⚠️  Badge shows: "pro" (no trial countdown)`);
        console.log(`  Reason: Trial dates are ${!sub.trialEnd ? 'NULL' : 'in the past'}`);
      }
      
    } else {
      console.log('  ❌ No polarSubscription data!');
      console.log('  This is why badge doesn\'t show');
    }
    
    console.log('\n' + '═'.repeat(60));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testUserDataFlow();
