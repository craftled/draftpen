import { generateObject, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { modelProvider } from "@/ai/providers";
import { serverEnv } from "@/env/server";
import {
  calculateFleschReadingEase,
  calculateWordCount,
  extractHeadings,
  extractIntroduction,
  extractKeywordFrequencies,
} from "@/lib/content-analysis";
import { maindb } from "@/lib/db";
import { extractedPage, pageAnalysis } from "@/lib/db/schema";

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

type AnalysisResult = {
  keywordFrequencies: Array<{ keyword: string; frequency: number }>;
  entities: Array<{ text: string; type: string }>;
  semanticKeywords: string[];
  contentStructure: Array<{ level: number; title: string }>;
  contentGaps: string[];
  introductionInsights: Array<{ type: "keyword"; value: string }>;
  contentInsights: Array<{ insight: string }>;
  searchIntent?: string;
  titleSuggestions?: string[];
  competitiveSummary?: string;
  detailedStructure?: Array<{
    level: number;
    title: string;
    guidance: string;
    subsections?: Array<{ level: number; title: string; guidance: string }>;
  }>;
  primaryGoals?: string[];
  voiceGuidance?: string;
  exampleOpening?: string;
};

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

  // Use detailed structure from LLM if available, otherwise fall back to extracted headings
  const contentStructure =
    analysis.detailedStructure && analysis.detailedStructure.length > 0
      ? analysis.detailedStructure
          .filter((s) => s.level === 2)
          .map((h2) => {
            const h3s =
              analysis.detailedStructure?.filter(
                (s) => s.level === 3 && s.title.includes(h2.title.slice(0, 20))
              ) || [];
            if (h3s.length > 0) {
              return `- H2: ${h2.title}\n  ${h3s.map((h3) => `- H3: ${h3.title}`).join("\n  ")}\n  \n  Guidance: ${h2.guidance}`;
            }
            return `- H2: ${h2.title}\n\n  Guidance: ${h2.guidance}`;
          })
          .join("\n\n")
      : analysis.contentStructure
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

  const paaQuestions =
    serpData?.peopleAlsoAsk?.questions
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

  const titleSuggestions =
    analysis.titleSuggestions && analysis.titleSuggestions.length > 0
      ? analysis.titleSuggestions.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "[Compelling, keyword-rich title]";

  return `## 1. Header Information

**Article Title Suggestions:**
${titleSuggestions}

**Target Keyword:** ${targetKeyword}

**Monthly Searches:** ${monthlySearches || "N/A"}

**Search Intent:** ${analysis.searchIntent || "Commercial investigation / Comparison"}

## 2. Quick Overview

**Recommended Article Length:** ~${avgWordCount}+ words (aim to meet or exceed ${avgWordCount} words — the average of top competitors)

**Readability Target:** Flesch Reading Ease 60+ (write clearly for marketing/SMB audiences)

**Recommended Voice & Tone:** ${analysis.voiceGuidance || "Authoritative but approachable; target SMB marketers and product managers"}

## 3. Primary Goals for the Article

${
  analysis.primaryGoals && analysis.primaryGoals.length > 0
    ? analysis.primaryGoals.map((goal) => `- ${goal}`).join("\n")
    : "- Help readers choose the right solution\n- Provide comprehensive, actionable content\n- Address common questions and concerns"
}

## 4. Word Count Analysis

Word Count:

The average word count of the top 5 competing pages is ${avgWordCount}. You should write an article with a word count greater than or equal to ${avgWordCount} words.

## 5. Competitor Analysis

Competing Pages:

${top5Pages
  .map((page, i) => `${i + 1}. [${page.title}](${page.url})`)
  .join("\n\n")}

The average domain rating for the competing pages is [N/A - Domain rating not available in MVP].

**Competitive Landscape Summary:**

${analysis.competitiveSummary || "The SERP is dominated by vendor landing pages and roundup/review articles. Top competitor patterns include detailed product lists, comparison charts, integration lists, and emphasis on easy setup and key features."}

## 6. Top Competing Page Analysis

Top Competing Page:

Here are the most used keywords on the top competing page:

${topKeywords}

Flesch Reading Ease Score: ${topPageFlesch} (aim for 60+)

What can we learn from the top page?

${contentInsightsList}

## 7. Introduction Analysis

Article Introduction:

Average word count of the article intros on the top 5 competing pages is ${avgIntroWordCount}.

Instead of typical fluff introduction, think of second/third-order pain point intro. Max 100 words.

The following keywords are mentioned in multiple article introductions:

${introductionKeywords}

**Example Opening Paragraph:**

${analysis.exampleOpening || `Choosing the best ${targetKeyword} can be challenging. This guide compares top options, shows pricing signals, and recommends the best choice based on your needs.`}

## 8. Keyword Strategy

Keyword Variants:

Here are some variants of the target keyword (which carry search volume) to include:

${keywordVariantsList}

## 9. Content Structure

Suggested Subheaders:

${contentStructure}

## 10. Technical Requirements

Suggested URL Structure: /${seoSlug}

Google's People Also Ask Questions:

${paaQuestions}

## 11. Content Strategy

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
    "Generate a comprehensive content brief by analyzing extracted SERP content. Requires targetKeyword and extractionId (from serp_extract tool output). Analyzes keywords, entities, semantics, content structure, and generates a structured brief.",
  inputSchema: z.object({
    targetKeyword: z
      .string()
      .min(1)
      .describe("Target keyword for the content brief"),
    extractionId: z
      .string()
      .describe("Extraction ID from serp_extract tool output"),
    serpResults: z
      .object({
        organic: z.object({
          count: z.number(),
          results: z.array(
            z.object({
              title: z.string(),
              link: z.string(),
              snippet: z.string(),
              position: z.number(),
            })
          ),
        }),
        peopleAlsoAsk: z
          .object({
            questions: z.array(
              z.object({
                question: z.string(),
                snippet: z.string(),
              })
            ),
          })
          .optional(),
        relatedSearches: z
          .object({
            queries: z.array(z.object({ query: z.string() })),
          })
          .optional(),
      })
      .optional()
      .describe("SERP data from serp_checker tool output (optional)"),
  }),
  execute: async ({
    targetKeyword,
    extractionId,
    serpResults,
  }: {
    targetKeyword: string;
    extractionId: string;
    serpResults?: SerpData;
  }) => {
    console.log(
      `[content-brief] Starting analysis for "${targetKeyword}", extraction: ${extractionId}`
    );

    // 1. Load pages from DB (use maindb to avoid replica lag - pages were just saved)
    const pages = await maindb
      .select()
      .from(extractedPage)
      .where(eq(extractedPage.extractionId, extractionId))
      .limit(5);

    if (pages.length === 0) {
      throw new Error(
        `No pages found for extraction ID: ${extractionId}. Please run serp_extract first.`
      );
    }

    console.log(`[content-brief] Loaded ${pages.length} pages from DB`);

    // 2. Run deterministic analysis for each page
    const analysisResults: Array<{
      id: string;
      introWordCount: number;
      fleschScore: number;
      headings: Array<{ level: number; text: string }>;
      keywordFrequencies: Array<{ keyword: string; count: number }>;
    }> = [];
    for (const page of pages) {
      const intro = extractIntroduction(page.content);
      const headings = extractHeadings(page.content);
      const fleschScore = calculateFleschReadingEase(page.content);
      const keywordFreqs = extractKeywordFrequencies(page.content);

      // Save analysis to DB
      const [analysis] = await maindb
        .insert(pageAnalysis)
        .values({
          pageId: page.id,
          introWordCount: calculateWordCount(intro),
          fleschScore,
          headings,
          keywordFrequencies: keywordFreqs,
        })
        .returning();

      analysisResults.push({
        id: analysis.id,
        introWordCount: analysis.introWordCount,
        fleschScore: analysis.fleschScore,
        headings: analysis.headings || [],
        keywordFrequencies: analysis.keywordFrequencies || [],
      });
    }

    console.log("[content-brief] Deterministic analysis complete");

    // 3. Use LLM for entity extraction + semantic clustering
    const contentPreviews = pages.map((p) => ({
      url: p.url,
      title: p.title,
      preview: p.content.slice(0, 5000),
    }));

    const llmAnalysis = await generateObject({
      model: modelProvider.languageModel("claude-4-5-sonnet"),
      schema: z.object({
        entities: z.array(
          z.object({
            text: z.string(),
            type: z.enum([
              "person",
              "company",
              "product",
              "technology",
              "concept",
            ]),
          })
        ),
        semanticKeywords: z.array(z.string()),
        contentGaps: z.array(z.string()),
        searchIntent: z
          .string()
          .describe(
            "Primary search intent (informational, commercial, transactional)"
          ),
        titleSuggestions: z
          .array(z.string())
          .describe("3-5 compelling title suggestions"),
        competitiveSummary: z
          .string()
          .describe("Summary of competitive landscape and patterns"),
        detailedStructure: z
          .array(
            z.object({
              level: z.number(),
              title: z.string(),
              guidance: z
                .string()
                .describe("What should be covered in this section"),
              subsections: z
                .array(
                  z.object({
                    level: z.number(),
                    title: z.string(),
                    guidance: z.string(),
                  })
                )
                .optional(),
            })
          )
          .describe(
            "Detailed content structure with H2/H3 and guidance for each section"
          ),
        primaryGoals: z
          .array(z.string())
          .describe("Primary goals for the article"),
        voiceGuidance: z
          .string()
          .describe("Recommended voice, tone, and style"),
        exampleOpening: z.string().describe("Example opening paragraph"),
      }),
      prompt: `Analyze these ${pages.length} top-ranking pages for "${targetKeyword}" and generate a comprehensive content brief.

Pages:
${contentPreviews.map((p) => `URL: ${p.url}\nTitle: ${p.title}\nContent: ${p.preview}\n\n`).join("")}

Generate:
1. Named entities (people, companies, products, technologies, concepts)
2. Semantic keywords and phrases that appear across multiple pages
3. Content gaps or topics that could be covered more comprehensively
4. Search intent analysis (informational, commercial investigation, transactional)
5. 3-5 compelling title suggestions
6. Competitive landscape summary (patterns, what competitors cover/avoid)
7. Detailed content structure with H2/H3 headings and specific guidance for each section
8. Primary goals for the article (what it should accomplish)
9. Voice and tone guidance
10. Example opening paragraph

Focus on creating an actionable brief that a content writer can use to create a comprehensive, SEO-optimized article.`,
    });

    console.log("[content-brief] LLM analysis complete");

    // Update analysis with LLM results
    for (const analysis of analysisResults) {
      await maindb
        .update(pageAnalysis)
        .set({
          entities: llmAnalysis.object.entities,
          semanticKeywords: llmAnalysis.object.semanticKeywords,
        })
        .where(eq(pageAnalysis.id, analysis.id));
    }

    // 4. Fetch keyword variants from DataForSEO
    let keywordVariants: Array<{ keyword: string; search_volume?: number }> =
      [];
    try {
      const login = serverEnv.DATAFORSEO_LOGIN;
      const password = serverEnv.DATAFORSEO_PASSWORD;

      if (login && password) {
        const authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
        const res = await fetch(
          "https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live",
          {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify([
              {
                keywords: [targetKeyword],
                location_code: 2840,
                language_code: "en",
                limit: 10,
              },
            ]),
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

          if (json.status_code === 20_000 && json.tasks?.[0]?.result) {
            keywordVariants = json.tasks[0].result.map((item) => ({
              keyword: item.keyword || "",
              search_volume: item.search_volume,
            }));
            console.log(
              `[content-brief] Fetched ${keywordVariants.length} keyword variants`
            );
          }
        }
      }
    } catch (error) {
      console.error("[content-brief] Keyword research failed:", error);
    }

    // 5. Generate brief
    const avgWordCount = Math.round(
      pages.reduce((sum, p) => sum + p.wordCount, 0) / pages.length
    );
    const avgIntroWordCount = Math.round(
      analysisResults.reduce((sum, a) => sum + a.introWordCount, 0) /
        analysisResults.length
    );
    const topPageFleschScore = analysisResults[0]?.fleschScore || 0;

    // Convert DB pages to format expected by generateContentBrief
    const pagesForBrief = pages.map((p) => ({
      url: p.url,
      title: p.title,
      metaDescription: p.metaDescription || undefined,
      h1: p.h1 || undefined,
      content: p.content,
      contentPreview: p.content.slice(0, 3000),
      metadata: p.metadata || {},
    }));

    // Convert analysis results to format expected by generateContentBrief
    const analysisForBrief = {
      keywordFrequencies:
        analysisResults[0]?.keywordFrequencies?.map((kf) => ({
          keyword: kf.keyword,
          frequency: kf.count,
        })) || [],
      entities: llmAnalysis.object.entities.map((e) => ({
        text: e.text,
        type: e.type,
      })),
      semanticKeywords: llmAnalysis.object.semanticKeywords,
      contentStructure:
        analysisResults[0]?.headings?.map((h) => ({
          level: h.level,
          title: h.text,
        })) || [],
      contentGaps: llmAnalysis.object.contentGaps,
      // Generate introduction insights from semantic keywords
      introductionInsights: llmAnalysis.object.semanticKeywords
        .slice(0, 5)
        .map((kw) => ({
          type: "keyword" as const,
          value: kw,
        })),
      // Generate content insights from gaps and structure
      contentInsights: [
        ...llmAnalysis.object.contentGaps.slice(0, 3).map((gap) => ({
          insight: gap,
        })),
        ...(analysisResults[0]?.headings?.length
          ? [
              {
                insight: `Content structure uses ${analysisResults[0].headings.length} headings for clear organization`,
              },
            ]
          : []),
        {
          insight: `Average Flesch Reading Ease score: ${Math.round(topPageFleschScore)} (target: 60+)`,
        },
      ],
      // Add new LLM analysis fields
      searchIntent: llmAnalysis.object.searchIntent,
      titleSuggestions: llmAnalysis.object.titleSuggestions,
      competitiveSummary: llmAnalysis.object.competitiveSummary,
      detailedStructure: llmAnalysis.object.detailedStructure,
      primaryGoals: llmAnalysis.object.primaryGoals,
      voiceGuidance: llmAnalysis.object.voiceGuidance,
      exampleOpening: llmAnalysis.object.exampleOpening,
    };

    const wordCounts = pages.map((p) => p.wordCount);
    const introWordCounts = analysisResults.map((a) => a.introWordCount);
    const fleschScores = analysisResults.map((a) => a.fleschScore);

    const brief = generateContentBrief(
      targetKeyword,
      keywordVariants.find(
        (kv) => kv.keyword.toLowerCase() === targetKeyword.toLowerCase()
      )?.search_volume,
      pagesForBrief,
      serpResults,
      analysisForBrief,
      keywordVariants,
      wordCounts,
      introWordCounts,
      fleschScores
    );

    console.log("[content-brief] Brief generation complete");

    return {
      targetKeyword,
      brief,
      analysis: {
        avgWordCount,
        avgIntroWordCount,
        topPageFleschScore,
        topKeywords: analysisResults[0]?.keywordFrequencies?.slice(0, 10) || [],
        entities: llmAnalysis.object.entities,
        semanticKeywords: llmAnalysis.object.semanticKeywords,
        contentGaps: llmAnalysis.object.contentGaps,
      },
      competitors: pages.map((p) => ({ url: p.url, title: p.title })),
    };
  },
});
