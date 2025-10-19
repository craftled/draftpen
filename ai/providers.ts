import { createAnthropic } from "@ai-sdk/anthropic";

import { customProvider, extractReasoningMiddleware, gateway } from "ai";

const _middleware = extractReasoningMiddleware({
  tagName: "think",
});

const _middlewareWithStartWithReasoning = extractReasoningMiddleware({
  tagName: "think",
  startWithReasoning: true,
});

const anthropic = createAnthropic({
  headers: {
    "anthropic-beta": "context-1m-2025-08-07",
  },
});

const DEFAULT_MAX_OUTPUT_TOKENS = 8000 as const;

export const modelProvider = customProvider({
  languageModels: {
    gpt5: gateway("openai/gpt-5"),
    "gpt5-mini": gateway("openai/gpt-5-mini"),
    "gpt5-nano": gateway("openai/gpt-5-nano"),
    o3: gateway("openai/o3"),

    // Utility/aux models (not shown in UI)
    "gpt4-1-nano": gateway("openai/gpt-4.1-nano"),

    // Anthropic
    "claude-3-5-haiku": anthropic("claude-3-5-haiku-20241022"),
    "claude-4-5-sonnet": anthropic("claude-sonnet-4-5-20250929"),
  },
});

export type ModelParameters = {
  temperature?: number;
  topP?: number;
  topK?: number;
  minP?: number;
  frequencyPenalty?: number;
};

export type Model = {
  value: string;
  label: string;
  description: string;
  vision: boolean;
  reasoning: boolean;
  experimental: boolean;
  category: string;
  pdf: boolean;
  pro: boolean;
  requiresAuth: boolean;
  freeUnlimited: boolean;
  maxOutputTokens: number;
  // Tags
  fast?: boolean;
  isNew?: boolean;
  parameters?: ModelParameters;
};

const defaultModelEntry: Model = {
  value: "gpt5-mini",
  label: "GPT 5 Mini (Default)",
  description: "Draftpen's free default model powered by GPT 5 Mini",
  vision: true,
  reasoning: true,
  experimental: false,
  category: "Free",
  pdf: true,
  pro: false,
  requiresAuth: false,
  freeUnlimited: false,
  maxOutputTokens: 16_000,
  fast: true,
  isNew: true,
};

export const models: Model[] = [
  defaultModelEntry,

  {
    value: "gpt5-nano",
    label: "GPT 5 Nano",
    description: "OpenAI's smallest flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: "Free",
    pdf: true,
    pro: false,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16_000,
    fast: true,
  },

  {
    value: "gpt5-mini",
    label: "GPT 5 Mini",
    description: "OpenAI's small flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: "Pro",
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16_000,
    fast: false,
    isNew: true,
  },
  {
    value: "gpt5",
    label: "GPT 5",
    description: "OpenAI's flagship LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: "Pro",
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16_000,
    fast: false,
    isNew: true,
  },
  {
    value: "o3",
    label: "o3",
    description: "OpenAI's advanced LLM",
    vision: true,
    reasoning: true,
    experimental: false,
    category: "Pro",
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 16_000,
    fast: false,
    isNew: true,
  },

  {
    value: "claude-4-5-sonnet",
    label: "Claude 4.5 Sonnet",
    description: "Anthropic's most advanced LLM",
    vision: true,
    reasoning: false,
    experimental: false,
    category: "Pro",
    pdf: true,
    pro: true,
    requiresAuth: true,
    freeUnlimited: false,
    maxOutputTokens: 8000,
    isNew: false,
  },
];

// Helper functions for model access checks
export function getModelConfig(modelValue: string) {
  return models.find((model) => model.value === modelValue);
}

export function requiresAuthentication(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.requiresAuth ?? false;
}

export function requiresProSubscription(_modelValue: string): boolean {
  // PRO-ONLY MODE: All models require subscription, but this function is kept for backwards compatibility
  // Always return false since subscription check happens at API route level
  return false;
}

export function isFreeUnlimited(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.freeUnlimited ?? false;
}

export function hasVisionSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.vision ?? false;
}

export function hasPdfSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.pdf ?? false;
}

export function hasReasoningSupport(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.reasoning ?? false;
}

export function isExperimentalModel(modelValue: string): boolean {
  const model = getModelConfig(modelValue);
  return model?.experimental ?? false;
}

export function getMaxOutputTokens(modelValue: string): number {
  const model = getModelConfig(modelValue);
  return model?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
}

export function getModelParameters(modelValue: string): ModelParameters {
  const model = getModelConfig(modelValue);
  return model?.parameters || {};
}

// Access control helper
export function canUseModel(
  modelValue: string,
  user: unknown,
  isProUser: boolean
): { canUse: boolean; reason?: string } {
  const model = getModelConfig(modelValue);

  if (!model) {
    return { canUse: false, reason: "Model not found" };
  }

  // PRO-ONLY MODE: Require authentication and active subscription for all models
  if (!user) {
    return { canUse: false, reason: "authentication_required" };
  }

  if (!isProUser) {
    return { canUse: false, reason: "subscription_required:auth" };
  }

  return { canUse: true };
}

// Helper to check if user should bypass rate limits
export function shouldBypassRateLimits(
  modelValue: string,
  user: unknown
): boolean {
  const model = getModelConfig(modelValue);
  return Boolean(user && model?.freeUnlimited);
}

// Get acceptable file types for a model
export function getAcceptedFileTypes(
  modelValue: string,
  _isProUser: boolean
): string {
  const model = getModelConfig(modelValue);
  // PRO-ONLY MODE: All subscribers get PDF support if model supports it
  if (model?.pdf) {
    return "image/*,.pdf";
  }
  return "image/*";
}

// Legacy arrays for backward compatibility (deprecated - use helper functions instead)
export const authRequiredModels = models
  .filter((m) => m.requiresAuth)
  .map((m) => m.value);
export const proRequiredModels = models
  .filter((m) => m.pro)
  .map((m) => m.value);
export const freeUnlimitedModels = models
  .filter((m) => m.freeUnlimited)
  .map((m) => m.value);
