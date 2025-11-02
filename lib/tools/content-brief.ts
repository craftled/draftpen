import { generateObject, tool } from "ai";
import { z } from "zod";
import { modelProvider } from "@/ai/providers";
import { serverEnv } from "@/env/server";

type ExtractedPage = {
  url: string;
  title: string;
  metaDescription?: string;
  h1?: string;
  content: string;
  contentPreview: string;
  metadata: {
    author?: string;
    publishedDate?: string;
    image?: string;
    favicon?: string;
    language?: string;
  };
};

type SerpResult = {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position: number;
  sitelinks?: Array<{ title: string; link: string }>;
};

type SerpData = {
  organic: {
    count: number;
    results: SerpResult[];
  };
  peopleAlsoAsk?: {
    count: number;
    questions: Array<{
      question: string;
      snippet: string;
      title: string;
      link: string;
    }>;
  };
  relatedSearches?: {
    count: number;
    queries: Array<{ query: string }>;
  };
};

// Strip markdown syntax and count words
function calculateWordCount(text: string): number {
  // Remove markdown headers
  let cleaned = text.replace(/^#{1,6}\s+/gm, "");
  // Remove markdown links [text](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove markdown images
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");
  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`[^`]+`/g, "");
  // Remove markdown lists
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, "");
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, "");
  // Remove markdown tables
  cleaned = cleaned.replace(/\|/g, " ");
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  // Split and count words
  return cleaned.split(/\s+/).filter((word) => word.length > 0).length;
}

// Count syllables in a word (approximation)
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) {
    return 1;
  }
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

// Calculate Flesch Reading Ease Score
function calculateFleschReadingEase(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0);
  if (sentences.length === 0) {
    return 0;
  }

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return 0;
  }

  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease formula
  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  return Math.round(score * 100) / 100;
}

// Extract introduction from content (first paragraph or first ~200 words)
function extractIntroduction(content: string): string {
  // Try to find first paragraph
  const paragraphs = content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);
  if (paragraphs.length > 0) {
    const firstPara = paragraphs[0];
    const words = firstPara.split(/\s+/);
    if (words.length <= 200) {
      return firstPara;
    }
    return words.slice(0, 200).join(" ");
  }
  // Fallback: first 200 words
  const words = content.split(/\s+/);
  return words.slice(0, 200).join(" ");
}

// LLM Analysis Schema
const analysisSchema = z.object({
  keywordFrequencies: z
    .array(
      z.object({
        keyword: z.string(),
        frequency: z.number(),
      })
    )
    .describe("Top keywords with their frequency counts"),
  entities: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
      })
    )
    .describe("Extracted entities (people, places, organizations, concepts)"),
  semanticKeywords: z
    .array(z.string())
    .describe("Semantic keywords and related terms"),
  contentStructure: z
    .array(
      z.object({
        level: z.union([z.literal(2), z.literal(3)]),
        title: z.string(),
      })
    )
    .describe("H2 and H3 headings structure"),
  introductionInsights: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
      })
    )
    .describe("Keywords and themes mentioned in introductions"),
  contentInsights: z
    .array(
      z.object({
        category: z.string(),
        insight: z.string(),
      })
    )
    .describe("Key insights about content approach, structure, depth, UX, value"),
});

type AnalysisResult = z.infer<typeof analysisSchema>;

// Analyze content with LLM
async function analyzeContentWithLLM(
  pages: ExtractedPage[],
  targetKeyword: string
): Promise<AnalysisResult> {
  const topPage = pages[0];
  const top5Pages = pages.slice(0, 5);

  // Prepare content for analysis (limit to prevent token overflow)
  // Reduce content length per page to speed up analysis
  const MAX_CONTENT_LENGTH = 5000; // Reduced from 8000
  const contentSummaries = top5Pages.map((page) => ({
    url: page.url,
    title: page.title,
    content: page.content.slice(0, MAX_CONTENT_LENGTH),
    introduction: extractIntroduction(page.content),
  }));

  const prompt = `Analyze the following content from top-ranking pages for the keyword "${targetKeyword}".

Top 5 Pages:
${contentSummaries
  .map(
    (p, i) =>
      `${i + 1}. ${p.title} (${p.url})\n   Content preview: ${p.content.slice(0, 400)}...\n   Introduction: ${p.introduction.slice(0, 150)}...`
  )
  .join("\n\n")}

Please analyze:
1. Extract top 10 keywords with their frequency counts across all pages
2. Extract entities (people, places, organizations, concepts)
3. Identify semantic keywords and related terms
4. Map content structure (H2 and H3 headings from markdown)
5. Analyze introduction patterns (keywords and themes mentioned)
6. Extract insights about: content approach, structure, depth, user experience, practical value

Focus on the top page especially for detailed analysis.`;

  const { object } = await generateObject({
    model: modelProvider.languageModel("gpt5-mini"),
    schema: analysisSchema,
    prompt,
  });

  return object;
}

// Generate content brief markdown
function generateContentBrief(
  targetKeyword: string,
  monthlySearches: number | undefined,
  pages: ExtractedPage[],
  serpData: SerpData | undefined,
  analysis: AnalysisResult,
  keywordVariants: Array<{ keyword: string; search_volume?: number }>,
  wordCounts: number[],
  introWordCounts: number[],
  fleschScores: number[]
): string {
  const top5Pages = pages.slice(0, 5);
  const avgWordCount = Math.round(
    wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
  );
  const avgIntroWordCount = Math.round(
    introWordCounts.reduce((a, b) => a + b, 0) / introWordCounts.length
  );
  const topPageFlesch = fleschScores[0] || 0;

  const topKeywords = analysis.keywordFrequencies
    .slice(0, 10)
    .map((k) => `- ${k.keyword} (${k.frequency})`)
    .join("\n");

  const contentStructure = analysis.contentStructure
    .filter((s) => s.level === 2)
    .map((h2) => {
      const h3s = analysis.contentStructure.filter(
        (s) => s.level === 3 && s.title.includes(h2.title.slice(0, 20))
      );
      return h3s.length > 0
        ? `- H2: ${h2.title}\n  ${h3s.map((h3) => `- H3: ${h3.title}`).join("\n  ")}`
        : `- H2: ${h2.title}`;
    })
    .join("\n");

  const paaQuestions = serpData?.peopleAlsoAsk?.questions
    .slice(0, 4)
    .map((q) => `- ${q.question}`)
    .join("\n") || "- No PAA questions available";

  const keywordVariantsList = keywordVariants
    .slice(0, 5)
    .map(
      (kv) =>
        `- "${kv.keyword}" (Monthly Searches: ${kv.search_volume || "N/A"})`
    )
    .join("\n");

  const introductionKeywords = analysis.introductionInsights
    .filter((i) => i.type === "keyword")
    .slice(0, 5)
    .map((i) => `- ${i.value}`)
    .join("\n");

  const contentInsightsList = analysis.contentInsights
    .slice(0, 5)
    .map((i) => `- ${i.insight}`)
    .join("\n");

  const seoSlug = targetKeyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `## 1. Header Information

**Article Title:** [Compelling, keyword-rich title]

**Target Keyword:** ${targetKeyword}

**Monthly Searches:** ${monthlySearches || "N/A"}

## 2. Word Count Analysis

Word Count:

The average word count of the top 5 competing pages is ${avgWordCount}. You should write an article with a word count greater than or equal to ${avgWordCount} words.

## 3. Competitor Analysis

Competing Pages:

${top5Pages
  .map((page, i) => `${i + 1}. [${page.title}](${page.url})`)
  .join("\n\n")}

The average domain rating for the competing pages is [N/A - Domain rating not available in MVP].

## 4. Top Competing Page Analysis

Top Competing Page:

Here are the most used keywords on the top competing page:

${topKeywords}

Flesch Reading Ease Score: ${topPageFlesch} (aim for 60+)

What can we learn from the top page?

${contentInsightsList}

## 5. Introduction Analysis

Article Introduction:

Average word count of the article intros on the top 5 competing pages is ${avgIntroWordCount}.

Instead of typical fluff introduction, think of second/third-order pain point intro. Max 100 words.

The following keywords are mentioned in multiple article introductions:

${introductionKeywords}

## 6. Keyword Strategy

Keyword Variants:

Here are some variants of the target keyword (which carry search volume) to include:

${keywordVariantsList}

## 7. Content Structure

Suggested Subheaders:

${contentStructure}

[Include detailed guidance for each section explaining what should be covered]

## 8. Technical Requirements

Suggested URL Structure: /${seoSlug}

Google's People Also Ask Questions:

${paaQuestions}

## 9. Content Strategy

How To Meet Search Intent:

- Analyze the top-performing pages to understand user intent
- Address the questions from People Also Ask section
- Provide comprehensive, actionable content
- Use semantic keywords naturally throughout
- Ensure readability (Flesch score 60+)

First Steps In The Writing Process:

- Review the top 5 competing pages for the target keyword
- Aim for ${avgWordCount} words with a ${avgIntroWordCount}-word introduction
- Include the most used keywords from the top competing page
- Use suggested subheaders for a clear content structure
- Consider how you will meet the search intent of the target keyword
- Answer common questions from Google's People Also Ask
- Check your content's Flesch Reading Ease Score with [Readable](https://app.readable.com/text)
`;
}

export const contentBriefTool = tool({
  description:
    "Generate a comprehensive content brief by analyzing extracted SERP content. Requires targetKeyword and extractedContent (from serp_extract tool output). Analyzes keywords, entities, semantics, content structure, and generates a structured brief.",
  inputSchema: z.object({
    targetKeyword: z
      .string()
      .min(1)
      .describe("Primary keyword phrase for the content brief"),
    extractedContent: z
      .array(
        z.object({
          url: z.string(),
          title: z.string(),
          metaDescription: z.string().optional(),
          h1: z.string().optional(),
          content: z.string(),
          contentPreview: z.string(),
          metadata: z
            .object({
              author: z.string().optional(),
              publishedDate: z.string().optional(),
              image: z.string().optional(),
              favicon: z.string().optional(),
              language: z.string().optional(),
            })
            .optional(),
        })
      )
      .min(1)
      .optional()
      .describe(
        "Array of extracted pages from SERP results. Extract from serp_extract tool output - use the 'extracted' array field."
      ),
    serpResults: z
      .object({
        organic: z.object({
          count: z.number(),
          results: z.array(
            z.object({
              title: z.string(),
              link: z.string(),
              snippet: z.string(),
              date: z.string().optional(),
              position: z.number(),
              sitelinks: z
                .array(z.object({ title: z.string(), link: z.string() }))
                .optional(),
            })
          ),
        }),
        peopleAlsoAsk: z
          .object({
            count: z.number(),
            questions: z.array(
              z.object({
                question: z.string(),
                snippet: z.string(),
                title: z.string(),
                link: z.string(),
              })
            ),
          })
          .optional(),
        relatedSearches: z
          .object({
            count: z.number(),
            queries: z.array(z.object({ query: z.string() })),
          })
          .optional(),
      })
      .optional()
      .describe(
        "SERP results with organic results, PAA, and related searches. Extract from serp_checker tool output."
      ),
    keywordVariants: z
      .array(
        z.object({
          keyword: z.string(),
          search_volume: z.number().optional(),
        })
      )
      .optional()
      .describe(
        "Keyword variants with search volumes. Can be fetched using keyword_research tool."
      ),
  }),
  execute: async ({
    targetKeyword,
    extractedContent,
    serpResults,
    keywordVariants: providedKeywordVariants,
  }: {
    targetKeyword: string;
    extractedContent?: ExtractedPage[];
    serpResults?: SerpData;
    keywordVariants?: Array<{ keyword: string; search_volume?: number }>;
  }) => {
    // Handle missing extracted content gracefully
    if (!extractedContent || extractedContent.length === 0) {
      throw new Error(
        "No extracted content provided. Please run serp_extract first to extract content from SERP URLs, then use that extracted content to generate the content brief."
      );
    }

    const pages = extractedContent.slice(0, 5); // Focus on top 5

    // Calculate word counts
    const wordCounts = pages.map((page) => calculateWordCount(page.content));
    const introWordCounts = pages.map((page) =>
      calculateWordCount(extractIntroduction(page.content))
    );
    const fleschScores = pages.map((page) =>
      calculateFleschReadingEase(page.content)
    );

    // Analyze content with LLM
    const analysis = await analyzeContentWithLLM(pages, targetKeyword);

    // Get keyword variants if not provided
    let keywordVariants = providedKeywordVariants || [];
    if (keywordVariants.length === 0) {
      try {
        // Call DataForSEO API directly for keyword research
        const login = serverEnv.DATAFORSEO_LOGIN;
        const password = serverEnv.DATAFORSEO_PASSWORD;

        if (login && password) {
          const authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;

          const payload = [
            {
              keywords: [targetKeyword],
              location_code: 2840, // US
              language_code: "en",
              limit: 5,
              include_adult_keywords: false,
            },
          ];

          const res = await fetch(
            "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live",
            {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          if (res.ok) {
            const json = (await res.json()) as {
              status_code?: number;
              tasks?: Array<{
                result?: Array<{
                  keyword?: string;
                  search_volume?: number;
                }>;
              }>;
            };

            if (json.status_code === 20000 && json.tasks?.[0]?.result) {
              keywordVariants = json.tasks[0].result.map((item) => ({
                keyword: item.keyword || "",
                search_volume: item.search_volume,
              }));
            }
          }
        }
      } catch (_error) {
        // Continue without keyword variants if API fails
        keywordVariants = [];
      }
    }

    // Get monthly searches from keyword variants or use first result
    const primaryKeyword = keywordVariants.find(
      (kv) => kv.keyword.toLowerCase() === targetKeyword.toLowerCase()
    );
    const monthlySearches = primaryKeyword?.search_volume;

    // Generate content brief
    const brief = generateContentBrief(
      targetKeyword,
      monthlySearches,
      pages,
      serpResults,
      analysis,
      keywordVariants,
      wordCounts,
      introWordCounts,
      fleschScores
    );

    return {
      targetKeyword,
      monthlySearches: monthlySearches || undefined,
      brief,
      analysis: {
        avgWordCount: Math.round(
          wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
        ),
        avgIntroWordCount: Math.round(
          introWordCounts.reduce((a, b) => a + b, 0) / introWordCounts.length
        ),
        topPageFleschScore: fleschScores[0] || 0,
        topKeywords: analysis.keywordFrequencies.slice(0, 10),
        contentStructure: analysis.contentStructure,
      },
      competitors: pages.slice(0, 5).map((p) => ({
        url: p.url,
        title: p.title,
      })),
    };
  },
});

