"use client";

import {
  Analytics01Icon,
  Brain02Icon,
  ConnectIcon,
  Crown02Icon,
  GlobalSearchIcon,
  InformationCircleIcon,
  Settings02Icon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowClockwiseIcon,
  CalendarIcon,
  FloppyDiskIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  RobotIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Clock, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createConnectorAction,
  deleteConnectorAction,
  deleteCustomInstructionsAction,
  getConnectorSyncStatusAction,
  getCustomInstructions,
  getExtremeSearchUsageCount,
  getHistoricalUsage,
  getSubDetails,
  getUserMessageCount,
  listUserConnectorsAction,
  manualSyncConnectorAction,
  saveCustomInstructions,
} from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  type Activity,
  ContributionGraph,
  ContributionGraphBlock,
  ContributionGraphCalendar,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from "@/components/ui/kibo-ui/contribution-graph";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsProUser } from "@/contexts/user-context";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useMediaQuery } from "@/hooks/use-media-query";
import { authClient } from "@/lib/auth-client";
import {
  CONNECTOR_CONFIGS,
  CONNECTOR_ICONS,
  type ConnectorProvider,
} from "@/lib/connectors";
import { SEARCH_LIMITS } from "@/lib/constants";
import {
  deleteMemory,
  getAllMemories,
  type MemoryItem,
} from "@/lib/memory-actions";
import { cn } from "@/lib/utils";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (
    value: boolean | ((val: boolean) => boolean)
  ) => void;
  initialTab?: string;
};

// Component for Profile Information
function ProfileSection({
  user,
  subscriptionData,
  isProUser,
  isProStatusLoading,
}: any) {
  const { isProUser: fastProStatus, isLoading: fastProLoading } =
    useIsProUser();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Use comprehensive Pro status from user data (Polar only)
  const isProUserActive: boolean = user?.isProUser || fastProStatus;
  const showProLoading: boolean = Boolean(fastProLoading || isProStatusLoading);

  // Check if in trial
  const subscription = subscriptionData?.subscription;
  const isTrialing = subscription?.status === "trialing";
  const trialEnd = subscription?.trialEnd || subscription?.currentPeriodEnd;
  const daysLeftInTrial = trialEnd
    ? Math.ceil(
        (new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div>
      <div
        className={cn(
          "flex flex-col items-center space-y-3 text-center",
          isMobile ? "pb-2" : "pb-4"
        )}
      >
        <Avatar className={isMobile ? "h-16 w-16" : "h-20 w-20"}>
          <AvatarImage src={user?.image || ""} />
          <AvatarFallback className={isMobile ? "text-base" : "text-lg"}>
            {user?.name
              ? user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
              : "U"}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3
            className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}
          >
            {user?.name}
          </h3>
          <p
            className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}
          >
            {user?.email}
          </p>
          {showProLoading ? (
            <Skeleton className="mx-auto h-5 w-16" />
          ) : (
            isProUserActive && (
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1.5 rounded-lg border-transparent px-2 pt-1 pb-2 font-sans leading-5 shadow-sm ring-1 ring-ring/35 ring-offset-1 ring-offset-background",
                  "bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground",
                  "dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground"
                )}
                suppressHydrationWarning
              >
                {isTrialing && daysLeftInTrial > 0 ? (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>{daysLeftInTrial}d trial</span>
                  </>
                ) : (
                  <span>pro user</span>
                )}
              </span>
            )
          )}
        </div>
      </div>

      <div className={isMobile ? "space-y-2" : "space-y-3"}>
        <div
          className={cn(
            "space-y-3 rounded-lg bg-muted/50",
            isMobile ? "p-3" : "p-4"
          )}
        >
          <div>
            <Label className="text-muted-foreground text-xs">Full Name</Label>
            <p className="mt-1 font-medium text-sm">
              {user?.name || "Not provided"}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">
              Email Address
            </Label>
            <p className="mt-1 break-all font-medium text-sm">
              {user?.email || "Not provided"}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg border border-border bg-muted/30",
            isMobile ? "p-2.5" : "p-3"
          )}
        >
          <p
            className={cn(
              "text-muted-foreground",
              isMobile ? "text-[11px]" : "text-xs"
            )}
          >
            Profile information is managed through your authentication provider.
            Contact support to update your details.
          </p>
        </div>
      </div>
    </div>
  );
}

// Icon components for search providers
const ParallelIcon = ({ className }: { className?: string }) => (
  <Image
    alt="Parallel AI"
    className={cn("rounded-full bg-white p-0.5", className)}
    height={16}
    src="/parallel-icon.svg"
    width={16}
  />
);

const ExaIcon = ({ className }: { className?: string }) => (
  <Image
    alt="Exa"
    className={className}
    height={16}
    src="/exa-color.svg"
    width={16}
  />
);

const FirecrawlIcon = ({ className }: { className?: string }) => (
  <span className={cn("!mb-3 !pr-1 text-base sm:text-lg", className)}>🔥</span>
);

// Search Provider Options
const searchProviders = [
  {
    value: "firecrawl",
    label: "Firecrawl",
    description:
      "Web, news, and image search with content scraping capabilities",
    icon: FirecrawlIcon,
    default: false,
  },
  {
    value: "exa",
    label: "Exa",
    description:
      "Enhanced and faster web search with images and advanced filtering",
    icon: ExaIcon,
    default: false,
  },
  {
    value: "parallel",
    label: "Parallel AI",
    description:
      "Base and premium web search along with Firecrawl image search support",
    icon: ParallelIcon,
    default: true,
  },
] as const;

// Search Provider Selector Component
function SearchProviderSelector({
  value,
  onValueChange,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: "exa" | "parallel" | "firecrawl") => void;
  disabled?: boolean;
  className?: string;
}) {
  const _isMobile = useMediaQuery("(max-width: 768px)");
  const currentProvider = searchProviders.find(
    (provider) => provider.value === value
  );

  return (
    <div className="w-full">
      <Select disabled={disabled} onValueChange={onValueChange} value={value}>
        <SelectTrigger
          className={cn(
            "h-auto min-h-18 w-full p-4 sm:min-h-14",
            "border border-input bg-background",
            "transition-all duration-200",
            "focus:outline-none focus:ring-0 focus:ring-offset-0",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {currentProvider && (
              <>
                <currentProvider.icon className="size-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 text-left">
                  <div className="mb-0.5 flex items-center gap-2 font-medium text-sm">
                    {currentProvider.label}
                    {currentProvider.default && (
                      <Badge
                        className="border-0 bg-primary/10 px-1 py-0.5 text-[9px] text-primary"
                        variant="secondary"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="line-clamp-2 text-wrap text-muted-foreground text-xs leading-tight">
                    {currentProvider.description}
                  </div>
                </div>
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-32px)]">
          {searchProviders.map((provider) => (
            <SelectItem key={provider.value} value={provider.value}>
              <div className="flex items-center gap-2.5">
                <provider.icon className="size-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    {provider.label}
                    {provider.default && (
                      <Badge
                        className="border-0 bg-primary/10 px-1 py-0.5 text-[9px] text-primary"
                        variant="secondary"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {provider.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Component for Combined Preferences (Search + Custom Instructions)
function PreferencesSection({
  user,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
}: {
  user: any;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (
    value: boolean | ((val: boolean) => boolean)
  ) => void;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchProvider, setSearchProvider] = useLocalStorage<
    "exa" | "parallel" | "firecrawl"
  >("scira-search-provider", "parallel");

  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const enabled = isCustomInstructionsEnabled ?? true;
  const setEnabled = setIsCustomInstructionsEnabled ?? (() => {});

  const handleSearchProviderChange = (
    newProvider: "exa" | "parallel" | "firecrawl"
  ) => {
    setSearchProvider(newProvider);
    toast.success(
      `Search provider changed to ${
        newProvider === "exa"
          ? "Exa"
          : newProvider === "parallel"
            ? "Parallel AI"
            : "Firecrawl"
      }`
    );
  };

  // Custom Instructions queries and handlers
  const {
    data: customInstructions,
    isLoading: customInstructionsLoading,
    refetch,
  } = useQuery({
    queryKey: ["customInstructions", user?.id],
    queryFn: () => getCustomInstructions(user),
    enabled: !!user,
  });

  useEffect(() => {
    if (customInstructions?.content) {
      setContent(customInstructions.content);
    }
  }, [customInstructions]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("Please enter some instructions");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveCustomInstructions(content);
      if (result.success) {
        toast.success("Custom instructions saved successfully");
        refetch();
      } else {
        toast.error(result.error || "Failed to save instructions");
      }
    } catch (_error) {
      toast.error("Failed to save instructions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const result = await deleteCustomInstructionsAction();
      if (result.success) {
        toast.success("Custom instructions deleted successfully");
        setContent("");
        refetch();
      } else {
        toast.error(result.error || "Failed to delete instructions");
      }
    } catch (_error) {
      toast.error("Failed to delete instructions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", isMobile ? "space-y-4" : "space-y-6")}>
      <div>
        <h3
          className={cn(
            "mb-1.5 font-semibold",
            isMobile ? "text-sm" : "text-base"
          )}
        >
          Preferences
        </h3>
        <p
          className={cn(
            "text-muted-foreground",
            isMobile ? "text-xs leading-relaxed" : "text-xs"
          )}
        >
          Configure your search provider and customize how the AI responds to
          your questions.
        </p>
      </div>

      {/* Search Provider Section */}
      <div className="space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <HugeiconsIcon
                className="h-3.5 w-3.5 text-primary"
                icon={GlobalSearchIcon}
              />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Search Provider</h4>
              <p className="text-muted-foreground text-xs">
                Choose your preferred search engine
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <SearchProviderSelector
              onValueChange={handleSearchProviderChange}
              value={searchProvider}
            />
            <p className="text-muted-foreground text-xs leading-relaxed">
              Select your preferred search provider for web searches. Changes
              take effect immediately and will be used for all future searches.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Instructions Section */}
      <div className="space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <RobotIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Custom Instructions</h4>
              <p className="text-muted-foreground text-xs">
                Customize how the AI responds to you
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between rounded-lg border bg-card p-3">
              <div className="mr-3 flex-1">
                <Label
                  className="font-medium text-sm"
                  htmlFor="enable-instructions"
                >
                  Enable Custom Instructions
                </Label>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Toggle to enable or disable custom instructions
                </p>
              </div>
              <Switch
                checked={enabled}
                id="enable-instructions"
                onCheckedChange={setEnabled}
              />
            </div>

            <div className={cn("space-y-3", !enabled && "opacity-50")}>
              <div>
                <Label className="font-medium text-sm" htmlFor="instructions">
                  Instructions
                </Label>
                <p className="mt-0.5 mb-2 text-muted-foreground text-xs">
                  Guide how the AI responds to your questions
                </p>
                {customInstructionsLoading ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <Textarea
                    className="min-h-[100px] resize-y text-sm"
                    disabled={isSaving || !enabled}
                    id="instructions"
                    onChange={(e) => setContent(e.target.value)}
                    onFocus={(e) => {
                      // Keep the focused textarea within the drawer's scroll container without jumping the whole viewport
                      try {
                        e.currentTarget.scrollIntoView({
                          block: "nearest",
                          inline: "nearest",
                        });
                      } catch {}
                    }}
                    placeholder="Enter your custom instructions here... For example: 'Always provide code examples when explaining programming concepts' or 'Keep responses concise and focused on practical applications'"
                    style={{ maxHeight: "25dvh" }}
                    value={content}
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="h-8 flex-1"
                  disabled={
                    isSaving ||
                    !content.trim() ||
                    customInstructionsLoading ||
                    !enabled
                  }
                  onClick={handleSave}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FloppyDiskIcon className="mr-1.5 h-3 w-3" />
                      Save Instructions
                    </>
                  )}
                </Button>
                {customInstructions && (
                  <Button
                    className="h-8 px-2.5"
                    disabled={isSaving || customInstructionsLoading || !enabled}
                    onClick={handleDelete}
                    size="sm"
                    variant="outline"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {customInstructionsLoading ? (
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <Skeleton className="h-3 w-28" />
                </div>
              ) : customInstructions ? (
                <div className="rounded-lg bg-muted/30 p-2.5">
                  <p className="text-muted-foreground text-xs">
                    Last updated:{" "}
                    {new Date(
                      customInstructions.updatedAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for Usage Information
function UsageSection({ user }: any) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isProUser = user?.isProUser;

  const {
    data: usageData,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsageData,
  } = useQuery({
    queryKey: ["usageData"],
    queryFn: async () => {
      const [searchCount, extremeSearchCount, subscriptionDetails] =
        await Promise.all([
          getUserMessageCount(),
          getExtremeSearchUsageCount(),
          getSubDetails(),
        ]);

      return {
        searchCount,
        extremeSearchCount,
        subscriptionDetails,
      };
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!user,
  });

  const {
    data: historicalUsageData,
    isLoading: historicalLoading,
    refetch: refetchHistoricalData,
  } = useQuery({
    queryKey: ["historicalUsage", user?.id, 9],
    queryFn: () => getHistoricalUsage(user, 9),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const searchCount = usageData?.searchCount;
  const extremeSearchCount = usageData?.extremeSearchCount;

  // Generate loading stars data that matches real data structure
  const loadingStars = useMemo(() => {
    if (!historicalLoading) {
      return [];
    }

    const months = 9;
    const totalDays = months * 30;
    const futureDays = Math.min(15, Math.floor(totalDays * 0.08));
    const pastDays = totalDays - futureDays - 1;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + futureDays);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - pastDays);

    // Generate complete dataset like real getHistoricalUsage
    const completeData: Activity[] = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split("T")[0];

      // Randomly light up some dots for star effect
      const shouldLight = Math.random() > 0.85; // 15% chance
      const count = shouldLight ? Math.floor(Math.random() * 10) + 1 : 0;

      let level: 0 | 1 | 2 | 3 | 4;
      if (count === 0) {
        level = 0;
      } else if (count <= 3) {
        level = 1;
      } else if (count <= 7) {
        level = 2;
      } else if (count <= 12) {
        level = 3;
      } else {
        level = 4;
      }

      completeData.push({
        date: dateKey,
        count,
        level,
      });
    }

    return completeData;
  }, [historicalLoading]);

  const handleRefreshUsage = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refetchUsageData(), refetchHistoricalData()]);
      toast.success("Usage data refreshed");
    } catch (_error) {
      toast.error("Failed to refresh usage data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const usagePercentage = isProUser
    ? 0
    : Math.min(
        ((searchCount?.count || 0) / SEARCH_LIMITS.DAILY_SEARCH_LIMIT) * 100,
        100
      );

  return (
    <div
      className={cn(
        isMobile ? "space-y-3" : "space-y-4",
        isMobile && !isProUser ? "pb-4" : ""
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Daily Search Usage</h3>
        <Button
          className={isMobile ? "h-7 px-1.5" : "h-8 px-2"}
          disabled={isRefreshing}
          onClick={handleRefreshUsage}
          size="sm"
          variant="ghost"
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowClockwiseIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className={cn("grid grid-cols-2", isMobile ? "gap-2" : "gap-3")}>
        <div
          className={cn(
            "space-y-1 rounded-lg bg-muted/50",
            isMobile ? "p-2.5" : "p-3"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-[11px]" : "text-xs"
              )}
            >
              Today
            </span>
            <MagnifyingGlassIcon
              className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"}
            />
          </div>
          {usageLoading ? (
            <Skeleton
              className={cn(
                "font-semibold",
                isMobile ? "h-4 text-base" : "h-5 text-lg"
              )}
            />
          ) : (
            <div
              className={cn(
                "font-semibold",
                isMobile ? "text-base" : "text-lg"
              )}
            >
              {searchCount?.count || 0}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Regular searches</p>
        </div>

        <div
          className={cn(
            "space-y-1 rounded-lg bg-muted/50",
            isMobile ? "p-2.5" : "p-3"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-[11px]" : "text-xs"
              )}
            >
              Extreme
            </span>
            <LightningIcon className={isMobile ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </div>
          {usageLoading ? (
            <Skeleton
              className={cn(
                "font-semibold",
                isMobile ? "h-4 text-base" : "h-5 text-lg"
              )}
            />
          ) : (
            <div
              className={cn(
                "font-semibold",
                isMobile ? "text-base" : "text-lg"
              )}
            >
              {extremeSearchCount?.count || 0}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">This month</p>
        </div>
      </div>

      {!isProUser && (
        <div className={isMobile ? "space-y-2" : "space-y-3"}>
          <div
            className={cn(
              "space-y-2 rounded-lg bg-muted/30",
              isMobile ? "p-2.5" : "p-3"
            )}
          >
            {usageLoading ? (
              <>
                <div className="flex justify-between text-xs">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Daily Limit</span>
                  <span className="text-muted-foreground">
                    {usagePercentage.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  className="h-1.5 [&>div]:transition-none"
                  value={usagePercentage}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {searchCount?.count || 0} /{" "}
                    {SEARCH_LIMITS.DAILY_SEARCH_LIMIT}
                  </span>
                  <span>
                    {Math.max(
                      0,
                      SEARCH_LIMITS.DAILY_SEARCH_LIMIT -
                        (searchCount?.count || 0)
                    )}{" "}
                    left
                  </span>
                </div>
              </>
            )}
          </div>

          <div
            className={cn(
              "rounded-lg border border-border bg-card",
              isMobile ? "p-3" : "p-4"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2",
                isMobile ? "mb-1.5" : "mb-2"
              )}
            >
              <HugeiconsIcon
                color="currentColor"
                icon={Crown02Icon}
                size={isMobile ? 14 : 16}
                strokeWidth={1.5}
              />
              <span
                className={cn(
                  "font-semibold",
                  isMobile ? "text-xs" : "text-sm"
                )}
              >
                Upgrade to Pro
              </span>
            </div>
            <p
              className={cn(
                "mb-3 text-muted-foreground",
                isMobile ? "text-[11px]" : "text-xs"
              )}
            >
              Get unlimited searches and premium features
            </p>
            <Button
              asChild
              className={cn("w-full", isMobile ? "h-7 text-xs" : "h-8")}
              size="sm"
            >
              <Link href="/pricing">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      )}

      {!usageLoading && (
        <div className={cn("space-y-2", isMobile && !isProUser ? "pb-4" : "")}>
          <h4
            className={cn(
              "font-semibold text-muted-foreground",
              isMobile ? "text-[11px]" : "text-xs"
            )}
          >
            Activity (Past 9 Months)
          </h4>
          <div className={cn("rounded-lg bg-muted/50 p-3 dark:bg-card")}>
            {historicalLoading ? (
              <TooltipProvider>
                <ContributionGraph
                  blockMargin={isMobile ? 3 : 4}
                  blockSize={isMobile ? 8 : 12}
                  className="w-full opacity-60"
                  data={loadingStars}
                  fontSize={isMobile ? 9 : 12}
                  labels={{
                    totalCount: "Loading activity data...",
                    legend: {
                      less: "Less",
                      more: "More",
                    },
                  }}
                >
                  <ContributionGraphCalendar
                    className={cn(
                      "text-muted-foreground",
                      isMobile ? "text-[9px]" : "text-xs"
                    )}
                    hideMonthLabels={false}
                  >
                    {({ activity, dayIndex, weekIndex }) => (
                      <ContributionGraphBlock
                        activity={activity}
                        className={cn(
                          'data-[level="0"]:fill-muted/40',
                          'data-[level="1"]:fill-primary/30',
                          'data-[level="2"]:fill-primary/50',
                          'data-[level="3"]:fill-primary/70',
                          'data-[level="4"]:fill-primary/90',
                          activity.level > 0 && "animate-pulse"
                        )}
                        dayIndex={dayIndex}
                        key={`${weekIndex}-${dayIndex}-loading`}
                        weekIndex={weekIndex}
                      />
                    )}
                  </ContributionGraphCalendar>
                  <ContributionGraphFooter
                    className={cn(
                      "flex-col pt-2 sm:flex-row",
                      isMobile ? "items-start gap-1.5" : "items-center gap-2"
                    )}
                  >
                    <ContributionGraphTotalCount
                      className={cn(
                        "text-muted-foreground",
                        isMobile ? "mb-1 text-[9px]" : "text-xs"
                      )}
                    />
                    <ContributionGraphLegend
                      className={cn(
                        "text-muted-foreground",
                        isMobile ? "flex-shrink-0" : ""
                      )}
                    >
                      {({ level }) => (
                        <svg
                          height={isMobile ? 8 : 12}
                          width={isMobile ? 8 : 12}
                        >
                          <rect
                            className={cn(
                              "stroke-[1px] stroke-border/50",
                              'data-[level="0"]:fill-muted/40',
                              'data-[level="1"]:fill-primary/30',
                              'data-[level="2"]:fill-primary/50',
                              'data-[level="3"]:fill-primary/70',
                              'data-[level="4"]:fill-primary/90'
                            )}
                            data-level={level}
                            height={isMobile ? 8 : 12}
                            rx={2}
                            ry={2}
                            width={isMobile ? 8 : 12}
                          />
                        </svg>
                      )}
                    </ContributionGraphLegend>
                  </ContributionGraphFooter>
                </ContributionGraph>
              </TooltipProvider>
            ) : historicalUsageData && historicalUsageData.length > 0 ? (
              <TooltipProvider>
                <ContributionGraph
                  blockMargin={isMobile ? 3 : 4}
                  blockSize={isMobile ? 8 : 12}
                  className="w-full"
                  data={historicalUsageData}
                  fontSize={isMobile ? 9 : 12}
                  labels={{
                    totalCount: "{{count}} total messages in {{year}}",
                    legend: {
                      less: "Less",
                      more: "More",
                    },
                  }}
                >
                  <ContributionGraphCalendar
                    className={cn(
                      "text-muted-foreground",
                      isMobile ? "text-[9px]" : "text-xs"
                    )}
                    hideMonthLabels={false}
                  >
                    {({ activity, dayIndex, weekIndex }) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <g className="cursor-help">
                            <ContributionGraphBlock
                              activity={activity}
                              className={cn(
                                'data-[level="0"]:fill-muted',
                                'data-[level="1"]:fill-primary/20',
                                'data-[level="2"]:fill-primary/40',
                                'data-[level="3"]:fill-primary/60',
                                'data-[level="4"]:fill-primary'
                              )}
                              dayIndex={dayIndex}
                              weekIndex={weekIndex}
                            />
                          </g>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-medium">
                              {activity.count}{" "}
                              {activity.count === 1 ? "message" : "messages"}
                            </p>
                            <p className="text-muted text-xs">
                              {new Date(activity.date).toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </ContributionGraphCalendar>
                  <ContributionGraphFooter
                    className={cn(
                      "flex-col pt-2 sm:flex-row",
                      isMobile ? "items-start gap-1.5" : "items-center gap-2"
                    )}
                  >
                    <ContributionGraphTotalCount
                      className={cn(
                        "text-muted-foreground",
                        isMobile ? "mb-1 text-[9px]" : "text-xs"
                      )}
                    />
                    <ContributionGraphLegend
                      className={cn(
                        "text-muted-foreground",
                        isMobile ? "flex-shrink-0" : ""
                      )}
                    >
                      {({ level }) => {
                        const getTooltipText = (level: number) => {
                          switch (level) {
                            case 0:
                              return "No messages";
                            case 1:
                              return "1-3 messages";
                            case 2:
                              return "4-7 messages";
                            case 3:
                              return "8-12 messages";
                            case 4:
                              return "13+ messages";
                            default:
                              return `${level} messages`;
                          }
                        };

                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <svg
                                className="cursor-help"
                                height={isMobile ? 8 : 12}
                                width={isMobile ? 8 : 12}
                              >
                                <rect
                                  className={cn(
                                    "stroke-[1px] stroke-border/50",
                                    'data-[level="0"]:fill-muted',
                                    'data-[level="1"]:fill-primary/20',
                                    'data-[level="2"]:fill-primary/40',
                                    'data-[level="3"]:fill-primary/60',
                                    'data-[level="4"]:fill-primary'
                                  )}
                                  data-level={level}
                                  height={isMobile ? 8 : 12}
                                  rx={2}
                                  ry={2}
                                  width={isMobile ? 8 : 12}
                                />
                              </svg>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{getTooltipText(level)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }}
                    </ContributionGraphLegend>
                  </ContributionGraphFooter>
                </ContributionGraph>
              </TooltipProvider>
            ) : (
              <div className="flex h-24 items-center justify-center">
                <p
                  className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-[11px]" : "text-xs"
                  )}
                >
                  No activity data
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for Subscription Information
function SubscriptionSection({ subscriptionData, isProUser, user }: any) {
  const [orders, setOrders] = useState<any>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const formatIntervalLabel = (interval: string, count: number) => {
    const normalized = interval.toLowerCase();
    if (count <= 1) {
      return normalized;
    }
    return `${count} ${normalized}${count > 1 ? "s" : ""}`;
  };

  const formatRecurringAmount = (
    amount: number,
    interval: string,
    count: number
  ) => {
    const dollars = (amount / 100).toFixed(2);
    return `$${dollars}/${formatIntervalLabel(interval, count)}`;
  };

  useEffect(() => {
    const fetchPolarOrders = async () => {
      try {
        setOrdersLoading(true);

        // Fetch Polar orders
        const ordersResponse = await authClient.customer.orders
          .list({
            query: {
              page: 1,
              limit: 10,
              productBillingType: "recurring",
            },
          })
          .catch(() => ({ data: null }));

        setOrders(ordersResponse.data);
      } catch (_error) {
        setOrders(null);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchPolarOrders();
  }, []);

  const handleManageSubscription = async () => {
    try {
      setIsManagingSubscription(true);
      await authClient.customer.portal();
    } catch (_error) {
      toast.error("Failed to open subscription management");
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Check for active status from either source (includes trialing)
  const hasActiveSubscription =
    subscriptionData?.hasSubscription &&
    (subscriptionData?.subscription?.status === "active" ||
      subscriptionData?.subscription?.status === "trialing");
  const isProUserActive = hasActiveSubscription;
  const subscription = subscriptionData?.subscription;

  return (
    <div className={isMobile ? "space-y-3" : "space-y-4"}>
      {isProUserActive ? (
        <div className={isMobile ? "space-y-2" : "space-y-3"}>
          <div
            className={cn(
              "rounded-lg bg-primary text-primary-foreground",
              isMobile ? "p-3" : "p-4"
            )}
          >
            <div
              className={cn(
                "flex items-start justify-between",
                isMobile ? "mb-2" : "mb-3"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded bg-primary-foreground/20",
                    isMobile ? "p-1" : "p-1.5"
                  )}
                >
                  <HugeiconsIcon
                    color="currentColor"
                    icon={Crown02Icon}
                    size={isMobile ? 14 : 16}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3
                    className={cn(
                      "font-semibold",
                      isMobile ? "text-xs" : "text-sm"
                    )}
                  >
                    PRO {hasActiveSubscription ? "Subscription" : "Membership"}
                  </h3>
                  <p
                    className={cn(
                      "opacity-90",
                      isMobile ? "text-[10px]" : "text-xs"
                    )}
                  >
                    {subscription?.status === "active"
                      ? "Active"
                      : subscription?.status || "Unknown"}
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "border-0 bg-primary-foreground/20 text-primary-foreground",
                  isMobile ? "px-1.5 py-0.5 text-[10px]" : "text-xs"
                )}
              >
                {subscription?.status === "trialing" ? "TRIAL" : "ACTIVE"}
              </Badge>
            </div>
            <div
              className={cn(
                "mb-3 opacity-90",
                isMobile ? "text-[11px]" : "text-xs"
              )}
            >
              <p className="mb-1">Unlimited access to all premium features</p>
              {hasActiveSubscription && subscription && (
                <div className="flex gap-4 text-[10px] opacity-75">
                  {subscription.status === "trialing" ? (
                    <>
                      <span>
                        Trial ends:{" "}
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </span>
                      <span>
                        Then{" "}
                        {formatRecurringAmount(
                          subscription.amount,
                          subscription.recurringInterval,
                          subscription.recurringIntervalCount ?? 1
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {formatRecurringAmount(
                          subscription.amount,
                          subscription.recurringInterval,
                          subscription.recurringIntervalCount ?? 1
                        )}
                      </span>
                      <span>
                        Next billing:{" "}
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {hasActiveSubscription && (
              <Button
                className={cn("w-full", isMobile ? "h-7 text-xs" : "h-8")}
                disabled={isManagingSubscription}
                onClick={handleManageSubscription}
                variant="secondary"
              >
                {isManagingSubscription ? (
                  <Loader2
                    className={isMobile ? "mr-1.5 h-3 w-3" : "mr-2 h-3.5 w-3.5"}
                  />
                ) : (
                  <ExternalLink
                    className={isMobile ? "mr-1.5 h-3 w-3" : "mr-2 h-3.5 w-3.5"}
                  />
                )}
                {isManagingSubscription ? "Opening..." : "Manage Billing"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={isMobile ? "space-y-2" : "space-y-3"}>
          <div
            className={cn(
              "rounded-lg border-2 border-dashed bg-muted/20 text-center",
              isMobile ? "p-4" : "p-6"
            )}
          >
            <HugeiconsIcon
              className={cn("mx-auto mb-3 text-muted-foreground")}
              color="currentColor"
              icon={Crown02Icon}
              size={isMobile ? 24 : 32}
              strokeWidth={1.5}
            />
            <h3
              className={cn(
                "mb-1 font-semibold",
                isMobile ? "text-sm" : "text-base"
              )}
            >
              No Active Subscription
            </h3>
            <p
              className={cn(
                "mb-4 text-muted-foreground",
                isMobile ? "text-[11px]" : "text-xs"
              )}
            >
              Start your 7-day free trial
            </p>
            <Button
              asChild
              className={cn("w-full", isMobile ? "h-8 text-xs" : "h-9")}
              size="sm"
            >
              <Link href="/pricing">
                <HugeiconsIcon
                  className={isMobile ? "mr-1.5" : "mr-2"}
                  color="currentColor"
                  icon={Crown02Icon}
                  size={isMobile ? 12 : 14}
                  strokeWidth={1.5}
                />
                Start Free Trial
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className={isMobile ? "space-y-2" : "space-y-3"}>
        <h4 className={cn("font-semibold", isMobile ? "text-xs" : "text-sm")}>
          Billing History
        </h4>
        {ordersLoading ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-lg border",
              isMobile ? "h-16 p-3" : "h-20 p-4"
            )}
          >
            <Loader2
              className={cn(
                isMobile ? "h-3.5 w-3.5" : "h-4 w-4",
                "animate-spin"
              )}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show Polar orders */}
            {orders?.result?.items &&
              orders.result.items.length > 0 &&
              orders.result.items.slice(0, 3).map((order: any) => {
                const amountCents =
                  typeof order.totalAmount === "number"
                    ? order.totalAmount
                    : typeof order.netAmount === "number"
                      ? order.netAmount
                      : 0;
                const currencyCode =
                  typeof order.currency === "string" && order.currency
                    ? order.currency.toUpperCase()
                    : "USD";
                const primaryLabel =
                  order?.items?.[0]?.label ||
                  order.product?.name ||
                  "Subscription";
                const isRecurring = Boolean(order.subscriptionId);

                return (
                  <div
                    className={cn(
                      "rounded-lg bg-muted/30",
                      isMobile ? "p-2.5" : "p-3"
                    )}
                    key={order.id}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-medium",
                            isMobile ? "text-xs" : "text-sm"
                          )}
                        >
                          {primaryLabel}
                        </p>
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "text-muted-foreground",
                              isMobile ? "text-[10px]" : "text-xs"
                            )}
                          >
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <Badge
                            className="px-1 py-0 text-[8px]"
                            variant="secondary"
                          >
                            🌍 {currencyCode}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "block font-semibold",
                            isMobile ? "text-xs" : "text-sm"
                          )}
                        >
                          ${(amountCents / 100).toFixed(2)}
                        </span>
                        <span
                          className={cn(
                            "text-muted-foreground",
                            isMobile ? "text-[9px]" : "text-xs"
                          )}
                        >
                          {isRecurring ? "recurring" : "one-time"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Show message if no billing history */}
            {(!orders?.result?.items || orders.result.items.length === 0) && (
              <div
                className={cn(
                  "flex items-center justify-center rounded-lg border bg-muted/20 text-center",
                  isMobile ? "h-16 p-4" : "h-20 p-6"
                )}
              >
                <p
                  className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-[11px]" : "text-xs"
                  )}
                >
                  No billing history yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Component for Memories
function MemoriesSection() {
  const queryClient = useQueryClient();
  const [searchQuery, _setSearchQuery] = useState("");
  const [deletingMemoryIds, setDeletingMemoryIds] = useState<Set<string>>(
    new Set()
  );

  const {
    data: memoriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: memoriesLoading,
  } = useInfiniteQuery({
    queryKey: ["memories"],
    queryFn: async ({ pageParam }) => {
      const pageNumber = pageParam as number;
      return await getAllMemories(pageNumber);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.memories.length >= 20;
      return hasMore ? Number(lastPage.memories.at(-1)?.id) : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: (_, memoryId) => {
      setDeletingMemoryIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memoryId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory deleted successfully");
    },
    onError: (_, memoryId) => {
      setDeletingMemoryIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memoryId);
        return newSet;
      });
      toast.error("Failed to delete memory");
    },
  });

  const handleDeleteMemory = (id: string) => {
    setDeletingMemoryIds((prev) => new Set(prev).add(id));
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  const getMemoryContent = (memory: MemoryItem): string => {
    if (memory.summary) {
      return memory.summary;
    }
    if (memory.title) {
      return memory.title;
    }
    if (memory.memory) {
      return memory.memory;
    }
    if (memory.name) {
      return memory.name;
    }
    return "No content available";
  };

  const displayedMemories =
    memoriesData?.pages.flatMap((page) => page.memories) || [];

  const totalMemories =
    memoriesData?.pages.reduce((acc, page) => acc + page.memories.length, 0) ||
    0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          {totalMemories} {totalMemories === 1 ? "memory" : "memories"} stored
        </p>
      </div>

      <div className="scrollbar-w-1 scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
        {memoriesLoading && !displayedMemories.length ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20">
            <HugeiconsIcon
              className="mb-2 h-6 w-6 text-muted-foreground"
              icon={Brain02Icon}
            />
            <p className="text-muted-foreground text-sm">No memories found</p>
          </div>
        ) : (
          <>
            {displayedMemories.map((memory: MemoryItem) => (
              <div
                className="group relative rounded-lg border bg-card/50 p-3 transition-all hover:bg-card"
                key={memory.id}
              >
                <div className="pr-8">
                  {memory.title && (
                    <h4 className="mb-1 font-medium text-foreground text-sm">
                      {memory.title}
                    </h4>
                  )}
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {memory.content || getMemoryContent(memory)}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>
                        {formatDate(
                          memory.createdAt || memory.created_at || ""
                        )}
                      </span>
                    </div>
                    {memory.type && (
                      <div className="rounded bg-muted/50 px-1.5 py-0.5 font-medium text-[9px]">
                        {memory.type}
                      </div>
                    )}
                    {memory.status && memory.status !== "done" && (
                      <div className="rounded bg-yellow-100 px-1.5 py-0.5 font-medium text-[9px] text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                        {memory.status}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  className={cn(
                    "absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    "touch-manipulation" // Better touch targets on mobile
                  )}
                  disabled={deletingMemoryIds.has(memory.id)}
                  onClick={() => handleDeleteMemory(memory.id)}
                  size="icon"
                  style={{ opacity: 1 }}
                  variant="ghost" // Always visible on mobile
                >
                  {deletingMemoryIds.has(memory.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TrashIcon className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}

            {hasNextPage && !searchQuery.trim() && (
              <div className="flex justify-center pt-2">
                <Button
                  className="h-8"
                  disabled={!hasNextPage || isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  size="sm"
                  variant="outline"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-2">
        <p className="text-muted-foreground text-xs">powered by</p>
        <Image
          alt="Memories"
          className="invert dark:invert-0"
          height={140}
          src="/supermemory.svg"
          width={140}
        />
      </div>
    </div>
  );
}

// Component for Connectors
function ConnectorsSection({ user }: { user: any }) {
  const isProUser = user?.isProUser;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [connectingProvider, setConnectingProvider] =
    useState<ConnectorProvider | null>(null);
  const [syncingProvider, setSyncingProvider] =
    useState<ConnectorProvider | null>(null);
  const [deletingConnectionId, setDeletingConnectionId] = useState<
    string | null
  >(null);

  const {
    data: connectorsData,
    isLoading: connectorsLoading,
    refetch: refetchConnectors,
  } = useQuery({
    queryKey: ["connectors", user?.id],
    queryFn: listUserConnectorsAction,
    enabled: !!user && isProUser,
    staleTime: 1000 * 60 * 2,
  });

  // Query actual connection status for each provider using Supermemory API
  const connectionStatusQueries = useQuery({
    queryKey: ["connectorsStatus", user?.id],
    queryFn: async () => {
      if (!(user?.id && isProUser)) {
        return {};
      }

      const statusPromises = Object.keys(CONNECTOR_CONFIGS).map(
        async (provider) => {
          try {
            const result = await getConnectorSyncStatusAction(
              provider as ConnectorProvider
            );
            return { provider, status: result };
          } catch (_error) {
            return { provider, status: null };
          }
        }
      );

      const statuses = await Promise.all(statusPromises);
      return statuses.reduce(
        (acc, { provider, status }) => {
          acc[provider] = status;
          return acc;
        },
        {} as Record<string, any>
      );
    },
    enabled: !!user?.id && isProUser,
    staleTime: 1000 * 60 * 2,
  });

  const handleConnect = async (provider: ConnectorProvider) => {
    setConnectingProvider(provider);
    try {
      const result = await createConnectorAction(provider);
      if (result.success && result.authLink) {
        window.location.href = result.authLink;
      } else {
        toast.error(result.error || "Failed to connect");
      }
    } catch (_error) {
      toast.error("Failed to connect");
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleSync = async (provider: ConnectorProvider) => {
    setSyncingProvider(provider);
    try {
      const result = await manualSyncConnectorAction(provider);
      if (result.success) {
        toast.success(`${CONNECTOR_CONFIGS[provider].name} sync started`);
        refetchConnectors();
        // Refetch connection status after a delay to show updated counts
        setTimeout(() => {
          connectionStatusQueries.refetch();
        }, 2000);
      } else {
        toast.error(result.error || "Failed to sync");
      }
    } catch (_error) {
      toast.error("Failed to sync");
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDelete = async (connectionId: string, providerName: string) => {
    setDeletingConnectionId(connectionId);
    try {
      const result = await deleteConnectorAction(connectionId);
      if (result.success) {
        toast.success(`${providerName} disconnected`);
        refetchConnectors();
        // Also refetch connection statuses immediately to update the UI
        connectionStatusQueries.refetch();
      } else {
        toast.error(result.error || "Failed to disconnect");
      }
    } catch (_error) {
      toast.error("Failed to disconnect");
    } finally {
      setDeletingConnectionId(null);
    }
  };

  const connections = connectorsData?.connections || [];
  const connectionStatuses = connectionStatusQueries.data || {};

  return (
    <div className={cn("space-y-4", isMobile ? "space-y-3" : "space-y-4")}>
      <div>
        <h3
          className={cn(
            "mb-1 font-semibold",
            isMobile ? "text-sm" : "text-base"
          )}
        >
          Connected Services
        </h3>
        <p
          className={cn(
            "text-muted-foreground",
            isMobile ? "text-[11px] leading-relaxed" : "text-xs"
          )}
        >
          Connect your cloud services to search across all your documents in one
          place
        </p>
      </div>

      {/* Beta Announcement Alert */}
      <Alert className="border-primary/20 bg-primary/5">
        <HugeiconsIcon
          className="h-4 w-4 text-primary"
          icon={InformationCircleIcon}
        />
        <AlertTitle className="text-foreground">
          Connectors Available in Beta
        </AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Connectors are now available for Pro users! Please note that this
          feature is in beta and there may be breaking changes as we continue to
          improve the experience.
        </AlertDescription>
      </Alert>

      {!isProUser && (
        <div className="rounded-lg border-2 border-primary/30 border-dashed bg-primary/5 p-6 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-primary/10 p-3">
              <HugeiconsIcon
                className="text-primary"
                color="currentColor"
                icon={Crown02Icon}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-lg">Pro Feature</h4>
              <p className="max-w-md text-muted-foreground text-sm">
                Connectors are available for Pro users only. Upgrade to connect
                your Google Drive, Notion, and OneDrive accounts.
              </p>
            </div>
            <Button asChild className="mt-4">
              <Link href="/pricing">
                <HugeiconsIcon
                  className="mr-2"
                  color="currentColor"
                  icon={Crown02Icon}
                  size={16}
                  strokeWidth={1.5}
                />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </div>
      )}

      {isProUser && (
        <div className="space-y-3">
          {Object.entries(CONNECTOR_CONFIGS).map(([provider, config]) => {
            const connectionStatus = connectionStatuses[provider]?.status;
            const connection = connections.find((c) => c.provider === provider);
            // A connector is connected if we have a connection record OR if status check confirms it
            const isConnected =
              !!connection ||
              (connectionStatus?.isConnected && connectionStatus !== null);
            const isConnecting = connectingProvider === provider;
            const isSyncing = syncingProvider === provider;
            const isDeleting =
              connection && deletingConnectionId === connection.id;
            const isStatusLoading = connectionStatusQueries.isLoading;
            const isComingSoon = provider === "onedrive";

            return (
              <div
                className={cn("rounded-lg border", isMobile ? "p-3" : "p-4")}
                key={provider}
              >
                <div
                  className={cn(
                    "flex items-center",
                    isMobile ? "gap-2" : "justify-between"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center">
                      <div className="text-xl">
                        {(() => {
                          const IconComponent = CONNECTOR_ICONS[config.icon];
                          return IconComponent ? <IconComponent /> : null;
                        })()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={cn(
                          "font-medium",
                          isMobile ? "text-[13px]" : "text-sm"
                        )}
                      >
                        {config.name}
                      </h4>
                      <p
                        className={cn(
                          "text-muted-foreground",
                          isMobile ? "text-[10px] leading-tight" : "text-xs"
                        )}
                      >
                        {config.description}
                      </p>
                      {isComingSoon ? (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            isMobile ? "mt-0.5" : "mt-1"
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span
                            className={cn(
                              "text-blue-600 dark:text-blue-400",
                              isMobile ? "text-[10px]" : "text-xs"
                            )}
                          >
                            Coming Soon
                          </span>
                        </div>
                      ) : isStatusLoading && !connection ? (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            isMobile ? "mt-0.5" : "mt-1"
                          )}
                        >
                          <div className="h-2 w-2 animate-pulse rounded-full bg-muted" />
                          <span
                            className={cn(
                              "text-muted-foreground",
                              isMobile ? "text-[10px]" : "text-xs"
                            )}
                          >
                            Checking connection...
                          </span>
                        </div>
                      ) : isConnected ? (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            isMobile ? "mt-0.5" : "mt-1"
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span
                            className={cn(
                              "text-green-600 dark:text-green-400",
                              isMobile ? "text-[10px]" : "text-xs"
                            )}
                          >
                            Connected
                          </span>
                          {(connectionStatus?.email || connection?.email) && (
                            <span
                              className={cn(
                                "text-muted-foreground",
                                isMobile ? "text-[10px]" : "text-xs"
                              )}
                            >
                              • {connectionStatus?.email || connection?.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            isMobile ? "mt-0.5" : "mt-1"
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                          <span
                            className={cn(
                              "text-muted-foreground",
                              isMobile ? "text-[10px]" : "text-xs"
                            )}
                          >
                            Not connected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex items-center",
                      isMobile ? "gap-1" : "gap-2"
                    )}
                  >
                    {isComingSoon ? (
                      <Button
                        className={cn(
                          "border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400",
                          isMobile ? "h-7 px-2 text-[10px]" : "h-8"
                        )}
                        disabled
                        size="sm"
                        variant="outline"
                      >
                        Coming Soon
                      </Button>
                    ) : isConnected ? (
                      <>
                        <Button
                          className={cn(
                            isMobile ? "h-7 px-2 text-[10px]" : "h-8"
                          )}
                          disabled={isSyncing || isDeleting || isStatusLoading}
                          onClick={() =>
                            handleSync(provider as ConnectorProvider)
                          }
                          size="sm"
                          variant="outline"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2
                                className={cn(
                                  isMobile ? "h-2.5 w-2.5" : "h-3 w-3",
                                  "mr-1 animate-spin"
                                )}
                              />
                              Syncing...
                            </>
                          ) : (
                            "Sync"
                          )}
                        </Button>
                        <Button
                          className={cn(
                            "text-destructive hover:text-destructive",
                            isMobile ? "h-7 px-2 text-[10px]" : "h-8"
                          )}
                          disabled={isDeleting || isSyncing || isStatusLoading}
                          onClick={() =>
                            connection &&
                            handleDelete(connection.id, config.name)
                          }
                          size="sm"
                          variant="outline"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2
                                className={cn(
                                  isMobile ? "h-2.5 w-2.5" : "h-3 w-3",
                                  "mr-1 animate-spin"
                                )}
                              />
                              Disconnecting...
                            </>
                          ) : (
                            "Disconnect"
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        className={cn(
                          isMobile ? "h-7 px-2 text-[10px]" : "h-8"
                        )}
                        disabled={isConnecting || isStatusLoading}
                        onClick={() =>
                          handleConnect(provider as ConnectorProvider)
                        }
                        size="sm"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2
                              className={cn(
                                isMobile ? "h-2.5 w-2.5" : "h-3 w-3",
                                "mr-1 animate-spin"
                              )}
                            />
                            Connecting...
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {isConnected && !isComingSoon && (
                  <div
                    className={cn(
                      "border-border border-t",
                      isMobile ? "mt-2 pt-2" : "mt-3 pt-3"
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs",
                        isMobile
                          ? "grid grid-cols-1 gap-2"
                          : "grid grid-cols-3 gap-4"
                      )}
                    >
                      <div>
                        <span className="text-muted-foreground">
                          Document Chunk:
                        </span>
                        <div className="font-medium">
                          {isStatusLoading ? (
                            <span className="text-muted-foreground">
                              Loading...
                            </span>
                          ) : connectionStatus?.documentCount !== undefined ? (
                            connectionStatus.documentCount === 0 ? (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title="Documents are being synced from your account"
                              >
                                Syncing...
                              </span>
                            ) : (
                              connectionStatus.documentCount.toLocaleString()
                            )
                          ) : connection?.metadata?.pageToken ? (
                            connection.metadata.pageToken === 0 ? (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title="Documents are being synced from your account"
                              >
                                Syncing...
                              </span>
                            ) : (
                              connection.metadata.pageToken.toLocaleString()
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Last Sync:
                        </span>
                        <div className="font-medium">
                          {isStatusLoading ? (
                            <span className="text-muted-foreground">
                              Loading...
                            </span>
                          ) : connectionStatus?.lastSync ||
                            connection?.createdAt ? (
                            new Date(
                              connectionStatus?.lastSync ||
                                connection?.createdAt
                            ).toLocaleDateString()
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Limit:</span>
                        <div className="font-medium">
                          {config.documentLimit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={cn("text-center", isMobile ? "pt-1" : "pt-2")}>
        <div className="flex items-center justify-center gap-2">
          <p
            className={cn(
              "text-muted-foreground",
              isMobile ? "text-[10px]" : "text-xs"
            )}
          >
            powered by
          </p>
          <Image
            alt="Connectors"
            className="invert dark:invert-0"
            height={isMobile ? 100 : 120}
            src="/supermemory.svg"
            width={isMobile ? 100 : 120}
          />
        </div>
      </div>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  subscriptionData,
  isProUser,
  isProStatusLoading,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
  initialTab = "profile",
}: SettingsDialogProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Reset tab when initialTab changes or when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentTab(initialTab);
    }
  }, [open, initialTab]);
  // Dynamically stabilize drawer height on mobile when the virtual keyboard opens (PWA/iOS)
  const [mobileDrawerPxHeight, setMobileDrawerPxHeight] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (!(isMobile && open)) {
      setMobileDrawerPxHeight(null);
      return;
    }

    const updateHeight = () => {
      try {
        // Prefer VisualViewport for accurate height when keyboard is open
        const visualHeight =
          (window as any).visualViewport?.height ?? window.innerHeight;
        const computed = Math.min(600, Math.round(visualHeight * 0.85));
        setMobileDrawerPxHeight(computed);
      } catch {
        setMobileDrawerPxHeight(null);
      }
    };

    updateHeight();
    const vv: VisualViewport | undefined = (window as any).visualViewport;
    vv?.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    return () => {
      vv?.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, [isMobile, open]);

  const tabItems = [
    {
      value: "profile",
      label: "Account",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={UserAccountIcon} />
      ),
    },
    {
      value: "usage",
      label: "Usage",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={Analytics01Icon} />
      ),
    },
    {
      value: "subscription",
      label: "Subscription",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={Crown02Icon} />
      ),
    },
    {
      value: "preferences",
      label: "Preferences",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={Settings02Icon} />
      ),
    },
    {
      value: "connectors",
      label: "Connectors",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={ConnectIcon} />
      ),
    },
    {
      value: "memories",
      label: "Memories",
      icon: ({ className }: { className?: string }) => (
        <HugeiconsIcon className={className} icon={Brain02Icon} />
      ),
    },
  ];

  const contentSections = (
    <>
      <TabsContent className="mt-0" value="profile">
        <ProfileSection
          isProStatusLoading={isProStatusLoading}
          isProUser={isProUser}
          subscriptionData={subscriptionData}
          user={user}
        />
      </TabsContent>

      <TabsContent className="mt-0" value="usage">
        <UsageSection user={user} />
      </TabsContent>

      <TabsContent className="mt-0" value="subscription">
        <SubscriptionSection
          isProUser={isProUser}
          subscriptionData={subscriptionData}
          user={user}
        />
      </TabsContent>

      <TabsContent
        className="!scrollbar-thin !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30 mt-0"
        value="preferences"
      >
        <PreferencesSection
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
          user={user}
        />
      </TabsContent>

      <TabsContent className="mt-0" value="connectors">
        <ConnectorsSection user={user} />
      </TabsContent>

      <TabsContent className="mt-0" value="memories">
        <MemoriesSection />
      </TabsContent>
    </>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent
          className="h-[85vh] max-h-[600px] overflow-hidden p-0 [&[data-vaul-drawer]]:transition-none"
          style={{
            height: mobileDrawerPxHeight ?? undefined,
            maxHeight: mobileDrawerPxHeight ?? undefined,
          }}
        >
          <div className="flex h-full max-h-full flex-col">
            {/* Header - more compact */}
            <DrawerHeader className="shrink-0 px-4 pt-3 pb-2">
              <DrawerTitle className="flex items-center gap-2 font-medium text-base">
                <Image
                  alt="Draftpen"
                  className="size-6"
                  height={24}
                  src="/draftpen.svg"
                  width={24}
                />
                Settings
              </DrawerTitle>
            </DrawerHeader>

            {/* Content area with tabs */}
            <Tabs
              className="flex flex-1 flex-col gap-0 overflow-hidden"
              onValueChange={setCurrentTab}
              value={currentTab}
            >
              {/* Tab content - takes up most space */}
              <div className="!pb-4 !scrollbar-w-1 !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4">
                {contentSections}
              </div>

              {/* Bottom tab navigation - compact and accessible */}
              <div
                className={cn(
                  "shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
                  currentTab === "preferences" || currentTab === "connectors"
                    ? "pb-[calc(env(safe-area-inset-bottom)+2.5rem)]"
                    : "pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                )}
              >
                <TabsList className="!mb-2 grid h-24 w-full grid-cols-3 gap-2 rounded-none bg-transparent px-3 py-1.5 sm:grid-cols-6 sm:px-4">
                  {tabItems.map((item) => (
                    <TabsTrigger
                      className="relative h-full min-w-0 flex-col gap-0.5 rounded-md px-2 transition-colors data-[state=active]:bg-muted data-[state=active]:shadow-none"
                      key={item.value}
                      value={item.value}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          currentTab === item.value
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(
                          "mt-0.5 text-[10px] transition-colors",
                          currentTab === item.value
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="!max-w-4xl !w-full !p-0 max-h-[85vh] gap-0 overflow-hidden">
        <DialogHeader className="!m-0 p-4">
          <DialogTitle className="flex items-center gap-2 font-medium text-xl tracking-normal">
            <Image
              alt="Draftpen"
              className="size-6"
              height={24}
              src="/draftpen.svg"
              width={24}
            />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="!m-0 w-48">
            <div className="!gap-1 flex flex-col p-2">
              {tabItems.map((item) => (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "hover:bg-muted",
                    currentTab === item.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={item.value}
                  onClick={() => setCurrentTab(item.value)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="!scrollbar-w-1 !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30 h-[calc(85vh-120px)]">
              <div className="p-6 pb-8">
                <Tabs
                  onValueChange={setCurrentTab}
                  orientation="vertical"
                  value={currentTab}
                >
                  {contentSections}
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
