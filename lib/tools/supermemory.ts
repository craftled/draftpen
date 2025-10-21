import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import type { Tool } from "ai";
import { serverEnv } from "@/env/server";

type MemoryRecord = Record<string, unknown>;

export function createMemoryTools(userId: string) {
  return supermemoryTools(serverEnv.SUPERMEMORY_API_KEY, {
    containerTags: [userId],
  });
}

export type SearchMemoryTool = Tool<
  {
    informationToGet: string;
  },
  | {
      success: boolean;
      results: MemoryRecord[];
      count: number;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
      results?: undefined;
      count?: undefined;
    }
>;

export type AddMemoryTool = Tool<
  {
    memory: string;
  },
  | {
      success: boolean;
      memory: MemoryRecord;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
      memory?: undefined;
    }
>;
