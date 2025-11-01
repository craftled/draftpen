"use client";

// Third-party library imports
import { useChat } from "@ai-sdk/react";
import { Crown02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DefaultChatTransport } from "ai";
import { Clock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
// React and React-related imports
import type React from "react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { requiresProSubscription } from "@/ai/providers";
// Internal app imports
import { suggestQuestions, updateChatVisibility } from "@/app/actions";
// Component imports
import { ChatDialogs } from "@/components/chat-dialogs";
// State management imports
import { chatReducer, createInitialState } from "@/components/chat-state";
import Messages from "@/components/messages";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import FormComponent from "@/components/ui/form-component";
import { useUser } from "@/contexts/user-context";
// Hook imports
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useOptimizedScroll } from "@/hooks/use-optimized-scroll";
import { useUsageData } from "@/hooks/use-usage-data";
import type { ConnectorProvider } from "@/lib/connectors";
// Utility and type imports
import { SEARCH_LIMITS } from "@/lib/constants";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { cn, invalidateChatsCache, type SearchGroupId } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";

type ChatInterfaceProps = {
  initialChatId?: string;
  initialMessages?: any[];
  initialVisibility?: "public" | "private";
  isOwner?: boolean;
};

const ChatInterface = memo(
  ({
    initialChatId,
    initialMessages,
    initialVisibility = "private",
    isOwner = true,
  }: ChatInterfaceProps): React.JSX.Element => {
    const _router = useRouter();
    const [query] = useQueryState("query", parseAsString.withDefault(""));
    const [q] = useQueryState("q", parseAsString.withDefault(""));
    const [input, setInput] = useState<string>("");

    const [selectedModel, setSelectedModel] = useLocalStorage(
      "selected-model",
      "gpt5-mini"
    );
    const [selectedGroup, setSelectedGroup] = useLocalStorage<SearchGroupId>(
      "scira-selected-group",
      "web"
    );
    const [selectedConnectors, setSelectedConnectors] = useState<
      ConnectorProvider[]
    >([]);
    const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] =
      useLocalStorage("scira-custom-instructions-enabled", true);

    // Settings dialog state management with URL hash support
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] =
      useState<string>("profile");

    // Function to open settings with a specific tab
    const handleOpenSettings = useCallback((tab = "profile") => {
      setSettingsInitialTab(tab);
      setSettingsOpen(true);
    }, []);

    // URL hash detection for settings dialog
    useEffect(() => {
      const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash === "#settings") {
          setSettingsOpen(true);
        }
      };

      // Check initial hash
      handleHashChange();

      // Listen for hash changes
      window.addEventListener("hashchange", handleHashChange);

      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }, []);

    // Update URL hash when settings dialog opens/closes
    useEffect(() => {
      if (settingsOpen) {
        // Only update hash if it's not already #settings to prevent infinite loops
        if (window.location.hash !== "#settings") {
          window.history.pushState(null, "", "#settings");
        }
      } else {
        // Remove hash if settings is closed and hash is #settings
        if (window.location.hash === "#settings") {
          // Use replaceState to avoid adding to browser history
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }
      }
    }, [settingsOpen]);

    // Get persisted values for dialog states
    const [persistedHasShownUpgradeDialog, setPersitedHasShownUpgradeDialog] =
      useLocalStorage("scira-upgrade-prompt-shown", false);
    const [persistedHasShownSignInPrompt, setPersitedHasShownSignInPrompt] =
      useLocalStorage("scira-signin-prompt-shown", false);
    const [
      persistedHasShownLookoutAnnouncement,
      setPersitedHasShownLookoutAnnouncement,
    ] = useLocalStorage("scira-lookout-announcement-shown", false);

    const [searchProvider, _] = useLocalStorage<
      "exa" | "parallel" | "firecrawl"
    >("scira-search-provider", "parallel");

    // Use reducer for complex state management
    const [chatState, dispatch] = useReducer(
      chatReducer,
      createInitialState(
        initialVisibility,
        persistedHasShownUpgradeDialog,
        persistedHasShownSignInPrompt,
        persistedHasShownLookoutAnnouncement
      )
    );

    const {
      user,
      subscriptionData,
      isProUser: isUserPro,
      isLoading: proStatusLoading,
      shouldCheckLimits: shouldCheckUserLimits,
      shouldBypassLimitsForModel,
      isInTrial,
      daysLeftInTrial,
    } = useUser();

    const { setDataStream } = useDataStream();

    const initialState = useMemo(
      () => ({
        query: query || q,
      }),
      [query, q]
    );

    const lastSubmittedQueryRef = useRef(initialState.query);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const inputRef = useRef<HTMLTextAreaElement>(null!);
    const initializedRef = useRef(false);

    // Use optimized scroll hook
    const { scrollToBottom, markManualScroll, resetManualScroll } =
      useOptimizedScroll(bottomRef);

    // Listen for manual scroll (wheel and touch)
    useEffect(() => {
      const handleManualScroll = () => markManualScroll();
      window.addEventListener("wheel", handleManualScroll);
      window.addEventListener("touchmove", handleManualScroll);
      return () => {
        window.removeEventListener("wheel", handleManualScroll);
        window.removeEventListener("touchmove", handleManualScroll);
      };
    }, [markManualScroll]);

    // Use clean React Query hooks for all data fetching
    const { data: usageData, refetch: refetchUsage } = useUsageData(
      user || null
    );

    // Sign-in prompt timer
    const signInTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Generate a consistent ID for new chats
    const chatId = useMemo(() => initialChatId ?? uuidv4(), [initialChatId]);

    // Pro users bypass all limit checks - much cleaner!
    const shouldBypassLimits = shouldBypassLimitsForModel(selectedModel);
    const hasExceededLimit =
      shouldCheckUserLimits &&
      !proStatusLoading &&
      !shouldBypassLimits &&
      usageData &&
      usageData.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
    const isLimitBlocked = Boolean(hasExceededLimit);

    // Auto-switch away from pro models when user loses pro access
    useEffect(() => {
      if (proStatusLoading) {
        return;
      }

      const currentModelRequiresPro = requiresProSubscription(selectedModel);

      // If current model requires pro but user is not pro, switch to default
      // Also prevent infinite loops by ensuring we're not already on the default model
      if (
        currentModelRequiresPro &&
        !isUserPro &&
        selectedModel !== "gpt5-mini"
      ) {
        setSelectedModel("gpt5-mini");

        // Show a toast notification to inform the user
        toast.info(
          "Switched to default model - Pro subscription required for premium models"
        );
      }
    }, [selectedModel, isUserPro, proStatusLoading, setSelectedModel]);

    // Timer for sign-in prompt for unauthenticated users
    useEffect(() => {
      // If user becomes authenticated, reset the prompt flag and clear timer
      if (user) {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
          signInTimerRef.current = null;
        }
        // Reset the flag so it can show again in future sessions if they log out
        setPersitedHasShownSignInPrompt(false);
        return;
      }

      // Only start timer if user is not authenticated and hasn't been shown the prompt yet
      if (!(user || chatState.hasShownSignInPrompt)) {
        // Clear any existing timer
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }

        // Set timer for 1 minute (60000 ms)
        signInTimerRef.current = setTimeout(() => {
          dispatch({ type: "SET_SHOW_SIGNIN_PROMPT", payload: true });
          dispatch({ type: "SET_HAS_SHOWN_SIGNIN_PROMPT", payload: true });
          setPersitedHasShownSignInPrompt(true);
        }, 60_000);
      }

      // Cleanup timer on unmount
      return () => {
        if (signInTimerRef.current) {
          clearTimeout(signInTimerRef.current);
        }
      };
    }, [user, chatState.hasShownSignInPrompt, setPersitedHasShownSignInPrompt]);

    // Timer for lookout announcement - show after 30 seconds for authenticated users
    useEffect(() => {
      if (user && !chatState.hasShownAnnouncementDialog) {
        const timer = setTimeout(() => {
          dispatch({ type: "SET_SHOW_ANNOUNCEMENT_DIALOG", payload: true });
          dispatch({
            type: "SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG",
            payload: true,
          });
          setPersitedHasShownLookoutAnnouncement(true);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }, [
      user,
      chatState.hasShownAnnouncementDialog,
      setPersitedHasShownLookoutAnnouncement,
    ]);

    type VisibilityType = "public" | "private";

    // Create refs to store current values to avoid closure issues
    const selectedModelRef = useRef(selectedModel);
    const selectedGroupRef = useRef(selectedGroup);
    const isCustomInstructionsEnabledRef = useRef(isCustomInstructionsEnabled);
    const searchProviderRef = useRef(searchProvider);
    const selectedConnectorsRef = useRef(selectedConnectors);

    // Update refs whenever state changes - this ensures we always have current values
    selectedModelRef.current = selectedModel;
    selectedGroupRef.current = selectedGroup;
    isCustomInstructionsEnabledRef.current = isCustomInstructionsEnabled;
    searchProviderRef.current = searchProvider;
    selectedConnectorsRef.current = selectedConnectors;

    const {
      messages,
      sendMessage,
      setMessages,
      regenerate,
      stop,
      status,
      error,
      resumeStream,
    } = useChat<ChatMessage>({
      id: chatId,
      messages: initialMessages ?? [],
      transport: new DefaultChatTransport({
        api: "/api/search",
        prepareSendMessagesRequest({ messages, body }) {
          // Use ref values to get current state
          return {
            body: {
              id: chatId,
              messages,
              model: selectedModelRef.current,
              group: selectedGroupRef.current,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              isCustomInstructionsEnabled:
                isCustomInstructionsEnabledRef.current,
              searchProvider: searchProviderRef.current,
              selectedConnectors: selectedConnectorsRef.current,
              selectedVisibilityType: chatState.selectedVisibilityType,
              ...(initialChatId ? { chat_id: initialChatId } : {}),
              ...body,
            },
          };
        },
      }),
      experimental_throttle: 100,
      onData: (dataPart) => {
        setDataStream((ds) => (ds ? [...ds, dataPart as any] : []));
      },
      onFinish: async ({ message }) => {
        // Refresh usage data after message completion for authenticated users
        if (user) {
          refetchUsage();
        }

        // Check if this is the first message completion and user is not Pro
        const isFirstMessage = messages.length <= 1;

        // Show upgrade dialog after first message if user is not Pro and hasn't seen it before
        if (
          isFirstMessage &&
          !isUserPro &&
          !proStatusLoading &&
          !chatState.hasShownUpgradeDialog &&
          user
        ) {
          setTimeout(() => {
            dispatch({ type: "SET_SHOW_UPGRADE_DIALOG", payload: true });
            dispatch({ type: "SET_HAS_SHOWN_UPGRADE_DIALOG", payload: true });
            setPersitedHasShownUpgradeDialog(true);
          }, 1000);
        }

        // Only generate suggested questions if authenticated user or private chat
        if (
          message.parts &&
          message.role === "assistant" &&
          (user || chatState.selectedVisibilityType === "private")
        ) {
          const lastPart = message.parts.at(-1);
          const lastPartText =
            lastPart && lastPart.type === "text" ? lastPart.text : "";
          const newHistory = [
            { role: "user", content: lastSubmittedQueryRef.current },
            { role: "assistant", content: lastPartText },
          ];
          const { questions } = await suggestQuestions(newHistory);
          dispatch({ type: "SET_SUGGESTED_QUESTIONS", payload: questions });
        }
      },
      onError: (error) => {
        // Don't show toast for ChatSDK errors as they will be handled by the enhanced error display
        if (error instanceof ChatSDKError) {
          // Only show toast for certain error types that need immediate attention
          if (error.type === "offline" || error.surface === "stream") {
            toast.error("Connection Error", {
              description: error.message,
            });
          }
        } else {
          toast.error("An error occurred.", {
            description: `Oops! An error occurred while processing your request. ${error.cause || error.message}`,
          });
        }
      },
    });

    // Handle text highlighting and quoting
    const handleHighlight = useCallback((text: string) => {
      const quotedText = `> ${text.replace(/\n/g, "\n> ")}\n\n`;
      setInput((prev: string) => prev + quotedText);

      // Focus the input after adding the quote
      setTimeout(() => {
        const inputElement = document.querySelector(
          'textarea[placeholder*="Ask"]'
        ) as HTMLTextAreaElement;
        if (inputElement) {
          inputElement.focus();
          // Move cursor to end
          inputElement.setSelectionRange(
            inputElement.value.length,
            inputElement.value.length
          );
        }
      }, 100);
    }, []);

    // Debug error structure
    if (error) {
    }

    useAutoResume({
      autoResume: true,
      initialMessages: initialMessages || [],
      resumeStream,
      setMessages,
    });

    useEffect(() => {
      if (status) {
      }
    }, [status]);

    useEffect(() => {
      if (user && status === "streaming" && messages.length > 0) {
        // Invalidate chats cache to refresh the list
        invalidateChatsCache();
      }
    }, [user, status, messages.length]);

    useEffect(() => {
      if (
        !initializedRef.current &&
        initialState.query &&
        !messages.length &&
        !initialChatId
      ) {
        initializedRef.current = true;
        sendMessage({
          parts: [{ type: "text", text: initialState.query }],
          role: "user",
        });
      }
    }, [initialState.query, sendMessage, messages.length, initialChatId]);

    // Generate suggested questions when opening a chat directly
    useEffect(() => {
      const generateSuggestionsForInitialMessages = async () => {
        // Only generate if we have initial messages, no suggested questions yet,
        // user is authenticated or chat is private, and status is not streaming
        if (
          initialMessages &&
          initialMessages.length >= 2 &&
          !chatState.suggestedQuestions.length &&
          (user || chatState.selectedVisibilityType === "private") &&
          status === "ready"
        ) {
          const lastUserMessage = initialMessages
            .filter((m) => m.role === "user")
            .pop();
          const lastAssistantMessage = initialMessages
            .filter((m) => m.role === "assistant")
            .pop();

          if (lastUserMessage && lastAssistantMessage) {
            // Extract content from parts similar to onFinish callback
            const getUserContent = (message: typeof lastUserMessage) => {
              if (message.parts && message.parts.length > 0) {
                const lastPart = message.parts.at(-1);
                return lastPart.type === "text" ? lastPart.text : "";
              }
              return message.content || "";
            };

            const getAssistantContent = (
              message: typeof lastAssistantMessage
            ) => {
              if (message.parts && message.parts.length > 0) {
                const lastPart = message.parts.at(-1);
                return lastPart.type === "text" ? lastPart.text : "";
              }
              return message.content || "";
            };

            const newHistory = [
              { role: "user", content: getUserContent(lastUserMessage) },
              {
                role: "assistant",
                content: getAssistantContent(lastAssistantMessage),
              },
            ];
            try {
              const { questions } = await suggestQuestions(newHistory);
              dispatch({ type: "SET_SUGGESTED_QUESTIONS", payload: questions });
            } catch (_error) {}
          }
        }
      };

      generateSuggestionsForInitialMessages();
    }, [
      initialMessages,
      chatState.suggestedQuestions.length,
      status,
      user,
      chatState.selectedVisibilityType,
    ]);

    // Reset suggested questions when status changes to streaming
    useEffect(() => {
      if (status === "streaming") {
        // Clear suggested questions when a new message is being streamed
        dispatch({ type: "RESET_SUGGESTED_QUESTIONS" });
      }
    }, [status]);

    const lastUserMessageIndex = useMemo(() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          return i;
        }
      }
      return -1;
    }, [messages]);

    useEffect(() => {
      // Reset manual scroll when streaming starts
      if (status === "streaming") {
        resetManualScroll();
        scrollToBottom();
      }
    }, [status, resetManualScroll, scrollToBottom]);

    // Auto-scroll during streaming when messages change
    useEffect(() => {
      if (status === "streaming") {
        scrollToBottom();
      }
    }, [status, scrollToBottom]);

    // Dialog management state - track command dialog state in chat state
    useEffect(() => {
      dispatch({
        type: "SET_ANY_DIALOG_OPEN",
        payload:
          chatState.commandDialogOpen ||
          chatState.showSignInPrompt ||
          chatState.showUpgradeDialog ||
          chatState.showAnnouncementDialog,
      });
    }, [
      chatState.commandDialogOpen,
      chatState.showSignInPrompt,
      chatState.showUpgradeDialog,
      chatState.showAnnouncementDialog,
    ]);

    // Keyboard shortcut for command dialog
    useEffect(() => {
      const down = (e: KeyboardEvent) => {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          dispatch({
            type: "SET_COMMAND_DIALOG_OPEN",
            payload: !chatState.commandDialogOpen,
          });
        }
      };

      document.addEventListener("keydown", down);
      return () => document.removeEventListener("keydown", down);
    }, [chatState.commandDialogOpen]);

    // Define the model change handler
    const handleModelChange = useCallback(
      (model: string) => {
        setSelectedModel(model);
      },
      [setSelectedModel]
    );

    const resetSuggestedQuestions = useCallback(() => {
      dispatch({ type: "RESET_SUGGESTED_QUESTIONS" });
    }, []);

    // Handle visibility change
    const handleVisibilityChange = useCallback(
      async (visibility: VisibilityType) => {
        if (!chatId) {
          return;
        }

        try {
          const result = await updateChatVisibility(chatId, visibility);

          // Check if the update was successful - be more forgiving with validation
          if (result?.success) {
            dispatch({ type: "SET_VISIBILITY_TYPE", payload: visibility });

            toast.success(`Chat is now ${visibility}`);

            // Invalidate cache to refresh the list with updated visibility
            invalidateChatsCache();
          } else {
            toast.error("Failed to update chat visibility");
          }
        } catch (_error) {
          toast.error("Failed to update chat visibility");
        }
      },
      [chatId]
    );

    return (
      <div className="!scrollbar-thin !scrollbar-thumb-muted-foreground dark:!scrollbar-thumb-muted-foreground !scrollbar-track-transparent hover:!scrollbar-thumb-foreground dark:!hover:scrollbar-thumb-foreground flex h-screen w-full flex-col items-center overflow-x-hidden bg-background font-sans! text-foreground transition-all duration-500">
        <Navbar
          chatId={initialChatId || (messages.length > 0 ? chatId : null)}
          daysLeftInTrial={daysLeftInTrial}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          isDialogOpen={chatState.anyDialogOpen}
          isInTrial={isInTrial}
          isOwner={isOwner}
          isProStatusLoading={proStatusLoading}
          isProUser={isUserPro}
          onHistoryClick={() =>
            dispatch({ type: "SET_COMMAND_DIALOG_OPEN", payload: true })
          }
          onVisibilityChange={handleVisibilityChange}
          selectedVisibilityType={chatState.selectedVisibilityType}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
          setSettingsOpen={setSettingsOpen}
          settingsInitialTab={settingsInitialTab}
          settingsOpen={settingsOpen}
          status={status}
          subscriptionData={subscriptionData}
          user={user || null}
        />

        {/* Chat Dialogs Component */}
        <ChatDialogs
          commandDialogOpen={chatState.commandDialogOpen}
          hasShownLookoutAnnouncement={chatState.hasShownAnnouncementDialog}
          hasShownSignInPrompt={chatState.hasShownSignInPrompt}
          hasShownUpgradeDialog={chatState.hasShownUpgradeDialog}
          setAnyDialogOpen={(open) =>
            dispatch({ type: "SET_ANY_DIALOG_OPEN", payload: open })
          }
          setCommandDialogOpen={(open) =>
            dispatch({ type: "SET_COMMAND_DIALOG_OPEN", payload: open })
          }
          setHasShownLookoutAnnouncement={(value) => {
            dispatch({
              type: "SET_HAS_SHOWN_ANNOUNCEMENT_DIALOG",
              payload: value,
            });
            setPersitedHasShownLookoutAnnouncement(value);
          }}
          setHasShownSignInPrompt={(value) => {
            dispatch({ type: "SET_HAS_SHOWN_SIGNIN_PROMPT", payload: value });
            setPersitedHasShownSignInPrompt(value);
          }}
          setHasShownUpgradeDialog={(value) => {
            dispatch({ type: "SET_HAS_SHOWN_UPGRADE_DIALOG", payload: value });
            setPersitedHasShownUpgradeDialog(value);
          }}
          setShowLookoutAnnouncement={(open) =>
            dispatch({ type: "SET_SHOW_ANNOUNCEMENT_DIALOG", payload: open })
          }
          setShowSignInPrompt={(open) =>
            dispatch({ type: "SET_SHOW_SIGNIN_PROMPT", payload: open })
          }
          setShowUpgradeDialog={(open) =>
            dispatch({ type: "SET_SHOW_UPGRADE_DIALOG", payload: open })
          }
          showLookoutAnnouncement={chatState.showAnnouncementDialog}
          showSignInPrompt={chatState.showSignInPrompt}
          showUpgradeDialog={chatState.showUpgradeDialog}
          user={user}
        />

        <div
          className={`relative w-full p-2 sm:p-4 ${
            status === "ready" && messages.length === 0
              ? "!flex !flex-col !items-center !justify-center flex-1" // Center everything when no messages
              : "!mt-20 sm:!mt-16 !flex-col flex" // Add top margin when showing messages
          }`}
        >
          <div
            className={
              "mx-auto w-full max-w-[95%] space-y-6 p-0 transition-all duration-300 sm:max-w-2xl"
            }
          >
            {status === "ready" && messages.length === 0 && (
              <div className="m-0 mb-2 text-center">
                <div className="inline-flex items-center gap-3">
                  <Image
                    alt="Draftpen"
                    className="size-4 sm:size-5"
                    height={20}
                    src="/draftpen.svg"
                    width={20}
                  />
                  <h1 className="!mb-0 font-normal font-sans text-xl text-foreground tracking-wide sm:text-2xl dark:text-foreground">
                    Draftpen
                  </h1>
                  {isUserPro && (
                    <h1
                      className="!px-2.5 !pt-1 !pb-1.5 !m-0 !mt-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 font-sans text-sm text-foreground leading-3 shadow-sm ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground"
                      suppressHydrationWarning
                    >
                      {isInTrial && daysLeftInTrial > 0 ? (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{daysLeftInTrial}d trial</span>
                        </>
                      ) : (
                        <span>Pro</span>
                      )}
                    </h1>
                  )}
                </div>
              </div>
            )}

            {/* Show initial limit exceeded message */}
            {status === "ready" && messages.length === 0 && isLimitBlocked && (
              <div className="mx-auto mt-16 max-w-sm">
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl backdrop-blur-xl">
                  {/* Header Section */}
                  <div className="px-8 pt-8 pb-6 text-center">
                    <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
                      <HugeiconsIcon
                        className="text-muted-foreground"
                        icon={Crown02Icon}
                        size={28}
                        strokeWidth={1.5}
                      />
                    </div>
                    <h2 className="mb-3 font-semibold text-2xl text-foreground tracking-tight">
                      Daily limit reached
                    </h2>
                  </div>

                  {/* Content Section */}
                  <div className="px-8 pb-8 text-center">
                    <div className="mb-8 space-y-4">
                      <p className="font-medium text-base text-foreground leading-relaxed">
                        You&apos;ve used all{" "}
                        <span className="font-semibold text-primary">
                          {SEARCH_LIMITS.DAILY_SEARCH_LIMIT}
                        </span>{" "}
                        searches for today
                      </p>
                      <p className="mx-auto max-w-xs text-muted-foreground text-sm leading-relaxed">
                        Upgrade to Pro for unlimited searches, faster responses,
                        and premium features
                      </p>
                    </div>

                    {/* Actions Section */}
                    <div className="space-y-3">
                      <Button
                        className="h-11 w-full font-semibold text-base"
                        onClick={() => {
                          window.location.href = "/pricing";
                        }}
                      >
                        <HugeiconsIcon
                          className="mr-2.5"
                          icon={Crown02Icon}
                          size={18}
                          strokeWidth={1.5}
                        />
                        Upgrade to Pro
                      </Button>
                      <Button
                        className="h-10 w-full font-medium text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          refetchUsage();
                        }}
                        variant="ghost"
                      >
                        Try refreshing
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Use the Messages component */}
            {messages.length > 0 && (
              <Messages
                chatId={
                  initialChatId || (messages.length > 0 ? chatId : undefined)
                }
                error={error ?? null}
                initialMessages={initialMessages}
                input={input}
                isOwner={isOwner}
                lastUserMessageIndex={lastUserMessageIndex}
                messages={messages as ChatMessage[]}
                onHighlight={handleHighlight}
                onVisibilityChange={handleVisibilityChange}
                regenerate={regenerate}
                selectedVisibilityType={chatState.selectedVisibilityType}
                sendMessage={sendMessage}
                setInput={setInput}
                setMessages={(messages) => {
                  setMessages(messages as ChatMessage[]);
                }}
                setSuggestedQuestions={(questions) =>
                  dispatch({
                    type: "SET_SUGGESTED_QUESTIONS",
                    payload: questions,
                  })
                }
                status={status}
                suggestedQuestions={chatState.suggestedQuestions}
                user={user}
              />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Single Form Component with dynamic positioning */}
          {((user && isOwner) ||
            !initialChatId ||
            (!user && chatState.selectedVisibilityType === "private")) &&
            !isLimitBlocked && (
              <div
                className={cn(
                  "transition-all duration-500",
                  messages.length === 0 && !chatState.hasSubmitted
                    ? "relative mx-auto w-full max-w-2xl"
                    : "!pb-6 fixed right-0 bottom-0 left-0 z-20 mx-4 mt-1 p-0 sm:mx-2"
                )}
              >
                <FormComponent
                  attachments={chatState.attachments}
                  chatId={chatId}
                  fileInputRef={fileInputRef}
                  input={input}
                  inputRef={inputRef}
                  isLimitBlocked={isLimitBlocked}
                  lastSubmittedQueryRef={lastSubmittedQueryRef}
                  messages={messages as ChatMessage[]}
                  onOpenSettings={handleOpenSettings}
                  resetSuggestedQuestions={resetSuggestedQuestions}
                  selectedConnectors={selectedConnectors}
                  selectedGroup={selectedGroup}
                  selectedModel={selectedModel}
                  sendMessage={sendMessage}
                  setAttachments={(attachments) => {
                    const newAttachments =
                      typeof attachments === "function"
                        ? attachments(chatState.attachments)
                        : attachments;
                    dispatch({
                      type: "SET_ATTACHMENTS",
                      payload: newAttachments,
                    });
                  }}
                  setHasSubmitted={(hasSubmitted) => {
                    const newValue =
                      typeof hasSubmitted === "function"
                        ? hasSubmitted(chatState.hasSubmitted)
                        : hasSubmitted;
                    dispatch({ type: "SET_HAS_SUBMITTED", payload: newValue });
                  }}
                  setInput={setInput}
                  setSelectedConnectors={setSelectedConnectors}
                  setSelectedGroup={setSelectedGroup}
                  setSelectedModel={handleModelChange}
                  showExperimentalModels={messages.length === 0}
                  status={status}
                  stop={stop}
                  subscriptionData={subscriptionData}
                  user={user!}
                />
              </div>
            )}

          {/* Form backdrop overlay - hides content below form when in submitted mode */}
          {((user && isOwner) ||
            !initialChatId ||
            (!user && chatState.selectedVisibilityType === "private")) &&
            !isLimitBlocked &&
            (messages.length > 0 || chatState.hasSubmitted) && (
              <div
                className="pointer-events-none fixed right-0 left-0 z-10 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-sm"
                style={{
                  bottom: 0,
                  height: "120px", // Adjust height as needed
                }}
              />
            )}

          {/* Show limit exceeded message */}
          {isLimitBlocked && messages.length > 0 && (
            <div className="fixed right-0 bottom-8 left-0 z-20 mx-auto w-full max-w-[95%] sm:bottom-4 sm:max-w-2xl">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 shadow-sm backdrop-blur-sm dark:border-border/60 dark:bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      className="text-muted-foreground dark:text-muted-foreground"
                      color="currentColor"
                      icon={Crown02Icon}
                      size={14}
                      strokeWidth={1.5}
                    />
                    <span className="text-foreground text-sm dark:text-foreground">
                      Daily limit reached ({SEARCH_LIMITS.DAILY_SEARCH_LIMIT}{" "}
                      searches used)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        refetchUsage();
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Refresh
                    </Button>
                    <Button
                      className="h-7 bg-primary px-3 text-primary-foreground text-xs hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                      onClick={() => {
                        window.location.href = "/pricing";
                      }}
                      size="sm"
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Add a display name for the memoized component for better debugging
ChatInterface.displayName = "ChatInterface";

export { ChatInterface };
