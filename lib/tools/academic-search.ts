import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import { serverEnv } from "@/env/server";

const SUMMARY_PREFIX_RE = /^Summary:\s*/i;
const TITLE_SUFFIX_BRACKET_RE = /\s\[.*?\]$/;

export const academicSearchTool = tool({
  description: "Search academic papers and research.",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }: { query: string }) => {
    const exa = new Exa(serverEnv.EXA_API_KEY as string);

    const result = await exa.search(query, {
      type: "auto",
      numResults: 20,
      category: "research paper",
      contents: {
        summary: {
          query: "Abstract of the Paper",
        },
      },
    });

    const processedResults = result.results.reduce<typeof result.results>(
      (acc, paper) => {
        if (acc.some((p) => p.url === paper.url) || !paper.summary) {
          return acc;
        }

        const cleanSummary = paper.summary.replace(SUMMARY_PREFIX_RE, "");
        const cleanTitle = paper.title?.replace(TITLE_SUFFIX_BRACKET_RE, "");

        acc.push({
          ...paper,
          title: cleanTitle || "",
          summary: cleanSummary,
        });

        return acc;
      },
      []
    );

    return {
      results: processedResults,
    };
  },
});
