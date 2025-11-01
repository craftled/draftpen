"use client";

import { GlobeHemisphereWestIcon, PlusIcon } from "@phosphor-icons/react";
import { Clock } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
import { ChatHistoryButton } from "@/components/chat-history-dialog";

// Dynamically import ShareButton with SSR disabled to prevent hydration mismatches
const ShareButtonNoSSR = dynamic(
  () =>
    import("@/components/share").then((mod) => ({ default: mod.ShareButton })),
  { ssr: false }
);

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavigationMenu, UserProfile } from "@/components/user-profile";
import type { ComprehensiveUserData } from "@/lib/user-data-server";
import { cn } from "@/lib/utils";

type VisibilityType = "public" | "private";

type NavbarProps = {
  isDialogOpen: boolean;
  chatId: string | null;
  selectedVisibilityType: VisibilityType;
  onVisibilityChange: (visibility: VisibilityType) => void | Promise<void>;
  status: string;
  user: ComprehensiveUserData | null;
  onHistoryClick: () => void;
  isOwner?: boolean;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isInTrial?: boolean;
  daysLeftInTrial?: number;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (
    value: boolean | ((val: boolean) => boolean)
  ) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: (open: boolean) => void;
  settingsInitialTab?: string;
};

const Navbar = memo(
  ({
    isDialogOpen,
    chatId,
    selectedVisibilityType,
    onVisibilityChange,
    status,
    user,
    onHistoryClick,
    isOwner = true,
    subscriptionData,
    isProUser,
    isProStatusLoading,
    isInTrial = false,
    daysLeftInTrial = 0,
    isCustomInstructionsEnabled,
    setIsCustomInstructionsEnabled,
    settingsOpen,
    setSettingsOpen,
    settingsInitialTab,
  }: NavbarProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const isSearchWithId = useMemo(
      () => Boolean(pathname && /^\/search\/[^/]+/.test(pathname)),
      [pathname]
    );

    // Prevent hydration mismatch by only showing upgrade buttons after client mount
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Use passed Pro status directly
    const hasActiveSubscription = isProUser;
    const showProLoading = isProStatusLoading;

    // Debug logging
    if (typeof window !== "undefined" && user) {
    }

    // Only show upgrade UI after hydration
    const shouldShowUpgrade =
      isMounted && user && !hasActiveSubscription && !showProLoading;

    return (
      <div
        className={cn(
          "fixed top-0 right-0 left-0 z-30 flex items-center justify-between p-3 transition-colors duration-200",
          isDialogOpen
            ? "pointer-events-none bg-transparent"
            : status === "streaming" || status === "ready"
              ? "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60"
              : "bg-background"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3",
            isDialogOpen ? "pointer-events-auto" : ""
          )}
        >
          <Link
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "group pointer-events-auto rounded-lg bg-accent transition-all hover:scale-105 hover:bg-accent/80"
            )}
            href="/new"
          >
            <PlusIcon
              className="transition-all group-hover:rotate-90"
              size={16}
            />
            <span className="fade-in ml-1.5 hidden animate-in text-sm duration-300 group-hover:block">
              New
            </span>
          </Link>

          {/* Mobile-only Upgrade (avoids overlap with share on small screens) */}
          {shouldShowUpgrade && (
            <Button
              className="h-7 rounded-md px-2 text-xs sm:hidden"
              onClick={() => router.push("/pricing")}
              size="sm"
              variant="default"
            >
              Upgrade
            </Button>
          )}
        </div>

        {/* Start Free Trial Button */}
        {shouldShowUpgrade && (
          <div
            className={cn(
              "-translate-x-1/2 absolute left-1/2 hidden transform items-center justify-center sm:flex",
              isDialogOpen ? "pointer-events-auto" : ""
            )}
          >
            <Button
              className="h-7 rounded-md shadow-sm"
              onClick={() => router.push("/pricing")}
              size="sm"
              variant="default"
            >
              Start 7-Day Free Trial
            </Button>
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-1",
            isDialogOpen ? "pointer-events-auto" : ""
          )}
        >
          {/* Share functionality using unified component */}
          {chatId &&
            (user && isOwner ? (
              /* Authenticated chat owners get share functionality */
              <ShareButtonNoSSR
                chatId={chatId}
                className="mr-1"
                disabled={false}
                isOwner={isOwner}
                onVisibilityChange={async (visibility) => {
                  await Promise.resolve(onVisibilityChange(visibility));
                }}
                selectedVisibilityType={selectedVisibilityType}
                user={user}
                variant="navbar"
              />
            ) : (
              /* Non-owners (authenticated or not) just see indicator */
              selectedVisibilityType === "public" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        aria-disabled="true"
                        className="pointer-events-none cursor-not-allowed border border-blue-200 bg-blue-50 opacity-80 dark:border-blue-800 dark:bg-blue-950/50"
                        size="sm"
                        tabIndex={-1}
                        variant="secondary"
                      >
                        <GlobeHemisphereWestIcon
                          className="text-blue-600 dark:text-blue-400"
                          size={16}
                        />
                        <span className="font-medium text-blue-700 text-sm dark:text-blue-300">
                          Shared
                        </span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>
                    {user
                      ? "This is someone else's shared page"
                      : "This is a shared page"}
                  </TooltipContent>
                </Tooltip>
              )
            ))}

          {/* Subscription Status - show loading or Pro status only */}
          {user &&
            isSearchWithId &&
            (showProLoading ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5">
                    <div className="size-4 animate-pulse rounded-full bg-muted" />
                    <div className="hidden h-3 w-8 animate-pulse rounded bg-muted sm:block" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  Loading subscription status...
                </TooltipContent>
              </Tooltip>
            ) : hasActiveSubscription ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="pointer-events-auto mr-1">
                    <span className="inline-flex items-center gap-1 rounded-lg border-transparent bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 px-2.5 pt-0.5 pb-1.75 font-sans text-foreground leading-4 shadow-sm ring-1 ring-ring/35 ring-offset-1 ring-offset-background sm:pt-1 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                      {(() =>
                        isInTrial && daysLeftInTrial > 0 ? (
                          <>
                            <Clock className="h-3 w-3" />
                            <span className="hidden sm:inline">
                              {daysLeftInTrial}d trial
                            </span>
                            <span className="sm:hidden">trial</span>
                          </>
                        ) : (
                          <span>pro</span>
                        ))()}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {isInTrial
                    ? `Trial - ${daysLeftInTrial} days remaining`
                    : "Pro Subscribed - Unlimited access"}
                </TooltipContent>
              </Tooltip>
            ) : null)}

          {/* Chat History Button */}
          {user && <ChatHistoryButton onClickAction={onHistoryClick} />}
          {/* Navigation Menu - settings icon for general navigation */}
          <NavigationMenu />
          {/* User Profile - focused on authentication and account management */}
          <UserProfile
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            isProStatusLoading={isProStatusLoading}
            isProUser={isProUser}
            setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
            setSettingsOpen={setSettingsOpen}
            settingsInitialTab={settingsInitialTab}
            settingsOpen={settingsOpen}
            subscriptionData={subscriptionData}
            user={user}
          />
        </div>
      </div>
    );
  }
);

Navbar.displayName = "Navbar";

export { Navbar };
