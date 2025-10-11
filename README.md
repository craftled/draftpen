# Scira

![Scira](/app/opengraph-image.png)

A minimalistic AI-powered search engine that helps you find information on the internet.

🔗 **[Try Scira at scira.ai](https://scira.ai)**

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/zaidmukaddam/scira)

## Powered By

<div align="center">

|          [Vercel AI SDK](https://sdk.vercel.ai/docs)          |                [Exa AI](https://exa.ai)                |
| :-----------------------------------------------------------: | :----------------------------------------------------: |
| <img src="/public/one.svg" alt="Vercel AI SDK" height="40" /> | <img src="/public/exa.png" alt="Exa AI" height="40" /> |
|            For AI model integration and streaming             |          For web search and content retrieval          |

</div>

## Special Thanks

<div align="center" markdown="1">

[![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>

### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>

[Available for MacOS, Linux, & Windows](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
[Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

</div>

## Features

### Core Search & Information

- **AI-powered search**: Get answers to your questions using multiple AI models including Anthropic's Claude and OpenAI's GPT models
- **Web search**: Search the web using Exa's API with support for multiple queries, search depths, and topics
- **URL content retrieval**: Extract and analyze content from any URL using Exa AI with live crawling capabilities
- **Reddit search**: Search Reddit content with time range filtering using Tavily API
- **Extreme search**: Advanced multi-step search capability for complex queries

### Academic & Research

- **Academic search**: Search for academic papers and research using Exa AI with abstracts and summaries
- **YouTube search**: Find YouTube videos with detailed information, captions, and timestamps powered by Exa AI

### Entertainment & Media

- (Removed) TMDB-dependent features

### Financial & Data Analysis

- (Removed) Crypto and finance features


### Productivity & Utilities

- **Text translation**: Translate text between languages using AI models
- **Date & time**: Get current date and time in user's timezone with multiple format options
- **Memory management**: Add and search personal memories using Mem0 AI
- **MCP server search**: Search for Model Context Protocol servers using Smithery Registry

### Search Groups

- **Web**: Search across the entire internet powered by Tavily
- **Memory**: Your personal memory companion (requires authentication)
- **Analysis**: Code execution, stock charts, and currency conversion
- **Chat**: Direct conversation with AI models
- **X**: Search X (Twitter) posts
- **Reddit**: Search Reddit posts
- **Academic**: Search academic papers powered by Exa
- **YouTube**: Search YouTube videos powered by Exa
- **Extreme**: Deep research with multiple sources and analysis

## LLM Models Supported



- **Anthropic**: Claude 4 Sonnet
- **OpenAI**: GPT-4o, o4-mini, o3 (with reasoning capabilities)

## Built with

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI model integration
- [Shadcn/UI](https://ui.shadcn.com/) - UI components
- [Exa.AI](https://exa.ai/) - Web search and content retrieval
- (Removed) Tavily, OpenWeather
- [Mem0](https://mem0.ai/) - Memory management
- [Better Auth](https://github.com/better-auth/better-auth) - Authentication
- [Drizzle ORM](https://orm.drizzle.team/) - Database management

### Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=OPENAI_API_KEY,ANTHROPIC_API_KEY,DATABASE_URL,BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET,REDIS_URL,ELEVENLABS_API_KEY,EXA_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,SMITHERY_API_KEY,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST&envDescription=API%20keys%20and%20configuration)

## Set Scira as your default search engine

1. **Open the Chrome browser settings**:
   - Click on the three vertical dots in the upper right corner of the browser.
   - Select "Settings" from the dropdown menu.

2. **Go to the search engine settings**:
   - In the left sidebar, click on "Search engine."
   - Then select "Manage search engines and site search."

3. **Add a new search engine**:
   - Click on "Add" next to "Site search."

4. **Set the search engine name**:
   - Enter `Scira` in the "Search engine" field.

5. **Set the search engine URL**:
   - Enter `https://scira.ai?q=%s` in the "URL with %s in place of query" field.

6. **Set the search engine shortcut**:
   - Enter `sh` in the "Shortcut" field.

7. **Set Default**:
   - Click on the three dots next to the search engine you just added.
   - Select "Make default" from the dropdown menu.

After completing these steps, you should be able to use Scira as your default search engine in Chrome.

### Local development (Bun)

To run the application locally without Docker:

1. Sign up for accounts with the required AI providers:
   - OpenAI (required)
   - Anthropic (required)
   - Exa (required for web search feature)
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
```

# License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.
