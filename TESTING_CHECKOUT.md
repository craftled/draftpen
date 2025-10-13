# Testing Checkout Flow

## Current Issue: "Nothing happens" when clicking "Start 7-day free trial"

---

## Debug Steps

### 1. Check if You're Signed In
**Open browser console (F12 or Cmd+Option+I) and run:**
```javascript
// Check session
fetch('/api/auth/get-session', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Session:', d));
```

**What to look for:**
- ✅ If you see user data → You're signed in
- ❌ If you see `null` or error → You need to sign in first

---

### 2. Open Browser Console
Before clicking "Start 7-day free trial":

1. Open **Developer Tools** (F12 or Cmd+Option+I)
2. Go to **Console** tab
3. Click **"Start 7-day free trial"** button
4. Look for these logs:

```
🛒 Checkout initiated: { productId: "...", slug: "...", hasUser: true/false }
```

---

## Expected Behaviors

### If NOT Signed In:
```
🛒 Checkout initiated: { hasUser: false }
❌ No user, redirecting to sign-up
Toast: "Please sign in to start your free trial"
→ Redirects to /sign-up
```

### If Signed In:
```
🛒 Checkout initiated: { hasUser: true }
📦 Opening checkout with authClient.checkout()...
✅ Checkout opened successfully
→ Polar checkout popup/redirect opens
```

---

## Troubleshooting

### Issue: Nothing in console
**Problem:** JavaScript not loading
**Solution:** Hard refresh (Cmd+Shift+R)

### Issue: "No user, redirecting to sign-up"
**Problem:** Not signed in
**Solution:** 
1. Go to `/sign-up` or `/sign-in`
2. Create account or sign in
3. Return to `/pricing`
4. Try again

### Issue: Checkout opens but closes immediately
**Problem:** Popup blocked by browser
**Solution:** 
1. Look for popup blocker icon in address bar
2. Allow popups for localhost:3000
3. Try again

### Issue: Error in console
**Problem:** Polar configuration issue
**Solution:** Check these:
```bash
# In .env.local
NEXT_PUBLIC_STARTER_TIER="c8b093b1-5647-40e6-bd19-f60336621863"
NEXT_PUBLIC_STARTER_SLUG="draftpen-pro"
POLAR_ACCESS_TOKEN="polar_..."
```

---

## Manual Test Flow

### Step 1: Sign In
```
1. Go to http://localhost:3000/sign-in
2. Sign in with test account
3. Verify you see your profile in navbar
```

### Step 2: Go to Pricing
```
1. Navigate to http://localhost:3000/pricing
2. Should see "Start 7-day free trial" button
3. Should NOT see "Current plan" badge (if no subscription)
```

### Step 3: Click Button
```
1. Open browser console (F12)
2. Click "Start 7-day free trial"
3. Watch console for logs
4. Polar checkout should open
```

### Step 4: Complete Checkout (Test Mode)
```
1. In Polar checkout:
   - Use test card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
2. Complete checkout
3. Wait for webhook (~5 seconds)
4. Check if trial badge appears in navbar
```

---

## Quick Diagnostic Commands

Run these in browser console on `/pricing`:

### Check if user loaded:
```javascript
console.log('User:', window.__NEXT_DATA__?.props?.pageProps?.user);
```

### Check environment variables:
```javascript
console.log('Product ID:', process.env.NEXT_PUBLIC_STARTER_TIER);
console.log('Slug:', process.env.NEXT_PUBLIC_STARTER_SLUG);
```

### Manually trigger checkout:
```javascript
// Replace with your actual product ID and slug
const productId = 'c8b093b1-5647-40e6-bd19-f60336621863';
const slug = 'draftpen-pro';

// This will show if authClient is available
console.log('authClient available:', typeof authClient);
```

---

## What Should Happen

### Polar Checkout Opens:
- **Desktop:** New popup window or redirect
- **Mobile:** Redirects to Polar checkout page
- **URL:** Should include `polar.sh` or `sandbox-polar.sh`

### Checkout Form Shows:
- Product: "Draftpen Pro"
- Price: "$99/month"
- Trial: "7-day free trial" badge
- Fields: Email, card details

---

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Button does nothing | Not signed in | Sign in first |
| Redirects to sign-up | Not authenticated | Create account |
| Console shows error | Env vars missing | Check .env.local |
| Popup blocked | Browser settings | Allow popups |
| Wrong price shows | Polar config | Update Polar product |

---

## Next Steps

1. **Check browser console** when clicking button
2. **Share console output** if there's an error
3. **Verify you're signed in** before testing
4. **Check for popup blockers**

---

## Expected Console Output (Success)

```
PricingTable Debug: {
  subscriptionDetails: { hasSubscription: false },
  userProStatus: { 
    id: "user_...", 
    isProUser: false,
    ...
  }
}

🛒 Checkout initiated: { 
  productId: "c8b093b1-5647-40e6-bd19-f60336621863",
  slug: "draftpen-pro",
  hasUser: true 
}

📦 Opening checkout with authClient.checkout()...
✅ Checkout opened successfully
```

Then Polar checkout window opens ✅
