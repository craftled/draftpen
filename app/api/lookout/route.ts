// /app/api/lookout/route.ts

import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  stepCountIs,
  streamText,
} from "ai";
import { CronExpressionParser } from "cron-parser";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import { v4 as uuidv4 } from "uuid";
import { modelProvider } from "@/ai/providers";
import { generateTitleFromUserMessage } from "@/app/actions";
import { db } from "@/lib/db";
import {
  createStreamId,
  getLookoutById,
  getUserById,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateLookout,
  updateLookoutLastRun,
  updateLookoutStatus,
} from "@/lib/db/queries";
import { type Lookout, subscription } from "@/lib/db/schema";
import { sendLookoutCompletionEmail } from "@/lib/email";

import type { ChatMessage } from "@/lib/types";

// Timing and formatting constants
const BACKOFF_BASE_MS = 500 as const;
const TRIM_LIMIT = 2000 as const;
const MS_PER_SECOND = 1000 as const;

// Limit retries for lookout fetch
const MAX_RETRIES_LOOKOUT = 3 as const;

// Helper function to check if a user is pro by userId
async function checkUserIsProById(userId: string): Promise<boolean> {
  try {
    // Check for active Polar subscription
    const polarSubscriptions = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId));

    // Check if any Polar subscription is active
    const activePolarSubscription = polarSubscriptions.find((sub) => {
      const now = new Date();
      const isActive =
        (sub.status === "active" || sub.status === "trialing") &&
        new Date(sub.currentPeriodEnd) > now;
      return isActive;
    });

    if (activePolarSubscription) {
      return true;
    }

    return false;
  } catch (_error) {
    return false; // Fail closed - don't allow access if we can't verify
  }
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
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
          /* missing REDIS_URL; skip Redis-backed resumable streams in this env */
        } else {
          /* unexpected error initializing resumable stream context */
        }
      } else {
        /* unknown error type initializing resumable stream context */
      }
    }
  }

  return globalStreamContext;
}

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  let runDuration = 0;
  let runError: string | undefined;

  try {
    const { lookoutId, prompt, userId } = await req.json();

    // Verify lookout exists and get details with retry logic
    let lookout: Lookout | null = null;
    let retryCount = 0;
    const maxRetries = MAX_RETRIES_LOOKOUT;

    while (!lookout && retryCount < maxRetries) {
      lookout = await getLookoutById({ id: lookoutId });
      if (!lookout) {
        retryCount += 1;
        if (retryCount < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryCount * BACKOFF_BASE_MS)
          ); // Exponential backoff
        }
      }
    }

    if (!lookout) {
      return new Response("Lookout not found", { status: 404 });
    }

    // Get user details
    const userResult = await getUserById(userId);
    if (!userResult) {
      return new Response("User not found", { status: 404 });
    }

    // Check if user is pro (lookouts are a pro feature)
    const isUserPro = await checkUserIsProById(userId);
    if (!isUserPro) {
      return new Response("Lookouts require a Pro subscription", {
        status: 403,
      });
    }

    // Generate a new chat ID for this scheduled search
    const chatId = uuidv4();
    const streamId = `stream-${uuidv4()}`;

    // Create the chat
    await saveChat({
      id: chatId,
      userId: userResult.id,
      title: `Scheduled: ${lookout.title}`,
      visibility: "private",
    });

    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: "user" as const,
      content: prompt,
      parts: [{ type: "text" as const, text: prompt }],
      experimental_attachments: [],
    };

    // Save user message and create stream ID
    await Promise.all([
      saveMessages({
        messages: [
          {
            chatId,
            id: userMessage.id,
            role: "user",
            parts: userMessage.parts,
            attachments: [],
            createdAt: new Date(),
            model: "gpt5-mini",
            completionTime: null,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
          },
        ],
      }),
      createStreamId({ streamId, chatId }),
    ]);

    // Set lookout status to running
    await updateLookoutStatus({
      id: lookoutId,
      status: "running",
    });

    // Create data stream with execute function
    const stream = createUIMessageStream<ChatMessage>({
      execute: ({ writer: dataStream }) => {
        const streamStartTime = Date.now();

        // Start streaming
        const result = streamText({
          model: modelProvider.languageModel("gpt5-mini"),
          messages: convertToModelMessages([userMessage]),
          stopWhen: stepCountIs(2),
          maxRetries: 10,
          activeTools: [],
          system: `# Scira AI Scheduled Research Assistant

You are an advanced research assistant focused on deep analysis and comprehensive understanding with focus to be backed by citations in a 3-page research paper format.

**Today's Date:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit", weekday: "short" })}

---

## 🚨 CRITICAL OPERATION RULES

### Immediate Tool Execution
- ⚠️ **MANDATORY**: Run extreme_search tool INSTANTLY when processing ANY scheduled query - NO EXCEPTIONS
- ⚠️ **NO PRE-ANALYSIS**: Do NOT write any text before running the tool
- ⚠️ **ONE TOOL ONLY**: Run the tool once and only once per scheduled search
- ⚠️ **NO CLARIFICATION**: Never ask for clarification - make best interpretation and run immediately
- ⚠️ **DIRECT ANSWERS**: Go straight to answering after running the tool
- ⚠️ **NO PREFACES**: Never begin with "I'm assuming..." or "Based on your query..."

### Response Format Requirements
- ⚠️ **MANDATORY**: Always respond with markdown format
- ⚠️ **CITATIONS REQUIRED**: EVERY factual claim, statistic, data point, or assertion MUST have a citation
- ⚠️ **ZERO TOLERANCE**: No unsupported claims allowed - if no citation available, don't make the claim
- ⚠️ **IMMEDIATE CITATIONS**: Citations must appear immediately after each sentence with factual content
- ⚠️ **STRICT MARKDOWN**: All responses must use proper markdown formatting throughout

---

## 🛠️ TOOL GUIDELINES

### Extreme Search Tool
- **Purpose**: Multi-step research planning with parallel web and academic searches
- **Capabilities**:
  - Autonomous research planning
    - Parallel web and academic searches
    - Deep analysis of findings
    - Cross-referencing and validation
- ⚠️ **MANDATORY**: Run the tool FIRST before any response
- ⚠️ **ONE TIME ONLY**: Run the tool once and only once, then write the response
- ⚠️ **NO PRE-ANALYSIS**: Do NOT write any analysis before running the tool

---

## 📝 RESPONSE GUIDELINES

### Content Requirements
- **Format**: Always use markdown format
- **Detail**: Extremely comprehensive, well-structured responses in 3-page research paper format
- **Structure**: Use markdown formatting with headers, tables, and proper hierarchy
- **Focus**: Address the question directly with deep analysis and synthesis
- **Language**: Maintain the language of the user's message and do not change it

### Response Format - MANDATORY STRUCTURE
- ⚠️ **CRITICAL**: ALWAYS start your response with "## Key Points" heading followed by a bulleted list of the main findings
  - After the key points, proceed with detailed sections and finally a conclusion
  - Keep it super detailed and long, do not skip any important details
  - It is very important to have citations for all facts provided
  - Be very specific, detailed and even technical in the response
  - Include equations and mathematical expressions in the response if needed
  - Present findings in a logical flow
  - Support claims with multiple sources
  - Each section should have 2-4 detailed paragraphs
  - CITATIONS SHOULD BE ON EVERYTHING YOU SAY
  - Include analysis of reliability and limitations

### Citation Rules - STRICT ENFORCEMENT
- ⚠️ **MANDATORY**: EVERY SINGLE factual claim, statistic, data point, or assertion MUST have a citation
- ⚠️ **IMMEDIATE PLACEMENT**: Citations go immediately after the sentence containing the information
- ⚠️ **NO EXCEPTIONS**: Even obvious facts need citations
- ⚠️ **ZERO TOLERANCE FOR END CITATIONS**: NEVER put citations at the end of responses, paragraphs, or sections
- ⚠️ **SENTENCE-LEVEL INTEGRATION**: Each sentence with factual content must have its own citation immediately after
- ⚠️ **GROUPED CITATIONS ALLOWED**: Multiple citations can be grouped together when supporting the same statement
- ⚠️ **NATURAL INTEGRATION**: Don't say "according to [Source]" or "as stated in [Source]"
- ⚠️ **FORMAT**: [Source Title](URL) with descriptive, specific source titles
- ⚠️ **MULTIPLE SOURCES**: For claims supported by multiple sources, use format: [Source 1](URL1) [Source 2](URL2)
- ⚠️ **YEAR REQUIREMENT**: Always include year when citing statistics, data, or time-sensitive information
- ⚠️ **NO UNSUPPORTED CLAIMS**: If you cannot find a citation, do not make the claim
- ⚠️ **READING FLOW**: Citations must not interrupt the natural flow of reading

### UX and Reading Flow Requirements
- ⚠️ **IMMEDIATE CONTEXT**: Citations must appear right after the statement they support
- ⚠️ **NO SCANNING REQUIRED**: Users should never have to scan to the end to find citations
- ⚠️ **SEAMLESS INTEGRATION**: Citations should feel natural and not break the reading experience
- ⚠️ **SENTENCE COMPLETION**: Each sentence should be complete with its citation before moving to the next
- ⚠️ **NO CITATION HUNTING**: Users should never have to hunt for which citation supports which claim

**STRICT Citation Examples:**

**✅ CORRECT - Immediate Citation Placement:**
The global AI market is projected to reach $1.8 trillion by 2030 [AI Market Forecast 2024](https://example.com/ai-market), representing significant growth in the technology sector [Tech Industry Analysis](https://example.com/tech-growth). Recent advances in transformer architectures have enabled models to achieve 95% accuracy on complex reasoning tasks [Deep Learning Advances 2024](https://example.com/dl-advances).

**✅ CORRECT - Grouped Citations (ALLOWED):**
Climate change is accelerating global temperature rise by 0.2°C per decade [IPCC Report 2024](https://example.com/ipcc) [NASA Climate Data](https://example.com/nasa-climate) [NOAA Temperature Analysis](https://example.com/noaa-temp), with significant implications for coastal regions [Sea Level Rise Study](https://example.com/sea-level).

**❌ WRONG - Random Symbols to enclose citations (FORBIDDEN):**
is【Granite】(https://example.com/granite)

**❌ WRONG - End Citations (FORBIDDEN):**
AI is transforming industries. Quantum computing shows promise. (No citations)

**FORBIDDEN Citation Practices - ZERO TOLERANCE:**
- ❌ **NO END CITATIONS**: NEVER put citations at the end of responses, paragraphs, or sections - creates terrible UX
- ❌ **NO END GROUPED CITATIONS**: Never group citations at end of paragraphs or responses - breaks reading flow
- ❌ **NO SECTIONS**: Absolutely NO sections named "Additional Resources", "Further Reading", "Useful Links", "References", "Citations", "Sources"
- ❌ **NO LINK LISTS**: No bullet points, numbered lists, or grouped links under any heading
- ❌ **NO GENERIC LINKS**: No "You can learn more here [link]" or "See this article [link]"
- ❌ **NO HR TAGS**: Never use horizontal rules in markdown
- ❌ **NO UNSUPPORTED STATEMENTS**: Never make claims without immediate citations
- ❌ **NO VAGUE SOURCES**: Never use generic titles like "Source 1", "Article", "Report"

### Markdown Formatting - STRICT ENFORCEMENT

#### Required Structure Elements
- ⚠️ **HEADERS**: Use proper header hierarchy (## ### #### ##### ######) - NEVER use # (h1)
- ⚠️ **LISTS**: Use bullet points (-) or numbered lists (1.) for all lists
- ⚠️ **TABLES**: Use proper markdown table syntax with | separators
- ⚠️ **CODE BLOCKS**: Use \`\`\`language for code blocks, \`code\` for inline code
- ⚠️ **BOLD/ITALIC**: Use **bold** and *italic* for emphasis
- ⚠️ **LINKS**: Use [text](URL) format for all links

#### Mandatory Formatting Rules
- ⚠️ **CONSISTENT HEADERS**: Use ## for main sections, ### for subsections
- ⚠️ **PROPER LISTS**: Always use - for bullet points, 1. for numbered lists
- ⚠️ **TABLE STRUCTURE**: Use | Header | Header | format with alignment
- ⚠️ **LINK FORMAT**: [Descriptive Text](URL) - never bare URLs
- ⚠️ **EMPHASIS**: Use **bold** for important terms, *italic* for emphasis

#### Forbidden Formatting Practices
- ❌ **NO PLAIN TEXT**: Never use plain text for lists or structure
- ❌ **NO BARE URLs**: Never include URLs without [text](URL) format
- ❌ **NO INCONSISTENT HEADERS**: Don't mix header levels randomly
- ❌ **NO UNFORMATTED TABLES**: Never use plain text for tabular data
- ❌ **NO MIXED LIST STYLES**: Don't mix bullet points and numbers in same list
- ❌ **NO H1 HEADERS**: Never use # (h1) - start with ## (h2)

### Mathematical Formatting
- ⚠️ **INLINE**: Use \`$equation$\` for inline math
- ⚠️ **BLOCK**: Use \`$$equation$$\` for block math
- ⚠️ **CURRENCY**: Use "USD", "EUR" instead of $ symbol
- ⚠️ **SPACING**: No space between $ and equation
- ⚠️ **BLOCK SPACING**: Blank lines before and after block equations
- ⚠️ **NO Slashes**: Never use slashes with $ symbol, since it breaks the formatting!!!

**Correct Examples:**
- Inline: $E = mc^2$ for energy-mass equivalence
- Block:

$$
F = G \frac{m_1 m_2}{r^2}
$$

- Currency: 100 USD (not $100)

### Research Paper Structure
- **Introduction** (2-3 paragraphs): Context, significance, research objectives
  - ⚠️ MANDATORY: Start with "## Key Points" heading followed by bulleted list of main findings
- **Main Sections** (3-5 sections): Each with 2-4 detailed paragraphs
  - Use ## for section headers, ### for subsections
  - Each paragraph should be 4-6 sentences minimum
  - Every sentence with facts must have inline citations
- **Analysis and Synthesis**: Cross-reference findings, identify patterns
- **Limitations**: Discuss reliability and constraints of sources
- **Conclusion** (2-3 paragraphs): Summary of key findings and implications

---

## 🚫 PROHIBITED ACTIONS

- ❌ **Multiple Tool Calls**: Don't run extreme_search multiple times
- ❌ **Pre-Tool Thoughts**: Never write analysis before running the tool
- ❌ **Response Prefaces**: Don't start with "According to my search" or "Based on the results"
- ❌ **UNSUPPORTED CLAIMS**: Never make any factual statement without immediate citation
- ❌ **VAGUE SOURCES**: Never use generic source titles like "Source", "Article", "Report"
- ❌ **END CITATIONS**: Never put citations at the end of responses - creates terrible UX
- ❌ **END GROUPED CITATIONS**: Never group citations at end of paragraphs or responses - breaks reading flow
- ❌ **CITATION SECTIONS**: Never create sections for links, references, or additional resources
- ❌ **CITATION HUNTING**: Never force users to hunt for which citation supports which claim
- ❌ **PLAIN TEXT FORMATTING**: Never use plain text for lists, tables, or structure
- ❌ **BARE URLs**: Never include URLs without proper [text](URL) markdown format
- ❌ **INCONSISTENT HEADERS**: Never mix header levels or use inconsistent formatting
- ❌ **UNFORMATTED CODE**: Never show code without proper \`\`\`language blocks
- ❌ **PLAIN TABLES**: Never use plain text for tabular data - use markdown tables
- ❌ **SHORT RESPONSES**: Never write brief responses - aim for 3-page research paper format
- ❌ **BULLET-POINT RESPONSES**: Use paragraphs for main content, bullets only for Key Points section`,
          toolChoice: "auto",
          tools: {},
          onChunk(event) {
            if (event.chunk.type === "tool-call") {
              /* no-op: tool invocations are handled by tool-specific streams */
            }
          },
          onStepFinish(event) {
            if (event.warnings) {
              /* no-op: warnings are aggregated in final report */
            }
          },
          onFinish: async (event) => {
            if (event.finishReason === "stop") {
              try {
                // Generate title for the chat
                const title = await generateTitleFromUserMessage({
                  message: userMessage,
                });

                // Update the chat with the generated title
                await updateChatTitleById({
                  chatId,
                  title: `Scheduled: ${title}`,
                });

                // Calculate run duration
                runDuration = Date.now() - requestStartTime;

                // Count searches performed (look for extreme_search tool calls)
                const searchesPerformed =
                  event.steps?.reduce(
                    (total, step) =>
                      total +
                      (step.toolCalls?.filter(
                        (call) => call.toolName === "extreme_search"
                      ).length || 0),
                    0
                  ) || 0;

                // Update lookout with last run info including metrics
                await updateLookoutLastRun({
                  id: lookoutId,
                  lastRunAt: new Date(),
                  lastRunChatId: chatId,
                  runStatus: "success",
                  duration: runDuration,
                  tokensUsed: event.usage?.totalTokens,
                  searchesPerformed,
                });

                // Calculate next run time for recurring lookouts
                if (lookout.frequency !== "once" && lookout.cronSchedule) {
                  try {
                    const options = {
                      currentDate: new Date(),
                      tz: lookout.timezone,
                    };

                    // Strip CRON_TZ= prefix if present
                    const cleanCronSchedule = lookout.cronSchedule.startsWith(
                      "CRON_TZ="
                    )
                      ? lookout.cronSchedule.split(" ").slice(1).join(" ")
                      : lookout.cronSchedule;

                    const interval = CronExpressionParser.parse(
                      cleanCronSchedule,
                      options
                    );
                    const nextRunAt = interval.next().toDate();

                    await updateLookout({
                      id: lookoutId,
                      nextRunAt,
                    });
                  } catch (_error) {
                    /* scheduling update failed; will recompute next run on next cycle */
                  }
                } else if (lookout.frequency === "once") {
                  // Mark one-time lookouts as paused after running
                  await updateLookoutStatus({
                    id: lookoutId,
                    status: "paused",
                  });
                }

                // Send completion email to user
                if (userResult.email) {
                  try {
                    // Extract assistant response - use event.text which contains the full response
                    let assistantResponseText = event.text || "";

                    // If event.text is empty, try extracting from messages
                    if (!assistantResponseText.trim()) {
                      const assistantMessages = event.response.messages.filter(
                        (msg: { role?: string; content?: unknown }) =>
                          msg.role === "assistant"
                      );

                      for (const msg of assistantMessages) {
                        if (typeof msg.content === "string") {
                          assistantResponseText += `${msg.content}\n`;
                        } else if (Array.isArray(msg.content)) {
                          const textContent = msg.content
                            .filter(
                              (part: { type?: string }) => part.type === "text"
                            )
                            .map((part) => {
                              const maybeText = (part as { text?: unknown })
                                .text;
                              return typeof maybeText === "string"
                                ? maybeText
                                : "";
                            })
                            .join("\n");
                          assistantResponseText += `${textContent}\n`;
                        }
                      }
                    }

                    const trimmedResponse =
                      assistantResponseText.trim() || "No response available.";
                    const finalResponse =
                      trimmedResponse.length > TRIM_LIMIT
                        ? `${trimmedResponse.substring(0, TRIM_LIMIT)}...`
                        : trimmedResponse;

                    await sendLookoutCompletionEmail({
                      to: userResult.email,
                      chatTitle: title,
                      assistantResponse: finalResponse,
                      chatId,
                    });
                  } catch (_emailError) {
                    /* sending completion email failed; continue without failing job */
                  }
                }

                // Set lookout status back to active after successful completion
                await updateLookoutStatus({
                  id: lookoutId,
                  status: "active",
                });
              } catch (_error) {
                /* final status update failed; ignore to avoid masking success */
              }
            }

            // Calculate and log overall request processing time
          },
          onError: async (event) => {
            // Calculate run duration and capture error
            runDuration = Date.now() - requestStartTime;
            runError = (event.error as string) || "Unknown error occurred";

            // Update lookout with failed run info
            try {
              await updateLookoutLastRun({
                id: lookoutId,
                lastRunAt: new Date(),
                lastRunChatId: chatId,
                runStatus: "error",
                error: runError,
                duration: runDuration,
              });
            } catch (_updateError) {
              /* failed to record error status; non-fatal */
            }

            // Set lookout status back to active on error
            try {
              await updateLookoutStatus({
                id: lookoutId,
                status: "active",
              });
            } catch (_statusError) {
              /* final status update after error failed; ignoring to avoid double-failing */
            }
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
                  model: "gpt5-mini",
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
      onError(_error) {
        return "Oops, an error occurred in scheduled search!";
      },
      onFinish: async ({ messages }) => {
        if (userId) {
          // Validate user exists and is Pro user
          const user = await getUserById(userId);
          const isProUser = user ? await checkUserIsProById(userId) : false;

          if (user && isProUser) {
            await saveMessages({
              messages: messages.map((message) => ({
                id: message.id,
                role: message.role,
                parts: message.parts,
                createdAt: new Date(),
                attachments: [],
                chatId,
                model: "gpt5-mini",
                completionTime: message.metadata?.completionTime ?? 0,
                inputTokens: message.metadata?.inputTokens ?? 0,
                outputTokens: message.metadata?.outputTokens ?? 0,
                totalTokens: message.metadata?.totalTokens ?? 0,
              })),
            });
          } else {
            /* user not found or not Pro; skip message persistence */
          }
        }
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream())
        )
      );
    }
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (_error) {
    return new Response("Internal server error", { status: 500 });
  }
}
