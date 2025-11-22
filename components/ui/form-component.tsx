"use client";
// /components/ui/form-component.tsx

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  ConnectIcon,
  CpuIcon,
  Crown02Icon,
  DocumentAttachmentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain, Eye, FilePdf, LockIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import {
  ArrowUpRight,
  Check,
  CheckIcon,
  ChevronsUpDown,
  Sparkles,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  getAcceptedFileTypes,
  hasPdfSupport,
  hasVisionSupport,
  models,
  requiresAuthentication,
  requiresProSubscription,
  shouldBypassRateLimits,
} from "@/ai/providers";
import {
  checkImageModeration,
  enhancePrompt,
  listUserConnectorsAction,
} from "@/app/actions";
import { AudioLinesIcon } from "@/components/ui/audio-lines";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { GripIcon } from "@/components/ui/grip";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ComprehensiveUserData } from "@/hooks/use-user-data";
import { useSession } from "@/lib/auth-client";
import {
  CONNECTOR_CONFIGS,
  CONNECTOR_ICONS,
  type ConnectorProvider,
} from "@/lib/connectors";
import { PRICING } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import {
  cn,
  getSearchGroups,
  type SearchGroup,
  type SearchGroupId,
  type SearchProvider,
} from "@/lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

// Pro Badge Component
const ProBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`!border-none !outline-0 !ring-offset-background/50 !pb-2 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 px-2.5 pt-0.5 font-sans text-foreground leading-3 shadow-sm ring-offset-1 sm:pt-1 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);

type ModelSwitcherProps = {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  className?: string;
  attachments: Attachment[];
  messages: ChatMessage[];
  status: UseChatHelpers<ChatMessage>["status"];
  onModelSelect?: (model: (typeof models)[0]) => void;
  subscriptionData?: any;
  user?: ComprehensiveUserData | null;
};

const ModelSwitcher: React.FC<ModelSwitcherProps> = React.memo(
  ({
    selectedModel,
    setSelectedModel,
    className,
    attachments,
    messages,
    status,
    onModelSelect,
    subscriptionData,
    user,
  }) => {
    const isProUser = useMemo(
      () =>
        user?.isProUser ||
        (subscriptionData?.hasSubscription &&
          subscriptionData?.subscription?.status === "active"),
      [
        user?.isProUser,
        subscriptionData?.hasSubscription,
        subscriptionData?.subscription?.status,
      ]
    );

    const isSubscriptionLoading = useMemo(
      () => user && !subscriptionData,
      [user, subscriptionData]
    );

    const availableModels = useMemo(() => models, []);

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showSignInDialog, setShowSignInDialog] = useState(false);
    const [selectedProModel, setSelectedProModel] = useState<
      (typeof models)[0] | null
    >(null);
    const [selectedAuthModel, setSelectedAuthModel] = useState<
      (typeof models)[0] | null
    >(null);
    const [open, setOpen] = useState(false);

    const isMobile = useIsMobile();

    const [searchQuery, setSearchQuery] = useState("");

    const normalizeText = useCallback(
      (input: string): string =>
        input
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim(),
      []
    );

    const tokenize = useCallback(
      (input: string): string[] => {
        const normalized = normalizeText(input);
        if (!normalized) {
          return [];
        }
        const tokens = normalized.split(/\s+/).filter(Boolean);
        return Array.from(new Set(tokens));
      },
      [normalizeText]
    );

    type SearchIndexEntry = {
      normalized: string;
      labelNorm: string;
      normalizedNoSpace: string;
      labelNoSpace: string;
    };

    const searchIndex = useMemo<Record<string, SearchIndexEntry>>(() => {
      const index: Record<string, SearchIndexEntry> = {};
      for (const m of availableModels) {
        const aggregate = [
          m.label,
          m.description,
          m.category,
          m.vision ? "vision" : "",
          m.reasoning ? "reasoning" : "",
          m.pdf ? "pdf" : "",
          m.experimental ? "experimental" : "",
          m.pro ? "pro" : "",
          m.requiresAuth ? "auth" : "",
        ].join(" ");
        const normalized = normalizeText(aggregate);
        const labelNorm = normalizeText(m.label);
        index[m.value] = {
          normalized,
          labelNorm,
          normalizedNoSpace: normalized.replace(/\s+/g, ""),
          labelNoSpace: labelNorm.replace(/\s+/g, ""),
        };
      }
      return index;
    }, [availableModels, normalizeText]);

    const computeScore = useCallback(
      (modelValue: string, query: string): number => {
        const entry = searchIndex[modelValue];
        if (!entry) {
          return 0;
        }
        const tokens = tokenize(query);
        if (tokens.length === 0) {
          return 1;
        }
        const filteredTokens = tokens.filter(
          (t) => t.length >= 2 || /^\d$/.test(t)
        );
        let matchedCount = 0;
        let score = 0;

        for (const token of filteredTokens) {
          if (!token) {
            continue;
          }

          const inLabel = entry.labelNorm.includes(token);
          const inAll = entry.normalized.includes(token);

          if (inAll) {
            matchedCount += 1;
            score += inLabel ? 3 : 1;

            if (new RegExp(`\\b${token}`).test(entry.labelNorm)) {
              score += 2;
            } else if (new RegExp(`\\b${token}`).test(entry.normalized)) {
              score += 1;
            }
          }
        }

        const phraseNoSpace = normalizeText(query).replace(/\s+/g, "");
        if (phraseNoSpace.length >= 2) {
          if (entry.normalizedNoSpace.includes(phraseNoSpace)) {
            score += 2;
          }
          if (entry.labelNoSpace.includes(phraseNoSpace)) {
            score += 3;
          }
          if (entry.labelNoSpace.startsWith(phraseNoSpace)) {
            score += 2;
          }
        }

        if (matchedCount === 0 && phraseNoSpace.length < 2) {
          return 0;
        }
        if (
          matchedCount === filteredTokens.length &&
          filteredTokens.length > 0
        ) {
          score += 2;
        }

        return score;
      },
      [searchIndex, tokenize, normalizeText]
    );

    const escapeHtml = useCallback(
      (input: string): string =>
        input
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;"),
      []
    );

    const escapeRegExp = useCallback(
      (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      []
    );

    const buildHighlightHtml = useCallback(
      (text: string): string => {
        const q = searchQuery.trim();
        if (!q) {
          return escapeHtml(text);
        }
        const safeText = escapeHtml(text);
        const pattern = new RegExp(`(${escapeRegExp(q)})`, "gi");
        return safeText.replace(
          pattern,
          '<mark class="bg-primary/80 text-primary-foreground rounded px-px">$1</mark>'
        );
      },
      [searchQuery, escapeHtml, escapeRegExp]
    );

    const isFilePart = useCallback(
      (p: unknown): p is { type: "file"; mediaType?: string } =>
        typeof p === "object" &&
        p !== null &&
        "type" in (p as Record<string, unknown>) &&
        (p as { type: unknown }).type === "file",
      []
    );

    const hasImageAttachments = useMemo(() => {
      const attachmentHasImage = attachments.some((att) => {
        const ct = att.contentType || att.mediaType || "";
        return ct.startsWith("image/");
      });
      const messagesHaveImage = messages.some((msg) =>
        (msg.parts || []).some(
          (part) =>
            isFilePart(part) &&
            typeof part.mediaType === "string" &&
            part.mediaType.startsWith("image/")
        )
      );
      return attachmentHasImage || messagesHaveImage;
    }, [attachments, messages, isFilePart]);

    const hasPdfAttachments = useMemo(() => {
      const attachmentHasPdf = attachments.some((att) => {
        const ct = att.contentType || att.mediaType || "";
        return ct === "application/pdf";
      });
      const messagesHavePdf = messages.some((msg) =>
        (msg.parts || []).some(
          (part) =>
            isFilePart(part) &&
            typeof part.mediaType === "string" &&
            part.mediaType === "application/pdf"
        )
      );
      return attachmentHasPdf || messagesHavePdf;
    }, [attachments, messages, isFilePart]);

    const filteredModels = useMemo(() => {
      if (!(hasImageAttachments || hasPdfAttachments)) {
        return availableModels;
      }
      if (hasImageAttachments && hasPdfAttachments) {
        return availableModels.filter((model) => model.vision && model.pdf);
      }
      if (hasImageAttachments) {
        return availableModels.filter((model) => model.vision);
      }
      // Only PDFs attached
      return availableModels.filter((model) => model.pdf);
    }, [availableModels, hasImageAttachments, hasPdfAttachments]);

    const rankedModels = useMemo(() => {
      const query = searchQuery.trim();
      if (!query) {
        return null;
      }
      const scored = filteredModels
        .map((m) => ({ model: m, score: computeScore(m.value, query) }))
        .filter((x) => x.score > 0);

      const normQuery = normalizeText(query);
      scored.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const aLabel = normalizeText(a.model.label);
        const bLabel = normalizeText(b.model.label);
        const aExact = aLabel === normQuery ? 1 : 0;
        const bExact = bLabel === normQuery ? 1 : 0;
        if (bExact !== aExact) {
          return bExact - aExact;
        }
        const aStarts = aLabel.startsWith(normQuery) ? 1 : 0;
        const bStarts = bLabel.startsWith(normQuery) ? 1 : 0;
        if (bStarts !== aStarts) {
          return bStarts - aStarts;
        }
        return a.model.label.localeCompare(b.model.label);
      });

      return scored.map((s) => s.model);
    }, [filteredModels, searchQuery, computeScore, normalizeText]);

    const sortedModels = useMemo(() => filteredModels, [filteredModels]);

    const groupedModels = useMemo(
      () =>
        sortedModels.reduce(
          (acc, model) => {
            const category = model.category;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(model);
            return acc;
          },
          {} as Record<string, typeof availableModels>
        ),
      [sortedModels]
    );

    const orderedGroupEntries = useMemo(() => {
      const groupOrder = isProUser
        ? ["Pro", "Experimental", "Free"]
        : ["Free", "Experimental", "Pro"];
      return groupOrder
        .filter(
          (category) =>
            groupedModels[category] && groupedModels[category].length > 0
        )
        .map((category) => [category, groupedModels[category]] as const);
    }, [groupedModels, isProUser]);

    const currentModel = useMemo(
      () => availableModels.find((m) => m.value === selectedModel),
      [availableModels, selectedModel]
    );

    // Auto-switch away from pro models when user loses pro access
    useEffect(() => {
      if (isSubscriptionLoading) {
        return;
      }

      const currentModelRequiresPro = requiresProSubscription(selectedModel);
      const currentModelExists = availableModels.find(
        (m) => m.value === selectedModel
      );

      // If current model requires pro but user is not pro, switch to default
      // Also prevent infinite loops by ensuring we're not already on the default model
      if (
        currentModelExists &&
        currentModelRequiresPro &&
        !isProUser &&
        selectedModel !== "gpt5-mini"
      ) {
        setSelectedModel("gpt5-mini");

        // Show a toast notification to inform the user
        toast.info(
          "Switched to default model - Pro subscription required for premium models"
        );
      }
    }, [
      selectedModel,
      isProUser,
      isSubscriptionLoading,
      setSelectedModel,
      availableModels,
    ]);

    const handleModelChange = useCallback(
      (value: string) => {
        const model = availableModels.find((m) => m.value === value);
        if (!model) {
          return;
        }

        const requiresAuth = requiresAuthentication(model.value) && !user;
        const requiresPro = requiresProSubscription(model.value) && !isProUser;

        if (isSubscriptionLoading) {
          return;
        }

        if (requiresAuth) {
          setSelectedAuthModel(model);
          setShowSignInDialog(true);
          return;
        }

        if (requiresPro && !isProUser) {
          setSelectedProModel(model);
          setShowUpgradeDialog(true);
          return;
        }
        setSelectedModel(model.value.trim());

        if (onModelSelect) {
          onModelSelect(model);
        }
      },
      [
        availableModels,
        user,
        isProUser,
        isSubscriptionLoading,
        setSelectedModel,
        onModelSelect,
      ]
    );

    // Shared command content renderer (not a component) to preserve focus
    const renderModelCommandContent = () => (
      <Command
        className={cn(
          isMobile
            ? "h-full flex-1 rounded-lg border-0 bg-transparent"
            : "rounded-lg"
        )}
        filter={() => 1}
        shouldFilter={false}
      >
        {!isMobile && (
          <CommandInput
            className="h-9"
            onValueChange={setSearchQuery}
            placeholder="Search models..."
            value={searchQuery}
          />
        )}
        <CommandEmpty>No model found.</CommandEmpty>
        <CommandList
          className={isMobile ? "!max-h-full flex-1 p-2" : "max-h-[15em]"}
        >
          {rankedModels && searchQuery.trim() ? (
            rankedModels.length > 0 ? (
              <CommandGroup key="best-matches">
                <div
                  className={cn(
                    "px-2 py-1 font-medium text-muted-foreground",
                    isMobile ? "text-xs" : "text-[10px]"
                  )}
                >
                  Best matches
                </div>
                {rankedModels.map((model) => {
                  const requiresAuth =
                    requiresAuthentication(model.value) && !user;
                  const requiresPro =
                    requiresProSubscription(model.value) && !isProUser;
                  const isLocked = requiresAuth || requiresPro;

                  if (isLocked) {
                    return (
                      <div
                        className={cn(
                          "mb-0.5 flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                          "transition-all duration-200",
                          "opacity-50 hover:bg-accent hover:opacity-70"
                        )}
                        key={model.value}
                        onClick={() => {
                          if (isSubscriptionLoading) {
                            return;
                          }

                          if (requiresAuth) {
                            setSelectedAuthModel(model);
                            setShowSignInDialog(true);
                          } else if (requiresPro && !isProUser) {
                            setSelectedProModel(model);
                            setShowUpgradeDialog(true);
                          }
                          setOpen(false);
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <div
                            className={cn(
                              "flex-1 truncate font-medium",
                              isMobile ? "text-sm" : "text-[11px]"
                            )}
                          >
                            {!isMobile && searchQuery ? (
                              <span
                                className="inline"
                                dangerouslySetInnerHTML={{
                                  __html: buildHighlightHtml(model.label),
                                }}
                              />
                            ) : (
                              <span className="inline">{model.label}</span>
                            )}
                          </div>
                          {requiresAuth ? (
                            <LockIcon
                              className={cn(
                                "flex-shrink-0 text-muted-foreground",
                                isMobile ? "size-3.5" : "size-3"
                              )}
                            />
                          ) : (
                            <HugeiconsIcon
                              className="flex-shrink-0 text-muted-foreground"
                              color="currentColor"
                              icon={Crown02Icon}
                              size={isMobile ? 14 : 12}
                              strokeWidth={1.5}
                            />
                          )}
                          {model.vision && (
                            <div
                              className={cn(
                                "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Eye
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {model.reasoning && (
                            <div
                              className={cn(
                                "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Brain
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {model.pdf && (
                            <div
                              className={cn(
                                "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <FilePdf
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <CommandItem
                      className={cn(
                        "mb-0.5 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                        "transition-all duration-200",
                        "hover:bg-accent",
                        "data-[selected=true]:bg-accent"
                      )}
                      key={model.value}
                      onSelect={(currentValue) => {
                        handleModelChange(currentValue);
                        setOpen(false);
                      }}
                      value={model.value}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <div
                          className={cn(
                            "truncate font-medium",
                            isMobile ? "text-sm" : "text-[11px]"
                          )}
                        >
                          {!isMobile && searchQuery ? (
                            <span
                              className="inline"
                              dangerouslySetInnerHTML={{
                                __html: buildHighlightHtml(model.label),
                              }}
                            />
                          ) : (
                            <span className="inline">{model.label}</span>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            selectedModel === model.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                          {model.isNew && (
                            <div
                              className={cn(
                                "inline-flex items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Sparkles
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {model.fast && (
                            <div
                              className={cn(
                                "inline-flex items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Zap
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {(() => {
                            const requiresAuth =
                              requiresAuthentication(model.value) && !user;
                            const requiresPro =
                              requiresProSubscription(model.value) &&
                              !isProUser;

                            if (requiresAuth) {
                              return (
                                <LockIcon
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-4" : "size-3"
                                  )}
                                />
                              );
                            }
                            if (requiresPro) {
                              return (
                                <HugeiconsIcon
                                  className="text-muted-foreground"
                                  color="currentColor"
                                  icon={Crown02Icon}
                                  size={isMobile ? 14 : 12}
                                  strokeWidth={1.5}
                                />
                              );
                            }
                            return null;
                          })()}
                          {model.vision && (
                            <div
                              className={cn(
                                "inline-flex items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Eye
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {model.reasoning && (
                            <div
                              className={cn(
                                "inline-flex items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <Brain
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                          {model.pdf && (
                            <div
                              className={cn(
                                "inline-flex items-center justify-center rounded bg-secondary/50",
                                isMobile ? "p-1" : "p-0.5"
                              )}
                            >
                              <FilePdf
                                className={cn(
                                  "text-muted-foreground",
                                  isMobile ? "size-3" : "size-2.5"
                                )}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : (
              <div className="px-3 py-6 text-muted-foreground text-xs">
                No model found.
              </div>
            )
          ) : (
            orderedGroupEntries.map(
              ([category, categoryModels], categoryIndex) => (
                <CommandGroup key={category}>
                  {categoryIndex > 0 && (
                    <div className="my-1 border-border border-t" />
                  )}
                  <div
                    className={cn(
                      "px-2 py-1 font-medium text-muted-foreground",
                      isMobile ? "text-xs" : "text-[10px]"
                    )}
                  >
                    {category} Models
                  </div>
                  {categoryModels.map((model) => {
                    const requiresAuth =
                      requiresAuthentication(model.value) && !user;
                    const requiresPro =
                      requiresProSubscription(model.value) && !isProUser;
                    const isLocked = requiresAuth || requiresPro;

                    if (isLocked) {
                      return (
                        <div
                          className={cn(
                            "mb-0.5 flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                            "transition-all duration-200",
                            "opacity-50 hover:bg-accent hover:opacity-70"
                          )}
                          key={model.value}
                          onClick={() => {
                            if (isSubscriptionLoading) {
                              return;
                            }

                            if (requiresAuth) {
                              setSelectedAuthModel(model);
                              setShowSignInDialog(true);
                            } else if (requiresPro && !isProUser) {
                              setSelectedProModel(model);
                              setShowUpgradeDialog(true);
                            }
                            setOpen(false);
                          }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-1">
                            <div
                              className={cn(
                                "flex-1 truncate font-medium",
                                isMobile ? "text-sm" : "text-[11px]"
                              )}
                            >
                              {!isMobile && searchQuery ? (
                                <span
                                  className="inline"
                                  dangerouslySetInnerHTML={{
                                    __html: buildHighlightHtml(model.label),
                                  }}
                                />
                              ) : (
                                <span className="inline">{model.label}</span>
                              )}
                            </div>
                            {requiresAuth ? (
                              <LockIcon
                                className={cn(
                                  "flex-shrink-0 text-muted-foreground",
                                  isMobile ? "size-3.5" : "size-3"
                                )}
                              />
                            ) : (
                              <HugeiconsIcon
                                className="flex-shrink-0 text-muted-foreground"
                                color="currentColor"
                                icon={Crown02Icon}
                                size={isMobile ? 14 : 12}
                                strokeWidth={1.5}
                              />
                            )}
                            {model.vision && (
                              <div
                                className={cn(
                                  "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Eye
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {model.reasoning && (
                              <div
                                className={cn(
                                  "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Brain
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {model.pdf && (
                              <div
                                className={cn(
                                  "inline-flex flex-shrink-0 items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <FilePdf
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <CommandItem
                        className={cn(
                          "mb-0.5 flex items-center justify-between rounded-lg px-2 py-1.5 text-xs",
                          "transition-all duration-200",
                          "hover:bg-accent",
                          "data-[selected=true]:bg-accent"
                        )}
                        key={model.value}
                        onSelect={(currentValue) => {
                          handleModelChange(currentValue);
                          setOpen(false);
                        }}
                        value={model.value}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <div
                            className={cn(
                              "truncate font-medium",
                              isMobile ? "text-sm" : "text-[11px]"
                            )}
                          >
                            {!isMobile && searchQuery ? (
                              <span
                                className="inline"
                                dangerouslySetInnerHTML={{
                                  __html: buildHighlightHtml(model.label),
                                }}
                              />
                            ) : (
                              <span className="inline">{model.label}</span>
                            )}
                          </div>
                          <Check
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              selectedModel === model.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="ml-auto flex flex-shrink-0 items-center gap-1">
                            {model.isNew && (
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Sparkles
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {model.fast && (
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Zap
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {(() => {
                              const requiresAuth =
                                requiresAuthentication(model.value) && !user;
                              const requiresPro =
                                requiresProSubscription(model.value) &&
                                !isProUser;

                              if (requiresAuth) {
                                return (
                                  <LockIcon
                                    className={cn(
                                      "text-muted-foreground",
                                      isMobile ? "size-4" : "size-3"
                                    )}
                                  />
                                );
                              }
                              if (requiresPro) {
                                return (
                                  <HugeiconsIcon
                                    className="text-muted-foreground"
                                    color="currentColor"
                                    icon={Crown02Icon}
                                    size={isMobile ? 14 : 12}
                                    strokeWidth={1.5}
                                  />
                                );
                              }
                              return null;
                            })()}
                            {model.vision && (
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Eye
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {model.reasoning && (
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <Brain
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                            {model.pdf && (
                              <div
                                className={cn(
                                  "inline-flex items-center justify-center rounded bg-secondary/50",
                                  isMobile ? "p-1" : "p-0.5"
                                )}
                              >
                                <FilePdf
                                  className={cn(
                                    "text-muted-foreground",
                                    isMobile ? "size-3" : "size-2.5"
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )
            )
          )}
        </CommandList>
      </Command>
    );

    // Common trigger button component
    const TriggerButton = ({
      ref,
      ...props
    }: React.ComponentPropsWithoutRef<typeof Button> & {
      ref?: React.RefObject<React.ElementRef<typeof Button> | null>;
    }) => (
      <Button
        aria-expanded={open}
        className={cn(
          "flex h-7.5 items-center gap-2 rounded-lg px-3",
          "border border-border",
          "bg-background text-foreground",
          "transition-colors hover:bg-accent",
          "focus:!outline-none focus:!ring-0",
          "shadow-none",
          className
        )}
        ref={ref}
        role="combobox"
        size="sm"
        variant="outline"
        {...props}
      >
        <HugeiconsIcon
          color="currentColor"
          icon={CpuIcon}
          size={24}
          strokeWidth={2}
        />
        <span className="hidden font-medium text-xs sm:block">
          {currentModel?.label}
        </span>
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </Button>
    );

    TriggerButton.displayName = "TriggerButton";

    return (
      <>
        {isMobile ? (
          <Drawer onOpenChange={setOpen} open={open}>
            <DrawerTrigger asChild>
              <TriggerButton />
            </DrawerTrigger>
            <DrawerContent className="flex max-h-[80vh] min-h-[60vh] flex-col">
              <DrawerHeader className="flex-shrink-0 pb-4">
                <DrawerTitle className="flex items-center gap-2 text-left font-medium font-sans text-lg">
                  <HugeiconsIcon
                    color="currentColor"
                    icon={CpuIcon}
                    size={22}
                    strokeWidth={2}
                  />
                  Select Model
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                {renderModelCommandContent()}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <TriggerButton />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              avoidCollisions={true}
              className="!shadow-none z-40 w-[90vw] max-w-[20em] rounded-lg border bg-popover p-0 font-sans sm:w-[20em]"
              collisionPadding={8}
              side="bottom"
              sideOffset={4}
            >
              {renderModelCommandContent()}
            </PopoverContent>
          </Popover>
        )}

        <Dialog onOpenChange={setShowUpgradeDialog} open={showUpgradeDialog}>
          <DialogContent
            className="gap-0 overflow-hidden bg-background p-0 sm:max-w-[450px]"
            showCloseButton={false}
          >
            <DialogHeader className="p-2">
              <div className="relative w-full overflow-hidden rounded-md p-6 text-white">
                <div className="absolute inset-0 rounded-sm bg-[url('/placeholder.png')] bg-center bg-cover">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-start gap-3 text-white">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {selectedProModel?.label ? (
                        <div className="flex flex-col gap-1">
                          <span className="truncate font-bold text-lg sm:text-xl">
                            {selectedProModel.label}
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-white/80">requires</span>
                            <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-extralight" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-sans text-xl sm:text-2xl">
                            Scira
                          </span>
                          <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-extralight" />
                        </div>
                      )}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-2xl">
                        ${PRICING.PRO_MONTHLY}
                      </span>
                      <span className="text-sm text-white/80">/month</span>
                    </div>
                    <p className="mt-2 text-left text-sm text-white/80">
                      {selectedProModel?.label
                        ? "Upgrade to access premium AI models and features"
                        : "Unlock advanced AI models, unlimited searches, and premium features"}
                    </p>
                  </DialogDescription>
                  <Button
                    className="w-full border border-white/20 bg-white/90 font-medium text-black backdrop-blur-md hover:bg-white"
                    onClick={() => {
                      window.location.href = "/pricing";
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 px-6 py-6">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Advanced AI Models
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Unlimited Searches
                  </p>
                  <p className="text-muted-foreground text-xs">
                    No daily limits on your research
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Prompt Enhancement
                  </p>
                  <p className="text-muted-foreground text-xs">
                    AI-powered prompt optimization
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Scira Lookout
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Automated search monitoring on your schedule
                  </p>
                </div>
              </div>

              <div className="mt-4 flex w-full items-center gap-2">
                <div className="flex-1 border-foreground/10 border-b" />
                <p className="text-foreground/50 text-xs">
                  Cancel anytime • Secure payment
                </p>
                <div className="flex-1 border-foreground/10 border-b" />
              </div>

              <Button
                className="mt-2 w-full text-muted-foreground hover:text-foreground"
                onClick={() => setShowUpgradeDialog(false)}
                size="sm"
                variant="ghost"
              >
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog onOpenChange={setShowSignInDialog} open={showSignInDialog}>
          <DialogContent
            className="gap-0 bg-background p-0 sm:max-w-[420px]"
            showCloseButton={false}
          >
            <DialogHeader className="p-2">
              <div className="relative w-full overflow-hidden rounded-md p-6 text-white">
                <div className="absolute inset-0 rounded-sm bg-[url('/placeholder.png')] bg-center bg-cover">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          height="11"
                          rx="2"
                          ry="2"
                          width="18"
                          x="3"
                          y="11"
                        />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-bold text-lg sm:text-xl">
                        Sign in required
                      </span>
                      {selectedAuthModel?.label && (
                        <span className="truncate text-sm text-white/70">
                          for {selectedAuthModel.label}
                        </span>
                      )}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    <p className="text-left text-sm text-white/80">
                      {selectedAuthModel?.label
                        ? `${selectedAuthModel.label} requires an account to access`
                        : "Create an account to access this AI model and unlock additional features"}
                    </p>
                  </DialogDescription>
                  <Button
                    className="w-full border border-white/20 bg-white/90 font-medium text-black backdrop-blur-md hover:bg-white"
                    onClick={() => {
                      window.location.href = "/sign-in";
                    }}
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 px-6 py-6">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Access better models
                  </p>
                  <p className="text-muted-foreground text-xs">
                    GPT-5 Nano and more premium models
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Save search history
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Keep track of your conversations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Free to start
                  </p>
                  <p className="text-muted-foreground text-xs">
                    No payment required for basic features
                  </p>
                </div>
              </div>

              <div className="mt-4 flex w-full items-center gap-2">
                <div className="flex-1 border-foreground/10 border-b" />
                <Button
                  className="px-3 text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => setShowSignInDialog(false)}
                  size="sm"
                  variant="ghost"
                >
                  Maybe later
                </Button>
                <div className="flex-1 border-foreground/10 border-b" />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

ModelSwitcher.displayName = "ModelSwitcher";

type Attachment = {
  name: string;
  contentType?: string;
  mediaType?: string;
  url: string;
  size: number;
};

const ArrowUpIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: "currentcolor" }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const StopIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    style={{ color: "currentcolor" }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M3 3H13V13H3V3Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_CHARS = 50_000;

const fileToDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

const truncateFilename = (filename: string, maxLength = 20) => {
  if (filename.length <= maxLength) {
    return filename;
  }
  const extension = filename.split(".").pop();
  const name = filename.substring(0, maxLength - 4);
  return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{
  attachment: Attachment | UploadingAttachment;
  onRemove: () => void;
  isUploading: boolean;
}> = React.memo(({ attachment, onRemove, isUploading }) => {
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }
    if (bytes < 1_048_576) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return (
      (bytes / 1_048_576).toFixed(1) +
      " MB" +
      (bytes > MAX_FILE_SIZE ? " (exceeds 5MB limit)" : "")
    );
  }, []);

  const isUploadingAttachment = useCallback(
    (
      attachment: Attachment | UploadingAttachment
    ): attachment is UploadingAttachment => "progress" in attachment,
    []
  );

  const isPdf = useCallback(
    (attachment: Attachment | UploadingAttachment): boolean => {
      if (isUploadingAttachment(attachment)) {
        return attachment.file.type === "application/pdf";
      }
      return (attachment as Attachment).contentType === "application/pdf";
    },
    [isUploadingAttachment]
  );

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative flex items-center",
        "bg-background/90 backdrop-blur-xs",
        "border border-border/80",
        "gap-2.5 rounded-lg p-2 pr-8",
        "z-0 shrink-0",
        "hover:bg-background",
        "transition-all duration-200",
        "group",
        "!shadow-none"
      )}
      exit={{ opacity: 0, scale: 0.8 }}
      initial={{ opacity: 0, scale: 0.8 }}
      layout
      transition={{ duration: 0.2 }}
    >
      {isUploading ? (
        <div className="flex h-8 w-8 items-center justify-center">
          <svg
            className="h-4 w-4 animate-spin text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
        </div>
      ) : isUploadingAttachment(attachment) ? (
        <div className="flex h-8 w-8 items-center justify-center">
          <div className="relative h-6 w-6">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              <circle
                className="stroke-current text-muted"
                cx="50"
                cy="50"
                fill="transparent"
                r="40"
                strokeWidth="8"
              />
              <circle
                className="stroke-current text-primary"
                cx="50"
                cy="50"
                fill="transparent"
                r="40"
                strokeDasharray={`${attachment.progress * 251.2}, 251.2`}
                strokeLinecap="round"
                strokeWidth="8"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-medium text-[10px] text-foreground">
                {Math.round(attachment.progress * 100)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
          {isPdf(attachment) ? (
            <svg
              className="text-red-500"
              fill="none"
              height="16"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15v-2h6v2" />
              <path d="M12 18v-5" />
            </svg>
          ) : (
            <Image
              alt={`Preview of ${attachment.name}`}
              className="object-cover"
              fill
              sizes="32px"
              src={(attachment as Attachment).url}
            />
          )}
        </div>
      )}
      <div className="min-w-0 grow">
        {!isUploadingAttachment(attachment) && (
          <p className="truncate font-medium text-foreground text-xs">
            {truncateFilename(attachment.name)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isUploadingAttachment(attachment)
            ? "Uploading..."
            : formatFileSize((attachment as Attachment).size)}
        </p>
      </div>
      <motion.button
        className={cn(
          "-top-1.5 -right-1.5 absolute m-0 rounded-full p-0.5",
          "bg-background/90 backdrop-blur-xs",
          "border border-border/80",
          "z-20 transition-all duration-200",
          "opacity-0 group-hover:opacity-100",
          "scale-75 group-hover:scale-100",
          "hover:bg-muted/50",
          "!shadow-none"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </motion.button>
    </motion.div>
  );
});

AttachmentPreview.displayName = "AttachmentPreview";

type UploadingAttachment = {
  file: File;
  progress: number;
};

type FormComponentProps = {
  input: string;
  setInput: (input: string) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  chatId: string;
  user: ComprehensiveUserData | null;
  subscriptionData?: any;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  stop: () => void;
  messages: ChatMessage[];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  resetSuggestedQuestions: () => void;
  lastSubmittedQueryRef: React.MutableRefObject<string>;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  showExperimentalModels: boolean;
  status: UseChatHelpers<ChatMessage>["status"];
  setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isLimitBlocked?: boolean;
  onOpenSettings?: (tab?: string) => void;
  selectedConnectors?: ConnectorProvider[];
  setSelectedConnectors?: React.Dispatch<
    React.SetStateAction<ConnectorProvider[]>
  >;
};

type GroupSelectorProps = {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  onOpenSettings?: (tab?: string) => void;
  isProUser?: boolean;
};

type ConnectorSelectorProps = {
  selectedConnectors: ConnectorProvider[];
  onConnectorToggle: (provider: ConnectorProvider) => void;
  user: ComprehensiveUserData | null;
  isProUser?: boolean;
};

// Connector Selector Component
const ConnectorSelector: React.FC<ConnectorSelectorProps> = React.memo(
  ({ selectedConnectors, onConnectorToggle, user, isProUser }) => {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    // Get user's connected connectors
    const { data: connectorsData, isLoading: connectorsLoading } = useQuery({
      queryKey: ["connectors", user?.id],
      queryFn: listUserConnectorsAction,
      enabled: !!user && isProUser,
      staleTime: 1000 * 60 * 2,
    });

    const connectedProviders =
      connectorsData?.connections?.map((conn) => conn.provider) || [];
    const availableConnectors = Object.entries(CONNECTOR_CONFIGS).filter(
      ([provider]) => connectedProviders.includes(provider as ConnectorProvider)
    );

    const selectedCount = selectedConnectors.length;
    const isAllSelected =
      selectedConnectors.length === availableConnectors.length;
    const isSingleConnector = availableConnectors.length === 1;

    // Auto-select all connectors if none selected (must be before early return to maintain hook order)
    React.useEffect(() => {
      if (isProUser && selectedCount === 0 && availableConnectors.length > 0) {
        availableConnectors.forEach(([provider]) => {
          onConnectorToggle(provider as ConnectorProvider);
        });
      }
    }, [isProUser, selectedCount, availableConnectors, onConnectorToggle]);

    if (!isProUser || availableConnectors.length === 0) {
      return null;
    }

    const _handleSelectAll = () => {
      // Don't allow deselecting all if only one connector
      if (isSingleConnector) {
        return;
      }

      if (isAllSelected) {
        // Deselect all
        availableConnectors.forEach(([provider]) => {
          if (selectedConnectors.includes(provider as ConnectorProvider)) {
            onConnectorToggle(provider as ConnectorProvider);
          }
        });
      } else {
        // Select all
        availableConnectors.forEach(([provider]) => {
          if (!selectedConnectors.includes(provider as ConnectorProvider)) {
            onConnectorToggle(provider as ConnectorProvider);
          }
        });
      }
    };

    const _handleClearAll = () => {
      if (isSingleConnector) {
        return;
      }

      selectedConnectors.forEach((provider) => {
        if (availableConnectors.some(([p]) => p === provider)) {
          onConnectorToggle(provider as ConnectorProvider);
        }
      });
    };

    const handleConnectorToggle = (provider: ConnectorProvider) => {
      // Don't allow deselecting if only one connector
      if (isSingleConnector && selectedConnectors.includes(provider)) {
        return;
      }
      onConnectorToggle(provider);
    };

    if (isMobile) {
      return (
        <Dialog onOpenChange={setOpen} open={open}>
          <Button
            className="h-8 px-2 text-xs"
            onClick={() => setOpen(true)}
            size="sm"
            variant="outline"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={ConnectIcon}
              size={16}
              strokeWidth={1.5}
            />
            <span className="ml-1">
              {selectedCount > 0 ? `${selectedCount} active` : "Select"}
            </span>
          </Button>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-sm">Select Connectors</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-2 overflow-auto">
              {availableConnectors.map(([provider, config]) => (
                <div
                  className="flex items-center justify-between rounded-md border p-2"
                  key={provider}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-4 w-4 items-center justify-center">
                      {(() => {
                        const IconComponent = CONNECTOR_ICONS[config.icon];
                        return IconComponent ? (
                          <IconComponent className="h-4 w-4" />
                        ) : null;
                      })()}
                    </div>
                    <span className="font-medium text-sm">{config.name}</span>
                  </div>
                  <Switch
                    checked={selectedConnectors.includes(
                      provider as ConnectorProvider
                    )}
                    disabled={
                      isSingleConnector &&
                      selectedConnectors.includes(provider as ConnectorProvider)
                    }
                    onCheckedChange={() =>
                      handleConnectorToggle(provider as ConnectorProvider)
                    }
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button className="h-8 px-2 text-xs" size="sm" variant="outline">
            <HugeiconsIcon
              color="currentColor"
              icon={ConnectIcon}
              size={16}
              strokeWidth={1.5}
            />
            <span className="ml-1">
              {selectedCount > 0 ? `${selectedCount} active` : "Select"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-2">
          <div className="max-h-64 space-y-1 overflow-auto">
            {availableConnectors.map(([provider, config]) => (
              <div
                className="flex items-center justify-between rounded p-2 hover:bg-muted"
                key={provider}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center">
                    {(() => {
                      const IconComponent = CONNECTOR_ICONS[config.icon];
                      return IconComponent ? (
                        <IconComponent className="h-4 w-4" />
                      ) : null;
                    })()}
                  </div>
                  <span className="font-medium text-sm">{config.name}</span>
                </div>
                <Switch
                  checked={selectedConnectors.includes(
                    provider as ConnectorProvider
                  )}
                  disabled={
                    isSingleConnector &&
                    selectedConnectors.includes(provider as ConnectorProvider)
                  }
                  onCheckedChange={() =>
                    handleConnectorToggle(provider as ConnectorProvider)
                  }
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

ConnectorSelector.displayName = "ConnectorSelector";

const GroupModeToggle: React.FC<GroupSelectorProps> = React.memo(
  ({ selectedGroup, onGroupSelect, status, onOpenSettings, isProUser }) => {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    // Get search provider from localStorage with reactive updates
    const [searchProvider] = useLocalStorage<SearchProvider>(
      "scira-search-provider",
      "parallel"
    );

    // Get dynamic search groups based on the selected search provider
    const dynamicSearchGroups = useMemo(
      () => getSearchGroups(searchProvider),
      [searchProvider]
    );

    // Memoize visible groups calculation
    const visibleGroups = useMemo(
      () =>
        dynamicSearchGroups.filter((group) => {
          if (!group.show) {
            return false;
          }
          if ("requireAuth" in group && group.requireAuth && !session) {
            return false;
          }
          // Don't filter out Pro-only groups, show them with Pro indicator
          return true;
        }),
      [dynamicSearchGroups, session]
    );

    const selectedGroupData = useMemo(
      () => visibleGroups.find((group) => group.id === selectedGroup),
      [visibleGroups, selectedGroup]
    );

    // Shared handler for group selection
    const handleGroupSelect = useCallback(
      async (currentValue: string) => {
        const selectedGroup = visibleGroups.find((g) => g.id === currentValue);

        if (selectedGroup) {
          // Check if this is a Pro-only group and user is not Pro
          if (
            "requirePro" in selectedGroup &&
            selectedGroup.requirePro &&
            !isProUser &&
            onOpenSettings
          ) {
            // Open settings to upgrade
            onOpenSettings("subscription");
            setOpen(false);
            return;
          }

          // Check if connectors group is selected but no connectors are connected
          if (
            selectedGroup.id === "connectors" &&
            session &&
            onOpenSettings &&
            isProUser
          ) {
            try {
              const { listUserConnectorsAction } = await import(
                "@/app/actions"
              );
              const result = await listUserConnectorsAction();
              if (result.success && result.connections.length === 0) {
                // No connectors connected, open settings dialog to connectors tab
                onOpenSettings("connectors");
                setOpen(false);
                return;
              }
            } catch (_error) {
              // If there's an error, still allow group selection
            }
          }

          onGroupSelect(selectedGroup);
          setOpen(false);
        }
      },
      [visibleGroups, isProUser, onOpenSettings, session, onGroupSelect]
    );

    // Handle opening the dropdown/drawer
    const handleOpenChange = useCallback((newOpen: boolean) => {
      setOpen(newOpen);
    }, []);

    // Handle group selector button click (mobile only)
    const handleGroupSelectorClick = useCallback(() => {
      setOpen(true);
    }, []);

    // Shared content component
    const GroupSelectionContent = () => (
      <Command
        className="rounded-lg"
        filter={(value, search) => {
          const group = visibleGroups.find((g) => g.id === value);
          if (!(group && search)) {
            return 1;
          }

          const searchTerm = search.toLowerCase();
          const searchableFields = [group.name, group.description, group.id]
            .join(" ")
            .toLowerCase();

          return searchableFields.includes(searchTerm) ? 1 : 0;
        }}
      >
        <CommandInput className="h-9" placeholder="Search modes..." />
        <CommandEmpty>No search mode found.</CommandEmpty>
        <CommandList className="max-h-[240px]">
          <CommandGroup>
            <div className="px-2 py-1 font-medium text-[10px] text-muted-foreground">
              Search Mode
            </div>
            {visibleGroups.map((group) => (
              <CommandItem
                className={cn(
                  "mb-0.5 flex items-center justify-between rounded-lg px-2 py-2 text-xs",
                  "transition-all duration-200",
                  "hover:bg-accent",
                  "data-[selected=true]:bg-accent"
                )}
                key={group.id}
                onSelect={(value) => handleGroupSelect(value)}
                value={group.id}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 pr-4">
                  <HugeiconsIcon
                    color="currentColor"
                    icon={group.icon}
                    size={30}
                    strokeWidth={2}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-medium text-[11px] text-foreground">
                        {group.name}
                      </span>
                      {"requirePro" in group &&
                        group.requirePro &&
                        !isProUser && (
                          <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1 py-0.5 font-medium text-[8px] text-primary">
                            PRO
                          </span>
                        )}
                    </div>
                    <div className="truncate text-[9px] text-muted-foreground text-wrap! leading-tight">
                      {group.description}
                    </div>
                  </div>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedGroup === group.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    );

    return (
      <div className="flex items-center">
        {/* Toggle Switch Container */}
        <div className="!gap-1 !py-1 !px-0.75 flex h-8 items-center rounded-lg border border-accent/50 bg-background">
          {/* Group Selector Side - Conditional Rendering for Mobile/Desktop */}
          {isMobile ? (
            <Drawer onOpenChange={handleOpenChange} open={open}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DrawerTrigger asChild>
                    <Button
                      aria-expanded={open}
                      className="!m-0 !px-1.5 !rounded-md flex h-6 cursor-pointer items-center gap-1.5 bg-accent text-foreground transition-all hover:bg-accent/80"
                      onClick={handleGroupSelectorClick}
                      role="combobox"
                      size="sm"
                      variant="ghost"
                    >
                      {selectedGroupData && (
                        <>
                          <HugeiconsIcon
                            color="currentColor"
                            icon={selectedGroupData.icon}
                            size={30}
                            strokeWidth={2}
                          />
                          <ChevronsUpDown className="size-4.5 opacity-50" />
                        </>
                      )}
                    </Button>
                  </DrawerTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] p-2" side="bottom">
                  {selectedGroupData ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="rounded bg-primary p-0.5">
                          <HugeiconsIcon
                            className="text-primary-foreground"
                            icon={selectedGroupData.icon}
                            size={14}
                            strokeWidth={2}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-xs">
                            {selectedGroupData.name} Active
                          </p>
                          {"requirePro" in selectedGroupData &&
                            selectedGroupData.requirePro &&
                            !isProUser && (
                              <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1 py-0.5 font-medium text-[9px] text-primary">
                                PRO
                              </span>
                            )}
                        </div>
                      </div>
                      <p className="text-[11px] text-secondary leading-snug">
                        {selectedGroupData.description}
                      </p>
                      <p className="text-[10px] text-accent italic">
                        Click to switch search mode
                      </p>
                      {"requirePro" in selectedGroupData &&
                        selectedGroupData.requirePro &&
                        !isProUser && (
                          <div className="border-border/50 border-t pt-1">
                            <a
                              className="group flex cursor-pointer items-start gap-1 rounded py-1 transition-colors"
                              href="/pricing"
                            >
                              <HugeiconsIcon
                                className="flex-shrink-0 text-secondary transition-transform group-hover:scale-110"
                                icon={Crown02Icon}
                                size={14}
                                strokeWidth={2}
                              />
                              <span className="flex items-center gap-0.5 font-semibold text-[11px] text-secondary group-hover:underline">
                                Unlock with Pro
                                <ArrowUpRight className="group-hover:-translate-y-0.5 size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                              </span>
                            </a>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs">Choose search mode</p>
                  )}
                </TooltipContent>
              </Tooltip>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader className="pb-4 text-left">
                  <DrawerTitle>Choose Search Mode</DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[calc(80vh-100px)] overflow-y-auto px-4 pb-6">
                  <div className="space-y-2">
                    {visibleGroups.map((group) => (
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg p-4 text-left transition-all",
                          "border border-border hover:bg-accent",
                          selectedGroup === group.id
                            ? "border-primary/20 bg-accent"
                            : "bg-background"
                        )}
                        key={group.id}
                        onClick={() => handleGroupSelect(group.id)}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <HugeiconsIcon
                            color="currentColor"
                            icon={group.icon}
                            size={24}
                            strokeWidth={2}
                          />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">
                                {group.name}
                              </span>
                              {"requirePro" in group &&
                                group.requirePro &&
                                !isProUser && (
                                  <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                                    PRO
                                  </span>
                                )}
                            </div>
                            <div className="mt-0.5 text-muted-foreground text-xs">
                              {group.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-3 h-5 w-5 shrink-0",
                            selectedGroup === group.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover onOpenChange={handleOpenChange} open={open}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      aria-expanded={open}
                      className="!m-0 !px-1.5 !rounded-md flex h-6 cursor-pointer items-center gap-1.5 bg-accent text-foreground transition-all hover:bg-accent/80"
                      role="combobox"
                      size="sm"
                      variant="ghost"
                    >
                      {selectedGroupData && (
                        <>
                          <HugeiconsIcon
                            color="currentColor"
                            icon={selectedGroupData.icon}
                            size={30}
                            strokeWidth={2}
                          />
                          <ChevronsUpDown className="size-4.5 opacity-50" />
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] p-2" side="bottom">
                  {selectedGroupData ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="rounded bg-primary p-0.5">
                          <HugeiconsIcon
                            className="text-primary-foreground"
                            icon={selectedGroupData.icon}
                            size={14}
                            strokeWidth={2}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="font-semibold text-xs">
                            {selectedGroupData.name} Active
                          </p>
                          {"requirePro" in selectedGroupData &&
                            selectedGroupData.requirePro &&
                            !isProUser && (
                              <span className="inline-flex items-center rounded border border-primary/20 bg-primary/10 px-1 py-0.5 font-medium text-[9px] text-primary">
                                PRO
                              </span>
                            )}
                        </div>
                      </div>
                      <p className="text-[11px] text-secondary leading-snug">
                        {selectedGroupData.description}
                      </p>
                      <p className="text-[10px] text-accent italic">
                        Click to switch search mode
                      </p>
                      {"requirePro" in selectedGroupData &&
                        selectedGroupData.requirePro &&
                        !isProUser && (
                          <div className="border-border/50 border-t pt-1">
                            <a
                              className="group flex cursor-pointer items-start gap-1 rounded py-1 transition-colors"
                              href="/pricing"
                            >
                              <HugeiconsIcon
                                className="flex-shrink-0 text-secondary transition-transform group-hover:scale-110"
                                icon={Crown02Icon}
                                size={14}
                                strokeWidth={2}
                              />
                              <span className="flex items-center gap-0.5 font-semibold text-[11px] text-secondary group-hover:underline">
                                Unlock with Pro
                                <ArrowUpRight className="group-hover:-translate-y-0.5 size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                              </span>
                            </a>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs">Choose search mode</p>
                  )}
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                align="start"
                avoidCollisions={true}
                className="!shadow-none z-50 w-[90vw] max-w-[14em] rounded-lg border bg-popover p-0 font-sans sm:w-[14em]"
                collisionPadding={8}
                side="bottom"
                sideOffset={4}
              >
                <GroupSelectionContent />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    );
  }
);

GroupModeToggle.displayName = "GroupModeToggle";

const FormComponent: React.FC<FormComponentProps> = ({
  chatId,
  user,
  subscriptionData,
  input,
  setInput,
  attachments,
  setAttachments,
  sendMessage,
  fileInputRef,
  inputRef,
  stop,
  selectedModel,
  setSelectedModel,
  resetSuggestedQuestions,
  lastSubmittedQueryRef,
  selectedGroup,
  setSelectedGroup,
  messages,
  status,
  setHasSubmitted,
  isLimitBlocked = false,
  onOpenSettings,
  selectedConnectors = [],
  setSelectedConnectors,
}) => {
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const isMounted = useRef(true);
  const isCompositionActive = useRef(false);
  const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Combined state for animations to avoid restart issues
  const isEnhancementActive = isEnhancing || isTypewriting;
  const audioLinesRef = useRef<any>(null);
  const gripIconRef = useRef<any>(null);

  const isMobile = useIsMobile();

  const isProUser = useMemo(
    () =>
      user?.isProUser ||
      (subscriptionData?.hasSubscription &&
        subscriptionData?.subscription?.status === "active"),
    [
      user?.isProUser,
      subscriptionData?.hasSubscription,
      subscriptionData?.subscription?.status,
    ]
  );

  const isProcessing = useMemo(
    () => status === "submitted" || status === "streaming",
    [status]
  );

  const hasInteracted = useMemo(() => messages.length > 0, [messages.length]);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  // Control audio lines animation
  useEffect(() => {
    if (audioLinesRef.current) {
      if (isRecording) {
        audioLinesRef.current.startAnimation();
      } else {
        audioLinesRef.current.stopAnimation();
      }
    }
  }, [isRecording]);

  // Control grip icon animation using combined state to avoid restarts
  useEffect(() => {
    if (gripIconRef.current) {
      if (isEnhancementActive) {
        gripIconRef.current.startAnimation();
      } else {
        gripIconRef.current.stopAnimation();
      }
    }
  }, [isEnhancementActive]);

  // Global typing detection to auto-focus form
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't interfere if user is already typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      // Don't interfere with keyboard shortcuts (Ctrl/Cmd + key)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Don't interfere with function keys, arrow keys, etc.
      if (
        event.key.length > 1 && // Multi-character keys like 'Enter', 'Escape', etc.
        !["Backspace", "Delete", "Space"].includes(event.key)
      ) {
        return;
      }

      // Don't focus if form is already focused
      if (inputRef.current && document.activeElement === inputRef.current) {
        return;
      }

      // Don't focus if recording is active
      if (isRecording) {
        return;
      }

      // Focus the input and add the typed character
      if (inputRef.current && event.key.length === 1) {
        inputRef.current.focus();
        // If it's a printable character, add it to the input
        if (event.key !== " " || input.length > 0) {
          // Allow space only if there's already content
          setInput(input + event.key);
          event.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isRecording, input, setInput, inputRef]);

  // Typewriter effect for enhanced text
  const typewriterText = useCallback(
    (text: string, speed = 5) => {
      if (!inputRef.current) {
        return;
      }

      setIsTypewriting(true);
      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex <= text.length && inputRef.current) {
          const currentText = text.substring(0, currentIndex);
          setInput(currentText);

          // Auto-resize textarea during typing
          if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          }

          currentIndex++;

          if (currentIndex <= text.length) {
            setTimeout(typeNextChar, speed);
          } else {
            setIsTypewriting(false);
          }
        }
      };

      typeNextChar();
    },
    [setInput, inputRef]
  );

  const handleEnhance = useCallback(async () => {
    if (!isProUser) {
      setShowUpgradeDialog(true);
      return;
    }
    if (!input || input.trim().length === 0) {
      toast.error("Please enter a prompt to enhance");
      return;
    }
    if (isProcessing || isEnhancing) {
      return;
    }

    const originalInput = input;

    try {
      setIsEnhancing(true);
      toast.loading("Enhancing your prompt...", { id: "enhance-prompt" });

      const result = await enhancePrompt(input);

      if (result?.success && result.enhanced) {
        // Clear input and start typewriter
        setInput("");
        typewriterText(result.enhanced);

        toast.success("✨ Prompt enhanced successfully!", {
          id: "enhance-prompt",
        });
        setIsEnhancing(false);
        inputRef.current?.focus();
      } else {
        setInput(originalInput);
        toast.error(result?.error || "Failed to enhance prompt", {
          id: "enhance-prompt",
        });
        setIsEnhancing(false);
      }
    } catch (_e) {
      setInput(originalInput);
      toast.error("Failed to enhance prompt", { id: "enhance-prompt" });
      setIsEnhancing(false);
    }
  }, [
    input,
    isProcessing,
    isProUser,
    setInput,
    inputRef,
    typewriterText,
    isEnhancing,
  ]);

  const handleRecord = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      cleanupMediaRecorder();
    } else {
      try {
        // Environment and feature checks
        if (typeof window === "undefined") {
          toast.error("Voice recording is only available in the browser.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          toast.error("Voice recording is not supported in this browser.");
          return;
        }

        // Best-effort permissions hint (not supported in all browsers)
        try {
          const permApi: any = (navigator as any).permissions;
          if (permApi?.query) {
            const status = await permApi.query({ name: "microphone" as any });
            if (status?.state === "denied") {
              toast.error(
                "Microphone access is denied. Enable it in your browser settings."
              );
              return;
            }
          }
        } catch {
          // Ignore permissions API errors; proceed to request directly
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // Pick a supported MIME type to maximize cross-browser compatibility (e.g., Safari)
        const candidateMimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4;codecs=mp4a.40.2",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/mpeg",
        ];
        const isTypeSupported = (type: string) =>
          typeof MediaRecorder !== "undefined" &&
          (MediaRecorder as any).isTypeSupported?.(type);
        const selectedMimeType = candidateMimeTypes.find((t) =>
          isTypeSupported(t)
        );

        let recorder: MediaRecorder;
        try {
          recorder = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream);
        } catch (_e) {
          // Fallback: try without options
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.addEventListener("dataavailable", async (event) => {
          if (event.data.size > 0) {
            const audioBlob = event.data;

            try {
              const formData = new FormData();
              const extension = (() => {
                const type = (audioBlob?.type || "").toLowerCase();
                if (type.includes("mp4")) {
                  return "mp4";
                }
                if (type.includes("ogg")) {
                  return "ogg";
                }
                if (type.includes("mpeg")) {
                  return "mp3";
                }
                return "webm";
              })();
              formData.append("audio", audioBlob, `recording.${extension}`);
              const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
              });

              if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
              }

              const data = await response.json();

              if (data.text) {
                setInput(data.text);
              } else {
              }
            } catch (_error) {
              toast.error("Failed to transcribe audio. Please try again.");
            } finally {
              cleanupMediaRecorder();
            }
          }
        });

        recorder.addEventListener("error", (_e) => {
          toast.error("Recording failed. Please try again or switch browser.");
          cleanupMediaRecorder();
        });

        recorder.addEventListener("stop", () => {
          stream.getTracks().forEach((track) => track.stop());
        });

        recorder.start();
        setIsRecording(true);
      } catch (_error) {
        toast.error(
          "Could not access microphone. Please allow mic permission."
        );
        setIsRecording(false);
      }
    }
  }, [isRecording, cleanupMediaRecorder, setInput]);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const newValue = event.target.value;

      if (newValue.length > MAX_INPUT_CHARS) {
        setInput(newValue);
        toast.error(
          `Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`
        );
      } else {
        setInput(newValue);
      }
    },
    [setInput]
  );

  const handleGroupSelect = useCallback(
    (group: SearchGroup) => {
      if (!(isEnhancing || isTypewriting)) {
        setSelectedGroup(group.id);
        inputRef.current?.focus();
      }
    },
    [setSelectedGroup, inputRef, isEnhancing, isTypewriting]
  );

  const handleConnectorToggle = useCallback(
    (provider: ConnectorProvider) => {
      if (!setSelectedConnectors) {
        return;
      }

      setSelectedConnectors((prev) => {
        if (prev.includes(provider)) {
          return prev.filter((p) => p !== provider);
        }
        return [...prev, provider];
      });
    },
    [setSelectedConnectors]
  );

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      const errorText = await response.text();
      throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
    } catch (error) {
      toast.error(
        `Failed to upload ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      throw error;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        return;
      }

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        } else if (file.type === "application/pdf") {
          if (isProUser) {
            pdfFiles.push(file);
          } else {
            blockedPdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        toast.error(
          `Some files are not supported: ${unsupportedFiles.map((f) => f.name).join(", ")}`
        );
      }

      if (blockedPdfFiles.length > 0) {
        toast.error(
          "PDF uploads require Pro subscription. Upgrade to access PDF analysis.",
          {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/pricing"),
            },
          }
        );
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        event.target.value = "";
        return;
      }

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && !currentModelData?.pdf) {
        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          setSelectedModel(compatibleModel.value);
        } else {
          toast.error("PDFs are only supported by Claude models");

          if (imageFiles.length === 0) {
            event.target.value = "";
            return;
          }
        }
      }

      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        event.target.value = "";
        return;
      }

      if (validFiles.length === 0) {
        event.target.value = "";
        return;
      }

      if (imageFiles.length > 0) {
        try {
          toast.info("Checking images for safety...");

          const imageDataURLs = await Promise.all(
            imageFiles.map((file) => fileToDataURL(file))
          );

          const moderationResult = await checkImageModeration(imageDataURLs);

          if (moderationResult !== "safe") {
            const [status, category] = moderationResult.split("\n");
            if (status === "unsafe") {
              toast.error(
                `Image content violates safety guidelines (${category}). Please choose different images.`
              );
              event.target.value = "";
              return;
            }
          }
        } catch (_error) {
          toast.error("Unable to verify image safety. Please try again.");
          event.target.value = "";
          return;
        }
      }

      setUploadQueue(validFiles.map((file) => file.name));

      try {
        const uploadedAttachments: Attachment[] = [];
        for (const file of validFiles) {
          try {
            const attachment = await uploadFile(file);
            uploadedAttachments.push(attachment);
          } catch (_err) {}
        }

        if (uploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...uploadedAttachments,
          ]);

          toast.success(
            `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? "s" : ""} uploaded successfully`
          );
        } else {
          toast.error("No files were successfully uploaded");
        }
      } catch (_error) {
        toast.error("Failed to upload one or more files. Please try again.");
      } finally {
        setUploadQueue([]);
        event.target.value = "";
      }
    },
    [
      attachments.length,
      setAttachments,
      selectedModel,
      setSelectedModel,
      isProUser,
      uploadFile,
    ]
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [setAttachments]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (attachments.length >= MAX_FILES) {
        return;
      }

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const hasFile = Array.from(e.dataTransfer.items).some(
          (item) => item.kind === "file"
        );
        if (hasFile) {
          setIsDragging(true);
        }
      }
    },
    [attachments.length]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getFirstVisionModel = useCallback(
    () => models.find((model) => model.vision)?.value || selectedModel,
    [selectedModel]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const allFiles = Array.from(e.dataTransfer.files);

      if (allFiles.length === 0) {
        toast.error("No files detected in drop");
        return;
      }

      toast.info(`Detected ${allFiles.length} dropped files`);

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      allFiles.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
        } else if (file.type === "application/pdf") {
          if (isProUser) {
            pdfFiles.push(file);
          } else {
            blockedPdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        toast.error(
          `Some files not supported: ${unsupportedFiles.map((f) => f.name).join(", ")}`
        );
      }

      if (oversizedFiles.length > 0) {
        toast.error(
          `Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`
        );
      }

      if (blockedPdfFiles.length > 0) {
        toast.error(
          "PDF uploads require Pro subscription. Upgrade to access PDF analysis.",
          {
            action: {
              label: "Upgrade",
              onClick: () => (window.location.href = "/pricing"),
            },
          }
        );
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        toast.error("Only image and PDF files are supported");
        return;
      }

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && !currentModelData?.pdf) {
        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          setSelectedModel(compatibleModel.value);
          toast.info(
            `Switching to ${compatibleModel.label} to support PDF files`
          );
        } else {
          toast.error("PDFs are only supported by Claude models");
          if (imageFiles.length === 0) {
            return;
          }
        }
      }

      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      if (validFiles.length === 0) {
        toast.error("No valid files to upload");
        return;
      }

      if (imageFiles.length > 0) {
        try {
          toast.info("Checking images for safety...");

          const imageDataURLs = await Promise.all(
            imageFiles.map((file) => fileToDataURL(file))
          );

          const moderationResult = await checkImageModeration(imageDataURLs);

          if (moderationResult !== "safe") {
            const [status, category] = moderationResult.split("\n");
            if (status === "unsafe") {
              toast.error(
                `Image content violates safety guidelines (${category}). Please choose different images.`
              );
              return;
            }
          }
        } catch (_error) {
          toast.error("Unable to verify image safety. Please try again.");
          return;
        }
      }

      if (!currentModelData?.vision) {
        let visionModel: string;

        if (pdfFiles.length > 0) {
          const pdfCompatibleModel = models.find((m) => m.vision && m.pdf);
          if (pdfCompatibleModel) {
            visionModel = pdfCompatibleModel.value;
          } else {
            visionModel = getFirstVisionModel();
          }
        } else {
          visionModel = getFirstVisionModel();
        }
        setSelectedModel(visionModel);
      }

      setUploadQueue(validFiles.map((file) => file.name));
      toast.info(`Starting upload of ${validFiles.length} files...`);

      setTimeout(async () => {
        try {
          const uploadedAttachments: Attachment[] = [];
          for (const file of validFiles) {
            try {
              const attachment = await uploadFile(file);
              uploadedAttachments.push(attachment);
            } catch (_err) {}
          }

          if (uploadedAttachments.length > 0) {
            setAttachments((currentAttachments) => [
              ...currentAttachments,
              ...uploadedAttachments,
            ]);

            toast.success(
              `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? "s" : ""} uploaded successfully`
            );
          } else {
            toast.error("No files were successfully uploaded");
          }
        } catch (_error) {
          toast.error("Upload failed. Please check console for details.");
        } finally {
          setUploadQueue([]);
        }
      }, 100);
    },
    [
      attachments.length,
      setAttachments,
      uploadFile,
      selectedModel,
      setSelectedModel,
      getFirstVisionModel,
      isProUser,
    ]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));

      if (imageItems.length === 0) {
        return;
      }

      e.preventDefault();

      const totalAttachments = attachments.length + imageItems.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      const files = imageItems
        .map((item) => item.getAsFile())
        .filter(Boolean) as File[];
      const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        toast.error(
          `Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name || "unnamed").join(", ")}`
        );

        const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
        if (validFiles.length === 0) {
          return;
        }
      }

      const currentModel = models.find((m) => m.value === selectedModel);
      if (!currentModel?.vision) {
        const visionModel = getFirstVisionModel();
        setSelectedModel(visionModel);
      }

      const filesToUpload =
        oversizedFiles.length > 0
          ? files.filter((file) => file.size <= MAX_FILE_SIZE)
          : files;

      if (filesToUpload.length > 0) {
        try {
          toast.info("Checking pasted images for safety...");

          const imageDataURLs = await Promise.all(
            filesToUpload.map((file) => fileToDataURL(file))
          );

          const moderationResult = await checkImageModeration(imageDataURLs);

          if (moderationResult !== "safe") {
            const [status, category] = moderationResult.split("\n");
            if (status === "unsafe") {
              toast.error(
                `Pasted image content violates safety guidelines (${category}). Please choose different images.`
              );
              return;
            }
          }
        } catch (_error) {
          toast.error(
            "Unable to verify pasted image safety. Please try again."
          );
          return;
        }
      }

      setUploadQueue(
        filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`)
      );

      try {
        const uploadPromises = filesToUpload.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...uploadedAttachments,
        ]);

        toast.success("Image pasted successfully");
      } catch (_error) {
        toast.error("Failed to upload pasted image. Please try again.");
      } finally {
        setUploadQueue([]);
      }
    },
    [
      attachments.length,
      setAttachments,
      uploadFile,
      selectedModel,
      setSelectedModel,
      getFirstVisionModel,
    ]
  );

  useEffect(() => {
    if (status !== "ready" && inputRef.current) {
      const focusTimeout = setTimeout(() => {
        if (isMounted.current && inputRef.current) {
          inputRef.current.focus({
            preventScroll: true,
          });
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [status, inputRef]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (status !== "ready") {
        toast.error("Please wait for the current response to complete!");
        return;
      }

      if (isRecording) {
        toast.error("Please stop recording before submitting!");
        return;
      }

      const shouldBypassLimitsForThisModel = shouldBypassRateLimits(
        selectedModel,
        user
      );

      if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
        toast.error(
          "Daily search limit reached. Please upgrade to Pro for unlimited searches."
        );
        return;
      }

      if (input.length > MAX_INPUT_CHARS) {
        toast.error(
          `Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`
        );
        return;
      }

      if (input.trim() || attachments.length > 0) {
        track("model_selected", {
          model: selectedModel,
        });

        if (user) {
          window.history.replaceState({}, "", `/search/${chatId}`);
        }

        setHasSubmitted(true);
        lastSubmittedQueryRef.current = input.trim();

        sendMessage({
          role: "user",
          parts: [
            ...attachments.map((attachment) => ({
              type: "file" as const,
              url: attachment.url,
              name: attachment.name,
              mediaType: attachment.contentType || attachment.mediaType || "",
            })),
            {
              type: "text",
              text: input,
            },
          ],
        });

        setInput("");
        setAttachments([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error("Please enter a search query or attach an image.");
      }
    },
    [
      input,
      attachments,
      sendMessage,
      setInput,
      setAttachments,
      fileInputRef,
      lastSubmittedQueryRef,
      status,
      selectedModel,
      setHasSubmitted,
      isLimitBlocked,
      user,
      isRecording,
      chatId,
    ]
  );

  const submitForm = useCallback(
    () =>
      debounce(() => {
        onSubmit({
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.FormEvent<HTMLFormElement>);
        resetSuggestedQuestions();

        // Handle iOS keyboard behavior differently
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          inputRef.current?.blur();
        } else {
          inputRef.current?.focus();
        }
      }, 500)(),
    [onSubmit, resetSuggestedQuestions, inputRef]
  );

  const triggerFileInput = useCallback(() => {
    if (attachments.length >= MAX_FILES) {
      toast.error(`You can only attach up to ${MAX_FILES} images.`);
      return;
    }

    if (status === "ready") {
      postSubmitFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }, [attachments.length, status, fileInputRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Desktop: submit on Cmd/Ctrl + Enter.
      // Mobile: submit on Enter, allow Shift+Enter to insert newline (when available).
      if (event.key === "Enter" && !isCompositionActive.current) {
        if (isMobile) {
          if (event.shiftKey) {
            // Allow newline on Shift+Enter (no preventDefault)
            return;
          }
          event.preventDefault();
          if (isProcessing) {
            toast.error("Please wait for the response to complete!");
          } else if (isRecording) {
            toast.error("Please stop recording before submitting!");
          } else {
            const shouldBypassLimitsForThisModel = shouldBypassRateLimits(
              selectedModel,
              user
            );
            if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
              toast.error(
                "Daily search limit reached. Please upgrade to Pro for unlimited searches."
              );
            } else {
              submitForm();
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            }
          }
        } else {
          if (event.shiftKey) {
            return;
          }
          event.preventDefault();
          if (isProcessing) {
            toast.error("Please wait for the response to complete!");
          } else if (isRecording) {
            toast.error("Please stop recording before submitting!");
          } else {
            const shouldBypassLimitsForThisModel = shouldBypassRateLimits(
              selectedModel,
              user
            );
            if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
              toast.error(
                "Daily search limit reached. Please upgrade to Pro for unlimited searches."
              );
            } else {
              submitForm();
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            }
          }
        }
      }
    },
    [
      isProcessing,
      isRecording,
      selectedModel,
      user,
      isLimitBlocked,
      submitForm,
      inputRef,
      isMobile,
    ]
  );

  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) {
      return;
    }

    const target = inputRef.current;

    target.style.height = "auto";

    const scrollHeight = target.scrollHeight;
    const maxHeight = 300;

    if (scrollHeight > maxHeight) {
      target.style.height = `${maxHeight}px`;
      target.style.overflowY = "auto";
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = "hidden";
    }
  }, [inputRef]);

  // Debounced resize function
  const debouncedResize = useMemo(
    () => debounce(resizeTextarea, 100),
    [resizeTextarea]
  );

  // Resize textarea when input value changes
  useEffect(() => {
    debouncedResize();
  }, [debouncedResize]);

  return (
    <div className={cn("mx-auto flex w-full max-w-2xl flex-col")}>
      <TooltipProvider>
        <div
          className={cn(
            "relative flex w-full flex-col gap-1 rounded-lg font-sans! transition-all duration-300",
            hasInteracted ? "z-50" : "z-10",
            isDragging && "ring-1 ring-border",
            attachments.length > 0 || uploadQueue.length > 0
              ? "!backdrop-blur-md bg-muted/40 p-1 shadow-black/5 shadow-sm dark:shadow-black/10"
              : "bg-transparent"
          )}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragging && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 m-2 flex items-center justify-center rounded-lg border border-border/60 border-dashed bg-background/90 shadow-black/10 shadow-xl backdrop-blur-md dark:shadow-black/25"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="!shadow-none rounded-full bg-muted p-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-medium text-foreground text-sm">
                      Drop images or PDFs here
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Max {MAX_FILES} files (5MB per file)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription &&
                  subscriptionData?.subscription?.status === "active")
            )}
            className="hidden"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
          <input
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription &&
                  subscriptionData?.subscription?.status === "active")
            )}
            className="hidden"
            multiple
            onChange={handleFileChange}
            ref={postSubmitFileInputRef}
            tabIndex={-1}
            type="file"
          />

          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent z-10 flex max-h-28 flex-row gap-2 overflow-x-auto px-1 py-2">
              {attachments.map((attachment, index) => (
                <AttachmentPreview
                  attachment={attachment}
                  isUploading={false}
                  key={attachment.url}
                  onRemove={() => removeAttachment(index)}
                />
              ))}
              {uploadQueue.map((filename) => (
                <AttachmentPreview
                  attachment={
                    {
                      url: "",
                      name: filename,
                      contentType: "",
                      size: 0,
                    } as Attachment
                  }
                  isUploading={true}
                  key={filename}
                  onRemove={() => {}}
                />
              ))}
            </div>
          )}

          {/* Form container */}
          <div className="relative">
            {/* Shadow-like background blur effect */}
            <div className="-inset-1 !blur-sm pointer-events-none absolute z-9999 rounded-2xl bg-primary/5 dark:bg-primary/2" />
            <div
              className={cn(
                "!bg-muted relative rounded-xl border border-border/60 transition-all duration-200 focus-within:border-ring/50",
                "border-0",
                (isEnhancing || isTypewriting) && "!bg-muted"
              )}
            >
              {isRecording ? (
                <Textarea
                  className={cn(
                    "w-full rounded-xl rounded-b-none md:text-base!",
                    "text-base leading-relaxed",
                    "!bg-muted",
                    "border-0!",
                    "!text-muted-foreground",
                    "focus:ring-0! focus-visible:ring-0!",
                    "px-4! py-4!",
                    "touch-manipulation",
                    "whatsize",
                    "text-center",
                    "cursor-not-allowed",
                    "!shadow-none"
                  )}
                  disabled={true}
                  placeholder=""
                  ref={inputRef}
                  rows={1}
                  style={{
                    WebkitUserSelect: "text",
                    WebkitTouchCallout: "none",
                    minHeight: undefined,
                    resize: "none",
                  }}
                  value="◉ Recording..."
                />
              ) : (
                <Textarea
                  autoFocus={!(isEnhancing || isTypewriting)}
                  className={cn(
                    "w-full rounded-xl rounded-b-none md:text-sm!",
                    "text-sm leading-relaxed",
                    "!bg-muted",
                    "!border-0",
                    "text-foreground",
                    "focus:!ring-0 focus-visible:!ring-0",
                    "!px-4 !py-4",
                    "touch-manipulation",
                    "whatsize",
                    "!shadow-none",
                    "transition-all duration-200",
                    (isEnhancing || isTypewriting) &&
                      "cursor-wait text-muted-foreground"
                  )}
                  disabled={isEnhancing || isTypewriting}
                  onChange={handleInput}
                  onCompositionEnd={() => (isCompositionActive.current = false)}
                  onCompositionStart={() =>
                    (isCompositionActive.current = true)
                  }
                  onInput={(e) => {
                    // Auto-resize textarea based on content
                    const target = e.target as HTMLTextAreaElement;

                    // Reset height to auto first to get the actual scroll height
                    target.style.height = "auto";

                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 300; // Increased max height for desktop

                    if (scrollHeight > maxHeight) {
                      target.style.height = `${maxHeight}px`;
                      target.style.overflowY = "auto";
                    } else {
                      target.style.height = `${scrollHeight}px`;
                      target.style.overflowY = "hidden";
                    }

                    // Ensure the cursor position is visible by scrolling to bottom if needed
                    requestAnimationFrame(() => {
                      const cursorPosition = target.selectionStart;
                      if (cursorPosition === target.value.length) {
                        target.scrollTop = target.scrollHeight;
                      }
                    });
                  }}
                  onKeyDown={
                    isEnhancing || isTypewriting ? undefined : handleKeyDown
                  }
                  onPaste={
                    isEnhancing || isTypewriting ? undefined : handlePaste
                  }
                  placeholder={
                    isEnhancing
                      ? "✨ Enhancing your prompt..."
                      : isTypewriting
                        ? "✨ Writing enhanced prompt..."
                        : hasInteracted
                          ? "Ask a new question..."
                          : "Ask a question..."
                  }
                  ref={inputRef}
                  rows={1}
                  style={{
                    WebkitUserSelect: "text",
                    WebkitTouchCallout: "none",
                    minHeight: undefined,
                    resize: "none",
                  }}
                  value={input}
                />
              )}

              {/* Toolbar as a separate block - no absolute positioning */}
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-none rounded-b-xl",
                  "!bg-muted",
                  "!border-0",
                  "gap-2 p-2 shadow-none",
                  "transition-all duration-200",
                  (isEnhancing || isTypewriting) && "pointer-events-none",
                  isRecording && "!bg-muted text-muted-foreground"
                )}
              >
                <div className={cn("flex items-center gap-2")}>
                  <GroupModeToggle
                    isProUser={isProUser}
                    onGroupSelect={handleGroupSelect}
                    onOpenSettings={onOpenSettings}
                    selectedGroup={selectedGroup}
                    status={status}
                  />

                  {selectedGroup === "connectors" && setSelectedConnectors && (
                    <ConnectorSelector
                      isProUser={isProUser}
                      onConnectorToggle={handleConnectorToggle}
                      selectedConnectors={selectedConnectors}
                      user={user}
                    />
                  )}

                  <ModelSwitcher
                    attachments={attachments}
                    messages={messages}
                    onModelSelect={(model) => {
                      setSelectedModel(model.value);
                      const isVisionModel = hasVisionSupport(model.value);
                      toast.message(`Switched to ${model.label}`, {
                        description: isVisionModel
                          ? "You can now upload images to the model."
                          : undefined,
                        icon: (
                          <HugeiconsIcon
                            color="currentColor"
                            icon={CpuIcon}
                            size={16}
                            strokeWidth={2}
                          />
                        ),
                      });
                    }}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    status={status}
                    subscriptionData={subscriptionData}
                    user={user}
                  />
                </div>

                <div className={cn("flex flex-shrink-0 items-center gap-1")}>
                  {hasVisionSupport(selectedModel) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          className="group !size-8 !shadow-none hover:!bg-primary/30 hover:!border-0 rounded-full border-0 transition-colors duration-200"
                          disabled={isEnhancing || isTypewriting}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!(isEnhancing || isTypewriting)) {
                              triggerFileInput();
                            }
                          }}
                          size="icon"
                          variant="outline"
                        >
                          <span className="block">
                            <HugeiconsIcon
                              icon={DocumentAttachmentIcon}
                              size={16}
                            />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="!shadow-none border-0 px-3 py-2 backdrop-blur-xs"
                        side="bottom"
                        sideOffset={6}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            Attach File
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {hasPdfSupport(selectedModel)
                              ? "Upload an image or PDF document"
                              : "Upload an image"}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Show enhance button when there's input */}
                  {(input.length > 0 || isEnhancing || isTypewriting) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          className={cn(
                            "group !size-8 !shadow-none hover:!bg-primary/30 hover:!border-0 rounded-full border-0 transition-colors duration-200",
                            isEnhancementActive &&
                              "border-primary/20 bg-primary/10"
                          )}
                          disabled={
                            isEnhancing ||
                            isTypewriting ||
                            uploadQueue.length > 0 ||
                            status !== "ready" ||
                            isLimitBlocked
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!(isEnhancing || isTypewriting)) {
                              handleEnhance();
                            }
                          }}
                          size="icon"
                          variant="outline"
                        >
                          <span className="block">
                            {isEnhancementActive ? (
                              <GripIcon
                                className="text-primary"
                                ref={gripIconRef}
                                size={16}
                              />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="!shadow-none border-0 px-3 py-2 backdrop-blur-xs"
                        side="bottom"
                        sideOffset={6}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isEnhancing
                              ? "Enhancing…"
                              : isTypewriting
                                ? "Writing…"
                                : "Enhance Prompt"}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {isEnhancing
                              ? "Using AI to improve your prompt"
                              : isTypewriting
                                ? "Typing enhanced prompt"
                                : isProUser
                                  ? "Enhance your prompt with AI"
                                  : "Enhance your prompt with AI (Pro feature)"}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {isProcessing ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          className="group !size-8 rounded-full transition-colors duration-200"
                          disabled={isEnhancing || isTypewriting}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!(isEnhancing || isTypewriting)) {
                              stop();
                            }
                          }}
                          size="icon"
                          variant="destructive"
                        >
                          <span className="block">
                            <StopIcon size={14} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="!shadow-none border-0 px-3 py-2 backdrop-blur-xs"
                        side="bottom"
                        sideOffset={6}
                      >
                        <span className="font-medium text-[11px]">
                          Stop Generation
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 &&
                    attachments.length === 0 &&
                    !isEnhancing &&
                    !isTypewriting ? (
                    /* Show Voice Recording Button when no input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          className={cn(
                            "group !size-8 m-auto rounded-full transition-colors duration-200"
                          )}
                          disabled={isEnhancing || isTypewriting}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!(isEnhancing || isTypewriting)) {
                              handleRecord();
                            }
                          }}
                          size="icon"
                          variant={isRecording ? "destructive" : "default"}
                        >
                          <span className="block">
                            <AudioLinesIcon ref={audioLinesRef} size={16} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="!shadow-none border-0 px-3 py-2 backdrop-blur-xs"
                        side="bottom"
                        sideOffset={6}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isRecording ? "Stop Recording" : "Voice Input"}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {isRecording
                              ? "Click to stop recording"
                              : "Record your voice message"}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    /* Show Send Button when there is input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          className="group !size-8 m-auto flex rounded-full transition-colors duration-200"
                          disabled={
                            (input.length === 0 &&
                              attachments.length === 0 &&
                              !isEnhancing &&
                              !isTypewriting) ||
                            uploadQueue.length > 0 ||
                            status !== "ready" ||
                            isLimitBlocked ||
                            isEnhancing ||
                            isTypewriting
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!(isEnhancing || isTypewriting)) {
                              submitForm();
                            }
                          }}
                          size="icon"
                        >
                          <span className="block">
                            <ArrowUpIcon size={16} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        className="!shadow-none border-0 px-3 py-2 backdrop-blur-xs"
                        side="bottom"
                        sideOffset={6}
                      >
                        <div className="text-center">
                          <div className="mb-1 font-medium text-[11px]">
                            Send Message
                          </div>
                          <div className="space-y-0.5 text-[10px] text-accent">
                            <div className="flex items-center justify-center gap-1.5">
                              <KbdGroup>
                                <Kbd className="h-4 min-w-4 rounded px-0.5 text-[9px]">
                                  Shift
                                </Kbd>
                                <span>+</span>
                                <Kbd className="h-4 min-w-4 rounded px-0.5 text-[9px]">
                                  Enter
                                </Kbd>
                              </KbdGroup>
                              <span>for new line</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5">
                              <Kbd className="h-4 min-w-4 rounded px-0.5 text-[9px]">
                                Enter
                              </Kbd>
                              <span>to send</span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Upgrade Dialog */}
        <Dialog onOpenChange={setShowUpgradeDialog} open={showUpgradeDialog}>
          <DialogContent
            className="gap-0 overflow-hidden bg-background p-0 sm:max-w-[450px]"
            showCloseButton={false}
          >
            <DialogHeader className="p-2">
              <div className="relative w-full overflow-hidden rounded-md p-6 text-white">
                <div className="absolute inset-0 rounded-sm bg-[url('/placeholder.png')] bg-center bg-cover">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10" />
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-xl sm:text-2xl">
                        Unlock
                      </span>
                      <ProBadge className="!text-white !bg-white/20 !ring-white/30 mb-0.5 font-extralight" />
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-bold text-2xl">
                        ${PRICING.PRO_MONTHLY}
                      </span>
                      <span className="text-sm text-white/80">/month</span>
                    </div>
                    <p className="text-left text-sm text-white/80">
                      Get enhanced capabilities including prompt enhancement and
                      unlimited features
                    </p>
                  </DialogDescription>
                  <Button
                    className="mt-3 w-full border border-white/20 bg-white/90 font-medium text-black backdrop-blur-md hover:bg-white"
                    onClick={() => {
                      window.location.href = "/pricing";
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4 px-6 py-6">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Prompt Enhancement
                  </p>
                  <p className="text-muted-foreground text-xs">
                    AI-powered prompt optimization
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Unlimited Searches
                  </p>
                  <p className="text-muted-foreground text-xs">
                    No daily limits on your research
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Advanced AI Models
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground text-sm">
                    Scira Lookout
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Automated search monitoring on your schedule
                  </p>
                </div>
              </div>

              <div className="mt-4 flex w-full items-center gap-2">
                <div className="flex-1 border-foreground/10 border-b" />
                <p className="text-foreground/50 text-xs">
                  Cancel anytime • Secure payment
                </p>
                <div className="flex-1 border-foreground/10 border-b" />
              </div>

              <Button
                className="mt-2 w-full text-muted-foreground hover:text-foreground"
                onClick={() => setShowUpgradeDialog(false)}
                size="sm"
                variant="ghost"
              >
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
