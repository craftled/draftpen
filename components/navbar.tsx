'use client';

/* eslint-disable @next/next/no-img-element */
import React, { memo, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon, GlobeHemisphereWestIcon } from '@phosphor-icons/react';

import { Button, buttonVariants } from '@/components/ui/button';
import { UserProfile, NavigationMenu } from '@/components/user-profile';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';

import { ShareButton } from '@/components/share';
import { cn } from '@/lib/utils';

import { useRouter, usePathname } from 'next/navigation';
import { ComprehensiveUserData } from '@/lib/user-data-server';

type VisibilityType = 'public' | 'private';

interface NavbarProps {
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
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: (open: boolean) => void;
  settingsInitialTab?: string;
}

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
    const isSearchWithId = useMemo(() => Boolean(pathname && /^\/search\/[^/]+/.test(pathname)), [pathname]);

    // Prevent hydration mismatch by only showing upgrade buttons after client mount
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Use passed Pro status directly
    const hasActiveSubscription = isProUser;
    const showProLoading = isProStatusLoading;
    
    // Debug logging
    if (typeof window !== 'undefined' && user) {
      console.log('🔍 Navbar Debug:', {
        isProUser,
        isInTrial,
        daysLeftInTrial,
        hasActiveSubscription,
      });
    }
    
    // Only show upgrade UI after hydration
    const shouldShowUpgrade = isMounted && user && !hasActiveSubscription && !showProLoading;

    return (
      <>
        <div
          className={cn(
            'fixed left-0 right-0 z-30 top-0 flex justify-between items-center p-3 transition-colors duration-200',
            isDialogOpen
              ? 'bg-transparent pointer-events-none'
              : status === 'streaming' || status === 'ready'
                ? 'bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60'
                : 'bg-background',
          )}
        >
          <div className={cn('flex items-center gap-3', isDialogOpen ? 'pointer-events-auto' : '')}>
            <Link
              href="/new"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105 pointer-events-auto',
              )}
            >
              <PlusIcon size={16} className="group-hover:rotate-90 transition-all" />
              <span className="text-sm ml-1.5 group-hover:block hidden animate-in fade-in duration-300">New</span>
            </Link>

            {/* Mobile-only Upgrade (avoids overlap with share on small screens) */}
            {shouldShowUpgrade && (
              <Button
                variant="default"
                size="sm"
                className="rounded-md h-7 px-2 text-xs sm:hidden"
                onClick={() => router.push('/pricing')}
              >
                Upgrade
              </Button>
            )}
          </div>

          {/* Start Free Trial Button */}
          {shouldShowUpgrade && (
            <div
              className={cn(
                'hidden sm:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2',
                isDialogOpen ? 'pointer-events-auto' : '',
              )}
            >
              <Button
                variant="default"
                size="sm"
                className="rounded-md h-7 shadow-sm"
                onClick={() => router.push('/pricing')}
              >
                Start 7-Day Free Trial
              </Button>
            </div>
          )}
          <div className={cn('flex items-center gap-1', isDialogOpen ? 'pointer-events-auto' : '')}>
            {/* Share functionality using unified component */}
            {chatId && (
              <>
                {user && isOwner ? (
                  /* Authenticated chat owners get share functionality */
                  <ShareButton
                    chatId={chatId}
                    selectedVisibilityType={selectedVisibilityType}
                    onVisibilityChange={async (visibility) => {
                      await Promise.resolve(onVisibilityChange(visibility));
                    }}
                    isOwner={isOwner}
                    user={user}
                    variant="navbar"
                    className="mr-1"
                    disabled={false}
                  />
                ) : (
                  /* Non-owners (authenticated or not) just see indicator */
                  selectedVisibilityType === 'public' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="pointer-events-none bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 opacity-80 cursor-not-allowed"
                            aria-disabled="true"
                            tabIndex={-1}
                          >
                            <GlobeHemisphereWestIcon size={16} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Shared</span>
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={4}>
                        {user ? "This is someone else's shared page" : 'This is a shared page'}
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </>
            )}

            {/* Subscription Status - show loading or Pro status only */}
            {user && isSearchWithId && (
              <>
                {showProLoading ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border">
                        <div className="size-4 rounded-full bg-muted animate-pulse" />
                        <div className="w-8 h-3 bg-muted rounded animate-pulse hidden sm:block" />
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
                        <span className="font-baumans! px-2.5 pt-0.5 pb-1.75 sm:pt-1 leading-4 inline-flex items-center gap-1 rounded-lg shadow-sm border-transparent ring-1 ring-ring/35 ring-offset-1 ring-offset-background bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground  dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                          {(() => {
                            console.log('Badge render check:', { isInTrial, daysLeftInTrial, check: isInTrial && daysLeftInTrial > 0 });
                            return isInTrial && daysLeftInTrial > 0 ? (
                              <>
                                <Clock className="h-3 w-3" />
                                <span className="hidden sm:inline">{daysLeftInTrial}d trial</span>
                                <span className="sm:hidden">trial</span>
                              </>
                            ) : (
                              <span>pro</span>
                            );
                          })()}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      {isInTrial ? `Trial - ${daysLeftInTrial} days remaining` : 'Pro Subscribed - Unlimited access'}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </>
            )}

            {/* Chat History Button */}
            {user && <ChatHistoryButton onClickAction={onHistoryClick} />}
            {/* Navigation Menu - settings icon for general navigation */}
            <NavigationMenu />
            {/* User Profile - focused on authentication and account management */}
            <UserProfile
              user={user}
              subscriptionData={subscriptionData}
              isProUser={isProUser}
              isProStatusLoading={isProStatusLoading}
              isCustomInstructionsEnabled={isCustomInstructionsEnabled}
              setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              settingsInitialTab={settingsInitialTab}
            />
          </div>
        </div>
      </>
    );
  },
);

Navbar.displayName = 'Navbar';

export { Navbar };
