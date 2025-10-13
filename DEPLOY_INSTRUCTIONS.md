# 🚀 Deploy Instructions

## ✅ Code Committed Locally
Commit: `dd719bb` - "Refactor to Pro-only model with 7-day trials"

---

## Step 1: Push to GitHub

```bash
git push
```

If you get auth error, use:
```bash
# Option A: Use GitHub CLI
gh auth login
git push

# Option B: Use SSH instead of HTTPS
git remote set-url origin git@github.com:craftled/draftpen.git
git push
```

---

## Step 2: Wait for Vercel Deploy

Once pushed, Vercel will automatically:
1. Build the app
2. Deploy to production
3. Run database migrations (if configured)

**Check:** https://vercel.com/dashboard → draftpen project

---

## Step 3: Manually Run Migration on Production DB

**IMPORTANT:** After deploy, run this migration on production:

```bash
# Using Vercel CLI
vercel env pull .env.production
DATABASE_URL="<your-neon-prod-url>" bun run migrate

# OR use the SQL directly in Neon dashboard:
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "trialStart" timestamp;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "trialEnd" timestamp;
```

---

## Step 4: Resend Webhook from Polar

1. Go to Polar dashboard → Webhooks
2. Find: `subscription.updated` (Oct 13, 8:58 PM)
3. Click on it
4. Click **"Resend"** or **"Retry"** button
5. Watch for success response

---

## Step 5: Verify Trial Badge

1. Go to https://draftpen.com
2. Hard refresh (Cmd+Shift+R)
3. You should see **"7d trial"** badge in navbar!

---

## What Was Fixed

- ✅ Trial field names: `trialStart` → `trial_start` (snake_case)
- ✅ Trial field names: `trialEnd` → `trial_end` (snake_case)
- ✅ Polar plugin enabled in development
- ✅ Subscription linked to user account
- ✅ Database migration created and applied locally

---

## Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Wait for Vercel deployment
- [ ] Run migration on production DB
- [ ] Resend webhook from Polar
- [ ] Verify trial badge appears
- [ ] Test chat access (should work)
- [ ] Test all models available

---

## If Migration Fails on Vercel

Run it manually via Neon dashboard:

1. Go to Neon console
2. Select your database
3. Open SQL Editor
4. Run:
```sql
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "trialStart" timestamp;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "trialEnd" timestamp;
```
5. Click "Run"

---

## Expected Webhook Response (After Deploy)

When you resend webhook, check production logs for:

```
🎯 Processing subscription webhook: subscription.updated
💾 Final subscription data: {
  id: '71a85756-4cda-4fca-8392-77fc3f20f02c',
  status: 'trialing',
  userId: 'Hny1gYZP060LBErymnNpKvlN67Ll4U8h',
  trialStart: 2025-10-13T18:58:23.905Z,  ← Should be populated!
  trialEnd: 2025-10-20T18:58:20.237Z     ← Should be populated!
}
```

---

## That's It!

After these steps, your production site will:
- ✅ Show trial badge with countdown
- ✅ Block non-subscribers
- ✅ Work with 7-day trials
- ✅ Capture trial dates from future webhooks

Good luck! 🚀
