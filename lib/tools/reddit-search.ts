import { tool } from "ai";
import { z } from "zod";

const MAX_QUERY_LENGTH = 200 as const;

export const redditSearchTool = tool({
  description: "Search Reddit content (disabled).",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The exact search query from the user.")
      .max(MAX_QUERY_LENGTH),
    maxResults: z
      .number()
      .describe("Maximum number of results to return. Default is 20."),
    timeRange: z
      .enum(["day", "week", "month", "year"])
      .describe("Time range for Reddit search."),
  }),
  execute: async () =>
    ({
      query: "",
      results: [],
      timeRange: "week",
      disabled: true,
      message: "Reddit search is currently disabled.",
    }) as unknown,
});
