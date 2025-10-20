"use server";

import { Supermemory } from "supermemory";
import { serverEnv } from "@/env/server";
import { getUser } from "@/lib/auth-utils";

// Initialize the memory client with API key
const supermemoryClient = new Supermemory({
  apiKey: serverEnv.SUPERMEMORY_API_KEY,
});

// Define the types based on actual API responses
export type MemoryItem = {
  id: string;
  customId: string;
  connectionId: string | null;
  containerTags: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
  status: string;
  summary: string;
  title: string;
  type: string;
  content: string;
  // Legacy fields for backward compatibility
  name?: string;
  memory?: string;
  user_id?: string;
  owner?: string;
  immutable?: boolean;
  expiration_date?: string | null;
  created_at?: string;
  categories?: string[];
};

export type MemoryResponse = {
  memories: MemoryItem[];
  total: number;
};
/**
 * Search memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function searchMemories(
  query: string,
  _page = 1,
  pageSize = 20
): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  if (!query.trim()) {
    return { memories: [], total: 0 };
  }
  const result = await supermemoryClient.search.memories({
    q: query,
    containerTag: user.id,
    limit: pageSize,
  });

  return { memories: [], total: result.total || 0 };
}

/**
 * Get all memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function getAllMemories(
  page = 1,
  pageSize = 20
): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error("Authentication required");
  }
  const result = await supermemoryClient.memories.list({
    containerTags: [user.id],
    page,
    limit: pageSize,
    includeContent: true,
  });

  return {
    memories: result.memories as any,
    total: result.pagination.totalItems || 0,
  };
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(memoryId: string) {
  const user = await getUser();

  if (!user) {
    throw new Error("Authentication required");
  }
  const data = await supermemoryClient.memories.delete(memoryId);
  return data;
}
