#!/usr/bin/env bun
/**
 * Test full content brief generation end-to-end
 * Usage: bun scripts/test-brief-generation.ts <extractionId> <targetKeyword>
 */

import { maindb } from "../lib/db";
import { extractedPage } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import {
  calculateFleschReadingEase,
  calculateWordCount,
  extractHeadings,
  extractIntroduction,
  extractKeywordFrequencies,
} from "../lib/content-analysis";
import { generateObject } from "ai";
import { modelProvider } from "../ai/providers";
import { serverEnv } from "../env/server";

const extractionId = process.argv[2];
const targetKeyword = process.argv[3] || "best affiliate software";

if (!extractionId) {
  console.error("Usage: bun scripts/test-brief-generation.ts <extractionId> [targetKeyword]");
  process.exit(1);
}

console.log(`\n📝 Generating Content Brief\n`);
console.log(`Extraction ID: ${extractionId}`);
console.log(`Target Keyword: ${targetKeyword}\n`);

try {
  // 1. Load pages
  console.log("Loading pages...");
  const pages = await maindb
    .select()
    .from(extractedPage)
    .where(eq(extractedPage.extractionId, extractionId))
    .limit(5);

  if (pages.length === 0) {
    throw new Error(`No pages found for extraction ID: ${extractionId}`);
  }
  console.log(`✅ Loaded ${pages.length} pages\n`);

  // 2. Deterministic analysis
  console.log("Running deterministic analysis...");
  const analysisResults = [];
  for (const page of pages) {
    const intro = extractIntroduction(page.content);
    const headings = extractHeadings(page.content);
    const fleschScore = calculateFleschReadingEase(page.content);
    const keywordFreqs = extractKeywordFrequencies(page.content);

    analysisResults.push({
      introWordCount: calculateWordCount(intro),
      fleschScore,
      headings,
      keywordFrequencies: keywordFreqs,
    });
  }
  console.log("✅ Analysis complete\n");

  // 3. LLM analysis
  console.log("Running LLM analysis...");
  const contentPreviews = pages.map((p) => ({
    url: p.url,
    title: p.title,
    preview: p.content.slice(0, 5000),
  }));

  const { z } = await import("zod");
  const llmAnalysis = await generateObject({
    model: modelProvider.languageModel("claude-4-5-sonnet"),
    schema: z.object({
      entities: z.array(
        z.object({
          text: z.string(),
          type: z.enum(["person", "company", "product", "technology", "concept"]),
        })
      ),
      semanticKeywords: z.array(z.string()),
      contentGaps: z.array(z.string()),
    }),
    prompt: `Analyze these ${pages.length} top-ranking pages for "${targetKeyword}".

Pages:
${contentPreviews.map((p) => `URL: ${p.url}\nTitle: ${p.title}\nContent: ${p.preview}\n\n`).join("")}

Extract:
1. Named entities (people, companies, products, technologies, concepts)
2. Semantic keywords and phrases that appear across multiple pages
3. Content gaps or topics that could be covered more comprehensively`,
  });
  console.log("✅ LLM analysis complete\n");

  // 4. Keyword research
  console.log("Fetching keyword variants...");
  let keywordVariants: Array<{ keyword: string; search_volume?: number }> = [];
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
        const json = await res.json();
        if (json.status_code === 20000 && json.tasks?.[0]?.result) {
          keywordVariants = json.tasks[0].result.map((item) => ({
            keyword: item.keyword || "",
            search_volume: item.search_volume,
          }));
        }
      }
    }
  } catch (error) {
    console.log("⚠️  Keyword research failed (continuing without it)");
  }
  console.log(`✅ Found ${keywordVariants.length} keyword variants\n`);

  // 5. Generate brief
  console.log("Generating content brief...\n");
  const avgWordCount = Math.round(
    pages.reduce((sum, p) => sum + p.wordCount, 0) / pages.length
  );
  const avgIntroWordCount = Math.round(
    analysisResults.reduce((sum, a) => sum + a.introWordCount, 0) / analysisResults.length
  );
  const topPageFleschScore = analysisResults[0]?.fleschScore || 0;
  const topKeywords = analysisResults[0]?.keywordFrequencies?.slice(0, 10) || [];

  // Generate markdown brief
  const brief = `## 1. Header Information

**Article Title:** [Compelling, keyword-rich title]

**Target Keyword:** ${targetKeyword}

**Monthly Searches:** ${keywordVariants[0]?.search_volume || "N/A"}

## 2. Word Count Analysis

Word Count: The average word count of the top 5 competing pages is ${avgWordCount}. You should write an article with a word count greater than or equal to ${avgWordCount} words.

## 3. Competitor Analysis

Competing Pages:
${pages.slice(0, 5).map((p, i) => `${i + 1}. [${p.title}](${p.url})`).join("\n")}

## 4. Top Competing Page Analysis

Top Competing Page: ${pages[0]?.title}

Most used keywords:
${topKeywords.map((k) => `- ${k.keyword} (${k.count})`).join("\n")}

Flesch Reading Ease Score: ${Math.round(topPageFleschScore)} (aim for 60+)

Key insights:
- Content structure: ${analysisResults[0]?.headings.length || 0} headings identified
- Average intro length: ${avgIntroWordCount} words
- Reading level: ${topPageFleschScore > 60 ? "Good" : "Needs improvement"}

## 5. Introduction Analysis

Average word count of article intros: ${avgIntroWordCount} words.

Keywords mentioned in introductions:
${llmAnalysis.object.semanticKeywords.slice(0, 5).map((k) => `- ${k}`).join("\n")}

## 6. Keyword Strategy

Keyword Variants:
${keywordVariants.slice(0, 5).map((kv) => `- "${kv.keyword}" (Monthly Searches: ${kv.search_volume || "N/A"})`).join("\n")}

## 7. Content Structure

Suggested Subheaders:
${analysisResults[0]?.headings.filter((h) => h.level === 2).slice(0, 5).map((h) => `- H2: ${h.text}`).join("\n") || "- H2: [To be determined]"}

## 8. Entities and Semantic Keywords

Key Entities:
${llmAnalysis.object.entities.slice(0, 10).map((e) => `- ${e.text} (${e.type})`).join("\n")}

Semantic Keywords:
${llmAnalysis.object.semanticKeywords.slice(0, 10).map((k) => `- ${k}`).join("\n")}

## 9. Content Gaps

Opportunities to cover:
${llmAnalysis.object.contentGaps.slice(0, 5).map((gap) => `- ${gap}`).join("\n")}
`;

  console.log("=".repeat(80));
  console.log(brief);
  console.log("=".repeat(80));
  console.log("\n✅ Content brief generated successfully!\n");
} catch (error) {
  console.error("\n❌ Brief generation failed:", error);
  if (error instanceof Error) {
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
  process.exit(1);
}

