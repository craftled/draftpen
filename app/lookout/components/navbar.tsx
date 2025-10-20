"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/user-profile";

type NavbarProps = {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
  showProBadge?: boolean;
};

export function Navbar({
  user,
  isProUser,
  isProStatusLoading,
  showProBadge = false,
}: NavbarProps) {
  return (
    <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between bg-background/95 p-3 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button
            className="group rounded-lg bg-accent transition-all hover:scale-105 hover:bg-accent/80"
            size="sm"
            type="button"
            variant="secondary"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={ArrowLeft01Icon}
              size={16}
              strokeWidth={1.5}
            />
            <span className="ml-1.5 hidden text-sm sm:inline">
              Back to Search
            </span>
            <span className="ml-1.5 text-sm sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {isProStatusLoading ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5">
            <div className="size-4 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
          </div>
        ) : showProBadge && isProUser ? (
          <div className="pointer-events-auto">
            <span className="inline-flex items-center gap-1 rounded-lg border-transparent bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 px-2.5 pt-0.5 pb-2 font-baumans! text-foreground leading-3 shadow-sm ring-1 ring-ring/35 ring-offset-1 ring-offset-background sm:pt-1 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
              <span>pro</span>
            </span>
          </div>
        ) : null}

        <UserProfile
          isProStatusLoading={isProStatusLoading}
          isProUser={isProUser}
          subscriptionData={
            user?.polarSubscription
              ? {
                  hasSubscription: true,
                  subscription: user.polarSubscription,
                }
              : { hasSubscription: false }
          }
          user={user || null}
        />
      </div>
    </div>
  );
}
