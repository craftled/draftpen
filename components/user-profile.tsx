"use client";

import { BinocularsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookIcon,
  BugIcon,
  CodeIcon,
  EyeIcon,
  EyeSlashIcon,
  FileTextIcon,
  GearIcon,
  GithubLogoIcon,
  InfoIcon,
  InstagramLogoIcon,
  ShieldIcon,
  SignInIcon,
  SignOutIcon,
  SunIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SignInPromptDialog } from "@/components/sign-in-prompt-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SettingsIcon,
  type SettingsIconHandle,
} from "@/components/ui/settings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { signOut, useSession } from "@/lib/auth-client";
import type { User } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "./settings-dialog";
import { ThemeSwitcher } from "./theme-switcher";

const VercelIcon = ({ size = 16 }: { size: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: "currentcolor" }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      clipRule="evenodd"
      d="M8 1L16 15H0L8 1Z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

// Navigation Menu Component - contains all the general navigation items
const NavigationMenu = memo(() => {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const [isOpen, setIsOpen] = useState(false);
  const settingsIconRef = useRef<SettingsIconHandle>(null);

  // Control the animation based on dropdown state
  useEffect(() => {
    if (isOpen) {
      settingsIconRef.current?.startAnimation();
    } else {
      settingsIconRef.current?.stopAnimation();
    }
  }, [isOpen]);

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <div className="!size-6 !p-0 !m-0 flex cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground">
              <SettingsIcon ref={settingsIconRef} size={18} />
            </div>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          Menu
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="z-[110] mr-5 w-[240px]">
        {/* Lookout - only show if authenticated */}
        {isAuthenticated && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push("/lookout")}
          >
            <div className="flex w-full items-center gap-2">
              <HugeiconsIcon icon={BinocularsIcon} size={16} />
              <span>Lookout</span>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href={"https://draftpen.com/"}
            rel="noopener"
            target="_blank"
          >
            <CodeIcon size={16} />
            <span>API</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer py-1 hover:bg-transparent!">
          <div
            className="flex w-full items-center justify-between px-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <SunIcon size={16} />
              <span className="text-sm">Theme</span>
            </div>
            <ThemeSwitcher />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* About and Information */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link className="flex w-full items-center gap-2" href="/about">
            <InfoIcon size={16} />
            <span>About</span>
          </Link>
        </DropdownMenuItem>
        {/* Blog */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link className="flex w-full items-center gap-2" href="/blog">
            <BookIcon size={16} />
            <span>Blog</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link className="flex w-full items-center gap-2" href="/terms">
            <FileTextIcon size={16} />
            <span>Terms</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            className="flex w-full items-center gap-2"
            href="/privacy-policy"
          >
            <ShieldIcon size={16} />
            <span>Privacy</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {/* Social and External Links */}
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href={"https://git.new/scira"}
            rel="noopener"
            target="_blank"
          >
            <GithubLogoIcon size={16} />
            <span>Github</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href={"https://x.com/sciraai"}
            rel="noopener"
            target="_blank"
          >
            <XLogoIcon size={16} />
            <span>X.com</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href={"https://www.instagram.com/draftpen"}
            rel="noopener"
            target="_blank"
          >
            <InstagramLogoIcon size={16} />
            <span>Instagram</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=OPENAI_API_KEY,ANTHROPIC_API_KEY,DATABASE_URL,BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET,REDIS_URL,ELEVENLABS_API_KEY,EXA_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,SANDBOX_TEMPLATE_ID,CRON_SECRET,BLOB_READ_WRITE_TOKEN,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID,SMITHERY_API_KEY,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,SCIRA_PUBLIC_API_KEY,NEXT_PUBLIC_SCIRA_PUBLIC_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function"
            rel="noopener"
            target="_blank"
          >
            <VercelIcon size={14} />
            <span>Deploy with Vercel</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a
            className="flex w-full items-center gap-2"
            href={"https://scira.userjot.com"}
            rel="noopener"
            target="_blank"
          >
            <BugIcon className="size-4" />
            <span>Feature/Bug Request</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

NavigationMenu.displayName = "NavigationMenu";

// User Profile Component - focused on user authentication and account management
const UserProfile = memo(
  ({
    className,
    user,
    subscriptionData,
    isProUser,
    isProStatusLoading,
    isCustomInstructionsEnabled,
    setIsCustomInstructionsEnabled,
    settingsOpen,
    setSettingsOpen,
    settingsInitialTab,
  }: {
    className?: string;
    user?: User | null;
    subscriptionData?: any;
    isProUser?: boolean;
    isProStatusLoading?: boolean;
    isCustomInstructionsEnabled?: boolean;
    setIsCustomInstructionsEnabled?: (
      value: boolean | ((val: boolean) => boolean)
    ) => void;
    settingsOpen?: boolean;
    setSettingsOpen?: (open: boolean) => void;
    settingsInitialTab?: string;
  }) => {
    const [signingOut, setSigningOut] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [signInDialogOpen, setSignInDialogOpen] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const { data: session, isPending } = useSession();
    const router = useRouter();

    // Use passed user prop if available, otherwise fall back to session
    // BUT only use session for authentication check, not for settings dialog data
    const currentUser = user || session?.user;
    const isAuthenticated = !!(user || session);

    // For settings dialog, always use the passed user prop (has unified data structure)
    const settingsUser = user;

    // Use passed Pro status instead of calculating it
    const hasActiveSubscription = isProUser;

    if (isPending && !user) {
      return (
        <div className="flex h-8 w-8 items-center justify-center">
          <div className="size-4 animate-pulse rounded-full bg-muted/50" />
        </div>
      );
    }

    // Function to format email for display
    const formatEmail = (email?: string | null) => {
      if (!email) return "";

      // If showing full email, don't truncate it
      if (showEmail) {
        return email;
      }

      // If hiding email, show only first few characters and domain
      const parts = email.split("@");
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        const maskedUsername = username.slice(0, 3) + "•••";
        return `${maskedUsername}@${domain}`;
      }

      // Fallback for unusual email formats
      return email.slice(0, 3) + "•••";
    };

    return (
      <>
        {isAuthenticated ? (
          // Authenticated user - show avatar dropdown with account options
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    asChild
                    className={cn(
                      "!p-0 !m-0",
                      signingOut && "animate-pulse",
                      className
                    )}
                    size="sm"
                    variant="ghost"
                  >
                    <Avatar className="!p-0 !m-0 size-6 rounded-full border border-neutral-200 dark:border-neutral-700">
                      <AvatarImage
                        alt={currentUser?.name ?? ""}
                        className="!p-0 !m-0 size-6 rounded-md"
                        src={currentUser?.image ?? ""}
                      />
                      <AvatarFallback className="!p-0 !m-0 size-6 rounded-md text-sm">
                        {currentUser?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={4}>
                Account
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent className="z-[110] mr-5 w-[240px]">
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700">
                    <AvatarImage
                      alt={currentUser?.name ?? ""}
                      className="m-0 size-8 rounded-md p-0"
                      src={currentUser?.image ?? ""}
                    />
                    <AvatarFallback className="m-0 size-8 rounded-md p-0">
                      {currentUser?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate font-medium text-sm leading-none">
                      {currentUser?.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div
                        className={`text-muted-foreground text-xs ${showEmail ? "" : "max-w-[160px] truncate"}`}
                        title={currentUser?.email || ""}
                      >
                        {formatEmail(currentUser?.email)}
                      </div>
                      <Button
                        className="size-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmail(!showEmail);
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        {showEmail ? (
                          <EyeSlashIcon size={12} />
                        ) : (
                          <EyeIcon size={12} />
                        )}
                        <span className="sr-only">
                          {showEmail ? "Hide email" : "Show email"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setSettingsOpen?.(true)}
              >
                <div className="flex w-full items-center gap-2">
                  <GearIcon size={16} />
                  <span>Settings</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/lookout")}
              >
                <div className="flex w-full items-center gap-2">
                  <HugeiconsIcon icon={BinocularsIcon} size={16} />
                  <span>Lookout</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="flex w-full cursor-pointer items-center justify-between gap-2"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onRequest: () => {
                        setSigningOut(true);
                        toast.loading("Signing out...");
                      },
                      onSuccess: () => {
                        setSigningOut(false);
                        localStorage.clear();
                        toast.success("Signed out successfully");
                        toast.dismiss();
                        window.location.href = "/new";
                      },
                      onError: () => {
                        setSigningOut(false);
                        toast.error("Failed to sign out");
                        window.location.reload();
                      },
                    },
                  })
                }
              >
                <span>Sign Out</span>
                <SignOutIcon className="size-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Unauthenticated user - show simple sign in button
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "group h-7 rounded-md px-2.5 text-xs shadow-sm",
                  "transition-transform hover:scale-[1.02] active:scale-[0.98]",
                  signingIn && "animate-pulse",
                  className
                )}
                onClick={() => {
                  setSigningIn(true);
                  setSignInDialogOpen(true);
                }}
                size="sm"
                variant="default"
              >
                <SignInIcon className="mr-1.5 size-3.5" />
                <span>Sign in</span>
                <span className="ml-1.5 hidden rounded-full bg-primary-foreground/15 px-1.5 py-0.5 text-[9px] text-primary-foreground/90 sm:inline">
                  Free
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              Sign in to save progress and sync across devices
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings Dialog */}
        {settingsOpen !== undefined && setSettingsOpen && (
          <SettingsDialog
            initialTab={settingsInitialTab}
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            isProStatusLoading={isProStatusLoading}
            isProUser={isProUser}
            onOpenChange={setSettingsOpen}
            open={settingsOpen}
            setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
            subscriptionData={subscriptionData}
            user={settingsUser}
          />
        )}

        <SignInPromptDialog
          onOpenChange={(open) => {
            setSignInDialogOpen(open);
            if (!open) setSigningIn(false);
          }}
          open={signInDialogOpen}
        />
      </>
    );
  }
);

// Add a display name for the memoized component for better debugging
UserProfile.displayName = "UserProfile";

export { UserProfile, NavigationMenu };
