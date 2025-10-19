import type { UseChatHelpers } from "@ai-sdk/react";
import { Wave } from "@foobar404/wave";
import { Copy01Icon, CpuIcon, RepeatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MemoryIcon,
  ClockIcon as PhosphorClockIcon,
  RedditLogoIcon,
  SigmaIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import {
  type DataUIPart,
  isToolUIPart,
  type ReasoningUIPart,
  type UIToolInvocation,
} from "ai";
import isEqual from "fast-deep-equal";
import {
  ArrowUpRight,
  Book,
  Clock,
  Code,
  Globe,
  Info,
  Loader2,
  Pause,
  Play as PlayIcon,
  Server,
  TextIcon,
  User2,
  YoutubeIcon,
} from "lucide-react";
import Image from "next/image";
// Tool-specific components (lazy loaded)
import type React from "react";
import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { getModelConfig } from "@/ai/providers";
import { deleteTrailingMessages, generateSpeech } from "@/app/actions";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ChatTextHighlighter } from "@/components/chat-text-highlighter";
import { ReasoningPartView } from "@/components/reasoning-part";
import { SciraLogoHeader } from "@/components/scira-logo-header";
import { ShareButton } from "@/components/share";
import { SearchLoadingState } from "@/components/tool-invocation-list-view";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ChatMessage,
  CodeContextToolInput,
  CodeContextToolOutput,
  CustomUIDataTypes,
  DataExtremeSearchPart,
  DataQueryCompletionPart,
} from "@/lib/types";
import type { ComprehensiveUserData } from "@/lib/user-data-server";
import { cn } from "@/lib/utils";

// Lazy load tool components
const InteractiveChart = lazy(() => import("@/components/interactive-charts"));
const MultiSearch = lazy(() => import("@/components/multi-search"));
const AcademicPapersCard = lazy(() => import("@/components/academic-papers"));
const RedditSearch = lazy(() => import("@/components/reddit-search"));
const XSearch = lazy(() => import("@/components/x-search"));
const ExtremeSearch = lazy(() =>
  import("@/components/extreme-search").then((module) => ({
    default: module.ExtremeSearch,
  }))
);
const CurrencyConverter = lazy(() =>
  import("@/components/currency_conv").then((module) => ({
    default: module.CurrencyConverter,
  }))
);

const SerpResults = lazy(() =>
  import("@/components/serp-results").then((module) => ({
    default: module.default,
  }))
);

const YouTubeSearchResults = lazy(() =>
  import("@/components/youtube-search-results").then((module) => ({
    default: module.YouTubeSearchResults,
  }))
);
const ConnectorsSearchResults = lazy(() =>
  import("@/components/connectors-search-results").then((module) => ({
    default: module.ConnectorsSearchResults,
  }))
);
const CodeInterpreterView = lazy(() =>
  import("@/components/tool-invocation-list-view").then((module) => ({
    default: module.CodeInterpreterView,
  }))
);
// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="mt-2 flex space-x-2">
    <div
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
      style={{ animationDelay: "0ms" }}
    />
    <div
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
      style={{ animationDelay: "150ms" }}
    />
    <div
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
      style={{ animationDelay: "300ms" }}
    />
  </div>
);

interface MessagePartRendererProps {
  part: ChatMessage["parts"][number];
  messageIndex: number;
  partIndex: number;
  parts: ChatMessage["parts"][number][];
  message: ChatMessage;
  status: string;
  hasActiveToolInvocations: boolean;
  reasoningVisibilityMap: Record<string, boolean>;
  reasoningFullscreenMap: Record<string, boolean>;
  setReasoningVisibilityMap: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setReasoningFullscreenMap: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  messages: ChatMessage[];
  user?: ComprehensiveUserData;
  isOwner?: boolean;
  selectedVisibilityType?: "public" | "private";
  chatId?: string;
  onVisibilityChange?: (visibility: "public" | "private") => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  setSuggestedQuestions: (questions: string[]) => void;
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  onHighlight?: (text: string) => void;
  annotations?: DataUIPart<CustomUIDataTypes>[];
}

export const MessagePartRenderer = memo<MessagePartRendererProps>(
  ({
    part,
    messageIndex,
    partIndex,
    parts,
    message,
    status,
    hasActiveToolInvocations,
    reasoningVisibilityMap,
    reasoningFullscreenMap,
    setReasoningVisibilityMap,
    setReasoningFullscreenMap,
    messages,
    user,
    isOwner,
    selectedVisibilityType,
    chatId,
    onVisibilityChange,
    setMessages,
    setSuggestedQuestions,
    regenerate,
    onHighlight,
    annotations,
  }) => {
    // Handle text parts
    if (part.type === "text") {
      // Check if there are any reasoning parts in the message
      const hasReasoningParts = parts.some((p) => p.type === "reasoning");

      // For empty text parts in a streaming message, show loading animation only if no tool invocations and no reasoning parts are present
      if (
        (!part.text || part.text.trim() === "") &&
        status === "streaming" &&
        !hasActiveToolInvocations &&
        !hasReasoningParts
      ) {
        return (
          <div
            className="!m-0 !p-0 flex min-h-[calc(100vh-18rem)] flex-col"
            key={`${messageIndex}-${partIndex}-loading`}
          >
            <div className="mt-2 ml-8 flex space-x-2">
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground dark:bg-muted-foreground"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        );
      }

      // Skip empty text parts entirely for non-streaming states, but allow them during streaming with active tool invocations
      if (!part.text || part.text.trim() === "") {
        // Only skip if we're not streaming or if there are no active tool invocations
        if (status !== "streaming" || !hasActiveToolInvocations) {
          return null;
        }
        // If we're streaming with active tool invocations, don't render anything for empty text but don't block other parts
        return <div key={`${messageIndex}-${partIndex}-empty`} />;
      }

      // Pre-compute metadata presentation values
      const meta = message?.metadata;
      const modelConfig = meta?.model ? getModelConfig(meta.model) : null;
      const modelLabel = modelConfig?.label ?? meta?.model ?? null;
      const tokenTotal =
        (meta?.totalTokens ??
          (meta?.inputTokens ?? 0) + (meta?.outputTokens ?? 0)) ||
        null;
      const inputCount = meta?.inputTokens ?? null;
      const outputCount = meta?.outputTokens ?? null;

      // Detect text sandwiched between step-start and tool-invocation
      const prevPart = parts[partIndex - 1];
      const nextPart = parts[partIndex + 1];
      if (prevPart?.type === "step-start" && nextPart?.type.includes("tool-")) {
        return null;
      }

      return (
        <div className="mt-2" key={`${messageIndex}-${partIndex}-text`}>
          <div>
            <ChatTextHighlighter
              onHighlight={onHighlight}
              removeHighlightOnClick={true}
            >
              <Response className="prose dark:prose-invert max-w-none">
                {part.text}
              </Response>
            </ChatTextHighlighter>
          </div>

          {/* Add compact buttons below the text with tooltips */}
          {status === "ready" && (
            <div className="!-ml-1 mt-2.5 mb-5 flex flex-row flex-wrap items-center justify-between gap-2">
              {/* Left side - Action buttons container */}
              <div className="flex flex-wrap items-center gap-1">
                {/* Only show reload for owners OR unauthenticated users on private chats */}
                {((user && isOwner) ||
                  (!user && selectedVisibilityType === "private")) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="size-8 rounded-full p-0"
                          onClick={async () => {
                            try {
                              const lastUserMessage = messages.findLast(
                                (m) => m.role === "user"
                              );
                              if (!lastUserMessage) return;

                              // Step 1: Delete trailing messages if user is authenticated
                              if (user && lastUserMessage.id) {
                                await deleteTrailingMessages({
                                  id: lastUserMessage.id,
                                });
                              }

                              // Step 2: Update local state to remove assistant messages
                              const newMessages = [];
                              // Find the index of the last user message
                              for (let i = 0; i < messages.length; i++) {
                                newMessages.push(messages[i]);
                                if (messages[i].id === lastUserMessage.id) {
                                  break;
                                }
                              }

                              // Step 3: Update UI state
                              setMessages(newMessages);
                              setSuggestedQuestions([]);

                              // Step 4: Reload
                              await regenerate();
                            } catch (error) {
                              console.error("Error in reload:", error);
                            }
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <HugeiconsIcon
                            color="currentColor"
                            icon={RepeatIcon}
                            size={32}
                            strokeWidth={2}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rewrite</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Share button using unified component */}
                {onVisibilityChange && (
                  <ShareButton
                    chatId={chatId || null}
                    className="rounded-full"
                    isOwner={isOwner}
                    onVisibilityChange={async (visibility) => {
                      await Promise.resolve(onVisibilityChange(visibility));
                    }}
                    selectedVisibilityType={selectedVisibilityType || "private"}
                    size="sm"
                    user={user}
                    variant="icon"
                  />
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="size-8 rounded-full p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(part.text);
                          toast.success("Copied to clipboard");
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          color="currentColor"
                          icon={Copy01Icon}
                          size={32}
                          strokeWidth={2}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Right side - Message metadata stats popover */}
              {meta && (
                <div className="flex items-center">
                  <HoverCard closeDelay={100} openDelay={100}>
                    <HoverCardTrigger asChild>
                      <Button
                        className="size-8 touch-manipulation rounded-full p-0"
                        onTouchStart={() => {}}
                        size="icon"
                        variant="ghost" // Enable touch events
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      align="end"
                      alignOffset={-8}
                      avoidCollisions={true}
                      className="w-72 max-w-[calc(100vw-2rem)]"
                      collisionPadding={16}
                      side="top"
                      sideOffset={8}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          <h4 className="font-semibold text-sm">
                            Response Info
                          </h4>
                        </div>

                        {modelLabel && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">
                              Model
                            </span>
                            <div className="flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-primary-foreground text-xs">
                              <HugeiconsIcon icon={CpuIcon} size={12} />
                              {modelLabel}
                            </div>
                          </div>
                        )}

                        {typeof meta.completionTime === "number" && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">
                              Generation Time
                            </span>
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {meta.completionTime.toFixed(1)}s
                            </div>
                          </div>
                        )}

                        {(inputCount != null || outputCount != null) && (
                          <div className="space-y-2">
                            <span className="text-muted-foreground text-sm">
                              Token Usage
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {inputCount != null && (
                                <div className="flex items-center justify-between rounded-lg bg-muted px-2 py-1">
                                  <span className="flex items-center gap-1">
                                    <ArrowLeftIcon
                                      className="h-3 w-3"
                                      weight="regular"
                                    />
                                    Input
                                  </span>
                                  <span className="font-medium">
                                    {inputCount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {outputCount != null && (
                                <div className="flex items-center justify-between rounded-lg bg-muted px-2 py-1">
                                  <span className="flex items-center gap-1">
                                    <ArrowRightIcon
                                      className="h-3 w-3"
                                      weight="regular"
                                    />
                                    Output
                                  </span>
                                  <span className="font-medium">
                                    {outputCount.toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                            {tokenTotal != null && (
                              <div className="flex items-center justify-between rounded-lg bg-accent px-2 py-1 text-xs">
                                <span className="flex items-center gap-1 font-medium">
                                  <SigmaIcon
                                    className="h-3 w-3"
                                    weight="regular"
                                  />
                                  Total
                                </span>
                                <span className="font-semibold">
                                  {tokenTotal.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle reasoning parts
    if (part.type === "reasoning") {
      // If previous part is also reasoning, skip rendering to avoid duplicate sections
      const prevPart = parts[partIndex - 1];
      if (prevPart && prevPart.type === "reasoning") {
        return null;
      }

      // Merge consecutive reasoning parts into a single block
      let nextIndex = partIndex;
      const mergedTexts: string[] = [];
      while (
        nextIndex < parts.length &&
        parts[nextIndex]?.type === "reasoning"
      ) {
        const r = parts[nextIndex] as unknown as ReasoningUIPart;
        if (typeof r.text === "string" && r.text.length > 0) {
          mergedTexts.push(r.text);
        }
        nextIndex += 1;
      }

      const mergedPart: ReasoningUIPart = {
        ...(part as ReasoningUIPart),
        text: mergedTexts.join("\n\n"),
      };

      const sectionKey = `${messageIndex}-${partIndex}`;
      const hasParallelToolInvocation = parts.some(
        (p: ChatMessage["parts"][number]) => p.type.startsWith("tool-")
      );
      const isComplete = parts.some(
        (p: ChatMessage["parts"][number], i: number) =>
          i > partIndex && (p.type === "text" || p.type.startsWith("tool-"))
      );
      const parallelTool = hasParallelToolInvocation
        ? (parts
            .find((p: ChatMessage["parts"][number]) => p.type.includes("tool-"))
            ?.type.split("-")[1] ?? null)
        : null;

      const isExpanded = reasoningVisibilityMap[sectionKey] ?? !isComplete;
      const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

      const setIsExpanded = (v: boolean) =>
        setReasoningVisibilityMap((prev) => ({ ...prev, [sectionKey]: v }));
      const setIsFullscreen = (v: boolean) =>
        setReasoningFullscreenMap((prev) => ({ ...prev, [sectionKey]: v }));

      // Back to original ReasoningPartView - Elements had issues
      return (
        <ReasoningPartView
          duration={null}
          isComplete={isComplete}
          isExpanded={isExpanded}
          isFullscreen={isFullscreen}
          key={sectionKey}
          parallelTool={parallelTool}
          part={mergedPart}
          sectionKey={sectionKey}
          setIsExpanded={setIsExpanded}
          setIsFullscreen={setIsFullscreen}
        />
      );
    }

    // Handle step-start parts
    if (part.type === "step-start") {
      const firstStepStartIndex = parts.findIndex(
        (p) => p.type === "step-start"
      );
      if (partIndex === firstStepStartIndex) {
        return (
          <div
            className="!m-0 !p-0"
            key={`${messageIndex}-${partIndex}-step-start-logo`}
          >
            <SciraLogoHeader />
          </div>
        );
      }
      return <div key={`${messageIndex}-${partIndex}-step-start`} />;
    }

    // Handle tool parts with new granular states system
    if (isToolUIPart(part)) {
      // Check if this part has the new state system
      if ("state" in part && part.state) {
        switch ((part as any).type) {
          case "tool-web_search":
            switch (part.state) {
              case "input-streaming":
              case "input-available":
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <MultiSearch
                      annotations={annotations as DataQueryCompletionPart[]}
                      args={(part.input as any) ?? {}}
                      result={part.output || null}
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-datetime":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing time request...
                  </div>
                );
              case "input-available":
                return (
                  <div
                    className="flex items-center gap-3 px-2 py-4"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <div className="relative h-5 w-5">
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-500 dark:border-neutral-700 dark:border-t-blue-400" />
                    </div>
                    <span className="font-medium text-neutral-700 text-sm dark:text-neutral-300">
                      Fetching current time...
                    </span>
                  </div>
                );
              case "output-available": {
                // Live Clock component that updates every second
                const LiveClock = memo(() => {
                  const [time, setTime] = useState(() => new Date());
                  const timerRef = useRef<NodeJS.Timeout | null>(null);

                  useEffect(() => {
                    // Sync with the nearest second
                    const now = new Date();
                    const delay = 1000 - now.getMilliseconds();

                    // Initial sync
                    const timeout = setTimeout(() => {
                      setTime(new Date());

                      // Then start the interval
                      timerRef.current = setInterval(() => {
                        setTime(new Date());
                      }, 1000);
                    }, delay);

                    return () => {
                      clearTimeout(timeout);
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                      }
                    };
                  }, []);

                  // Format the time according to the specified timezone
                  const timezone =
                    part.output.timezone ||
                    new Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const formatter = new Intl.DateTimeFormat("en-US", {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                    hour12: true,
                    timeZone: timezone,
                  });

                  const formattedParts = formatter.formatToParts(time);
                  const timeParts = {
                    hour:
                      formattedParts.find((part) => part.type === "hour")
                        ?.value || "12",
                    minute:
                      formattedParts.find((part) => part.type === "minute")
                        ?.value || "00",
                    second:
                      formattedParts.find((part) => part.type === "second")
                        ?.value || "00",
                    dayPeriod:
                      formattedParts.find((part) => part.type === "dayPeriod")
                        ?.value || "AM",
                  };

                  return (
                    <div className="mt-3">
                      <div className="flex items-baseline">
                        <div className="font-light text-4xl text-neutral-900 tabular-nums tracking-tighter sm:text-5xl md:text-6xl dark:text-white">
                          {timeParts.hour.padStart(2, "0")}
                        </div>
                        <div className="mx-1 font-light text-4xl text-neutral-400 sm:mx-2 sm:text-5xl md:text-6xl dark:text-neutral-500">
                          :
                        </div>
                        <div className="font-light text-4xl text-neutral-900 tabular-nums tracking-tighter sm:text-5xl md:text-6xl dark:text-white">
                          {timeParts.minute.padStart(2, "0")}
                        </div>
                        <div className="mx-1 font-light text-4xl text-neutral-400 sm:mx-2 sm:text-5xl md:text-6xl dark:text-neutral-500">
                          :
                        </div>
                        <div className="font-light text-4xl text-neutral-900 tabular-nums tracking-tighter sm:text-5xl md:text-6xl dark:text-white">
                          {timeParts.second.padStart(2, "0")}
                        </div>
                        <div className="ml-2 self-center font-light text-neutral-400 text-xl sm:ml-4 sm:text-2xl dark:text-neutral-500">
                          {timeParts.dayPeriod}
                        </div>
                      </div>
                    </div>
                  );
                });

                LiveClock.displayName = "LiveClock";

                return (
                  <div
                    className="my-6 w-full"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4 sm:gap-6">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h3 className="font-medium text-neutral-500 text-xs uppercase tracking-wider dark:text-neutral-400">
                                Current Time
                              </h3>
                              <div className="flex items-center gap-1.5 rounded bg-neutral-100 px-2 py-1 font-medium text-neutral-600 text-xs dark:bg-neutral-800 dark:text-neutral-300">
                                <PhosphorClockIcon
                                  className="h-3 w-3 text-blue-500"
                                  weight="regular"
                                />
                                {part.output.timezone ||
                                  new Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone}
                              </div>
                            </div>
                            <LiveClock />
                            <p className="mt-2 text-neutral-500 text-sm dark:text-neutral-400">
                              {part.output.formatted?.date}
                            </p>
                          </div>

                          {/* Compact Technical Details */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {part.output.formatted?.iso_local && (
                              <div className="rounded bg-neutral-50 p-3 dark:bg-neutral-900">
                                <div className="mb-1 text-neutral-500 dark:text-neutral-400">
                                  Local
                                </div>
                                <div className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                                  {part.output.formatted.iso_local}
                                </div>
                              </div>
                            )}

                            {part.output.timestamp && (
                              <div className="rounded bg-neutral-50 p-3 dark:bg-neutral-900">
                                <div className="mb-1 text-neutral-500 dark:text-neutral-400">
                                  Timestamp
                                </div>
                                <div className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                                  {part.output.timestamp}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            }
            break;

          case "tool-extreme_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing extreme search...
                  </div>
                );
              case "input-available":
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <ExtremeSearch
                      annotations={
                        (annotations?.filter(
                          (annotation) =>
                            annotation.type === "data-extreme_search"
                        ) as DataExtremeSearchPart[]) || []
                      }
                      toolInvocation={
                        part as unknown as UIToolInvocation<
                          ReturnType<
                            typeof import("@/lib/tools")["extremeSearchTool"]
                          >
                        >
                      }
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-text_translate":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing translation...
                  </div>
                );
              case "input-available":
              case "output-available":
                return (
                  <TranslationTool
                    args={part.input}
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={part.output}
                  />
                );
            }
            break;

          case "tool-code_context":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing code context...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="blue"
                    icon={Code}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Getting code context..."
                  />
                );
              case "output-available":
                return (
                  <CodeContextTool
                    args={part.input}
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={part.output}
                  />
                );
            }
            break;

          case "tool-academic_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing academic search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="violet"
                    icon={Book}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Searching academic papers..."
                  />
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <AcademicPapersCard
                      results={
                        part.output.results?.map((result: any) => ({
                          ...result,
                          title:
                            result.title ||
                            ("name" in result ? String(result.name) : null) ||
                            "Untitled",
                        })) || []
                      }
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-reddit_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing Reddit search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="orange"
                    icon={RedditLogoIcon}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Searching Reddit..."
                  />
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <RedditSearch
                      args={{
                        query:
                          typeof (part.input as any)?.query === "string"
                            ? (part.input as any).query
                            : "",
                        maxResults: (part.input as any)?.maxResults || 10,
                        timeRange: (part.input as any)?.timeRange || "week",
                      }}
                      result={part.output}
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-x_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing X search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="gray"
                    icon={XLogoIcon}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Searching X (Twitter)..."
                  />
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <XSearch
                      args={{
                        query: (part.input as any)?.query || "",
                        startDate: (part.input as any)?.startDate || "",
                        endDate: (part.input as any)?.endDate || "",
                        includeXHandles:
                          (part.input as any)?.includeXHandles || [],
                        excludeXHandles:
                          (part.input as any)?.excludeXHandles || [],
                        postFavoritesCount:
                          (part.input as any)?.postFavoritesCount || 0,
                        postViewCount: (part.input as any)?.postViewCount || 0,
                        maxResults: (part.input as any)?.maxResults || 20,
                      }}
                      result={{
                        ...part.output,
                        query: part.output.query || "",
                        citations:
                          part.output.citations?.map((citation: any) => ({
                            ...citation,
                            title:
                              citation.title ||
                              ("url" in citation
                                ? citation.url
                                : citation.id) ||
                              "Citation",
                            url: "url" in citation ? citation.url : citation.id,
                          })) || [],
                      }}
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-youtube_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing YouTube search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="red"
                    icon={YoutubeIcon}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Searching YouTube..."
                  />
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <YouTubeSearchResults results={part.output} />
                  </Suspense>
                );
            }
            break;

          case "tool-serp_checker":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing SERP search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="blue"
                    icon={Globe}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Searching Google (Serper.dev)..."
                  />
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <SerpResults output={part.output as any} />
                  </Suspense>
                );
              case "output-error":
                return (
                  <Tool
                    defaultOpen={true}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <ToolHeader
                      state={part.state}
                      title="SERP Checker"
                      type={part.type as any}
                    />
                    <ToolContent>
                      <ToolInput input={part.input} />
                      <ToolOutput
                        errorText={part.errorText}
                        output={part.output}
                      />
                    </ToolContent>
                  </Tool>
                );
            }
            break;

          case "tool-search_memories":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div className="text-neutral-500 text-sm">
                    Preparing memory search...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="blue"
                    icon={MemoryIcon}
                    text="Searching memories..."
                  />
                );
              case "output-available": {
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="my-4 w-full rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                            <MemoryIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-red-900 text-sm dark:text-red-100">
                              Memory search failed
                            </h3>
                            <p className="mt-1 text-red-700 text-xs dark:text-red-300">
                              {part.output.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const { results, count } = part.output;
                if (!results || results.length === 0) {
                  return (
                    <div className="my-4 w-full rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                            <MemoryIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-amber-900 text-sm dark:text-amber-100">
                              No memories found
                            </h3>
                            <p className="mt-1 text-amber-700 text-xs dark:text-amber-300">
                              No memories match your search query. Try different
                              keywords.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="my-4 w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm">
                    {/* Header */}
                    <div className="border-[hsl(var(--border))] border-b bg-[hsl(var(--muted))] px-2 py-2">
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10">
                            <MemoryIcon className="h-4 w-4 text-[hsl(var(--primary))]" />
                          </div>
                          <h3 className="font-semibold text-sm">
                            {count} Memor{count !== 1 ? "ies" : "y"} Found
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Image
                            alt="Supermemory"
                            className="opacity-60 invert transition-opacity hover:opacity-80 dark:invert-0"
                            height={16}
                            src="/supermemory.svg"
                            width={100}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="">
                      {results.map((memory: any, index: number) => (
                        <div className="px-4 py-2" key={memory.id || index}>
                          <p className="line-clamp-2 text-[hsl(var(--muted-foreground))] text-xs">
                            • {memory.chunks[0].content || memory.memory || ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            }
            break;

          case "tool-add_memory":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div className="text-neutral-500 text-sm">
                    Preparing to add memory...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="green"
                    icon={MemoryIcon}
                    text="Adding memory..."
                  />
                );
              case "output-available": {
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="my-4 w-full rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900">
                            <MemoryIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-red-900 text-sm dark:text-red-100">
                              Failed to add memory
                            </h3>
                            <p className="mt-1 text-red-700 text-xs dark:text-red-300">
                              {part.output.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const { memory: addedMemory } = part.output;
                return (
                  <div className="my-4 w-full overflow-hidden rounded-2xl border border-green-200 bg-green-50 shadow-sm dark:border-green-800 dark:bg-green-950">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                            <MemoryIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-green-900 text-sm dark:text-green-100">
                              Memory Added Successfully
                            </h3>
                            <p className="mt-1 text-green-700 text-xs dark:text-green-300">
                              Your information has been saved to memory for
                              future reference.
                            </p>
                          </div>
                        </div>
                        <Image
                          alt="Supermemory"
                          className="shrink-0 opacity-60 invert transition-opacity hover:opacity-80 dark:invert-0"
                          height={16}
                          src="/supermemory.svg"
                          width={100}
                        />
                      </div>

                      {addedMemory && (
                        <div className="mt-3 rounded-lg border border-green-200 bg-white p-3 dark:border-green-800 dark:bg-green-900/20">
                          {addedMemory.title && (
                            <h4 className="mb-1 font-medium text-green-900 text-sm dark:text-green-100">
                              {addedMemory.title}
                            </h4>
                          )}
                          <p className="text-green-700 text-xs dark:text-green-300">
                            {addedMemory.summary ||
                              addedMemory.content ||
                              (part.input as any)?.memory ||
                              "Memory stored"}
                          </p>
                          {addedMemory.type && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700 dark:bg-green-800 dark:text-green-300">
                                {addedMemory.type}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            }
            break;

          case "tool-connectors_search":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Searching your connected documents...
                  </div>
                );
              case "input-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <ConnectorsSearchResults
                      isLoading={true}
                      query={(part.input as any)?.query || ""}
                      results={[]}
                      totalResults={0}
                    />
                  </Suspense>
                );
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <ConnectorsSearchResults
                      query={part.output?.query || ""}
                      results={part.output?.results || []}
                      totalResults={part.output?.count || 0}
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-currency_converter":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing currency conversion...
                  </div>
                );
              case "input-available":
              case "output-available":
                return (
                  <Suspense
                    fallback={<ComponentLoader />}
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <CurrencyConverter
                      result={part.output}
                      toolInvocation={{
                        input: part.input,
                        result: part.output,
                      }}
                    />
                  </Suspense>
                );
            }
            break;

          case "tool-code_interpreter":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing code execution...
                  </div>
                );
              case "input-available":
              case "output-available":
                return (
                  <div
                    className="w-full space-y-3 overflow-hidden"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <Suspense fallback={<ComponentLoader />}>
                      <CodeInterpreterView
                        code={(part.input as any)?.code}
                        error={
                          part.output && "error" in part.output
                            ? String(part.output.error)
                            : undefined
                        }
                        language="python"
                        output={part.output?.message}
                        status={
                          part.output &&
                          "error" in part.output &&
                          part.output.error
                            ? "error"
                            : part.output
                              ? "completed"
                              : "running"
                        }
                        title={(part.input as any)?.title || "Code Execution"}
                      />
                    </Suspense>

                    {part.output?.chart && (
                      <div className="overflow-x-auto pt-1">
                        <Suspense fallback={<ComponentLoader />}>
                          <InteractiveChart chart={part.output.chart} />
                        </Suspense>
                      </div>
                    )}
                  </div>
                );
            }
            break;

          case "tool-retrieve":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing content retrieval...
                  </div>
                );
              case "input-available":
                return (
                  <div
                    className="my-4 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <div className="relative h-36 animate-pulse overflow-hidden bg-neutral-50 dark:bg-neutral-800/50">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 dark:to-black/10" />
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800">
                          <Globe className="absolute inset-0 m-auto h-5 w-5 text-neutral-300 dark:text-neutral-700" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="space-y-2">
                            <div className="h-6 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                            <div className="flex gap-2">
                              <div className="h-4 w-24 animate-pulse rounded-md bg-violet-100 dark:bg-violet-900/30" />
                              <div className="h-4 w-32 animate-pulse rounded-md bg-emerald-100 dark:bg-emerald-900/30" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-3 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                            <div className="h-3 w-4/5 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="h-4 w-24 animate-pulse rounded-md bg-blue-100 dark:bg-blue-900/30" />
                            <div className="h-4 w-32 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-neutral-200 border-t dark:border-neutral-800">
                      <div className="flex items-center gap-2 p-3">
                        <div className="h-4 w-4 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                        <div className="h-4 w-28 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
                      </div>
                    </div>
                  </div>
                );
              case "output-available": {
                // Handle error responses
                if (
                  (part.output &&
                    "error" in part.output &&
                    part.output.error) ||
                  (part.output.results &&
                    part.output.results[0] &&
                    "error" in part.output.results[0] &&
                    part.output.results[0].error)
                ) {
                  const errorMessage = String(
                    (part.output &&
                      "error" in part.output &&
                      part.output.error) ||
                      (part.output.results &&
                        part.output.results[0] &&
                        "error" in part.output.results[0] &&
                        part.output.results[0].error)
                  );
                  return (
                    <div
                      className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500 dark:bg-red-950/50"
                      key={`${messageIndex}-${partIndex}-tool`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                          <Globe className="h-4 w-4 text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                          <div className="font-medium text-red-700 text-sm dark:text-red-300">
                            Error retrieving content
                          </div>
                          <div className="mt-1 text-red-600/80 text-xs dark:text-red-400/80">
                            {errorMessage}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Handle no content
                if (!part.output.results || part.output.results.length === 0) {
                  return (
                    <div
                      className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500 dark:bg-amber-950/50"
                      key={`${messageIndex}-${partIndex}-tool`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                          <Globe className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        </div>
                        <div className="font-medium text-amber-700 text-sm dark:text-amber-300">
                          No content available
                        </div>
                      </div>
                    </div>
                  );
                }

                // Beautiful, sophisticated rendering for Exa AI retrieval
                const result = part.output;
                return (
                  <div
                    className="my-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    {result.results[0].image && (
                      <div className="relative h-36 overflow-hidden">
                        <Image
                          alt={result.results[0].title || "Featured image"}
                          className="h-full w-full object-cover"
                          height={128}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          src={result.results[0].image}
                          unoptimized
                          width={128}
                        />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0">
                          {result.results[0].favicon ? (
                            <Image
                              alt=""
                              className="h-full w-full rounded-lg object-contain"
                              height={64}
                              onError={(e) => {
                                e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                                  result.results[0].url
                                )}`;
                              }}
                              src={result.results[0].favicon}
                              unoptimized
                              width={64}
                            />
                          ) : (
                            <Image
                              alt=""
                              className="h-full w-full rounded-lg object-contain"
                              height={64}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2.29-2.333A17.9 17.9 0 0 1 8.027 13H4.062a8.008 8.008 0 0 0 5.648 6.667zM10.03 13c.151 2.439.848 4.73 1.97 6.752A15.905 15.905 0 0 0 13.97 13h-3.94zm9.908 0h-3.965a17.9 17.9 0 0 1-1.683 6.667A8.008 8.008 0 0 0 19.938 13zM4.062 11h3.965A17.9 17.9 0 0 1 9.71 4.333 8.008 8.008 0 0 0 4.062 11zm5.969 0h3.938A15.905 15.905 0 0 0 12 4.248 15.905 15.905 0 0 0 10.03 11zm4.259-6.667A17.9 17.9 0 0 1 15.938 11h3.965a8.008 8.008 0 0 0-5.648-6.667z' fill='rgba(128,128,128,0.5)'/%3E%3C/svg%3E";
                              }}
                              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                                result.results[0].url
                              )}`}
                              unoptimized
                              width={64}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="group">
                            <h2 className="truncate font-medium text-base text-neutral-900 tracking-tight dark:text-neutral-100">
                              {result.results[0].title || "Retrieved Content"}
                            </h2>
                            <div className="-mt-1 absolute z-10 hidden max-w-lg rounded-lg border border-neutral-200 bg-white p-2 shadow-lg group-hover:block dark:border-neutral-800 dark:bg-neutral-900">
                              <p className="text-neutral-900 text-sm dark:text-neutral-100">
                                {result.results[0].title || "Retrieved Content"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {result.results[0].author && (
                              <Badge
                                className="rounded-md border-0 bg-violet-50 text-violet-600 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/30"
                                variant="secondary"
                              >
                                <User2 className="mr-1 h-3 w-3" />
                                {result.results[0].author}
                              </Badge>
                            )}
                            {result.results[0].publishedDate && (
                              <Badge
                                className="rounded-md border-0 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                variant="secondary"
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                {new Date(
                                  result.results[0].publishedDate
                                ).toLocaleDateString()}
                              </Badge>
                            )}
                            {result.response_time && (
                              <Badge
                                className="rounded-md border-0 bg-sky-50 text-sky-600 transition-colors hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:hover:bg-sky-900/30"
                                variant="secondary"
                              >
                                <Server className="mr-1 h-3 w-3" />
                                {result.response_time.toFixed(1)}s
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-neutral-600 text-sm dark:text-neutral-400">
                        {result.results[0].description ||
                          "No description available"}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            className="cursor-pointer rounded-md border-0 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            variant="secondary"
                          >
                            <a
                              className="inline-flex items-center gap-1.5"
                              href={result.results[0].url}
                              target="_blank"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              View source
                            </a>
                          </Badge>

                          {result.results.length > 1 && (
                            <Badge
                              className="rounded-md border-0 bg-amber-50 text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                              variant="secondary"
                            >
                              <TextIcon className="mr-1 h-3 w-3" />
                              {result.results.length} pages
                            </Badge>
                          )}
                        </div>

                        <Badge
                          className="rounded-md border-0 bg-neutral-50 text-neutral-500 transition-colors hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                          variant="secondary"
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          {new URL(result.results[0].url).hostname.replace(
                            "www.",
                            ""
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-neutral-200 border-t dark:border-neutral-800">
                      <Accordion collapsible type="single">
                        {result.results.map(
                          (resultItem: any, index: number) => (
                            <AccordionItem
                              className="border-0"
                              key={index}
                              value={`content${index}`}
                            >
                              <AccordionTrigger className="group no-underline! rounded-t-none! px-4 py-3 font-medium text-neutral-700 text-xs transition-colors hover:bg-neutral-50 data-[state=open]:rounded-b-none! data-[state=open]:bg-neutral-50 dark:text-neutral-300 dark:data-[state=open]:bg-neutral-800/50 dark:hover:bg-neutral-800/50 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-neutral-500 [&>svg]:transition-transform [&>svg]:duration-200">
                                <div className="flex items-center gap-2">
                                  <TextIcon className="h-3.5 w-3.5 text-neutral-400" />
                                  <span>
                                    {index === 0
                                      ? "View full content"
                                      : `Additional content ${index + 1}`}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-0">
                                <div className="max-h-[50vh] overflow-y-auto border-neutral-200 border-t bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
                                  <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>
                                      {resultItem.content ||
                                        "No content available"}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        )}
                      </Accordion>
                    </div>
                  </div>
                );
              }
            }
            break;

          case "tool-greeting":
            switch (part.state) {
              case "input-streaming":
                return (
                  <div
                    className="text-neutral-500 text-sm"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    Preparing greeting...
                  </div>
                );
              case "input-available":
                return (
                  <SearchLoadingState
                    color="gray"
                    icon={User2}
                    key={`${messageIndex}-${partIndex}-tool`}
                    text="Preparing greeting..."
                  />
                );
              case "output-available":
                return (
                  <div
                    className="group my-2 rounded-md border border-neutral-200/60 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-700/60 dark:bg-neutral-900/50 dark:hover:border-neutral-600"
                    key={`${messageIndex}-${partIndex}-tool`}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {part.output.timeEmoji && (
                          <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-neutral-600">
                            <span className="text-xs">
                              {part.output.timeEmoji}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">
                              {part.output.greeting}
                            </span>
                            <span className="text-neutral-400">•</span>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              {part.output.dayOfWeek}
                            </span>
                          </div>
                          <div className="text-neutral-700 text-sm leading-relaxed dark:text-neutral-300">
                            {part.output.professionalMessage}
                          </div>
                          {part.output.helpfulTip && (
                            <div className="text-neutral-500 text-xs dark:text-neutral-400">
                              {part.output.helpfulTip}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
            }
            break;

          default: {
            // Generic fallback for any tool without custom UI (e.g., keyword_research)
            const toolName = part.type.replace("tool-", "");
            const shouldAutoOpen =
              part.state === "output-available" ||
              part.state === "output-error";

            return (
              <Tool
                defaultOpen={shouldAutoOpen}
                key={`${messageIndex}-${partIndex}-tool`}
              >
                <ToolHeader
                  state={part.state}
                  title={toolName
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                  type={part.type as any}
                />
                <ToolContent>
                  {(part.state === "input-available" ||
                    part.state === "output-available" ||
                    part.state === "output-error") && (
                    <ToolInput input={part.input} />
                  )}
                  {(part.state === "output-available" ||
                    part.state === "output-error") && (
                    <ToolOutput
                      errorText={part.errorText}
                      output={part.output}
                    />
                  )}
                </ToolContent>
              </Tool>
            );
          }
        }
      } else {
        // Legacy tool invocation without state - show as loading or fallback
        console.warn("Legacy tool part without state:", part);
        return (
          <div
            className="my-4 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900"
            key={`${messageIndex}-${partIndex}-tool-legacy`}
          >
            <h3 className="mb-2 font-medium">Tool: Unknown</h3>
            <pre className="overflow-auto text-xs">
              {JSON.stringify(part, null, 2)}
            </pre>
          </div>
        );
      }
    }

    // Log unhandled part types for debugging
    console.log(
      "Unhandled part type:",
      typeof part === "object" && part !== null && "type" in part
        ? part.type
        : "unknown",
      part
    );

    return null;
  },
  (
    prevProps: MessagePartRendererProps,
    nextProps: MessagePartRendererProps
  ) => {
    const areEqual =
      isEqual(prevProps.part, nextProps.part) &&
      prevProps.messageIndex === nextProps.messageIndex &&
      prevProps.partIndex === nextProps.partIndex &&
      isEqual(prevProps.parts, nextProps.parts) &&
      isEqual(prevProps.message, nextProps.message) &&
      prevProps.status === nextProps.status &&
      prevProps.hasActiveToolInvocations ===
        nextProps.hasActiveToolInvocations &&
      isEqual(
        prevProps.reasoningVisibilityMap,
        nextProps.reasoningVisibilityMap
      ) &&
      isEqual(
        prevProps.reasoningFullscreenMap,
        nextProps.reasoningFullscreenMap
      ) &&
      prevProps.user?.id === nextProps.user?.id &&
      prevProps.isOwner === nextProps.isOwner &&
      prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
      prevProps.chatId === nextProps.chatId &&
      isEqual(prevProps.annotations, nextProps.annotations);

    // Debug logging
    if (!areEqual) {
      console.log("MessagePartRenderer re-rendering");
    }

    return areEqual;
  }
);

// Code Context tool component
interface CodeContextToolProps {
  args: CodeContextToolInput | null | undefined;
  result: CodeContextToolOutput | string | null | undefined;
}

const CodeContextTool: React.FC<CodeContextToolProps> = ({
  args,
  result,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!result) {
    return (
      <div className="group my-2 rounded-md border border-neutral-200/60 bg-neutral-50/30 p-3 dark:border-neutral-700/60 dark:bg-neutral-900/30">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-600 opacity-80">
            <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-neutral-300 dark:bg-neutral-600" />
          </div>
        </div>
      </div>
    );
  }

  const responseText =
    typeof result === "string" ? result : result?.response ?? "";
  const normalizedResult =
    typeof result === "string" ? undefined : result ?? undefined;
  const shouldShowAccordion = responseText && responseText.length > 500;
  const previewText = shouldShowAccordion
    ? responseText.slice(0, 400) + "..."
    : responseText;

  return (
    <div className="group my-2 rounded-md border border-neutral-200/60 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-700/60 dark:bg-neutral-900/50 dark:hover:border-neutral-600">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-blue-600">
            <Code className="h-2.5 w-2.5 text-white" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Code Context
                </span>
                <span className="text-neutral-400">•</span>
                <span className="max-w-[200px] truncate text-neutral-500 dark:text-neutral-400">
                  {args ? args.query : ""}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Copy button */}
                <Button
                  className="h-6 w-6 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => {
                    navigator.clipboard.writeText(responseText);
                    toast.success("Code context copied to clipboard");
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <HugeiconsIcon
                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    color="currentColor"
                    icon={Copy01Icon}
                    size={12}
                    strokeWidth={2}
                  />
                </Button>

                {/* Metadata badges */}
                {normalizedResult?.resultsCount !== undefined && (
                  <div className="flex items-center gap-2">
                    <Badge
                      className="rounded-md border-0 bg-blue-50 px-2 py-0.5 text-blue-600 text-xs hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      variant="secondary"
                    >
                      {normalizedResult?.resultsCount} results
                    </Badge>
                    {normalizedResult?.outputTokens && (
                      <Badge
                        className="rounded-md border-0 bg-emerald-50 px-2 py-0.5 text-emerald-600 text-xs hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        variant="secondary"
                      >
                        {normalizedResult.outputTokens} tokens
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              {shouldShowAccordion ? (
                <Accordion
                  collapsible
                  onValueChange={(value) => setIsExpanded(!!value)}
                  type="single"
                  value={isExpanded ? "context" : ""}
                >
                  <AccordionItem className="border-0" value="context">
                    <div className="space-y-2">
                      <div className="break-words text-neutral-700 text-sm leading-relaxed dark:text-neutral-300">
                        {!isExpanded && previewText}
                      </div>
                      <AccordionTrigger className="py-2 text-blue-600 text-xs transition-colors hover:text-blue-700 hover:no-underline dark:text-blue-400 dark:hover:text-blue-300">
                        {isExpanded ? "Show less" : "Show full context"}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="whitespace-pre-wrap break-words border-neutral-200/60 border-t pt-2 text-neutral-700 text-sm leading-relaxed dark:border-neutral-700/60 dark:text-neutral-300">
                          {responseText}
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                </Accordion>
              ) : (
                <div className="whitespace-pre-wrap break-words text-neutral-700 text-sm leading-relaxed dark:text-neutral-300">
                  {responseText}
                </div>
              )}

              {/* Footer metadata */}
              {normalizedResult?.searchTime && (
                <div className="flex items-center gap-2 border-neutral-200/30 border-t pt-2 dark:border-neutral-700/30">
                  <Clock className="h-3 w-3 text-neutral-400" />
                  <span className="text-neutral-500 text-xs dark:text-neutral-400">
                    Search completed in {(
                      normalizedResult.searchTime / 1000
                    ).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Translation tool component with audio features
const TranslationTool: React.FC<{ args: any; result: any }> = ({
  args,
  result,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<Wave | null>(null);

  useEffect(() => {
    const _audioRef = audioRef.current;
    return () => {
      if (_audioRef) {
        _audioRef.pause();
        _audioRef.src = "";
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current && canvasRef.current) {
      waveRef.current = new Wave(audioRef.current, canvasRef.current);
      waveRef.current.addAnimation(
        new waveRef.current.animations.Lines({
          lineWidth: 3,
          lineColor: "rgb(82, 82, 91)",
          count: 80,
          mirroredY: true,
        })
      );
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!(audioUrl || isGeneratingAudio)) {
      setIsGeneratingAudio(true);
      try {
        const { audio } = await generateSpeech(result.translatedText);
        setAudioUrl(audio);
        setIsGeneratingAudio(false);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      } catch (error) {
        console.error("Error generating speech:", error);
        setIsGeneratingAudio(false);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!result) {
    return (
      <div className="group my-2 rounded-md border border-neutral-200/60 bg-neutral-50/30 p-3 dark:border-neutral-700/60 dark:bg-neutral-900/30">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-600 opacity-80">
            <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-neutral-300 dark:bg-neutral-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group my-2 rounded-md border border-neutral-200/60 bg-white/50 backdrop-blur-sm transition-all duration-200 hover:border-neutral-300 dark:border-neutral-700/60 dark:bg-neutral-900/50 dark:hover:border-neutral-600">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md bg-neutral-600">
            <TextIcon className="h-2.5 w-2.5 text-white" />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                Translation
              </span>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {result.detectedLanguage} → {args ? args.to : ""}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="group/text">
                <div className="mb-1 text-neutral-500 text-xs opacity-70 dark:text-neutral-400">
                  {result.detectedLanguage}
                </div>
                <div className="break-words text-neutral-700 text-sm leading-relaxed dark:text-neutral-300">
                  {args ? args.text : ""}
                </div>
              </div>

              <div className="group/text">
                <div className="mb-1 text-neutral-600 text-xs opacity-70 dark:text-neutral-400">
                  {args ? args.to : ""}
                </div>
                <div className="break-words font-medium text-neutral-900 text-sm leading-relaxed dark:text-neutral-100">
                  {result.translatedText}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-sm transition-all duration-150",
                  isPlaying
                    ? "bg-neutral-700 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                )}
                disabled={isGeneratingAudio}
                onClick={handlePlayPause}
              >
                {isGeneratingAudio ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-2.5 w-2.5" />
                ) : (
                  <PlayIcon className="h-2.5 w-2.5" />
                )}
              </button>

              <div className="h-5 flex-1 overflow-hidden rounded-sm bg-neutral-100/80 dark:bg-neutral-800/80">
                {!(audioUrl || isGeneratingAudio) && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-0.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                )}
                <canvas
                  className="h-full w-full"
                  height="40"
                  ref={canvasRef}
                  style={{ imageRendering: "crisp-edges" }}
                  width="800"
                />
              </div>

              <span className="font-mono text-neutral-400 text-xs opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-500">
                {isGeneratingAudio ? "..." : audioUrl ? "●" : "○"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {audioUrl && (
        <audio
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          ref={audioRef}
          src={audioUrl}
        />
      )}
    </div>
  );
};

MessagePartRenderer.displayName = "MessagePartRenderer";
