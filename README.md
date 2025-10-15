# Draftpen

AI-first content writing software for researching and drafting human-level content.

🔗 **[Try Draftpen](https://draftpen.com)**

## Special Thanks

To the open-source community and [Scira]([https://draftpen.com](https://github.com/zaidmukaddam/scira) for providing strong foundations for this project.

## Features

### AI drafting workspace

- **Multi-model chat**: Stream responses from OpenAI GPT-4o, GPT-5 variants, and Anthropic Claude through the Vercel AI SDK with reasoning, throttle control, and auto-resume.
- **Context controls**: Toggle custom instructions, surface suggested follow-up questions, and preserve chat history with visibility and share controls (private or public).
- **Polished UX**: PWA install prompts, keyboard-driven command palette, and proactive usage limits keep the writing flow uninterrupted.

### Live research tools

- **First-party search tools**: Run web, academic, YouTube, and Reddit lookups via Parallel AI, Firecrawl, and Exa with automatic deduping and streaming citations.
- **Keyword research**: Get real-time keyword data with search volume, CPC, and difficulty metrics powered by DataForSEO's Google Ads API—perfect for SEO content planning.
- **Extreme search mode**: Orchestrate multi-step investigations that branch into additional tool calls when queries demand deeper context.
- **Inline utilities**: Translate text, pull date/time context, and fetch code-aware context blocks without leaving the conversation.

### Knowledge connectors & memory

- **Document connectors**: Sync Google Drive and Notion workspaces (OneDrive coming soon) using Supermemory for unified retrieval inside chat.
- **Long-term memory**: Store and query personal notes directly from the assistant to blend saved knowledge with live search results.
- **Rich inputs**: Upload PDFs or images and transcribe audio with Whisper before injecting content into prompts.

### Automation & monitoring

- **Lookouts**: Schedule recurring research jobs with manual test runs, status tracking, and quota guards for Pro subscribers.
- **Usage awareness**: Automatic model switching, daily usage tracking, and toast reminders make it hard to run past plan limits.

### Integrations & extensions
- **Connector APIs**: Endpoints for manual sync, uploads, transcription, and health checks power integrations beyond the web app.

## LLM Models Supported



- **Anthropic**: Claude 4 Sonnet
- **OpenAI**: GPT-4o, o4-mini, o3 (with reasoning capabilities)

## Tech stack

### Core framework & runtime

- [Next.js 15 (React 19, Turbopack)](https://nextjs.org/) - Application shell and routing
- [Bun 1.3+](https://bun.sh/) - Runtime & package manager
- [TypeScript 5](https://www.typescriptlang.org/) - Type-safe development

### Styling & design system

- [Tailwind CSS 4](https://tailwindcss.com/) with `tailwind-merge`, `tailwind-scrollbar`, and `tw-animate-css`
- [Shadcn UI](https://ui.shadcn.com/) on top of [Radix UI primitives](https://www.radix-ui.com/) for accessible components
- [next-themes](https://github.com/pacocoursey/next-themes) for theme switching

### AI, search & automation

- [Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/gateway`, `@ai-sdk/openai`, `@ai-sdk/anthropic`)](https://sdk.vercel.ai/docs) - AI orchestration
- [Anthropic Claude](https://www.anthropic.com/claude) & [OpenAI GPT](https://platform.openai.com/) models
- [Exa AI](https://exa.ai/) - Web search and retrieval
- [Firecrawl](https://firecrawl.dev/) - Live crawling
- [Parallel](https://parallel.to/) - Agent automation
- [DataForSEO](https://dataforseo.com/) - Keyword research with search volume, CPC, and difficulty metrics
- [Supermemory](https://supermemory.ai/) & `@supermemory/tools` - Long-term memory and connectors
- [ElevenLabs](https://elevenlabs.io/) (text-to-speech integration)

### Data, storage & infra

- [Drizzle ORM](https://orm.drizzle.team/) with [Drizzle Kit](https://github.com/drizzle-team/drizzle-kit)
- [Neon Postgres](https://neon.tech/) via `@neondatabase/serverless` and `postgres`
- [Upstash Redis](https://upstash.com/) caching via `@upstash/redis` and QStash task queue
- [AWS S3](https://aws.amazon.com/s3/) via `@aws-sdk/client-s3` & `@aws-sdk/lib-storage`
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for file storage
- [Resumable Stream](https://github.com/transitive-bullshit/resumable-stream) for large transfers
- [dotenv](https://github.com/motdotla/dotenv) & [`@t3-oss/env-nextjs`](https://env.t3.gg/) for environment management

### Auth, billing & user platform

- [Better Auth](https://github.com/better-auth/better-auth) + `@polar-sh/better-auth` plugins
- [Polar](https://polar.sh/) billing (`@polar-sh/sdk`, checkout, portal, usage)
- [Upstash Redis cache](https://upstash.com/redis) for session data (via Drizzle cache)
- [Resend](https://resend.com/) & `@react-email/components` for email delivery

### UX, charts & media

- [TanStack Query](https://tanstack.com/query/latest) for data fetching
- [React Hook Form](https://react-hook-form.com/) with `@hookform/resolvers`
- [Zod](https://zod.dev/) for schema validation
- [Framer Motion](https://www.framer.com/motion/) & [`motion`](https://motion.dev/) for animation
- [cmdk](https://cmdk.paco.me/) command menu, [sonner](https://sonner.emilkowal.ski/) toasts
- [Embla Carousel](https://www.embla-carousel.com/) (core, react, autoplay)
- [Recharts](https://recharts.org/) & [Apache ECharts](https://echarts.apache.org/en/index.html)
- [YouTube caption extractor](https://www.npmjs.com/package/youtube-caption-extractor) and `react-tweet` embeds

### Observability & deployment

- [Vercel Analytics](https://vercel.com/docs/analytics) and [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Cron-parser](https://www.npmjs.com/package/cron-parser) for scheduled tasks
- [Prettier](https://prettier.io/), [ESLint](https://eslint.org/), [Knip](https://github.com/webpro/knip) for static analysis


### Local development (Bun)

To run the application locally:

1. Sign up for accounts with the required AI providers:
   - OpenAI (required)
   - Anthropic (required)
   - Exa (required for web search feature)
   - DataForSEO (optional, for keyword research feature)
2. Copy `.env.example` to `.env.local` and fill in your API keys (minimal keys listed below)
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the development server:
   ```bash
   bun run dev
   ```
5. Open `http://localhost:3000` in your browser

### Minimal environment variables

Create `.env.local` at the project root with at least:

```
DATABASE_URL=postgres://user:pass@host/db
READ_DB_1=${DATABASE_URL}
READ_DB_2=${DATABASE_URL}
UPSTASH_REDIS_REST_URL=https://your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
BETTER_AUTH_SECRET=dev-secret

OPENAI_API_KEY=xxxx
EXA_API_KEY=xxxx
PARALLEL_API_KEY=xxxx
FIRECRAWL_API_KEY=xxxx

# Optional: For keyword research feature
DATAFORSEO_LOGIN=your-email@example.com
DATAFORSEO_PASSWORD=your-api-password
```

# License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.


## Pricing

- One plan: Draftpen Pro — $99/month with a 7‑day free trial
- Access: Full access when subscription status is "active" or "trialing" and currentPeriodEnd is in the future
- Billing: Polar (checkout and customer portal)
- Database: Single Neon Postgres for all environments; set the same DATABASE_URL (and READ_DB_1/READ_DB_2) for Production/Preview/Development
- Local setup: keep envs in sync with `vercel env pull`
- No free tier: all features require an active or trialing subscription
