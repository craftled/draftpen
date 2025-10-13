# Trigger New Webhook to Capture Trial Dates

## Problem
The webhook handler was using wrong field names (`trialStart` instead of `trial_start`).

## Fixed
✅ Updated webhook handler to use `trial_start` and `trial_end` (snake_case)

---

## How to Test

### Option 1: Update Subscription in Polar Dashboard (EASIEST)
1. Go to Polar dashboard
2. Find your subscription
3. Make any small change (e.g., add metadata or note)
4. Save
5. This triggers `subscription.updated` webhook
6. Check logs for trial dates

### Option 2: Manually Trigger Webhook from Polar
1. Go to Polar dashboard → Webhooks
2. Find the recent `subscription.active` or `subscription.created` event
3. Click "Resend" button
4. Check logs

### Option 3: Cancel and Resubscribe (NOT RECOMMENDED)
1. Cancel current subscription
2. Subscribe again
3. New webhook will fire with correct fields

---

## Verify It Worked

### Check Server Logs:
```bash
tail -f /tmp/dev-server-final.log | grep "🔍 Raw webhook data"
```

Look for:
```
🔍 Raw webhook data (trial fields): {
  trial_start: '2025-10-13T...',
  trial_end: '2025-10-20T...',
  ...
}
```

### Check Database:
```bash
bun run check-trial.ts
```

Should show:
```
Trial Start: 2025-10-13...
Trial End: 2025-10-20...
```

---

## OR: Manually Set Trial Dates (Quick Fix)

If you don't want to wait for webhook, I can manually set the trial dates to 7 days from now:

```sql
UPDATE subscription 
SET 
  "trialStart" = NOW(),
  "trialEnd" = NOW() + INTERVAL '7 days'
WHERE id = '71a85756-4cda-4fca-8392-77fc3f20f02c';
```

Would you like me to do this?
