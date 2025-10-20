"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  Copy01Icon,
  Crown02Icon,
  PencilEdit02Icon,
  PlusSignCircleIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@phosphor-icons/react";
import type { UIMessagePart } from "ai";
import {
  AlertCircle,
  AlignLeft,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  LogIn,
  Maximize2,
  RefreshCw,
  X,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteTrailingMessages } from "@/app/actions";
import { ChatTextHighlighter } from "@/components/chat-text-highlighter";
import { MarkdownRenderer } from "@/components/markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  getErrorActions,
  getErrorIcon,
  isProRequired,
  isRateLimited,
  isSignInRequired,
} from "@/lib/errors";
import type {
  Attachment,
  ChatMessage,
  ChatTools,
  CustomUIDataTypes,
} from "@/lib/types";
import type { ComprehensiveUserData } from "@/lib/user-data-server";
import { cn } from "@/lib/utils";

// Enhanced Error Display Component
type EnhancedErrorDisplayProps = {
  error: any;
  handleRetry?: () => Promise<void>;
  user?: any;
  selectedVisibilityType?: "public" | "private";
};

const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  handleRetry,
  user,
  selectedVisibilityType,
}) => {
  let parsedError: any = null;
  let isChatSDKError = false;

  if (error) {
    try {
      const errorData = JSON.parse(error.message);
      if (errorData.code && errorData.message) {
        parsedError = {
          type: errorData.code.split(":")[0],
          surface: errorData.code.split(":")[1],
          message: errorData.message,
          cause: errorData.cause,
        };
        isChatSDKError = true;
      }
    } catch (_e) {
      // Not JSON, fallback
      parsedError = {
        type: "unknown",
        surface: "chat",
        message: error.message,
        cause: (error as any).cause,
      };
      isChatSDKError = false;
    }
  }

  // Get error details
  const errorIcon = getErrorIcon(parsedError as any);
  const errorMessage = isChatSDKError
    ? parsedError.message
    : typeof error === "string"
      ? error
      : (error as any).message ||
        "Something went wrong while processing your message";
  const errorCause = isChatSDKError
    ? parsedError.cause
    : typeof error === "string"
      ? undefined
      : (error as any).cause;
  const errorCode = isChatSDKError
    ? `${parsedError.type}:${parsedError.surface}`
    : null;
  const actions = isChatSDKError
    ? getErrorActions(parsedError as any)
    : { primary: { label: "Try Again", action: "retry" } };

  // Get icon component based on error type
  const getIconComponent = () => {
    switch (errorIcon) {
      case "auth":
        return (
          <UserIcon
            className="h-4 w-4 text-blue-500 dark:text-blue-300"
            weight="fill"
          />
        );
      case "upgrade":
        return (
          <HugeiconsIcon
            className="text-amber-500 dark:text-amber-300"
            color="currentColor"
            icon={Crown02Icon}
            size={16}
            strokeWidth={1.5}
          />
        );
      case "warning":
        return (
          <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-300" />
        );
      default:
        return (
          <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-300" />
        );
    }
  };

  // Get color scheme based on error type
  const getColorScheme = () => {
    switch (errorIcon) {
      case "auth":
        return {
          bg: "bg-primary/5 dark:bg-primary/10",
          border: "border-primary/20 dark:border-primary/30",
          iconBg: "bg-primary/10 dark:bg-primary/20",
          title: "text-primary dark:text-primary",
          text: "text-primary/80 dark:text-primary/80",
          button: "bg-primary hover:bg-primary/90 text-primary-foreground",
        };
      case "upgrade":
        return {
          bg: "bg-secondary/30 dark:bg-secondary/20",
          border: "border-secondary dark:border-secondary",
          iconBg: "bg-secondary/50 dark:bg-secondary/40",
          title: "text-secondary-foreground dark:text-secondary-foreground",
          text: "text-secondary-foreground/80 dark:text-secondary-foreground/80",
          button:
            "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
        };
      case "warning":
        return {
          bg: "bg-muted dark:bg-muted",
          border: "border-muted-foreground/20 dark:border-muted-foreground/30",
          iconBg: "bg-muted-foreground/10 dark:bg-muted-foreground/20",
          title: "text-muted-foreground dark:text-muted-foreground",
          text: "text-muted-foreground/80 dark:text-muted-foreground/80",
          button:
            "bg-muted-foreground hover:bg-muted-foreground/90 text-background",
        };
      default:
        return {
          bg: "bg-destructive/5 dark:bg-destructive/10",
          border: "border-destructive/20 dark:border-destructive/30",
          iconBg: "bg-destructive/10 dark:bg-destructive/20",
          title: "text-destructive dark:text-destructive",
          text: "text-destructive/80 dark:text-destructive/80",
          button:
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        };
    }
  };

  const colors = getColorScheme();

  // Handle action clicks
  const handleAction = (action: string) => {
    switch (action) {
      case "signin":
        window.location.href = "/sign-in";
        break;
      case "upgrade":
        window.location.href = "/pricing";
        break;
      case "retry":
        if (handleRetry) {
          handleRetry();
        }
        break;
      case "refresh":
        window.location.href = "/new";
        break;
      default:
        if (handleRetry) {
          handleRetry();
        }
    }
  };

  // Determine if user can perform action
  const canPerformAction = (action: string) => {
    if (action === "retry" || action === "refresh") {
      return (user || selectedVisibilityType === "private") && handleRetry;
    }
    return true;
  };

  return (
    <div className="mt-3">
      <div
        className={`rounded-lg border ${colors.border} overflow-hidden bg-background shadow-sm dark:bg-background`}
      >
        <div
          className={`${colors.bg} border-b px-4 py-3 ${colors.border} flex items-start gap-3`}
        >
          <div className="mt-0.5">
            <div className={`${colors.iconBg} rounded-full p-1.5`}>
              {getIconComponent()}
            </div>
          </div>
          <div className="flex-1">
            <h3 className={`font-medium ${colors.title}`}>
              {isChatSDKError &&
                isSignInRequired(parsedError as any) &&
                "Sign In Required"}
              {isChatSDKError &&
                (isProRequired(parsedError as any) ||
                  isRateLimited(parsedError as any)) &&
                "Upgrade Required"}
              {isChatSDKError &&
                !isSignInRequired(parsedError as any) &&
                !isProRequired(parsedError as any) &&
                !isRateLimited(parsedError as any) &&
                "Error"}
              {!isChatSDKError && "Error"}
            </h3>
            <p className={`text-sm ${colors.text} mt-0.5`}>{errorMessage}</p>
            {errorCode && (
              <p className={`text-xs ${colors.text} mt-1 font-mono`}>
                Error Code: {errorCode}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 py-3">
          {errorCause && (
            <div className="mb-3 overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-muted-foreground text-xs dark:border-border dark:bg-muted dark:text-muted-foreground">
              {errorCause.toString()}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs dark:text-muted-foreground">
              {!user && selectedVisibilityType === "public"
                ? "Please sign in to retry or try a different prompt"
                : "You can retry your request or try a different approach"}
            </p>
            <div className="flex gap-2">
              {actions.secondary &&
                canPerformAction(actions.secondary.action) && (
                  <Button
                    className="text-xs"
                    onClick={() =>
                      actions.secondary &&
                      handleAction(actions.secondary.action)
                    }
                    size="sm"
                    variant="outline"
                  >
                    {actions.secondary.action === "retry" && (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    {actions.secondary.label}
                  </Button>
                )}
              {actions.primary && canPerformAction(actions.primary.action) && (
                <Button
                  className={colors.button}
                  onClick={() =>
                    actions.primary && handleAction(actions.primary.action)
                  }
                  size="sm"
                >
                  {actions.primary.action === "signin" && (
                    <LogIn className="mr-2 h-3.5 w-3.5" />
                  )}
                  {actions.primary.action === "upgrade" && (
                    <HugeiconsIcon
                      className="mr-2"
                      color="currentColor"
                      icon={Crown02Icon}
                      size={14}
                      strokeWidth={1.5}
                    />
                  )}
                  {actions.primary.action === "retry" && (
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  )}
                  {actions.primary.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EnhancedErrorDisplay };

type MessageProps = {
  message: ChatMessage;
  index: number;
  lastUserMessageIndex: number;
  renderPart: (
    part: ChatMessage["parts"][number],
    messageIndex: number,
    partIndex: number,
    parts: ChatMessage["parts"][number][],
    message: ChatMessage
  ) => React.ReactNode;
  status: UseChatHelpers<ChatMessage>["status"];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  setSuggestedQuestions: (questions: string[]) => void;
  suggestedQuestions: string[];
  user?: ComprehensiveUserData | null;
  selectedVisibilityType?: "public" | "private";
  isLastMessage?: boolean;
  error?: any;
  isMissingAssistantResponse?: boolean;
  handleRetry?: () => Promise<void>;
  isOwner?: boolean;
  onHighlight?: (text: string) => void;
  shouldReduceHeight?: boolean;
};

// Message Editor Component
type MessageEditorProps = {
  message: ChatMessage;
  setMode: (mode: "view" | "edit") => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  messages: ChatMessage[];
  setSuggestedQuestions: (questions: string[]) => void;
  user?: ComprehensiveUserData | null;
};

const MessageEditor: React.FC<MessageEditorProps> = ({
  message,
  setMode,
  setMessages,
  regenerate,
  messages,
  setSuggestedQuestions,
  user,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(
    message.parts
      ?.map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim() || ""
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="group relative mt-2">
      <form
        className="w-full"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draftContent.trim()) {
            toast.error("Please enter a valid message.");
            return;
          }

          try {
            setIsSubmitting(true);

            if (user && message.id) {
              await deleteTrailingMessages({
                id: message.id,
              });
            }

            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const originalParts = Array.isArray(message.parts)
                  ? message.parts
                  : [];

                // Replace existing text part(s) with a single updated text part, preserving non-text parts and order
                const updatedTextPart = {
                  type: "text",
                  text: draftContent,
                } as ChatMessage["parts"][number];
                const mergedParts: ChatMessage["parts"][number][] = [];
                let textInserted = false;

                for (const p of originalParts) {
                  if (p.type === "text") {
                    if (!textInserted) {
                      mergedParts.push(updatedTextPart);
                      textInserted = true;
                    }
                  } else {
                    mergedParts.push(p);
                  }
                }

                if (!textInserted) {
                  mergedParts.unshift(updatedTextPart);
                }

                const updatedMessage: ChatMessage = {
                  ...message,
                  parts: mergedParts,
                };

                const before = messages.slice(0, index);
                return [...before, updatedMessage];
              }

              return messages;
            });

            setSuggestedQuestions([]);

            setMode("view");

            await regenerate();
          } catch (_error) {
            toast.error("Failed to update message. Please try again.");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-start gap-2">
          {user ? (
            <Avatar className="!p-0 !m-0 size-7 flex-shrink-0 self-start rounded-md">
              <AvatarImage
                alt={user.name ?? ""}
                className="!p-0 !m-0 size-7 rounded-md"
                src={user.image ?? ""}
              />
              <AvatarFallback className="m-0 size-7 rounded-md p-0 text-sm">
                {(user.name || user.email || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <HugeiconsIcon
              className="size-7 flex-shrink-0 self-start"
              icon={UserCircleIcon}
              size={24}
            />
          )}
          <div className="relative min-w-0 flex-1 grow rounded-2xl bg-accent/80 p-2">
            <Textarea
              autoFocus
              className="prose prose-sm sm:prose-base prose-neutral dark:prose-invert !text-base sm:!text-lg relative prose-p:my-1 prose-pre:my-1 min-h-[auto] w-full max-w-none resize-none overflow-hidden border-none bg-transparent p-0 pr-10 font-normal font-sans text-foreground leading-relaxed shadow-none outline-none transition-colors prose-code:before:hidden prose-code:after:hidden focus-visible:ring-0 focus-visible:ring-offset-0 sm:prose-p:my-2 sm:prose-pre:my-2 sm:pr-12 dark:text-foreground"
              onChange={handleInput}
              placeholder="Edit your message..."
              ref={textareaRef}
              style={{
                lineHeight: "1.625",
              }}
              value={draftContent}
            />

            {/* Show editable attachments inside bubble */}
            {message.parts &&
              message.parts.filter((part) => part.type === "file").length >
                0 && (
                <div className="mt-2">
                  <EditableAttachmentsBadge
                    attachments={
                      message.parts.filter(
                        (part) => part.type === "file"
                      ) as unknown as Attachment[]
                    }
                    onRemoveAttachment={(index) => {
                      // Handle attachment removal
                      const updatedAttachments = message.parts.filter(
                        (_: ChatMessage["parts"][number], i: number) =>
                          i !== index
                      );
                      // Update the message with new attachments
                      setMessages((messages) => {
                        const messageIndex = messages.findIndex(
                          (m) => m.id === message.id
                        );
                        if (messageIndex !== -1) {
                          const updatedMessage = {
                            ...message,
                            parts: updatedAttachments,
                          };
                          const updatedMessages = [...messages];
                          updatedMessages[messageIndex] = updatedMessage;
                          return updatedMessages;
                        }
                        return messages;
                      });
                    }}
                  />
                </div>
              )}

            <div className="-right-2 -bottom-4 absolute flex items-center rounded-md border border-border bg-background/95 shadow-sm backdrop-blur-sm dark:border-border dark:bg-background/95">
              <Button
                className="h-7 w-7 rounded-r-none rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted"
                disabled={
                  isSubmitting ||
                  draftContent.trim() ===
                    message.parts
                      ?.map((part) => (part.type === "text" ? part.text : ""))
                      .join("")
                      .trim()
                }
                size="icon"
                type="submit"
                variant="ghost"
              >
                {isSubmitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </Button>
              <Separator
                className="h-5 bg-border dark:bg-border"
                orientation="vertical"
              />
              <Button
                className="h-7 w-7 rounded-r-md rounded-l-none text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted"
                disabled={isSubmitting}
                onClick={() => setMode("view")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

// Max height for collapsed user messages (in pixels)
const USER_MESSAGE_MAX_HEIGHT = 120;

export const Message: React.FC<MessageProps> = ({
  message,
  index,
  lastUserMessageIndex,
  renderPart,
  status,
  messages,
  setMessages,
  sendMessage,
  setSuggestedQuestions,
  suggestedQuestions,
  user,
  selectedVisibilityType = "private",
  regenerate,
  isLastMessage,
  error,
  isMissingAssistantResponse,
  handleRetry,
  isOwner = true,
  onHighlight,
  shouldReduceHeight = false,
}) => {
  // State for expanding/collapsing long user messages
  const [isExpanded, setIsExpanded] = useState(false);
  // State to track if the message exceeds max height
  const [exceedsMaxHeight, setExceedsMaxHeight] = useState(false);
  // Ref to check content height
  const messageContentRef = React.useRef<HTMLDivElement>(null);
  // Mode state for editing
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Determine if user message should top-align avatar based on combined text length
  const combinedUserText: string = React.useMemo(
    () =>
      message.parts
        ?.map((part) => (part.type === "text" ? part.text : ""))
        .join("")
        .trim() || "",
    [message.parts]
  );

  const shouldTopAlignUser: boolean = React.useMemo(
    () => combinedUserText.length > 50,
    [combinedUserText]
  );

  // Check if message content exceeds max height
  React.useEffect(() => {
    if (messageContentRef.current) {
      const contentHeight = messageContentRef.current.scrollHeight;
      setExceedsMaxHeight(contentHeight > USER_MESSAGE_MAX_HEIGHT);
    }
  }, []);

  // Dynamic font size based on content length with mobile responsiveness
  const getDynamicFontSize = useCallback((content: string) => {
    const length = content.trim().length;
    const lines = content.split("\n").length;

    // Very short messages (like single words or short phrases)
    if (length <= 20 && lines === 1) {
      return "[&>*]:!text-lg sm:[&>*]:text-xl font-normal"; // Smaller on mobile
    }
    // Short messages (one line, moderate length)
    if (length <= 120 && lines === 1) {
      return "[&>*]:!text-base sm:[&>*]:!text-lg"; // Smaller on mobile
    }
    // Medium messages (2-3 lines or longer single line)
    if (lines <= 3 || length <= 200) {
      return "[&>*]:!text-sm sm:[&>*]:!text-base"; // Smaller on mobile
    }
    // Longer messages

    return "[&>*]:!text-sm sm:[&>*]:!text-base"; // Even smaller on mobile
  }, []);

  const handleSuggestedQuestionClick = useCallback(
    async (question: string) => {
      // Only proceed if user is authenticated for public chats
      if (selectedVisibilityType === "public" && !user) {
        return;
      }

      setSuggestedQuestions([]);

      await sendMessage({
        parts: [
          { type: "text", text: question.trim() } as UIMessagePart<
            CustomUIDataTypes,
            ChatTools
          >,
        ],
        role: "user",
      });
    },
    [sendMessage, setSuggestedQuestions, user, selectedVisibilityType]
  );

  if (message.role === "user") {
    // Check if the message has parts that should be rendered
    if (
      message.parts &&
      Array.isArray(message.parts) &&
      message.parts.length > 0
    ) {
      return (
        <div className="mb-0! px-0">
          <div className="min-w-0 grow">
            {mode === "edit" ? (
              <MessageEditor
                message={message}
                messages={messages}
                regenerate={regenerate}
                setMessages={setMessages}
                setMode={setMode}
                setSuggestedQuestions={setSuggestedQuestions}
                user={user}
              />
            ) : (
              <div className="group relative">
                <div className="relative">
                  {/* Render user message parts */}
                  {message.parts?.map(
                    (part: ChatMessage["parts"][number], partIndex: number) => {
                      if (part.type === "text") {
                        return (
                          <div
                            className={`prose prose-sm sm:prose-base prose-neutral dark:prose-invert [&>*]:!font-be-vietnam-pro prose-p:my-1 prose-pre:my-1 mt-2 prose-p:mt-0 max-w-none font-be-vietnam-pro font-normal prose-code:before:hidden prose-code:after:hidden sm:prose-p:my-2 sm:prose-pre:my-2 sm:prose-p:mt-0 ${getDynamicFontSize(part.text)} relative overflow-hidden text-foreground dark:text-foreground ${
                              !isExpanded && exceedsMaxHeight
                                ? "max-h-[120px]"
                                : ""
                            }`}
                            key={`user-${index}-${partIndex}`}
                            ref={messageContentRef}
                          >
                            <div
                              className={`flex ${shouldTopAlignUser ? "items-start" : "items-center"} justify-start gap-2`}
                            >
                              {user ? (
                                <Avatar className="!p-0 !m-0 size-7 flex-shrink-0 self-start rounded-md">
                                  <AvatarImage
                                    alt={user.name ?? ""}
                                    className="!p-0 !m-0 size-7 rounded-md"
                                    src={user.image ?? ""}
                                  />
                                  <AvatarFallback className="m-0 size-7 rounded-md p-0 text-sm">
                                    {(user.name || user.email || "?").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <HugeiconsIcon
                                  className="size-7 flex-shrink-0 self-start"
                                  icon={UserCircleIcon}
                                  size={24}
                                />
                              )}
                              <div className="min-w-0 flex-1 grow rounded-2xl bg-accent/80 p-2">
                                <ChatTextHighlighter
                                  className={`${getDynamicFontSize(part.text)}`}
                                  onHighlight={onHighlight}
                                  removeHighlightOnClick={true}
                                >
                                  <MarkdownRenderer
                                    content={part.text}
                                    isUserMessage={true}
                                  />
                                </ChatTextHighlighter>
                                {message.parts?.filter(
                                  (part) => part.type === "file"
                                ) &&
                                  message.parts?.filter(
                                    (part) => part.type === "file"
                                  ).length > 0 && (
                                    <div className="mt-2">
                                      <AttachmentsBadge
                                        attachments={
                                          message.parts?.filter(
                                            (part) => part.type === "file"
                                          ) as unknown as Attachment[]
                                        }
                                      />
                                    </div>
                                  )}
                              </div>
                            </div>

                            {!isExpanded && exceedsMaxHeight && (
                              <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-background to-transparent" />
                            )}
                          </div>
                        );
                      }
                      return null; // Skip non-text parts for user messages
                    }
                  )}

                  {/* If no parts have text, fall back to the content property */}
                  {!message.parts?.some(
                    (part) => part.type === "text" && part.text
                  ) && (
                    <div
                      className={`prose prose-sm sm:prose-base prose-neutral dark:prose-invert [&>*]:!font-be-vietnam-pro prose-p:my-1 prose-pre:my-1 mt-2 prose-p:mt-0 max-w-none font-normal prose-code:before:hidden prose-code:after:hidden sm:prose-p:my-2 sm:prose-pre:my-2 sm:prose-p:mt-0 ${getDynamicFontSize(
                        message.parts
                          ?.map((part) =>
                            part.type === "text" ? part.text : ""
                          )
                          .join("")
                          .trim() || ""
                      )} relative overflow-hidden text-foreground dark:text-foreground ${
                        !isExpanded && exceedsMaxHeight ? "max-h-[120px]" : ""
                      }`}
                      ref={messageContentRef}
                    >
                      <div
                        className={`flex ${shouldTopAlignUser ? "items-start" : "items-center"} justify-start gap-2`}
                      >
                        {user ? (
                          <Avatar className="!p-0 !m-0 size-7 flex-shrink-0 self-start rounded-md">
                            <AvatarImage
                              alt={user.name ?? ""}
                              className="!p-0 !m-0 size-7 rounded-md"
                              src={user.image ?? ""}
                            />
                            <AvatarFallback className="m-0 size-7 rounded-md p-0 text-sm">
                              {(user.name || user.email || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <HugeiconsIcon
                            className="size-7 flex-shrink-0 self-start"
                            icon={UserCircleIcon}
                            size={24}
                          />
                        )}
                        <div className="min-w-0 flex-1 grow rounded-2xl bg-accent/80 p-2">
                          <ChatTextHighlighter
                            className={`${getDynamicFontSize(
                              message.parts
                                ?.map((part) =>
                                  part.type === "text" ? part.text : ""
                                )
                                .join("")
                                .trim() || ""
                            )}`}
                            onHighlight={onHighlight}
                            removeHighlightOnClick={true}
                          >
                            <MarkdownRenderer
                              content={
                                message.parts
                                  ?.map((part) =>
                                    part.type === "text" ? part.text : ""
                                  )
                                  .join("")
                                  .trim() || ""
                              }
                              isUserMessage={true}
                            />
                          </ChatTextHighlighter>
                          {message.parts?.filter(
                            (part) => part.type === "file"
                          ) &&
                            message.parts?.filter(
                              (part) => part.type === "file"
                            ).length > 0 && (
                              <div className="mt-2">
                                <AttachmentsBadge
                                  attachments={
                                    message.parts?.filter(
                                      (part) => part.type === "file"
                                    ) as unknown as Attachment[]
                                  }
                                />
                              </div>
                            )}
                        </div>
                      </div>

                      {!isExpanded && exceedsMaxHeight && (
                        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-background to-transparent" />
                      )}
                    </div>
                  )}

                  {exceedsMaxHeight && (
                    <div className="mt-0.5 flex justify-center">
                      <Button
                        aria-label={isExpanded ? "Show less" : "Show more"}
                        className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                        onClick={() => setIsExpanded(!isExpanded)}
                        size="sm"
                        variant="ghost"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}

                  <div className="-bottom-4 absolute right-0 flex transform items-center rounded-md border border-border bg-background/95 opacity-100 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 dark:border-border dark:bg-background/95">
                    {((user && isOwner) ||
                      (!user && selectedVisibilityType === "private")) && (
                      <Button
                        aria-label="Edit message"
                        className="h-7 w-7 rounded-r-none rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted"
                        disabled={
                          status === "submitted" || status === "streaming"
                        }
                        onClick={() => setMode("edit")}
                        size="icon"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          className="size-6 flex-shrink-0 pl-1"
                          icon={PencilEdit02Icon}
                          size={24}
                        />
                      </Button>
                    )}
                    <Separator
                      className="h-5 bg-black dark:bg-white"
                      orientation="vertical"
                    />
                    <Button
                      aria-label="Copy message"
                      className={`h-7 w-7 ${
                        (!(user && isOwner)) &&
                        selectedVisibilityType === "public"
                          ? "rounded-md"
                          : "rounded-r-md rounded-l-none"
                      } text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted`}
                      onClick={() => {
                        navigator.clipboard.writeText(
                          message.parts
                            ?.map((part) =>
                              part.type === "text" ? part.text : ""
                            )
                            .join("")
                            .trim() || ""
                        );
                        toast.success("Copied to clipboard");
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <HugeiconsIcon
                        className="size-6 flex-shrink-0 pr-1"
                        icon={Copy01Icon}
                        size={24}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback to the original rendering if no parts are present
    return (
      <div className="mb-0! px-0">
        <div className="min-w-0 grow">
          {mode === "edit" ? (
            <MessageEditor
              message={message}
              messages={messages}
              regenerate={regenerate}
              setMessages={setMessages}
              setMode={setMode}
              setSuggestedQuestions={setSuggestedQuestions}
              user={user}
            />
          ) : (
            <div className="group relative">
              <div className="relative">
                <div
                  className={`prose prose-sm sm:prose-base prose-neutral dark:prose-invert prose-p:my-1 prose-pre:my-1 mt-2 prose-p:mt-0 max-w-none font-normal prose-code:before:hidden prose-code:after:hidden sm:prose-p:my-2 sm:prose-pre:my-2 sm:prose-p:mt-0 [&>*]:font-be-vietnam-pro! ${getDynamicFontSize(
                    message.parts
                      ?.map((part) => (part.type === "text" ? part.text : ""))
                      .join("")
                      .trim() || ""
                  )} relative overflow-hidden text-foreground dark:text-foreground ${
                    !isExpanded && exceedsMaxHeight ? "max-h-[120px]" : ""
                  }`}
                  ref={messageContentRef}
                >
                  <div
                    className={`flex ${shouldTopAlignUser ? "items-start" : "items-center"} justify-start gap-2`}
                  >
                    {user ? (
                      <Avatar className="!p-0 !m-0 size-7 flex-shrink-0 self-start rounded-md">
                        <AvatarImage
                          alt={user.name ?? ""}
                          className="!p-0 !m-0 size-7 rounded-md"
                          src={user.image ?? ""}
                        />
                        <AvatarFallback className="m-0 size-7 rounded-md p-0 text-sm">
                          {(user.name || user.email || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <HugeiconsIcon
                        className="size-7 flex-shrink-0 self-start"
                        icon={UserCircleIcon}
                        size={24}
                      />
                    )}
                    <div className="min-w-0 flex-1 grow rounded-2xl bg-accent/80 p-2">
                      <ChatTextHighlighter
                        className={`${getDynamicFontSize(
                          message.parts
                            ?.map((part) =>
                              part.type === "text" ? part.text : ""
                            )
                            .join("")
                            .trim() || ""
                        )}`}
                        onHighlight={onHighlight}
                        removeHighlightOnClick={true}
                      >
                        <MarkdownRenderer
                          content={
                            message.parts
                              ?.map((part) =>
                                part.type === "text" ? part.text : ""
                              )
                              .join("")
                              .trim() || ""
                          }
                          isUserMessage={true}
                        />
                      </ChatTextHighlighter>
                      {message.parts?.filter((part) => part.type === "file") &&
                        message.parts?.filter((part) => part.type === "file")
                          .length > 0 && (
                          <div className="mt-2">
                            <AttachmentsBadge
                              attachments={
                                message.parts?.filter(
                                  (part) => part.type === "file"
                                ) as unknown as Attachment[]
                              }
                            />
                          </div>
                        )}
                    </div>
                  </div>

                  {!isExpanded && exceedsMaxHeight && (
                    <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-gradient-to-t from-background to-transparent" />
                  )}
                </div>

                {exceedsMaxHeight && (
                  <div className="mt-0.5 flex justify-center">
                    <Button
                      aria-label={isExpanded ? "Show less" : "Show more"}
                      className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
                      onClick={() => setIsExpanded(!isExpanded)}
                      size="sm"
                      variant="ghost"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                <div className="-bottom-4 absolute right-0 flex transform items-center rounded-md border border-border bg-background/95 opacity-100 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md sm:translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100 dark:border-border dark:bg-background/95">
                  {/* Only show edit button for owners OR unauthenticated users on private chats */}
                  {((user && isOwner) ||
                    (!user && selectedVisibilityType === "private")) && (
                    <Button
                      aria-label="Edit message"
                      className="h-7 w-7 rounded-r-none rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted"
                      disabled={
                        status === "submitted" || status === "streaming"
                      }
                      onClick={() => setMode("edit")}
                      size="icon"
                      variant="ghost"
                    >
                      <HugeiconsIcon
                        className="size-6 flex-shrink-0 pl-1 text-primary"
                        icon={PencilEdit02Icon}
                        size={24}
                      />
                    </Button>
                  )}
                  <Separator
                    className="h-5 bg-black dark:bg-white"
                    orientation="vertical"
                  />
                  <Button
                    aria-label="Copy message"
                    className={`h-7 w-7 ${
                      (!(user && isOwner)) &&
                      selectedVisibilityType === "public"
                        ? "rounded-md"
                        : "rounded-r-md rounded-l-none"
                    } text-muted-foreground transition-colors hover:bg-muted hover:text-primary dark:text-muted-foreground dark:hover:bg-muted`}
                    onClick={() => {
                      navigator.clipboard.writeText(
                        message.parts
                          ?.map((part) =>
                            part.type === "text" ? part.text : ""
                          )
                          .join("")
                          .trim() || ""
                      );
                      toast.success("Copied to clipboard");
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <HugeiconsIcon
                      className="size-6 flex-shrink-0 pr-1"
                      icon={Copy01Icon}
                      size={24}
                    />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    return (
      <div
        className={cn(
          shouldReduceHeight ? "" : "min-h-[calc(100vh-18rem)]",
          ""
        )}
      >
        {message.parts?.map(
          (part: ChatMessage["parts"][number], partIndex: number) => {
            const key = `${message.id || index}-part-${partIndex}-${part.type}`;
            return (
              <div key={key}>
                {renderPart(
                  part,
                  index,
                  partIndex,
                  message.parts as ChatMessage["parts"][number][],
                  message
                )}
              </div>
            );
          }
        )}

        {/* Missing assistant response UI moved inside assistant message */}
        {isMissingAssistantResponse && (
          <div className="mt-4 flex items-start">
            <div className="w-full">
              <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/10 p-4 dark:border-primary/20">
                <div className="mb-4 max-w-2xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary-foreground dark:text-secondary-foreground" />
                    <div className="flex-1">
                      <h3 className="mb-1 font-medium text-secondary-foreground dark:text-secondary-foreground">
                        No response generated
                      </h3>
                      <p className="text-secondary-foreground/80 text-sm dark:text-secondary-foreground/80">
                        It looks like the assistant didn’t provide a response to
                        your message.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex max-w-2xl items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 dark:border-primary/20">
                  <p className="text-muted-foreground text-xs dark:text-muted-foreground">
                    {!user && selectedVisibilityType === "public"
                      ? "Please sign in to retry or try a different prompt"
                      : "Try regenerating the response or rephrase your question"}
                  </p>
                  {(user || selectedVisibilityType === "private") && (
                    <Button
                      className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      onClick={handleRetry}
                      size="sm"
                    >
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Generate Response
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display error message with retry button */}
        {error && (
          <EnhancedErrorDisplay
            error={error}
            handleRetry={handleRetry}
            selectedVisibilityType={selectedVisibilityType}
            user={user}
          />
        )}

        {suggestedQuestions.length > 0 &&
          (user || selectedVisibilityType === "private") &&
          status !== "streaming" && (
            <div className="mt-4 w-full max-w-xl sm:max-w-2xl">
              <div className="mb-2 flex items-center gap-1.5 pr-3">
                <AlignLeft
                  className="text-muted-foreground dark:text-muted-foreground"
                  size={16}
                />
                <h2 className="texl-lg font-medium text-foreground dark:text-foreground">
                  Suggested questions
                </h2>
              </div>
              <div className="flex flex-col border-border border-t dark:border-border">
                {suggestedQuestions.map((question, i) => (
                  <button
                    className="flex w-full items-center justify-between border-border border-b px-1 py-2.5 text-left last:border-none dark:border-border"
                    key={i}
                    onClick={() => handleSuggestedQuestionClick(question)}
                  >
                    <span className="pr-3 font-normal text-foreground text-sm hover:text-primary/80 dark:text-foreground dark:hover:text-primary/80">
                      {question}
                    </span>
                    <HugeiconsIcon
                      className="flex-shrink-0 pr-1 text-primary"
                      icon={PlusSignCircleIcon}
                      size={22}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
      </div>
    );
  }

  return null;
};

// Add display name for better debugging
Message.displayName = "Message";

// Editable attachments badge component for edit mode
export const EditableAttachmentsBadge = ({
  attachments,
  onRemoveAttachment,
}: {
  attachments: Attachment[];
  onRemoveAttachment: (index: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) =>
      att.contentType?.startsWith("image/") ||
      att.mediaType?.startsWith("image/") ||
      att.contentType === "application/pdf" ||
      att.mediaType === "application/pdf"
  );

  if (fileAttachments.length === 0) {
    return null;
  }

  const isPdf = (attachment: Attachment) =>
    attachment.contentType === "application/pdf" ||
    attachment.mediaType === "application/pdf";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName =
            fileName.length > 15 ? `${fileName.substring(0, 12)}...` : fileName;

          const isImage =
            attachment.contentType?.startsWith("image/") ||
            attachment.mediaType?.startsWith("image/");

          return (
            <div
              className="group flex max-w-xs items-center gap-1.5 rounded-full border border-border bg-muted py-1 pr-2 pl-1 dark:border-border dark:bg-muted"
              key={i}
            >
              <button
                className="flex items-center gap-1.5 rounded-full pr-1 pl-0 transition-colors hover:bg-muted-foreground/10 dark:hover:bg-muted-foreground/10"
                onClick={() => {
                  setSelectedIndex(i);
                  setIsOpen(true);
                }}
              >
                <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background dark:bg-background">
                  {isPdf(attachment) ? (
                    <svg
                      className="text-red-500 dark:text-red-400"
                      fill="none"
                      height="14"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M9 15v-2h6v2" />
                      <path d="M12 18v-5" />
                    </svg>
                  ) : isImage ? (
                    <Image
                      alt={fileName}
                      className="object-cover"
                      fill
                      sizes="24px"
                      src={attachment.url}
                    />
                  ) : (
                    <svg
                      className="text-blue-500 dark:text-blue-400"
                      fill="none"
                      height="14"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      width="14"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </div>
                <span className="truncate font-medium text-foreground text-xs dark:text-foreground">
                  {truncatedName}
                </span>
              </button>

              <Button
                className="h-4 w-4 p-0 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100 dark:hover:text-destructive"
                onClick={() => onRemoveAttachment(i)}
                size="icon"
                title="Remove attachment"
                variant="ghost"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogContent className="max-h-[85vh] w-[90vw] overflow-hidden bg-background p-0 sm:max-w-3xl dark:bg-background">
          <div className="flex h-full max-h-[85vh] flex-col">
            <header className="flex items-center justify-between border-border border-b p-2 dark:border-border">
              <div className="flex items-center gap-2">
                <Button
                  className="h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      fileAttachments[selectedIndex].url
                    );
                    toast.success("File URL copied to clipboard");
                  }}
                  size="icon"
                  title="Copy link"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                  download={fileAttachments[selectedIndex].name}
                  href={fileAttachments[selectedIndex].url}
                  target="_blank"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-xs dark:border-border dark:bg-background"
                  variant="secondary"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex flex-1 items-center justify-center overflow-auto p-1">
              <div className="relative flex h-full w-full items-center justify-center">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="mx-auto flex h-[60vh] w-full flex-col overflow-hidden rounded-md border border-border dark:border-border">
                    <div className="flex items-center justify-between border-border border-b bg-muted px-2 py-1.5 dark:border-border dark:bg-muted">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="max-w-[200px] truncate font-medium text-foreground text-sm dark:text-foreground">
                          {fileAttachments[selectedIndex].name ||
                            `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/10 dark:text-muted-foreground dark:hover:bg-muted-foreground/10"
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          title="Open fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="w-full flex-1 bg-white">
                      <object
                        className="h-full w-full"
                        data={fileAttachments[selectedIndex].url}
                        type="application/pdf"
                      >
                        <div className="flex h-full w-full flex-col items-center justify-center bg-muted dark:bg-muted">
                          <FileText className="mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
                          <p className="mb-2 text-muted-foreground text-sm dark:text-muted-foreground">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              className="rounded-md bg-red-500 px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-red-600"
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                            >
                              Open PDF
                            </a>
                            <a
                              className="rounded-md bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted-foreground/10 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted-foreground/10"
                              download={fileAttachments[selectedIndex].name}
                              href={fileAttachments[selectedIndex].url}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[60vh] items-center justify-center">
                    <div className="relative h-full w-full">
                      <Image
                        alt={
                          fileAttachments[selectedIndex].name ||
                          `Image ${selectedIndex + 1}`
                        }
                        className="rounded-md object-contain"
                        fill
                        sizes="100vw"
                        src={fileAttachments[selectedIndex].url}
                      />
                    </div>
                  </div>
                )}

                {fileAttachments.length > 1 && (
                  <>
                    <Button
                      className="-translate-y-1/2 absolute top-1/2 left-2 h-8 w-8 transform rounded-full border border-border bg-background/90 shadow-xs dark:border-border dark:bg-background/90"
                      onClick={() =>
                        setSelectedIndex((prev) =>
                          prev === 0 ? fileAttachments.length - 1 : prev - 1
                        )
                      }
                      size="icon"
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      className="-translate-y-1/2 absolute top-1/2 right-2 h-8 w-8 transform rounded-full border border-border bg-background/90 shadow-xs dark:border-border dark:bg-background/90"
                      onClick={() =>
                        setSelectedIndex((prev) =>
                          prev === fileAttachments.length - 1 ? 0 : prev + 1
                        )
                      }
                      size="icon"
                      variant="outline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {fileAttachments.length > 1 && (
              <div className="border-neutral-200 border-t p-2 dark:border-neutral-800">
                <div className="flex max-w-full items-center justify-center gap-2 overflow-x-auto py-1">
                  {fileAttachments.map((attachment, idx) => (
                    <button
                      className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md transition-all ${
                        selectedIndex === idx
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                    >
                      {isPdf(attachment) ? (
                        <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                          <svg
                            className="text-red-500 dark:text-red-400"
                            fill="none"
                            height="14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="14"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      ) : (
                        <Image
                          alt={
                            attachment.name?.trim().length
                              ? attachment.name
                              : `Thumbnail ${idx + 1}`
                          }
                          className="object-cover"
                          fill
                          sizes="40px"
                          src={attachment.url}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="border-neutral-200 border-t p-2 dark:border-neutral-800">
              <div className="flex items-center justify-between text-neutral-600 text-xs dark:text-neutral-400">
                <span className="max-w-[70%] truncate">
                  {fileAttachments[selectedIndex].name ||
                    `File ${selectedIndex + 1}`}
                </span>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export the attachments badge component for reuse
export const AttachmentsBadge = ({
  attachments,
}: {
  attachments: Attachment[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const fileAttachments = attachments.filter(
    (att) =>
      att.contentType?.startsWith("image/") ||
      att.mediaType?.startsWith("image/") ||
      att.contentType === "application/pdf" ||
      att.mediaType === "application/pdf"
  );

  React.useEffect(() => {}, []);

  if (fileAttachments.length === 0) {
    return null;
  }

  const isPdf = (attachment: Attachment) =>
    attachment.contentType === "application/pdf" ||
    attachment.mediaType === "application/pdf";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {fileAttachments.map((attachment, i) => {
          // Truncate filename to 15 characters
          const fileName = attachment.name || `File ${i + 1}`;
          const truncatedName =
            fileName.length > 15 ? `${fileName.substring(0, 12)}...` : fileName;

          const fileExtension = fileName.split(".").pop()?.toLowerCase();
          const isImage =
            attachment.contentType?.startsWith("image/") ||
            attachment.mediaType?.startsWith("image/");

          return (
            <button
              className="flex max-w-xs items-center gap-1.5 rounded-full border border-border bg-muted py-1 pr-3 pl-1 transition-colors hover:bg-muted-foreground/10 dark:border-border dark:bg-muted dark:hover:bg-muted-foreground/10"
              key={i}
              onClick={() => {
                setSelectedIndex(i);
                setIsOpen(true);
              }}
            >
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background dark:bg-background">
                {isPdf(attachment) ? (
                  <svg
                    className="text-red-500 dark:text-red-400"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M9 15v-2h6v2" />
                    <path d="M12 18v-5" />
                  </svg>
                ) : isImage ? (
                  <Image
                    alt={fileName}
                    className="object-cover"
                    fill
                    sizes="24px"
                    src={attachment.url}
                  />
                ) : (
                  <svg
                    className="text-blue-500 dark:text-blue-400"
                    fill="none"
                    height="14"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
              </div>
              <span className="truncate font-medium text-foreground text-xs dark:text-foreground">
                {truncatedName}
                {fileExtension && !isPdf(attachment) && !isImage && (
                  <span className="ml-0.5 text-muted-foreground dark:text-muted-foreground">
                    .{fileExtension}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogContent className="max-h-[85vh] w-[90vw] overflow-hidden bg-background p-0 sm:max-w-3xl dark:bg-background">
          <div className="flex h-full max-h-[85vh] flex-col">
            <header className="flex items-center justify-between border-border border-b p-2 dark:border-border">
              <div className="flex items-center gap-2">
                <Button
                  className="h-8 w-8 rounded-md text-muted-foreground dark:text-muted-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      fileAttachments[selectedIndex].url
                    );
                    toast.success("File URL copied to clipboard");
                  }}
                  size="icon"
                  title="Copy link"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <a
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                  download={fileAttachments[selectedIndex].name}
                  href={fileAttachments[selectedIndex].url}
                  target="_blank"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>

                {isPdf(fileAttachments[selectedIndex]) && (
                  <a
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
                    href={fileAttachments[selectedIndex].url}
                    target="_blank"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Badge
                  className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium text-xs dark:border-border dark:bg-background"
                  variant="secondary"
                >
                  {selectedIndex + 1} of {fileAttachments.length}
                </Badge>
              </div>

              <DialogClose className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted dark:text-muted-foreground dark:hover:bg-muted">
                <X className="h-4 w-4" />
              </DialogClose>
            </header>

            <div className="flex flex-1 items-center justify-center overflow-auto p-1">
              <div className="relative flex h-full w-full items-center justify-center">
                {isPdf(fileAttachments[selectedIndex]) ? (
                  <div className="mx-auto flex h-[60vh] w-full flex-col overflow-hidden rounded-md border border-border dark:border-border">
                    <div className="flex items-center justify-between border-border border-b bg-muted px-2 py-1.5 dark:border-border dark:bg-muted">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="max-w-[200px] truncate font-medium text-foreground text-sm dark:text-foreground">
                          {fileAttachments[selectedIndex].name ||
                            `PDF ${selectedIndex + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-foreground/10 dark:text-muted-foreground dark:hover:bg-muted-foreground/10"
                          href={fileAttachments[selectedIndex].url}
                          target="_blank"
                          title="Open fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="w-full flex-1 bg-white">
                      <object
                        className="h-full w-full"
                        data={fileAttachments[selectedIndex].url}
                        type="application/pdf"
                      >
                        <div className="flex h-full w-full flex-col items-center justify-center bg-muted dark:bg-muted">
                          <FileText className="mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
                          <p className="mb-2 text-muted-foreground text-sm dark:text-muted-foreground">
                            PDF cannot be displayed directly
                          </p>
                          <div className="flex gap-2">
                            <a
                              className="rounded-md bg-red-500 px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-red-600"
                              href={fileAttachments[selectedIndex].url}
                              target="_blank"
                            >
                              Open PDF
                            </a>
                            <a
                              className="rounded-md bg-muted px-3 py-1.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted-foreground/10 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted-foreground/10"
                              download={fileAttachments[selectedIndex].name}
                              href={fileAttachments[selectedIndex].url}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </object>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[60vh] items-center justify-center">
                    <div className="relative h-full w-full">
                      <Image
                        alt={
                          fileAttachments[selectedIndex].name ||
                          `Image ${selectedIndex + 1}`
                        }
                        className="rounded-md object-contain"
                        fill
                        sizes="100vw"
                        src={fileAttachments[selectedIndex].url}
                      />
                    </div>
                  </div>
                )}

                {fileAttachments.length > 1 && (
                  <>
                    <Button
                      className="-translate-y-1/2 absolute top-1/2 left-2 h-8 w-8 transform rounded-full border border-border bg-background/90 shadow-xs dark:border-border dark:bg-background/90"
                      onClick={() =>
                        setSelectedIndex((prev) =>
                          prev === 0 ? fileAttachments.length - 1 : prev - 1
                        )
                      }
                      size="icon"
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      className="-translate-y-1/2 absolute top-1/2 right-2 h-8 w-8 transform rounded-full border border-border bg-background/90 shadow-xs dark:border-border dark:bg-background/90"
                      onClick={() =>
                        setSelectedIndex((prev) =>
                          prev === fileAttachments.length - 1 ? 0 : prev + 1
                        )
                      }
                      size="icon"
                      variant="outline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {fileAttachments.length > 1 && (
              <div className="border-border border-t p-2 dark:border-border">
                <div className="flex max-w-full items-center justify-center gap-2 overflow-x-auto py-1">
                  {fileAttachments.map((attachment, idx) => (
                    <button
                      className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md transition-all ${
                        selectedIndex === idx
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                    >
                      {isPdf(attachment) ? (
                        <div className="flex h-full w-full items-center justify-center bg-muted dark:bg-muted">
                          <svg
                            className="text-red-500 dark:text-red-400"
                            fill="none"
                            height="14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            width="14"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                      ) : (
                        <Image
                          alt={
                            attachment.name?.trim().length
                              ? attachment.name
                              : `Thumbnail ${idx + 1}`
                          }
                          className="object-cover"
                          fill
                          sizes="40px"
                          src={attachment.url}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <footer className="border-border border-t p-2 dark:border-border">
              <div className="flex items-center justify-between text-muted-foreground text-xs dark:text-muted-foreground">
                <span className="max-w-[70%] truncate">
                  {fileAttachments[selectedIndex].name ||
                    `File ${selectedIndex + 1}`}
                </span>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
