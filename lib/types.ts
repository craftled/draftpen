import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { AddMemoryTool, SearchMemoryTool } from "@/lib/tools";

export type DataPart = { type: "append-message"; message: string };
export type DataQueryCompletionPart = {
  type: "data-query_completion";
  data: {
    query: string;
    index: number;
    total: number;
    status: "started" | "completed" | "error";
    resultsCount: number;
    imagesCount: number;
  };
};

export type DataExtremeSearchPart = {
  type: "data-extreme_search";
  data:
    | {
        kind: "plan";
        status: { title: string };
        plan?: Array<{ title: string; todos: string[] }>;
      }
    | {
        kind: "query";
        queryId: string;
        query: string;
        status: "started" | "reading_content" | "completed" | "error";
      }
    | {
        kind: "source";
        queryId: string;
        source: { title: string; url: string; favicon?: string };
      }
    | {
        kind: "content";
        queryId: string;
        content: { title: string; url: string; text: string; favicon?: string };
      }
    | {
        kind: "code";
        codeId: string;
        title: string;
        code: string;
        status: "running" | "completed" | "error";
        result?: string;
        charts?: unknown[];
      };
};

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
  completionTime: z.number().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
type academicSearch = InferUITool<
  typeof import("@/lib/tools")["academicSearchTool"]
>;
type redditSearch = InferUITool<
  typeof import("@/lib/tools")["redditSearchTool"]
>;
type retrieve = InferUITool<typeof import("@/lib/tools")["retrieveTool"]>;
type textTranslate = InferUITool<
  typeof import("@/lib/tools")["textTranslateTool"]
>;
type greeting = InferUITool<
  ReturnType<typeof import("@/lib/tools")["greetingTool"]>
>;
type webSearch = InferUITool<
  ReturnType<typeof import("@/lib/tools")["webSearchTool"]>
>;
type extremeSearch = InferUITool<
  ReturnType<typeof import("@/lib/tools")["extremeSearchTool"]>
>;
type youtubeSearch = InferUITool<
  typeof import("@/lib/tools")["youtubeSearchTool"]
>;
type datetime = InferUITool<typeof import("@/lib/tools")["datetimeTool"]>;
type connectorsSearch = InferUITool<
  ReturnType<typeof import("@/lib/tools")["createConnectorsSearchTool"]>
>;
type createMemoryTools = InferUITool<SearchMemoryTool>;
type addMemoryTools = InferUITool<AddMemoryTool>;
// Kept for backward-compatibility of old messages referencing code_context
// No runtime tool implementation remains; this is a loose UI-only placeholder type
export type CodeContextToolInput = {
  query?: string;
};

export type CodeContextToolOutput = {
  response?: string;
  resultsCount?: number;
  outputTokens?: number;
  searchTime?: number;
};

type codeContextTool = {
  input: CodeContextToolInput;
  output: CodeContextToolOutput | undefined;
};
type keywordResearch = InferUITool<
  typeof import("@/lib/tools")["keywordResearchTool"]
>;

// type mcpSearchTool = InferUITool<typeof mcpSearchTool>;

export type ChatTools = {
  // Crypto/finance removed

  // Search & Content Tools
  web_search: webSearch;
  academic_search: academicSearch;
  youtube_search: youtubeSearch;
  reddit_search: redditSearch;
  retrieve: retrieve;

  // Location & Maps (removed)

  // Utility Tools
  text_translate: textTranslate;
  // Flight tracker removed
  datetime: datetime;
  // mcp_search: mcpSearchTool;
  extreme_search: extremeSearch;
  greeting: greeting;

  connectors_search: connectorsSearch;
  search_memories: createMemoryTools;
  add_memory: addMemoryTools;

  code_context: codeContextTool;
  keyword_research: keywordResearch;
};

export type CodeContextToolDefinition = codeContextTool;

export type CustomUIDataTypes = {
  appendMessage: string;
  id: string;
  "message-annotations": unknown;
  query_completion: {
    query: string;
    index: number;
    total: number;
    status: "started" | "completed" | "error";
    resultsCount: number;
    imagesCount: number;
  };
  extreme_search: DataExtremeSearchPart["data"];
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType?: string;
  mediaType?: string;
};
