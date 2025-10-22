// /app/api/chat/route.ts

import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import type { ToolSet } from "ai";
import {
  convertToModelMessages,
  createUIMessageStream,
  generateObject,
  JsonToSseTransformStream,
  NoSuchToolError,
  stepCountIs,
  streamText,
} from "ai";

import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { v4 as uuidv4 } from "uuid";
import {
  getModelParameters,
  modelProvider,
  shouldBypassRateLimits,
} from "@/ai/providers";
import {
  generateTitleFromUserMessage,
  getCurrentUser,
  getGroupConfig,
  getLightweightUser,
} from "@/app/actions";
import {
  createStreamId,
  getChatById,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from "@/lib/db/queries";
import type { CustomInstructions } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { markdownJoinerTransform } from "@/lib/parser";
import {
  academicSearchTool,
  createConnectorsSearchTool,
  datetimeTool,
  extremeSearchTool,
  greetingTool,
  keywordResearchTool,
  screenshotTool,
  // mcpSearchTool,
  redditSearchTool,
  retrieveTool,
  serpCheckerTool,
  textTranslateTool,
  webSearchTool,
  youtubeSearchTool,
} from "@/lib/tools";
import { createMemoryTools } from "@/lib/tools/supermemory";
import type { ChatMessage } from "@/lib/types";
import { getCachedCustomInstructionsByUserId } from "@/lib/user-data-server";

let globalStreamContext: ResumableStreamContext | null = null;

const MS_PER_SECOND = 1000 as const;

const STOP_STEP_COUNT = 5 as const;
const MAX_RETRIES = 10 as const;
const BUDGET_TOKENS = 4000 as const;

// Gateway provider configuration constants
const GATEWAY_ONLY_PROVIDERS: readonly string[] = ["openai", "anthropic"];
const GATEWAY_PROVIDER_ORDER: readonly string[] = ["anthropic"];

// Shared config promise to avoid duplicate calls
let configPromise: Promise<{
  tools: readonly string[];
  instructions: string;
}>;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: "scira-ai",
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        const message = (error as { message: string }).message;
        if (message.includes("REDIS_URL")) {
          /* missing REDIS_URL; running without Redis-backed resumable streams */
        } else {
          /* unexpected error creating resumable stream context */
        }
      } else {
        /* unknown error type creating resumable stream context */
      }
    }
  }

  return globalStreamContext;
}

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  const {
    messages,
    model,
    group,
    timezone,
    id,
    selectedVisibilityType,
    isCustomInstructionsEnabled,
    searchProvider,
    selectedConnectors,
  } = await req.json();
  const streamId = `stream-${uuidv4()}`;

  // CRITICAL PATH: Get auth status first (required for all subsequent checks)
  const lightweightUser = await getLightweightUser();

  // Early exit checks (no DB operations needed)
  // PRO-ONLY MODE: Block all non-subscribers (no free tier)
  if (!lightweightUser) {
    return new ChatSDKError(
      "unauthorized:auth",
      "This app requires an active subscription. Start your 7-day free trial to continue."
    ).toResponse();
  }

  // Check if user has active subscription (includes trials)
  if (!lightweightUser.isProUser) {
    return new ChatSDKError(
      "subscription_required:auth",
      "An active subscription is required. Start your 7-day free trial to continue."
    ).toResponse();
  }

  // START ALL CRITICAL PARALLEL OPERATIONS IMMEDIATELY
  const _isProUser = lightweightUser?.isProUser ?? false;

  // 1. Config (needed for streaming) - start immediately
  configPromise = getGroupConfig(group);

  // 2. Full user data (needed for usage checks and custom instructions)
  const fullUserPromise = lightweightUser
    ? getCurrentUser()
    : Promise.resolve(null);

  // 3. Custom instructions (only if enabled and authenticated)
  const customInstructionsPromise =
    lightweightUser && (isCustomInstructionsEnabled ?? true)
      ? fullUserPromise.then((user) =>
          user ? getCachedCustomInstructionsByUserId(user.id) : null
        )
      : Promise.resolve(null);

  // 4. For authenticated users: start ALL operations in parallel
  let criticalChecksPromise: Promise<{
    canProceed: boolean;
    error?: unknown;
    isProUser: boolean;
    messageCount?: number;
    extremeSearchUsage?: number;
    subscriptionData?: {
      hasSubscription: boolean;
      subscription?: unknown;
    } | null;
    shouldBypassLimits?: boolean;
  }>;

  if (lightweightUser) {
    // Chat validation and creation (must be synchronous for DB consistency)
    const chatValidationPromise = getChatById({ id }).then(
      async (existingChat) => {
        // Validate ownership if chat exists
        if (existingChat && existingChat.userId !== lightweightUser.userId) {
          throw new ChatSDKError(
            "forbidden:chat",
            "This chat belongs to another user"
          );
        }

        // Create chat if it doesn't exist (MUST be sync - other operations depend on it)
        if (!existingChat) {
          await saveChat({
            id,
            userId: lightweightUser.userId,
            title: "New Chat",
            visibility: selectedVisibilityType ?? "private",
          });

          // Generate better title in background (non-critical)
          after(async () => {
            try {
              const title = await generateTitleFromUserMessage({
                message: messages.at(-1),
              });
              await updateChatTitleById({ chatId: id, title });
            } catch (_error) {
              /* non-fatal background task failure */
            }
          });
        }

        // Stream tracking in background (non-critical for functionality)
        after(async () => {
          try {
            await createStreamId({ streamId, chatId: id });
          } catch (_error) {
            /* non-fatal background task failure */
          }
        });

        return existingChat;
      }
    );

    // All authenticated users with subscription have full access (no rate limits)
    criticalChecksPromise = Promise.all([
      fullUserPromise,
      chatValidationPromise,
    ]).then(([user]) => ({
      canProceed: true,
      isProUser: true,
      messageCount: 0,
      extremeSearchUsage: 0,
      subscriptionData: user?.polarSubscription
        ? {
            hasSubscription: true,
            subscription: { ...user.polarSubscription, organizationId: null },
          }
        : { hasSubscription: false },
      shouldBypassLimits: true,
    }));
  } else {
    // Unauthenticated users: no checks needed
    criticalChecksPromise = Promise.resolve({
      canProceed: true,
      isProUser: false,
      messageCount: 0,
      extremeSearchUsage: 0,
      subscriptionData: null,
      shouldBypassLimits: false,
    });
  }

  let customInstructions: CustomInstructions | null = null;

  // Start streaming immediately while background operations continue
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Wait for critical checks and config in parallel (only what's needed to start streaming)
      const [
        criticalResult,
        { tools: activeTools, instructions },
        customInstructionsResult,
        user,
      ] = await Promise.all([
        criticalChecksPromise,
        configPromise,
        customInstructionsPromise,
        fullUserPromise,
      ]);

      if (!criticalResult.canProceed) {
        throw criticalResult.error;
      }

      customInstructions = customInstructionsResult;

      // Save user message BEFORE streaming (critical for conversation history)
      if (user) {
        await saveMessages({
          messages: [
            {
              chatId: id,
              id: messages.at(-1).id,
              role: "user",
              parts: messages.at(-1).parts,
              attachments: messages.at(-1).experimental_attachments ?? [],
              createdAt: new Date(),
              model,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              completionTime: 0,
            },
          ],
        });
      }

      const _setupTime = (Date.now() - requestStartTime) / MS_PER_SECOND;

      const streamStartTime = Date.now();

      const result = streamText({
        model: modelProvider.languageModel(model),
        messages: convertToModelMessages(messages),
        ...getModelParameters(model),
        stopWhen: stepCountIs(STOP_STEP_COUNT),
        onAbort: () => {
          /* no-op on abort */
        },
        maxRetries: MAX_RETRIES,
        activeTools: [...activeTools],
        experimental_transform: markdownJoinerTransform(),
        system:
          instructions +
          (customInstructions && (isCustomInstructionsEnabled ?? true)
            ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
            : "\n"),
        toolChoice: "auto",
        providerOptions: {
          gateway: {
            only: [...GATEWAY_ONLY_PROVIDERS],
            order: [...GATEWAY_PROVIDER_ORDER],
          },
          openai: {
            ...(model !== "qwen-coder"
              ? {
                  parallelToolCalls: false,
                }
              : {}),
            ...((model === "gpt5" ||
            model === "gpt5-mini" ||
            model === "o3" ||
            model === "gpt5-nano" ||
            model === "gpt5-codex"
              ? {
                  reasoningEffort:
                    model === "gpt5-nano" ||
                    model === "gpt5" ||
                    model === "gpt5-mini"
                      ? "minimal"
                      : "medium",
                  parallelToolCalls: false,
                  store: false,
                  reasoningSummary: "detailed",
                  textVerbosity:
                    model === "o3" || model === "gpt5-codex"
                      ? "medium"
                      : "high",
                }
              : {}) satisfies OpenAIResponsesProviderOptions),
          },

          anthropic: {
            ...(model === "claude-4-5-sonnet-think"
              ? {
                  sendReasoning: true,
                  thinking: {
                    type: "enabled",
                    budgetTokens: BUDGET_TOKENS,
                  },
                }
              : {}),
            disableParallelToolUse: true,
          } satisfies AnthropicProviderOptions,
        },
        prepareStep: ({ steps }) => {
          const lastStep = steps.at(-1);
          if (!lastStep) {
            return;
          }

          // If tools were called and results are available, disable further tool calls
          if (
            lastStep.toolCalls.length > 0 &&
            lastStep.toolResults.length > 0
          ) {
            return {
              toolChoice: "none",
            };
          }
        },
        tools: (() => {
          const baseTools = {
            web_search: webSearchTool(dataStream, searchProvider),
            academic_search: academicSearchTool,
            youtube_search: youtubeSearchTool,
            reddit_search: redditSearchTool,
            retrieve: retrieveTool,

            text_translate: textTranslateTool,
            datetime: datetimeTool,
            extreme_search: extremeSearchTool(dataStream),
            greeting: greetingTool(timezone),
            keyword_research: keywordResearchTool,
            serp_checker: serpCheckerTool,
            screenshot_capture: screenshotTool,
          };

          if (!user) {
            return baseTools;
          }

          const memoryTools = createMemoryTools(user.id);
          return {
            ...baseTools,
            search_memories: memoryTools.searchMemories as unknown,
            add_memory: memoryTools.addMemory as unknown,
            connectors_search: createConnectorsSearchTool(
              user.id,
              selectedConnectors
            ),
          } as unknown;
        })() as ToolSet,
        experimental_repairToolCall: async ({
          toolCall,
          tools,
          inputSchema,
          error,
        }) => {
          if (NoSuchToolError.isInstance(error)) {
            return null;
          }

          const tool = tools[toolCall.toolName as keyof typeof tools];

          if (!tool) {
            return null;
          }

          const { object: repairedArgs } = await generateObject({
            model: modelProvider.languageModel("gpt5-mini"),
            schema: tool.inputSchema,
            prompt: [
              `The model tried to call the tool "${toolCall.toolName}"` +
                " with the following arguments:",
              JSON.stringify(toolCall.input),
              "The tool accepts the following schema:",
              JSON.stringify(inputSchema(toolCall)),
              "Please fix the arguments.",
              "For the code interpreter tool do not use print statements.",
              "For the web search make multiple queries to get the best results but avoid using the same query multiple times and do not use te include and exclude parameters.",
              `Today's date is ${new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}`,
            ].join("\n"),
          });

          return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
        onChunk(event) {
          if (event.chunk.type === "tool-call") {
            /* tool-call chunks are handled by tool streams; no-op here */
          }
        },
        onStepFinish(event) {
          if (event.warnings) {
            /* warnings are collected and surfaced at the end of the run */
          }
        },
        onFinish: (event) => {
          const _processingTime =
            (Date.now() - requestStartTime) / MS_PER_SECOND;

          if (user?.id && event.finishReason === "stop") {
            // Track usage in background
            after(async () => {
              try {
                if (!shouldBypassRateLimits(model, user)) {
                  await incrementMessageUsage({ userId: user.id });
                }

                // Track extreme search usage if used
                if (group === "extreme") {
                  const extremeSearchUsed = event.steps?.some((step) =>
                    step.toolCalls?.some(
                      (toolCall) =>
                        toolCall && toolCall.toolName === "extreme_search"
                    )
                  );
                  if (extremeSearchUsed) {
                    await incrementExtremeSearchUsage({ userId: user.id });
                  }
                }
              } catch (_error) {
                /* non-fatal background task failure */
              }
            });
          }
        },
        onError(_event) {
          const _processingTime =
            (Date.now() - requestStartTime) / MS_PER_SECOND;
        },
      });

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (part.type === "finish") {
              const processingTime =
                (Date.now() - streamStartTime) / MS_PER_SECOND;
              return {
                model: model as string,
                completionTime: processingTime,
                createdAt: new Date().toISOString(),
                totalTokens: part.totalUsage?.totalTokens ?? null,
                inputTokens: part.totalUsage?.inputTokens ?? null,
                outputTokens: part.totalUsage?.outputTokens ?? null,
              };
            }
          },
        })
      );
    },
    onError(error) {
      if (error instanceof Error && error.message.includes("Rate Limit")) {
        return "Oops, you have reached the rate limit! Please try again later.";
      }
      return "Oops, an error occurred!";
    },
    onFinish: async ({ messages: finalMessages }) => {
      if (lightweightUser) {
        await saveMessages({
          messages: finalMessages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
            model,
            completionTime: message.metadata?.completionTime ?? 0,
            inputTokens: message.metadata?.inputTokens ?? 0,
            outputTokens: message.metadata?.outputTokens ?? 0,
            totalTokens: message.metadata?.totalTokens ?? 0,
          })),
        });
      }
    },
  });
  // const streamContext = getStreamContext();

  // if (streamContext) {
  //   return new Response(
  //     await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
  //   );
  // }
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
