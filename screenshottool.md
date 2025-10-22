# 📸 Screenshot Tool Implementation Guide

Complete guide for implementing screenshot functionality in Next.js AI chat applications using ScreenshotOne API.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Implementation Steps](#implementation-steps)
- [Advanced Options](#advanced-options)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [References](#references)

---

## Overview

This guide demonstrates how to add AI-powered screenshot capabilities to your Next.js chat application. The AI assistant can take screenshots of any URL and display them inline in the chat interface.

**Key Features:**
- 🌐 Screenshot any public URL
- ⏱️ Configurable delays and wait conditions
- 🎯 Target specific elements with CSS selectors
- 📄 Full-page or viewport-only captures
- 🚫 Automatic ad/cookie banner blocking
- 🔒 Secure signed URLs
- 🖼️ Multiple image formats (PNG, JPEG, WebP)

---

## Prerequisites

- Next.js 14+ application with AI SDK
- ScreenshotOne account ([sign up here](https://screenshotone.com/))
- Node.js 18+ and npm/pnpm/yarn

---

## Installation

### Step 1: Install Dependencies

```bash
npm install screenshotone-api-sdk --save
```

### Step 2: Get API Credentials

1. Sign up at [ScreenshotOne.com](https://screenshotone.com/)
2. Navigate to your dashboard
3. Copy your **Access Key** (required)
4. Copy your **Secret Key** (optional but recommended for signed URLs)

### Step 3: Configure Environment Variables

Add to your `.env.local`:

```bash
SCREENSHOTONE_ACCESS_KEY=your_access_key_here
SCREENSHOTONE_SECRET_KEY=your_secret_key_here  # Optional but recommended
```

**Important:** Never commit these keys to version control. Add `.env.local` to your `.gitignore`.

---

## Implementation Steps

### Step 1: Create the Screenshot Tool

Create `lib/ai/tools/take-screenshot.ts`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Client, TakeOptions } from 'screenshotone-api-sdk';

export const takeScreenshot = tool({
  description: 'Take a screenshot of a web page. Returns a public URL to the screenshot image.',
  parameters: z.object({
    url: z.string().url().describe('Target webpage URL to screenshot'),
    delay: z
      .number()
      .min(0)
      .max(10)
      .optional()
      .describe('Delay in seconds before taking screenshot (0-10)'),
    selector: z
      .string()
      .optional()
      .describe('CSS selector to capture only a specific element'),
    fullPage: z
      .boolean()
      .optional()
      .describe('Capture the full scrollable page instead of just viewport'),
  }),
  execute: async ({ url, delay, selector, fullPage }) => {
    // Validate environment variables
    const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
    const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;

    if (!accessKey) {
      throw new Error('Missing SCREENSHOTONE_ACCESS_KEY environment variable');
    }

    // Initialize the ScreenshotOne client
    const client = new Client(accessKey, secretKey ?? '');

    // Build screenshot options
    let options = TakeOptions.url(url);

    if (delay) {
      options = options.delay(delay);
    }

    if (selector) {
      options = options.selector(selector);
    }

    if (fullPage) {
      options = options.fullPage(true);
    }

    // Add sensible defaults for better screenshots
    options = options
      .blockAds(true)           // Block ads for cleaner screenshots
      .blockCookieBanners(true) // Block cookie banners
      .blockTrackers(true);     // Block trackers

    try {
      // Generate signed URL (more secure) or regular URL
      const screenshotUrl = secretKey
        ? await client.generateSignedTakeURL(options)
        : await client.generateTakeURL(options);

      return {
        success: true,
        url: screenshotUrl,
        markdown: `![Screenshot of ${url}](${screenshotUrl})`,
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to take screenshot',
      };
    }
  },
});
```

### Step 2: Register Tool in Chat API Route

Update your `app/api/chat/route.ts`:

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai'; // or your preferred provider
import { takeScreenshot } from '@/lib/ai/tools/take-screenshot';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      takeScreenshot,
      // ... your other tools (createDocument, getWeather, etc.)
    },
  });

  return result.toDataStreamResponse();
}
```

### Step 3: Display Screenshots in Chat UI

Update your message component (e.g., `components/message.tsx`):

```tsx
import { Message } from 'ai';

export function ChatMessage({ message }: { message: Message }) {
  return (
    <div className="message">
      {/* Regular message content */}
      <div className="prose">{message.content}</div>

      {/* Tool invocations */}
      {message.toolInvocations?.map((toolInvocation) => {
        const { toolName, toolCallId, state } = toolInvocation;

        if (state === 'result') {
          const { result } = toolInvocation;

          // Handle screenshot tool result
          if (toolName === 'takeScreenshot') {
            if (result.success) {
              return (
                <div key={toolCallId} className="my-4">
                  <img
                    src={result.url}
                    alt="Screenshot"
                    className="rounded-lg border shadow-sm max-w-2xl w-full"
                  />
                </div>
              );
            } else {
              return (
                <div key={toolCallId} className="text-red-600 p-3 bg-red-50 rounded">
                  ❌ Failed to take screenshot: {result.error}
                </div>
              );
            }
          }
        }

        // Show loading state
        if (state === 'call') {
          if (toolName === 'takeScreenshot') {
            return (
              <div key={toolCallId} className="flex items-center gap-2 text-gray-600">
                <div className="animate-spin">⏳</div>
                <span>Taking screenshot...</span>
              </div>
            );
          }
        }

        return null;
      })}
    </div>
  );
}
```

---

## Usage Examples

Once implemented, users can interact with the AI like this:

```
User: "Take a screenshot of https://example.com"
AI: [Takes screenshot and displays it]

User: "Screenshot https://github.com after 3 seconds"
AI: [Waits 3 seconds before capturing]

User: "Capture only the header of https://example.com using selector 'header'"
AI: [Screenshots only the header element]

User: "Take a full page screenshot of https://news.ycombinator.com"
AI: [Captures entire scrollable page]
```

---

## Advanced Options

### Option 1: Extended Screenshot Parameters

Add more configuration options to the tool:

```typescript
parameters: z.object({
  url: z.string().url(),
  delay: z.number().min(0).max(10).optional(),
  selector: z.string().optional(),
  fullPage: z.boolean().optional(),

  // Additional options:
  viewportWidth: z.number().optional().describe('Viewport width in pixels (default: 1920)'),
  viewportHeight: z.number().optional().describe('Viewport height in pixels (default: 1080)'),
  format: z.enum(['png', 'jpeg', 'webp']).optional().describe('Image format (default: png)'),
  quality: z.number().min(0).max(100).optional().describe('Image quality for JPEG/WebP (0-100)'),
  darkMode: z.boolean().optional().describe('Enable dark mode if supported'),
  waitUntil: z
    .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
    .optional()
    .describe('Wait condition before screenshot'),
}),
```

Apply these options in the execute function:

```typescript
if (viewportWidth && viewportHeight) {
  options = options.viewportWidth(viewportWidth).viewportHeight(viewportHeight);
}

if (format) {
  options = options.format(format);
}

if (quality && (format === 'jpeg' || format === 'webp')) {
  options = options.quality(quality);
}

if (darkMode) {
  options = options.darkMode(true);
}

if (waitUntil) {
  // Map to ScreenshotOne wait conditions
  const waitConditions = {
    load: 'load',
    domcontentloaded: 'domcontentloaded',
    networkidle0: 'networkidle0',
    networkidle2: 'networkidle2',
  };
  options = options.waitUntil(waitConditions[waitUntil]);
}
```

### Option 4: Rate Limiting

Prevent abuse and control API costs with rate limiting:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize rate limiter
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 screenshots per hour per user
});

// In your execute function (before taking screenshot):
const identifier = userId || ip; // Use user ID or IP address
const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

if (!success) {
  throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000 / 60)} minutes.`);
}
```

### Option 5: URL Validation and Sanitization

Add security checks before screenshotting:

```typescript
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    // Block localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname === '0.0.0.0'
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// In your execute function:
if (!isValidUrl(url)) {
  throw new Error('Invalid or disallowed URL');
}
```

---

## Security Best Practices

### 1. Always Use Signed URLs

Signed URLs prevent unauthorized access and tampering:

```typescript
// ✅ Good: Uses secret key for signed URLs
const client = new Client(accessKey, secretKey);
const screenshotUrl = await client.generateSignedTakeURL(options);

// ❌ Bad: Unsigned URLs can be manipulated
const screenshotUrl = await client.generateTakeURL(options);
```

### 2. Validate Input URLs

Never trust user input. Always validate and sanitize URLs:

```typescript
// Validate URL format
if (!z.string().url().safeParse(url).success) {
  throw new Error('Invalid URL format');
}

// Check against blocklist
const blockedDomains = ['internal.company.com', 'admin.example.com'];
const urlObj = new URL(url);
if (blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
  throw new Error('This domain is not allowed');
}
```

### 3. Implement Rate Limiting

Protect your API quota and prevent abuse:

- Per-user limits: 10-20 screenshots per hour
- Global limits: Monitor total API usage
- Cost alerts: Set up billing alerts in ScreenshotOne dashboard

### 4. Never Expose API Keys Client-Side

```typescript
// ✅ Good: Keys in environment variables (server-side only)
const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;

// ❌ Bad: Keys in client-side code
const accessKey = 'your_key_here'; // Never do this!
```

### 5. Handle Errors Gracefully

Don't expose internal errors to users:

```typescript
try {
  const screenshotUrl = await client.generateSignedTakeURL(options);
  return { success: true, url: screenshotUrl };
} catch (error) {
  console.error('Screenshot error:', error); // Log for debugging
  return {
    success: false,
    error: 'Failed to capture screenshot. Please try again.', // Generic message
  };
}
```

### 6. Set Timeouts

Prevent long-running requests:

```typescript
options = options
  .timeout(60)           // Max 60 seconds for screenshot
  .navigationTimeout(30); // Max 30 seconds for page load
```

---

## Troubleshooting

### Issue: "Missing SCREENSHOTONE_ACCESS_KEY"

**Cause:** Environment variable not set or not loaded.

**Solution:**
1. Verify `.env.local` contains the key
2. Restart your development server
3. Check that the file is in the project root
4. Ensure it's not in `.gitignore` (it should be!)

```bash
# Verify environment variables are loaded
npm run dev
# Check console for any .env loading errors
```

### Issue: Screenshots Timing Out

**Cause:** Page takes too long to load or render.

**Solutions:**
```typescript
// Option 1: Increase delay
options = options.delay(5); // Wait 5 seconds

// Option 2: Use network idle condition
options = options.waitUntil('networkidle0'); // Wait until no network activity

// Option 3: Increase timeout
options = options.timeout(90); // Max timeout allowed
```

### Issue: Cookie Banners Blocking Content

**Cause:** Cookie consent popups covering content.

**Solution:** Already handled in the base implementation:
```typescript
options = options.blockCookieBanners(true);
```

If still appearing, try:
```typescript
// Block by custom selector
options = options.blockSelector('.cookie-banner, #cookie-consent');
```

### Issue: Screenshots of Dynamic Content Are Incomplete

**Cause:** JavaScript hasn't finished rendering.

**Solutions:**
```typescript
// Option 1: Wait for specific element
options = options.waitForSelector('.main-content');

// Option 2: Use network idle
options = options.waitUntil('networkidle2');

// Option 3: Combine delay with wait condition
options = options.delay(3).waitUntil('networkidle0');
```

### Issue: Images Are Too Large

**Cause:** High resolution or full-page screenshots.

**Solutions:**
```typescript
// Option 1: Reduce viewport size
options = options.viewportWidth(1280).viewportHeight(720);

// Option 2: Use JPEG with compression
options = options.format('jpeg').quality(80);

// Option 3: Use WebP for better compression
options = options.format('webp').quality(85);
```

### Issue: Dark Mode Not Working

**Cause:** Website doesn't support dark mode or uses custom implementation.

**Solution:**
```typescript
// Enable dark mode preference
options = options.darkMode(true);

// If still not working, inject custom CSS
options = options.styles(`
  body { background: #1a1a1a !important; color: #fff !important; }
`);
```

### Issue: Rate Limit Errors from ScreenshotOne

**Cause:** Exceeded your plan's screenshot quota.

**Solutions:**
1. Check your usage in ScreenshotOne dashboard
2. Upgrade your plan if needed
3. Implement caching to reduce API calls
4. Add user-facing rate limits

---

## Pricing Considerations

### ScreenshotOne Pricing (as of 2024)

- **Free Tier:** 100 screenshots/month
- **Starter:** $19/month for 1,000 screenshots
- **Pro:** $49/month for 5,000 screenshots
- **Business:** $99/month for 15,000 screenshots
- **Enterprise:** Custom pricing

**Check current pricing:** [screenshotone.com/pricing](https://screenshotone.com/pricing)

### Cost Optimization Tips

1. **Implement Caching:** Cache screenshots for 1-24 hours
2. **Rate Limiting:** Limit users to 5-10 screenshots per hour
3. **Lazy Loading:** Only take screenshots when explicitly requested
4. **Compression:** Use WebP format with 80-85% quality
5. **Monitoring:** Set up alerts for unusual usage patterns

---

## API Reference

### ScreenshotOne SDK Methods

```typescript
// Initialize client
const client = new Client(accessKey, secretKey);

// Build options
const options = TakeOptions.url('https://example.com')
  .delay(3)                          // Delay in seconds
  .selector('.main-content')         // CSS selector
  .fullPage(true)                    // Full page screenshot
  .viewportWidth(1920)               // Viewport width
  .viewportHeight(1080)              // Viewport height
  .format('png')                     // Image format: png, jpeg, webp
  .quality(90)                       // Quality for jpeg/webp (0-100)
  .blockAds(true)                    // Block advertisements
  .blockCookieBanners(true)          // Block cookie banners
  .blockTrackers(true)               // Block tracking scripts
  .darkMode(true)                    // Enable dark mode
  .timeout(60)                       // Request timeout in seconds
  .navigationTimeout(30)             // Navigation timeout in seconds
  .waitUntil('networkidle0')         // Wait condition
  .waitForSelector('.loaded')        // Wait for element
  .styles('body { margin: 0; }')     // Inject custom CSS
  .scripts('console.log("test")')    // Inject custom JavaScript
  .blockSelector('.ad, .popup')      // Block specific elements
  .cache(true)                       // Enable caching
  .cacheTtl(3600);                   // Cache TTL in seconds

// Generate URL
const url = await client.generateSignedTakeURL(options);

// Or download directly
const imageBlob = await client.take(options);
const buffer = Buffer.from(await imageBlob.arrayBuffer());
```

### Wait Conditions

- `load`: Wait for the load event (default)
- `domcontentloaded`: Wait for DOM to be ready
- `networkidle0`: Wait until no network connections for 500ms
- `networkidle2`: Wait until ≤2 network connections for 500ms

### Image Formats

- `png`: Lossless, larger file size (default)
- `jpeg`: Lossy, smaller file size, no transparency
- `webp`: Modern format, best compression, good quality

---

## References

### Official Documentation

- **ScreenshotOne Docs:** [screenshotone.com/docs](https://screenshotone.com/docs)
- **Node.js SDK Guide:** [screenshotone.com/docs/code-examples/javascript-and-typescript-nodejs](https://screenshotone.com/docs/code-examples/javascript-and-typescript-nodejs)
- **API Options Reference:** [screenshotone.com/docs/options](https://screenshotone.com/docs/options)
- **Performance Guide:** [screenshotone.com/docs/guides/performance](https://screenshotone.com/docs/guides/performance)

### SDK & Libraries

- **NPM Package:** [npmjs.com/package/screenshotone-api-sdk](https://www.npmjs.com/package/screenshotone-api-sdk)
- **GitHub Repository:** [github.com/screenshotone/screenshotone-api-sdk-js](https://github.com/screenshotone/screenshotone-api-sdk-js)

### AI SDK Documentation

- **Vercel AI SDK:** [sdk.vercel.ai/docs](https://sdk.vercel.ai/docs)
- **AI SDK Tools:** [sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling)
- **Streaming Responses:** [sdk.vercel.ai/docs/ai-sdk-core/streaming](https://sdk.vercel.ai/docs/ai-sdk-core/streaming)

### Related Technologies

- **Next.js Documentation:** [nextjs.org/docs](https://nextjs.org/docs)
- **Zod Schema Validation:** [zod.dev](https://zod.dev)
- **TypeScript:** [typescriptlang.org/docs](https://www.typescriptlang.org/docs)

### Alternative Screenshot Services

- **Puppeteer (self-hosted):** [pptr.dev](https://pptr.dev)
- **Playwright (self-hosted):** [playwright.dev](https://playwright.dev)
- **ApiFlash:** [apiflash.com](https://apiflash.com)
- **ScreenshotAPI:** [screenshotapi.net](https://screenshotapi.net)
- **Urlbox:** [urlbox.io](https://urlbox.io)

---

## Example Implementation

### Complete Working Example

Here's a minimal but complete implementation you can copy-paste:

**1. Install dependencies:**
```bash
npm install screenshotone-api-sdk ai zod
```

**2. Create `.env.local`:**
```bash
SCREENSHOTONE_ACCESS_KEY=your_access_key
SCREENSHOTONE_SECRET_KEY=your_secret_key
```

**3. Create `lib/ai/tools/screenshot.ts`:**
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Client, TakeOptions } from 'screenshotone-api-sdk';

export const screenshot = tool({
  description: 'Take a screenshot of any URL',
  parameters: z.object({
    url: z.string().url(),
    delay: z.number().min(0).max(10).optional(),
  }),
  execute: async ({ url, delay }) => {
    const client = new Client(
      process.env.SCREENSHOTONE_ACCESS_KEY!,
      process.env.SCREENSHOTONE_SECRET_KEY
    );

    let options = TakeOptions.url(url).blockAds(true);
    if (delay) options = options.delay(delay);

    const screenshotUrl = await client.generateSignedTakeURL(options);
    return { url: screenshotUrl };
  },
});
```

**4. Use in `app/api/chat/route.ts`:**
```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { screenshot } from '@/lib/ai/tools/screenshot';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: { screenshot },
  });

  return result.toDataStreamResponse();
}
```

**5. Render in your UI:**
```tsx
{toolName === 'screenshot' && result.url && (
  <img src={result.url} alt="Screenshot" className="rounded-lg" />
)}
```

---

## Contributing

Found an issue or have a suggestion? This guide is based on the implementation in the DraftPen project. Feel free to:

- Open an issue for bugs or unclear documentation
- Submit a PR with improvements
- Share your own implementation variations

---

## License

This guide is provided as-is for educational purposes. ScreenshotOne is a third-party service with its own terms of service and pricing.

---

## Changelog

- **2024-01-20:** Initial guide created
  - Basic implementation steps
  - Advanced options and security practices
  - Troubleshooting section
  - Complete API reference

---

**Last Updated:** October 2025
**Author:** Based on DraftPen implementation
**Version:** 1.0.0
}

if (waitUntil) {
  // Map to ScreenshotOne wait conditions
  const waitConditions = {
    load: 'load',
    domcontentloaded: 'domcontentloaded',
    networkidle0: 'networkidle0',
    networkidle2: 'networkidle2',
  };
  options = options.waitUntil(waitConditions[waitUntil]);
}
```

### Option 2: Download and Store Screenshots Locally

Instead of using ScreenshotOne URLs, save screenshots to your own storage:

```typescript
import * as fs from 'fs';
import { put } from '@vercel/blob'; // or use S3, Cloudinary, etc.

// In your execute function:
const imageBlob = await client.take(options);
const buffer = Buffer.from(await imageBlob.arrayBuffer());

// Option A: Save to file system (local development)
fs.writeFileSync(`screenshots/${Date.now()}.png`, buffer);

// Option B: Upload to Vercel Blob
const { url } = await put(`screenshots/${Date.now()}.png`, buffer, {
  access: 'public',
});

return {
  success: true,
  url: url,
};
```

### Option 3: Add Caching

Cache screenshots to reduce API calls and costs:

```typescript
import { unstable_cache } from 'next/cache';

const getCachedScreenshot = unstable_cache(
  async (url: string, options: Record<string, any>) => {
    // Your screenshot logic here
    return screenshotUrl;
  },
  ['screenshot'],
  {
    revalidate: 3600, // Cache for 1 hour
    tags: ['screenshots']
  }
);

// Use in your tool:
const screenshotUrl = await getCachedScreenshot(url, { delay, selector });
```


