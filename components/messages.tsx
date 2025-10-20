import type { UseChatHelpers } from "@ai-sdk/react";
import { type DataUIPart, isToolUIPart } from "ai";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteTrailingMessages } from "@/app/actions";
import { EnhancedErrorDisplay, Message } from "@/components/message";
import { MessagePartRenderer } from "@/components/message-parts";
import { SciraLogoHeader } from "@/components/scira-logo-header";
import type { ChatMessage, CustomUIDataTypes } from "@/lib/types";
import type { ComprehensiveUserData } from "@/lib/user-data-server";

// Define interface for part, messageIndex and partIndex objects
type PartInfo = {
  part: any;
  messageIndex: number;
  partIndex: number;
};

type MessagesProps = {
  messages: ChatMessage[];
  lastUserMessageIndex: number;
  input: string;
  setInput: (value: string) => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  suggestedQuestions: string[];
  setSuggestedQuestions: (questions: string[]) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  error: Error | null; // Add error from useChat
  user?: ComprehensiveUserData | null; // Add user prop
  selectedVisibilityType?: "public" | "private"; // Add visibility type
  chatId?: string; // Add chatId prop
  onVisibilityChange?: (visibility: "public" | "private") => void; // Add visibility change handler
  initialMessages?: any[]; // Add initial messages prop to detect existing chat
  isOwner?: boolean; // Add ownership prop
  onHighlight?: (text: string) => void; // Add highlight handler
};

const Messages: React.FC<MessagesProps> = ({
  messages,
  lastUserMessageIndex,
  setMessages,
  suggestedQuestions,
  setSuggestedQuestions,
  status,
  error,
  user,
  selectedVisibilityType = "private",
  chatId,
  onVisibilityChange,
  initialMessages,
  isOwner,
  onHighlight,
  sendMessage,
  regenerate,
}) => {
  // Track visibility state for each reasoning section using messageIndex-partIndex as key
  const [reasoningVisibilityMap, setReasoningVisibilityMap] = useState<
    Record<string, boolean>
  >({});
  const [reasoningFullscreenMap, setReasoningFullscreenMap] = useState<
    Record<string, boolean>
  >({});
  const reasoningScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  // Scroll to bottom immediately (without animation) when opening existing chat
  useEffect(() => {
    if (
      initialMessages &&
      initialMessages.length > 0 &&
      !hasInitialScrolled &&
      messagesEndRef.current
    ) {
      // Use scrollTo with instant behavior for existing chats
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
      setHasInitialScrolled(true);
    }
  }, [initialMessages, hasInitialScrolled]);

  // Filter messages to only show the ones we want to display
  const memoizedMessages = useMemo(() => {
    const filtered = messages.filter((message) => {
      // Keep all user messages
      if (message.role === "user") {
        return true;
      }

      // For assistant messages, keep all of them for now (debugging)
      if (message.role === "assistant") {
        return true;
      }
      return false;
    });
    return filtered;
  }, [messages]);

  // Check if there are any active tool invocations in the current messages
  const hasActiveToolInvocations = useMemo(() => {
    const lastMessage = memoizedMessages.at(-1);

    // Only consider tools as "active" if we're currently streaming AND the last message is assistant with tools
    if (status === "streaming" && lastMessage?.role === "assistant") {
      const hasTools = lastMessage.parts?.some(
        (part: ChatMessage["parts"][number]) => isToolUIPart(part)
      );
      return hasTools;
    }
    return false;
  }, [memoizedMessages, status]);

  // Check if we need to show retry due to missing assistant response (different from error status)
  const isMissingAssistantResponse = useMemo(() => {
    const lastMessage = memoizedMessages.at(-1);

    // Case 1: Last message is user and no assistant response yet
    if (lastMessage?.role === "user" && status === "ready" && !error) {
      return true;
    }

    // Case 2: Last message is assistant but lacks visible content
    if (lastMessage?.role === "assistant" && status === "ready" && !error) {
      const parts = lastMessage.parts || [];

      const hasVisibleText = parts.some(
        (part: ChatMessage["parts"][number]) =>
          part.type === "text" && part.text && part.text.trim() !== ""
      );
      const hasToolInvocations = parts.some(
        (part: ChatMessage["parts"][number]) => isToolUIPart(part)
      );
      const hasVisibleContent = hasVisibleText || hasToolInvocations;

      // If there is no visible content at all, consider the response missing
      if (!hasVisibleContent) {
        return true;
      }
    }

    return false;
  }, [memoizedMessages, status, error]);

  // Memoize the retry handler
  const handleRetry = useCallback(async () => {
    try {
      const lastUserMessage = messages.findLast((m) => m.role === "user");
      if (!lastUserMessage) {
        return;
      }

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
    } catch (_error) {}
  }, [messages, user, setMessages, setSuggestedQuestions, regenerate]);

  // Handle rendering of message parts - using the new MessagePartRenderer component
  const renderPart = useCallback(
    (
      part: ChatMessage["parts"][number],
      messageIndex: number,
      partIndex: number,
      parts: ChatMessage["parts"][number][],
      message: ChatMessage
    ): React.ReactNode => {
      // Extract annotations from all data parts in the message
      const annotations = message.parts
        .filter((p) => p.type.startsWith("data-"))
        .map((p) => p as DataUIPart<CustomUIDataTypes>);

      return (
        <MessagePartRenderer
          annotations={annotations}
          chatId={chatId}
          hasActiveToolInvocations={hasActiveToolInvocations}
          isOwner={isOwner}
          message={message}
          messageIndex={messageIndex}
          messages={messages}
          onHighlight={onHighlight}
          onVisibilityChange={onVisibilityChange}
          part={part}
          partIndex={partIndex}
          parts={parts}
          reasoningFullscreenMap={reasoningFullscreenMap}
          reasoningVisibilityMap={reasoningVisibilityMap}
          regenerate={regenerate}
          selectedVisibilityType={selectedVisibilityType}
          setMessages={setMessages}
          setReasoningFullscreenMap={setReasoningFullscreenMap}
          setReasoningVisibilityMap={setReasoningVisibilityMap}
          setSuggestedQuestions={setSuggestedQuestions}
          status={status}
          user={user ?? undefined}
        />
      );
    },
    [
      status,
      hasActiveToolInvocations,
      messages,
      user,
      isOwner,
      selectedVisibilityType,
      chatId,
      onVisibilityChange,
      setMessages,
      setSuggestedQuestions,
      regenerate,
      reasoningVisibilityMap,
      reasoningFullscreenMap,
      onHighlight,
    ]
  );

  // Check if we should show loading animation
  const shouldShowLoading = useMemo(() => {
    if (status === "submitted") {
      return true;
    }

    if (status === "streaming") {
      const lastMessage = memoizedMessages.at(-1);
      // Show loading if only user message exists (no assistant response yet)
      if (lastMessage?.role === "user") {
        return true;
      }
      // Show loading if assistant message exists but has 0 or 1 parts (just starting)
      if (lastMessage?.role === "assistant") {
        const partsCount = lastMessage.parts?.length || 0;
        return partsCount <= 1;
      }
    }

    return false;
  }, [status, memoizedMessages]);

  // Compute index of the most recent assistant message; only that one should keep min-height
  const lastAssistantIndex = useMemo(() => {
    for (let i = memoizedMessages.length - 1; i >= 0; i -= 1) {
      if (memoizedMessages[i]?.role === "assistant") {
        return i;
      }
    }
    return -1;
  }, [memoizedMessages]);

  // Index of actively streaming assistant (only when last message is assistant during streaming)
  const activeAssistantIndex = useMemo(() => {
    const lastMessage = memoizedMessages.at(-1);
    if (status === "streaming" && lastMessage?.role === "assistant") {
      return memoizedMessages.length - 1;
    }
    return -1;
  }, [memoizedMessages, status]);

  // Is the active assistant in the initial skeleton phase (0 or 1 parts)?
  const isActiveAssistantSkeleton = useMemo(() => {
    const lastMessage = memoizedMessages.at(-1);
    if (status === "streaming" && lastMessage?.role === "assistant") {
      const partsCount = lastMessage.parts?.length || 0;
      return partsCount <= 1;
    }
    return false;
  }, [memoizedMessages, status]);

  // Loader reserves min-height when submitted, or streaming after user, or
  // streaming with assistant in skeleton phase (0/1 parts)
  const shouldReserveLoaderMinHeight = useMemo(() => {
    const lastMessage = memoizedMessages.at(-1);
    if (status === "submitted") {
      return true;
    }
    if (
      status === "streaming" &&
      (lastMessage?.role === "user" || isActiveAssistantSkeleton)
    ) {
      return true;
    }
    return false;
  }, [memoizedMessages, status, isActiveAssistantSkeleton]);

  // No useEffect here - let the parent handle scrolling when it receives streaming data

  // Add effect for auto-scrolling reasoning content
  useEffect(() => {
    // Find active reasoning parts that are not complete
    const activeReasoning = messages.flatMap((message, messageIndex) =>
      (message.parts || [])
        .map((part: any, partIndex: number) => ({
          part,
          messageIndex,
          partIndex,
        }))
        .filter(({ part }: PartInfo) => part.type === "reasoning")
        .filter(({ messageIndex, partIndex }: PartInfo) => {
          const message = messages[messageIndex];
          // Check if reasoning is complete
          return !(message.parts || []).some(
            (p: any, i: number) =>
              i > partIndex &&
              (p.type === "text" || p.type === "tool-invocation")
          );
        })
    );

    // Auto-scroll when active reasoning
    if (activeReasoning.length > 0 && reasoningScrollRef.current) {
      reasoningScrollRef.current.scrollTop =
        reasoningScrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (memoizedMessages.length === 0) {
    return null;
  }

  return (
    <div className="mb-30 flex flex-col space-y-0 sm:mb-36">
      <div className="flex-grow">
        {memoizedMessages.map((message, index) => {
          const isNextMessageAssistant =
            index < memoizedMessages.length - 1 &&
            memoizedMessages[index + 1].role === "assistant";
          const isCurrentMessageUser = message.role === "user";
          const isCurrentMessageAssistant = message.role === "assistant";
          const isLastMessage = index === memoizedMessages.length - 1;

          // Determine proper spacing between messages
          let messageClasses = "";

          if (isCurrentMessageUser && isNextMessageAssistant) {
            // Reduce space between user message and its response
            messageClasses = "mb-0";
          } else if (
            isCurrentMessageAssistant &&
            index < memoizedMessages.length - 1
          ) {
            // Add border and spacing only if this is not the last assistant message
            messageClasses =
              "mb-6 pb-6 border-b border-border dark:border-border";
          } else if (
            isCurrentMessageAssistant &&
            index === memoizedMessages.length - 1
          ) {
            // Last assistant message should have no bottom margin (min-height is now handled in Message component)
            messageClasses = "mb-0";
          } else {
            messageClasses = "mb-0";
          }
          return (
            <div className={messageClasses} key={message.id || index}>
              <Message
                error={error}
                handleRetry={handleRetry}
                index={index}
                isLastMessage={isLastMessage}
                isMissingAssistantResponse={isMissingAssistantResponse}
                isOwner={isOwner}
                lastUserMessageIndex={lastUserMessageIndex}
                message={message}
                messages={messages}
                onHighlight={onHighlight}
                regenerate={regenerate}
                renderPart={renderPart}
                selectedVisibilityType={selectedVisibilityType}
                sendMessage={sendMessage}
                setMessages={setMessages}
                setSuggestedQuestions={setSuggestedQuestions}
                shouldReduceHeight={
                  message.role === "assistant"
                    ? status === "submitted"
                      ? true
                      : status === "streaming"
                        ? activeAssistantIndex !== -1
                          ? index === activeAssistantIndex
                            ? isActiveAssistantSkeleton
                            : true
                          : true
                        : index !== lastAssistantIndex
                    : false
                }
                status={status}
                suggestedQuestions={
                  index === memoizedMessages.length - 1
                    ? suggestedQuestions
                    : []
                }
                user={user ?? undefined}
              />
            </div>
          );
        })}
      </div>

      {/* Loading animation when status is submitted or streaming with minimal assistant content */}
      {shouldShowLoading && (
        <div
          className={`flex items-start ${shouldReserveLoaderMinHeight ? "min-h-[calc(100vh-18rem)]" : ""} !m-0 !p-0`}
        >
          <div className="!m-0 !p-0 w-full">
            <SciraLogoHeader />
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
        </div>
      )}

      {/* Missing assistant response UI is now handled inside the assistant Message */}

      {/* Show global error when there is no assistant message to display it */}
      {error && memoizedMessages.at(-1)?.role !== "assistant" && (
        <EnhancedErrorDisplay
          error={error}
          handleRetry={handleRetry}
          selectedVisibilityType={selectedVisibilityType}
          user={user ?? undefined}
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

// Add a display name for better debugging
Messages.displayName = "Messages";

export default Messages;
