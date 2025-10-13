# Pro-Only Refactoring Plan

## Overview
Convert from free/pro model to **pro-only with 7-day trials**. Polar is configured with trial, we need to:
1. Add trial field support
2. Treat active + trialing as "has access"
3. Block all non-subscribers
4. Remove free tier UI/logic

## Changes Required

### 1. Database Schema (Migration Required)
**File:** `drizzle/migrations/XXXX_add_trial_fields.sql`

```sql
-- Add trial fields to subscription table
ALTER TABLE "subscription" ADD COLUMN "trial_start" TIMESTAMP;
ALTER TABLE "subscription" ADD COLUMN "trial_end" TIMESTAMP;
```

**File:** `lib/db/schema.ts`
```typescript
// Add to subscription table definition:
trialStart: timestamp('trial_start'),
trialEnd: timestamp('trial_end'),
```

### 2. Webhook Handler - Capture Trial Data
**File:** `lib/auth.ts` (line ~202)

Add to subscriptionData object:
```typescript
trialStart: safeParseDate(data.trialStart),
trialEnd: safeParseDate(data.trialEnd),
```

### 3. Core Access Logic - Include Trials
**File:** `lib/subscription.ts`

Update `getComprehensiveProStatus`:
```typescript
// OLD: Only check status === 'active'
const activeSubscription = userSubscriptions.find((sub) => sub.status === 'active');

// NEW: Active includes trials
const activeSubscription = userSubscriptions.find((sub) => 
  sub.status === 'active' // Polar keeps status as 'active' during trial
);
```

Add new helper:
```typescript
export function isInTrial(subscription: any): boolean {
  if (!subscription?.trialEnd) return false;
  return new Date() < new Date(subscription.trialEnd);
}

export function getSubscriptionType(subscription: any): 'trial' | 'paid' | 'none' {
  if (!subscription || subscription.status !== 'active') return 'none';
  return isInTrial(subscription) ? 'trial' : 'paid';
}
```

### 4. API Routes - Block Non-Subscribers
**File:** `app/api/search/route.ts` (line ~118)

```typescript
// OLD: Check if model requires pro
if (requiresProSubscription(model) && !lightweightUser.isProUser) {
  return new ChatSDKError('upgrade_required:model', ...).toResponse();
}

// NEW: Block ALL non-subscribers (no free tier)
if (!lightweightUser.isProUser) {
  return new ChatSDKError('subscription_required', 
    'This app requires an active subscription. Start your 7-day free trial to continue.'
  ).toResponse();
}
```

**Apply same pattern to:**
- `app/api/xql/route.ts`
- `app/api/lookout/route.ts`
- Any other API routes

### 5. Remove Free Tier Models
**File:** `ai/providers.ts`

```typescript
// OLD: Models had pro: true/false flags
// NEW: All models available to subscribers, remove flag or set all to true

export function requiresProSubscription(modelValue: string): boolean {
  // OPTION 1: Remove this function entirely
  // OPTION 2: Always return false (everyone is pro now)
  return false;
}

export function canUseModel(modelValue: string, user: any, isProUser: boolean) {
  // Simplified: If you're logged in with active sub, you can use any model
  if (!isProUser) {
    return { canUse: false, reason: 'subscription_required' };
  }
  return { canUse: true };
}
```

### 6. UI Updates - Show Trial Status
**File:** `hooks/use-user-data.ts`

Add to returned data:
```typescript
// In useUserData hook
import { isInTrial, getSubscriptionType } from '@/lib/subscription';

return {
  // ... existing fields
  isInTrial: userData?.polarSubscription ? isInTrial(userData.polarSubscription) : false,
  subscriptionType: userData?.polarSubscription ? getSubscriptionType(userData.polarSubscription) : 'none',
  trialEndsAt: userData?.polarSubscription?.trialEnd,
  daysLeftInTrial: userData?.polarSubscription?.trialEnd 
    ? Math.ceil((new Date(userData.polarSubscription.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0,
};
```

**File:** `components/navbar.tsx`

Replace "Upgrade to Pro" with trial-aware badge:
```typescript
{hasActiveSubscription && isInTrial ? (
  <Badge variant="outline" className="gap-1">
    <Clock className="h-3 w-3" />
    {daysLeftInTrial} days left in trial
  </Badge>
) : hasActiveSubscription ? (
  <Badge variant="default" className="gap-1">
    <Crown className="h-3 w-3" />
    Pro
  </Badge>
) : (
  <Button size="sm" onClick={handleUpgrade}>
    Start Free Trial
  </Button>
)}
```

### 7. Auth Middleware - Block App Access
**File:** `middleware.ts`

Add check for non-subscribers:
```typescript
// After auth check, before allowing app access
const userData = await getComprehensiveUserData(session.user.id);

if (!userData.isProUser && isProtectedRoute(pathname)) {
  return NextResponse.redirect(new URL('/pricing', request.url));
}
```

### 8. Remove Rate Limiting for Free Users
**File:** `app/api/search/route.ts` (line ~191)

```typescript
// OLD: if (!isProUser) { check limits }
// NEW: Remove this entire block - everyone is pro
```

### 9. Update Error Messages
**File:** `lib/errors.ts`

```typescript
// Update all "upgrade to pro" messages
'This feature requires a Pro subscription' 
  → 'Start your 7-day free trial to access this feature'

'Upgrade to Pro to continue'
  → 'Subscribe to continue (7-day free trial)'
```

### 10. Pricing Page Updates
**File:** `app/pricing/page.tsx`

- Show single plan: "$99/mo"
- Emphasize "7-day free trial" prominently
- Remove any "free forever" or tiered pricing

## Migration Steps

1. **Create migration:** `drizzle-kit generate` after updating schema
2. **Run migration:** `npm run db:push` or equivalent
3. **Deploy changes** in this order:
   - Schema changes first
   - Webhook handler (to capture trial data going forward)
   - API routes (to enforce subscription)
   - UI updates last

## Testing Checklist

- [ ] New subscription with trial shows "trial" badge
- [ ] Trial countdown displays correctly
- [ ] Non-subscribers blocked from chat interface
- [ ] All models available to trial/paid users
- [ ] After trial ends → requires payment
- [ ] Canceled subs lose access immediately
- [ ] Webhook updates reflect in UI within 5s

## Rollback Plan

If issues arise:
1. Revert middleware change (allows free access again)
2. Revert API route blocks
3. Database changes are additive (safe to keep)
