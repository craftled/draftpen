// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import FirecrawlApp from "@mendable/firecrawl-js";
import type { UIMessageStreamWriter } from "ai";
import { generateObject, generateText, stepCountIs, tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { modelProvider } from "@/ai/providers";
import { serverEnv } from "@/env/server";
import type { ChatMessage } from "../types";

const MAX_EXA_CHARS = 3000 as const;
const MIN_TITLE_LEN = 10 as const;
const MAX_TITLE_LEN = 70 as const;
const TODOS_MIN = 3 as const;
const TODOS_MAX = 5 as const;
const PLAN_MIN = 1 as const;
const PLAN_MAX = 5 as const;
const MAX_QUERY_LEN = 150 as const;
const SNIPPET_LEN = 500 as const;

const SEARCH_CATEGORIES = [
  "news",
  "company",
  "research paper",
  "github",
  "financial report",
] as const;

type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

type CodeRunnerResult = { charts?: unknown[] };

const exa = new Exa(serverEnv.EXA_API_KEY);
const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  favicon: string;
};

export type Research = {
  text: string;
  toolResults: unknown[];
  sources: SearchResult[];
  charts: unknown[];
};

const searchWeb = async (
  query: string,
  category?: SearchCategory,
  include_domains?: string[]
) => {
  try {
    const { results } = await exa.searchAndContents(query, {
      numResults: 8,
      type: "auto",
      ...(category
        ? {
            category: category as SearchCategory,
          }
        : {}),
      ...(include_domains
        ? {
            include_domains,
          }
        : {}),
    });

    const mappedResults = results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.text,
      publishedDate: r.publishedDate,
      favicon: r.favicon,
    })) as SearchResult[];
    return mappedResults;
  } catch (_error) {
    return [];
  }
};

const getContents = async (links: string[]) => {
  const results: SearchResult[] = [];
  const failedUrls: string[] = [];

  // First, try Exa for all URLs
  try {
    const result = await exa.getContents(links, {
      text: {
        maxCharacters: MAX_EXA_CHARS,
        includeHtmlTags: false,
      },
      livecrawl: "preferred",
    });

    // Process Exa results
    for (const r of result.results) {
      if (r.text?.trim()) {
        results.push({
          title: r.title || r.url.split("/").pop() || "Retrieved Content",
          url: r.url,
          content: r.text,
          publishedDate: r.publishedDate || "",
          favicon:
            r.favicon ||
            `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=128`,
        });
      } else {
        // Add URLs with no content to failed list for Firecrawl fallback
        failedUrls.push(r.url);
      }
    }

    // Add any URLs that weren't returned by Exa to the failed list
    const exaUrls = result.results.map((r) => r.url);
    const missingUrls = links.filter((url) => !exaUrls.includes(url));
    failedUrls.push(...missingUrls);
  } catch (_error) {
    failedUrls.push(...links);
  }

  // Use Firecrawl as fallback for failed URLs
  if (failedUrls.length > 0) {
    for (const url of failedUrls) {
      try {
        const scrapeResponse = await firecrawl.scrape(url, {
          formats: ["markdown"],
          proxy: "auto",
          storeInCache: true,
          parsers: ["pdf"],
        });

        if (scrapeResponse.markdown) {
          results.push({
            title:
              scrapeResponse.metadata?.title ||
              url.split("/").pop() ||
              "Retrieved Content",
            url,
            content: scrapeResponse.markdown.slice(0, MAX_EXA_CHARS), // Match maxCharacters from Exa
            publishedDate:
              (scrapeResponse.metadata?.publishedDate as string) || "",
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
          });
        } else {
          // No markdown content returned; skipping this URL for now
        }
      } catch (_firecrawlError) {
        // Intentionally ignore Firecrawl errors for fallback path
      }
    }
  }
  return results;
};

async function extremeSearch(
  prompt: string,
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined
): Promise<Research> {
  const allSources: SearchResult[] = [];

  if (dataStream) {
    dataStream.write({
      type: "data-extreme_search",
      data: {
        kind: "plan",
        status: { title: "Planning research" },
      },
    });
  }

  // plan out the research
  const { object: result } = await generateObject({
    model: modelProvider.languageModel("gpt5-mini"),
    schema: z.object({
      plan: z
        .array(
          z.object({
            title: z
              .string()
              .min(MIN_TITLE_LEN)
              .max(MAX_TITLE_LEN)
              .describe("A title for the research topic"),
            todos: z
              .array(z.string())
              .min(TODOS_MIN)
              .max(TODOS_MAX)
              .describe("A list of what to research for the given title"),
          })
        )
        .min(PLAN_MIN)
        .max(PLAN_MAX),
    }),
    prompt: `
Plan out the research for the following topic: ${prompt}.

Today's Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", weekday: "short" })}

Plan Guidelines:
- Break down the topic into key aspects to research
- Generate specific, diverse search queries for each aspect
- Search for relevant information using the web search tool
- Analyze the results and identify important facts and insights
- The plan is limited to 15 actions, do not exceed this limit!
- Follow up with more specific queries as you learn more
- Add todos for code execution if it is asked for by the user
- No need to synthesize your findings into a comprehensive response, just return the results
- The plan should be concise and to the point, no more than 10 items
- Keep the titles concise and to the point, no more than 70 characters
- Mention any need for visualizations in the plan
- Make the plan technical and specific to the topic`,
  });

  const plan = result.plan;

  // calculate the total number of todos
  const totalTodos = plan.reduce((acc, curr) => acc + curr.todos.length, 0);

  if (dataStream) {
    dataStream.write({
      type: "data-extreme_search",
      data: {
        kind: "plan",
        status: { title: "Research plan ready, starting up research agent" },
        plan,
      },
    });
  }

  const toolResults: unknown[] = [];

  // Create the autonomous research agent with tools
  const { text } = await generateText({
    model: modelProvider.languageModel("gpt5-mini"),
    stopWhen: stepCountIs(totalTodos),
    system: `
You are an autonomous deep research analyst. Your goal is to research the given research plan thoroughly with the given tools.

Today's Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", weekday: "short" })}.

### PRIMARY FOCUS: SEARCH-DRIVEN RESEARCH (95% of your work)
Your main job is to SEARCH extensively and gather comprehensive information. Search should be your go-to approach for almost everything.
Make sure to be mindful of today's date and time and use it to your advantage when searching for information.

⚠️ IMP: Total Assistant function-call turns limit: at most ${totalTodos}! You must reach this limit strictly!

For searching:
- PRIORITIZE SEARCH OVER CODE - Search first, search often, search comprehensively
- Do not run all the queries at once, run them one by one, wait for the results before running the next query
- Make 3-5 targeted searches per research topic to get different angles and perspectives
- Search queries should be specific and focused, 5-15 words maximum
- You can use include domains to filter results by specific websites or sources
- Vary your search approaches: broad overview → specific details → recent developments → expert opinions
- Use different categories strategically: news, research papers, company info, financial reports, github
- Follow up initial searches with more targeted queries based on what you learn
- Cross-reference information by searching for the same topic from different angles
- Search for contradictory information to get balanced perspectives
- Include exact metrics, dates, technical terms, and proper nouns in queries
- Make searches progressively more specific as you gather context
- Search for recent developments, trends, and updates on topics
- Always verify information with multiple searches from different sources


### SEARCH STRATEGY EXAMPLES:
- Topic: "AI model performance" → Search: "GPT-4 benchmark results 2024", "LLM performance comparison studies", "AI model evaluation metrics research"
- Topic: "Company financials" → Search: "Tesla Q3 2024 earnings report", "Tesla revenue growth analysis", "electric vehicle market share 2024"
- Topic: "Technical implementation" → Search: "React Server Components best practices", "Next.js performance optimization techniques", "modern web development patterns"


Only use code when:
- You need to process or analyze data that was found through searches
- Mathematical calculations are required that cannot be found through search
- Creating visualizations of data trends that were discovered through research
- The research plan specifically requests data analysis or calculations

Code guidelines (when absolutely necessary):
- Keep code simple and focused on the specific calculation or analysis needed
- Always end with print() statements for any results
- Prefer data visualization (line charts, bar charts only) when showing trends or any comparisons or other visualizations
- Import required libraries: pandas, numpy, matplotlib, scipy as needed

### RESEARCH WORKFLOW:
1. Start with broad searches to understand the topic landscape
2. Identify key subtopics and drill down with specific searches
3. Look for recent developments and trends through targeted news/research searches
4. Cross-validate information with searches from different categories
5. Use code execution if mathematical analysis is needed on the gathered data or if you need or are asked to visualize the data
6. Continue searching to fill any gaps in understanding

For research:
- Carefully follow the plan, do not skip any steps
- Do not use the same query twice to avoid duplicates
- Plan is limited to ${totalTodos} actions with 2 extra actions in case of errors, do not exceed this limit but use to the fullest to get the most information!

Research Plan:
${JSON.stringify(plan)}
`,
    prompt,
    temperature: 0,
    providerOptions: {},
    tools: {
      webSearch: {
        description: "Search the web for information on a topic",
        inputSchema: z.object({
          query: z
            .string()
            .describe("The search query to achieve the todo")
            .max(MAX_QUERY_LEN),
          category: z
            .enum(SEARCH_CATEGORIES)
            .optional()
            .describe("The category of the search if relevant"),
          includeDomains: z
            .array(z.string())
            .optional()
            .describe("The domains to include in the search for results"),
        }),
        execute: async (
          { query, category, includeDomains },
          { toolCallId }
        ) => {
          if (dataStream) {
            dataStream.write({
              type: "data-extreme_search",
              data: {
                kind: "query",
                queryId: toolCallId,
                query,
                status: "started",
              },
            });
          }
          // Query annotation already sent above
          let results = await searchWeb(query, category, includeDomains);

          // Add these sources to our total collection
          allSources.push(...results);

          if (dataStream) {
            for (const source of results) {
              dataStream.write({
                type: "data-extreme_search",
                data: {
                  kind: "source",
                  queryId: toolCallId,
                  source: {
                    title: source.title,
                    url: source.url,
                    favicon: source.favicon,
                  },
                },
              });
            }
          }
          // Get full content for the top results
          if (results.length > 0) {
            try {
              if (dataStream) {
                dataStream.write({
                  type: "data-extreme_search",
                  data: {
                    kind: "query",
                    queryId: toolCallId,
                    query,
                    status: "reading_content",
                  },
                });
              }

              // Get the URLs from the results
              const urls = results.map((r) => r.url);

              // Get the full content using getContents
              const contentsResults = await getContents(urls);

              // Only update results if we actually got content results
              if (contentsResults && contentsResults.length > 0) {
                // For each content result, add a content annotation
                if (dataStream) {
                  for (const content of contentsResults) {
                    dataStream.write({
                      type: "data-extreme_search",
                      data: {
                        kind: "content",
                        queryId: toolCallId,
                        content: {
                          title: content.title || "",
                          url: content.url,
                          text: `${(content.content || "").slice(0, SNIPPET_LEN)}...`, // Truncate for annotation
                          favicon: content.favicon || "",
                        },
                      },
                    });
                  }
                }
                // Update results with full content, but keep original results as fallback
                results = contentsResults.map((content) => {
                  const originalResult = results.find(
                    (r) => r.url === content.url
                  );
                  return {
                    title: content.title || originalResult?.title || "",
                    url: content.url,
                    content: content.content || originalResult?.content || "",
                    publishedDate:
                      content.publishedDate ||
                      originalResult?.publishedDate ||
                      "",
                    favicon: content.favicon || originalResult?.favicon || "",
                  };
                }) as SearchResult[];
              }
            } catch (_error) {
              // Ignore content retrieval errors in this stage
            }
          }

          // Mark query as completed
          if (dataStream) {
            dataStream.write({
              type: "data-extreme_search",
              data: {
                kind: "query",
                queryId: toolCallId,
                query,
                status: "completed",
              },
            });
          }

          return results.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            publishedDate: r.publishedDate,
          }));
        },
      },
    },
    onStepFinish: (step) => {
      if (step.toolResults) {
        toolResults.push(...step.toolResults);
      }
    },
  });

  if (dataStream) {
    dataStream.write({
      type: "data-extreme_search",
      data: {
        kind: "plan",
        status: { title: "Research completed" },
      },
    });
  }

  const chartResults = toolResults.filter(
    (tr) =>
      tr.toolName === "codeRunner" &&
      typeof tr.result === "object" &&
      tr.result !== null &&
      "charts" in tr.result
  );

  const charts = chartResults.flatMap((res) => {
    const value = res.result as CodeRunnerResult;
    return value.charts ?? [];
  });

  return {
    text,
    toolResults,
    sources: Array.from(
      new Map(
        allSources.map((s) => [
          s.url,
          { ...s, content: `${s.content.slice(0, MAX_EXA_CHARS)}...` },
        ])
      ).values()
    ),
    charts,
  };
}

export function extremeSearchTool(
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined
) {
  return tool({
    description: "Use this tool to conduct an extreme search on a given topic.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "This should take the user's exact prompt. Extract from the context but do not infer or change in any way."
        ),
    }),
    execute: async ({ prompt }) => {
      const research = await extremeSearch(prompt, dataStream);

      return {
        research: {
          text: research.text,
          toolResults: research.toolResults,
          sources: research.sources,
          charts: research.charts,
        },
      };
    },
  });
}
