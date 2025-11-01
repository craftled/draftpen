import { BinocularsIcon, BookOpen01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { ChatHistoryDialog } from "@/components/chat-history-dialog";
import { SignInPromptDialog } from "@/components/sign-in-prompt-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Pro Badge Component
const ProBadge = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-lg border-transparent bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 px-2.5 pt-1.5 pb-2.5 font-sans text-foreground leading-3 shadow-sm ring-offset-1 ring-offset-background/50 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);

type PostMessageUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const PostMessageUpgradeDialog = React.memo(
  ({ open, onOpenChange }: PostMessageUpgradeDialogProps) => (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="gap-0 overflow-hidden bg-background p-0 sm:max-w-[420px]"
        showCloseButton={false}
      >
        <DialogHeader className="p-0">
          <div className="relative h-80 overflow-hidden rounded-t-lg">
            <Image
              alt="Scira Pro"
              className="h-full w-full object-cover"
              height={630}
              src="/placeholder.png"
              width={1200}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute right-6 bottom-6 left-6">
              <div className="mb-3" />
              <DialogTitle className="mb-2 flex items-center gap-3 text-white">
                <span className="flex items-center gap-2 font-sans font-medium text-4xl">
                  scira
                  <ProBadge className="!text-white !bg-white/20 !ring-white/30 !tracking-normal font-light text-xl" />
                </span>
              </DialogTitle>
              <DialogDescription className="text-white/90">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-bold text-2xl">
                    Start 7-day free trial
                  </span>
                </div>
                <p className="mb-2 text-white/80 text-xs">
                  See Pricing page for current monthly price.
                </p>
                <p className="text-left text-sm text-white/80">
                  Unlock unlimited searches, advanced AI models, and premium
                  features to supercharge your research.
                </p>
              </DialogDescription>
              <Button
                className="mt-3 w-full border border-white/20 bg-white/90 font-medium text-black backdrop-blur-md hover:bg-white"
                onClick={() => {
                  window.location.href = "/pricing";
                }}
              >
                Start 7-day free trial
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-6 py-6">
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
                Access to all AI models including Grok 4, Claude 4 Sonnet and
                GPT-5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CheckIcon className="size-4 flex-shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-medium text-foreground text-sm">
                Priority Support
              </p>
              <p className="text-muted-foreground text-xs">
                Get help when you need it most
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
            onClick={() => onOpenChange(false)}
            size="sm"
            variant="ghost"
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
);

PostMessageUpgradeDialog.displayName = "PostMessageUpgradeDialog";

type LookoutAnnouncementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const LookoutAnnouncementDialog = React.memo(
  ({ open, onOpenChange }: LookoutAnnouncementDialogProps) => {
    const router = useRouter();
    const [isMac, setIsMac] = React.useState(false);

    React.useEffect(() => {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    }, []);

    React.useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (!open) {
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          router.push("/lookout");
          onOpenChange(false);
        } else if (
          (e.metaKey || e.ctrlKey) &&
          (e.key === "b" || e.key === "B")
        ) {
          e.preventDefault();
          router.push("/blog");
          onOpenChange(false);
        }
      };

      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }, [open, router, onOpenChange]);

    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent
          className="max-h-[85svh] gap-0 overflow-y-auto bg-background p-0 sm:max-h-[90vh] sm:max-w-lg"
          showCloseButton={false}
        >
          <DialogHeader className="p-0">
            <div className="relative h-40 overflow-hidden rounded-t-lg sm:h-48">
              <Image
                alt="Scira Lookout"
                className="h-full w-full object-cover"
                height={630}
                src="/lookout-promo.png"
                width={1200}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute right-4 bottom-4 left-4">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3 py-1.5 font-medium text-sm text-white backdrop-blur-sm">
                  New Feature
                </div>
                <DialogTitle className="font-bold text-white text-xl tracking-tight sm:text-2xl">
                  Introducing Scira Lookout
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/80">
                  Automated search monitoring on your schedule
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Set up searches that track trends, monitor developments, and
                keep you informed without manual effort.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                  <span className="text-foreground text-sm">
                    Schedule searches to run automatically
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                  <span className="text-foreground text-sm">
                    Receive notifications when results are ready
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckIcon className="size-4 flex-shrink-0 text-primary" />
                  <span className="text-foreground text-sm">
                    Access comprehensive search history
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="group w-full sm:flex-1"
                  onClick={() => {
                    router.push("/lookout");
                    onOpenChange(false);
                  }}
                >
                  <HugeiconsIcon
                    className="mr-2"
                    color="currentColor"
                    icon={BinocularsIcon}
                    size={16}
                    strokeWidth={2}
                  />
                  Explore Lookout
                  <span className="hidden font-mono text-xs opacity-60 sm:ml-auto sm:inline">
                    ⌘ ⏎
                  </span>
                </Button>
                <Button
                  className="group w-full shadow-none sm:flex-1"
                  onClick={() => {
                    router.push("/blog");
                    onOpenChange(false);
                  }}
                  variant="outline"
                >
                  <HugeiconsIcon
                    className="mr-2"
                    color="currentColor"
                    icon={BookOpen01Icon}
                    size={16}
                    strokeWidth={2}
                  />
                  Read Blog
                  <span className="hidden font-mono text-xs opacity-60 sm:ml-auto sm:inline">
                    {isMac ? "⌘" : "Ctrl"} B
                  </span>
                </Button>
              </div>

              <div className="mt-4 flex w-full items-center gap-2">
                <div className="flex-1 border-foreground/10 border-b" />
                <Button
                  className="px-3 text-muted-foreground text-xs hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  variant="ghost"
                >
                  Maybe later
                </Button>
                <div className="flex-1 border-foreground/10 border-b" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

LookoutAnnouncementDialog.displayName = "LookoutAnnouncementDialog";

type ChatDialogsProps = {
  commandDialogOpen: boolean;
  setCommandDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
  setShowSignInPrompt: (open: boolean) => void;
  hasShownSignInPrompt: boolean;
  setHasShownSignInPrompt: (value: boolean) => void;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
  hasShownUpgradeDialog: boolean;
  setHasShownUpgradeDialog: (value: boolean) => void;
  showLookoutAnnouncement: boolean;
  setShowLookoutAnnouncement: (open: boolean) => void;
  hasShownLookoutAnnouncement: boolean;
  setHasShownLookoutAnnouncement: (value: boolean) => void;
  user: any;
  setAnyDialogOpen: (open: boolean) => void;
};

export const ChatDialogs = React.memo(
  ({
    commandDialogOpen,
    setCommandDialogOpen,
    showSignInPrompt,
    setShowSignInPrompt,
    hasShownSignInPrompt,
    setHasShownSignInPrompt,
    showUpgradeDialog,
    setShowUpgradeDialog,
    hasShownUpgradeDialog,
    setHasShownUpgradeDialog,
    showLookoutAnnouncement,
    setShowLookoutAnnouncement,
    hasShownLookoutAnnouncement,
    setHasShownLookoutAnnouncement,
    user,
    setAnyDialogOpen,
  }: ChatDialogsProps) => {
    return (
      <>
        {/* Chat History Dialog */}
        <ChatHistoryDialog
          onOpenChange={(open) => {
            setCommandDialogOpen(open);
            setAnyDialogOpen(open);
          }}
          open={commandDialogOpen}
          user={user}
        />

        {/* Sign-in Prompt Dialog */}
        <SignInPromptDialog
          onOpenChange={(open) => {
            setShowSignInPrompt(open);
            if (!open) {
              setHasShownSignInPrompt(true);
            }
          }}
          open={showSignInPrompt}
        />

        {/* Post-Message Upgrade Dialog */}
        <PostMessageUpgradeDialog
          onOpenChange={(open) => {
            setShowUpgradeDialog(open);
            if (!open) {
              setHasShownUpgradeDialog(true);
            }
          }}
          open={showUpgradeDialog}
        />

        {/* Lookout Announcement Dialog */}
        <LookoutAnnouncementDialog
          onOpenChange={(open) => {
            setShowLookoutAnnouncement(open);
            if (!open) {
              setHasShownLookoutAnnouncement(true);
            }
          }}
          open={showLookoutAnnouncement}
        />
      </>
    );
  }
);

ChatDialogs.displayName = "ChatDialogs";
