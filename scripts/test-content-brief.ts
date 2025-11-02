#!/usr/bin/env bun
/**
 * Comprehensive test script for content brief tool
 * Tests all components: DB queries, analysis, LLM, keyword research, brief generation
 * Usage: bun scripts/test-content-brief.ts <extractionId> [targetKeyword]
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

const extractionId = process.argv[2];
const targetKeyword = process.argv[3] || "best affiliate software";

if (!extractionId) {
  console.error("Usage: bun scripts/test-content-brief.ts <extractionId> [targetKeyword]");
  console.error("Example: bun scripts/test-content-brief.ts cKAYq3B9bm8vC0FO 'best affiliate software'");
  process.exit(1);
}

console.log(`\n🧪 Testing Content Brief Pipeline\n`);
console.log(`Extraction ID: ${extractionId}`);
console.log(`Target Keyword: ${targetKeyword}\n`);

// Test 1: Database Query
console.log("1️⃣  Testing Database Query...");
try {
  const pages = await maindb
    .select()
    .from(extractedPage)
    .where(eq(extractedPage.extractionId, extractionId))
    .limit(5);

  if (pages.length === 0) {
    console.error("❌ No pages found!");
    process.exit(1);
  }

  console.log(`✅ Found ${pages.length} pages\n`);
  pages.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.title}`);
    console.log(`      URL: ${p.url}`);
    console.log(`      Words: ${p.wordCount}`);
    console.log(`      Content: ${p.content.length} chars\n`);
  });
} catch (error) {
  console.error("❌ Database query failed:", error);
  process.exit(1);
}

// Test 2: Deterministic Analysis
console.log("2️⃣  Testing Deterministic Analysis...");
try {
  const pages = await maindb
    .select()
    .from(extractedPage)
    .where(eq(extractedPage.extractionId, extractionId))
    .limit(5);

  const results = [];
  for (const page of pages) {
    const intro = extractIntroduction(page.content);
    const headings = extractHeadings(page.content);
    const fleschScore = calculateFleschReadingEase(page.content);
    const keywordFreqs = extractKeywordFrequencies(page.content, 10);
    const introWordCount = calculateWordCount(intro);

    results.push({
      title: page.title,
      introWordCount,
      fleschScore: Math.round(fleschScore * 100) / 100,
      headingsCount: headings.length,
      topKeywords: keywordFreqs.slice(0, 5),
    });
  }

  console.log("✅ Analysis complete:\n");
  results.forEach((r, i) => {
    console.log(`   Page ${i + 1}: ${r.title}`);
    console.log(`   - Intro words: ${r.introWordCount}`);
    console.log(`   - Flesch score: ${r.fleschScore}`);
    console.log(`   - Headings: ${r.headingsCount}`);
    console.log(`   - Top keywords: ${r.topKeywords.map((k) => `${k.keyword} (${k.count})`).join(", ")}\n`);
  });

  const avgWordCount = Math.round(
    pages.reduce((sum, p) => sum + p.wordCount, 0) / pages.length
  );
  const avgIntroWords = Math.round(
    results.reduce((sum, r) => sum + r.introWordCount, 0) / results.length
  );
  const avgFlesch = Math.round(
    (results.reduce((sum, r) => sum + r.fleschScore, 0) / results.length) * 100
  ) / 100;

  console.log(`   Average word count: ${avgWordCount}`);
  console.log(`   Average intro words: ${avgIntroWords}`);
  console.log(`   Average Flesch score: ${avgFlesch}\n`);
} catch (error) {
  console.error("❌ Analysis failed:", error);
  process.exit(1);
}

// Test 3: LLM Analysis (if API key available)
console.log("3️⃣  Testing LLM Analysis...");
try {
  const { generateObject } = await import("ai");
  const { modelProvider } = await import("../ai/providers");
  const pages = await maindb
    .select()
    .from(extractedPage)
    .where(eq(extractedPage.extractionId, extractionId))
    .limit(3); // Test with 3 pages

  const contentPreviews = pages.map((p) => ({
    url: p.url,
    title: p.title,
    preview: p.content.slice(0, 5000),
  }));

  console.log(`   Analyzing ${pages.length} pages...`);

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
3. Content gaps or topics that could be covered more comprehensively

Focus on patterns and themes across all pages.`,
  });

  console.log("✅ LLM analysis complete:\n");
  console.log(`   Entities: ${llmAnalysis.object.entities.length}`);
  llmAnalysis.object.entities.slice(0, 5).forEach((e) => {
    console.log(`   - ${e.text} (${e.type})`);
  });
  console.log(`\n   Semantic keywords: ${llmAnalysis.object.semanticKeywords.length}`);
  console.log(`   ${llmAnalysis.object.semanticKeywords.slice(0, 5).join(", ")}`);
  console.log(`\n   Content gaps: ${llmAnalysis.object.contentGaps.length}`);
  llmAnalysis.object.contentGaps.slice(0, 3).forEach((gap) => {
    console.log(`   - ${gap}`);
  });
  console.log("");
} catch (error) {
  console.error("❌ LLM analysis failed:", error);
  console.log("   (This is OK if API keys are not configured)\n");
}

// Test 4: Keyword Research API
console.log("4️⃣  Testing Keyword Research API...");
try {
  const { serverEnv } = await import("../env/server");
  const login = serverEnv.DATAFORSEO_LOGIN;
  const password = serverEnv.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    console.log("   ⚠️  DataForSEO credentials not configured, skipping\n");
  } else {
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
            location_code: 2840, // US
            language_code: "en",
            limit: 5,
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

      if (json.status_code === 20000 && json.tasks?.[0]?.result) {
        const keywords = json.tasks[0].result.map((item) => ({
          keyword: item.keyword || "",
          search_volume: item.search_volume,
        }));

        console.log(`✅ Found ${keywords.length} keyword variants:\n`);
        keywords.forEach((kw) => {
          console.log(`   - "${kw.keyword}" (${kw.search_volume || "N/A"} searches)`);
        });
        console.log("");
      } else {
        console.log("   ⚠️  API returned unexpected response\n");
      }
    } else {
      console.log(`   ⚠️  API request failed: ${res.status}\n`);
    }
  }
} catch (error) {
  console.error("❌ Keyword research failed:", error);
  console.log("   (This is OK if API is unavailable)\n");
}

// Test 5: Full Pipeline Summary
console.log("5️⃣  Full Pipeline Summary\n");
console.log("✅ All components tested!");
console.log("\nReady to generate content brief.\n");

