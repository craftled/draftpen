"use client";

import { Share03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckIcon,
  CopyIcon,
  LinkedinLogoIcon,
  LockIcon,
  RedditLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  selectedVisibilityType: "public" | "private";
  onVisibilityChange: (visibility: "public" | "private") => Promise<void>;
  isOwner?: boolean;
  user?: any;
}

export function ShareDialog({
  isOpen,
  onOpenChange,
  chatId,
  selectedVisibilityType,
  onVisibilityChange,
  isOwner = true,
  user,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);

  // Generate the share URL
  const shareUrl = chatId ? `https://draftpen.com/search/${chatId}` : "";

  // Reset copied state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // Handle copy to clipboard
  const handleCopyIconLink = async () => {
    console.log("📋 Attempting to copy URL to clipboard:", shareUrl);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      console.log("✅ URL copied to clipboard successfully");

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("❌ Failed to copy to clipboard:", error);
      toast.error("Failed to copy link");
    }
  };

  // Handle visibility change to public and copy link
  const handleShareAndCopyIcon = async () => {
    console.log("🔗 Share and copy initiated, chatId:", chatId);
    setIsChangingVisibility(true);

    try {
      if (selectedVisibilityType === "private") {
        console.log("📡 Changing visibility to public");
        await onVisibilityChange("public");
        console.log("✅ Visibility changed to public successfully");
      }

      // Copy the link
      await handleCopyIconLink();
    } catch (error) {
      console.error("❌ Error in share and copy:", {
        chatId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error("Failed to share chat");
    } finally {
      setIsChangingVisibility(false);
    }
  };

  // Handle making chat private
  const handleMakePrivate = async () => {
    console.log("🔒 Make private initiated, chatId:", chatId);
    setIsChangingVisibility(true);

    try {
      console.log("📡 Changing visibility to private");
      await onVisibilityChange("private");
      console.log("✅ Visibility changed to private successfully");
      toast.success("Chat is now private");
      console.log("🍞 Success toast shown: Chat is now private");

      // Close dialog after successful private change
      onOpenChange(false);
      console.log("🚪 Dialog closed after making private");
    } catch (error) {
      console.error("❌ Error making chat private:", {
        chatId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error("Failed to make chat private");
      console.log("🍞 Error toast shown: Failed to make chat private");
    } finally {
      setIsChangingVisibility(false);
    }
  };

  // Social media share handlers
  const handleShareLinkedIn = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("📱 Sharing to LinkedIn:", shareUrl);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("📱 Sharing to Twitter:", shareUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleShareReddit = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("📱 Sharing to Reddit:", shareUrl);
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
    window.open(redditUrl, "_blank", "noopener,noreferrer");
  };

  // Handle native share API
  const handleNativeShare = async () => {
    console.log("📱 Using native share API:", shareUrl);
    try {
      await navigator.share({
        title: "Shared Scira Chat",
        url: shareUrl,
      });
      console.log("✅ Native share completed");
    } catch (error) {
      console.error("❌ Native share failed:", error);
      // Fallback to copy
      await handleCopyIconLink();
    }
  };

  if (!(chatId && user && isOwner)) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="mx-auto max-h-[90vh] w-[95vw] max-w-[500px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon
              color="currentColor"
              icon={Share03Icon}
              size={20}
              strokeWidth={2}
            />
            Share Chat
          </DialogTitle>
          <DialogDescription>
            {selectedVisibilityType === "private"
              ? "Share this chat to make it accessible to anyone with the link."
              : "This chat is already shared. Anyone with the link can access it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-1">
          {/* Share URL Display and CopyIcon */}
          {selectedVisibilityType === "public" && (
            <div className="space-y-4">
              {/* Make Private Option */}
              <div className="flex items-center justify-between px-1">
                <h4 className="font-medium text-sm">Share Link</h4>
                <Button
                  className="h-8 text-xs"
                  disabled={isChangingVisibility}
                  onClick={handleMakePrivate}
                  size="sm"
                  variant="outline"
                >
                  <LockIcon className="mr-1" size={12} />
                  {isChangingVisibility ? "Making Private..." : "Make Private"}
                </Button>
              </div>

              <div className="flex items-start gap-3 rounded-md border border-border bg-muted/50 p-3">
                <div className="word-break-break-all overflow-wrap-anywhere flex-1 break-all font-mono text-muted-foreground text-xs leading-relaxed sm:text-sm">
                  <div className="max-h-16 overflow-y-auto pr-1 sm:max-h-12">
                    {shareUrl}
                  </div>
                </div>
                <Button
                  className="size-8 flex-shrink-0"
                  onClick={handleCopyIconLink}
                  size="icon"
                  title="Copy to clipboard"
                  variant="ghost"
                >
                  {copied ? (
                    <CheckIcon className="text-green-500" size={16} />
                  ) : (
                    <CopyIcon size={16} />
                  )}
                </Button>
              </div>

              <p className="px-1 text-center text-muted-foreground text-xs">
                Anyone with this link can view this chat
              </p>

              <Separator className="my-3" />

              {/* Compact Social Links and Action Buttons */}
              <div className="flex flex-col items-center justify-between gap-3 px-1 sm:flex-row">
                {/* Social Share Options */}
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-muted-foreground text-xs">
                    Share on:
                  </span>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <Button
                      className="size-8"
                      onClick={handleNativeShare}
                      size="icon"
                      title="Share via system"
                      variant="outline"
                    >
                      <HugeiconsIcon
                        color="currentColor"
                        icon={Share03Icon}
                        size={14}
                        strokeWidth={2}
                      />
                    </Button>
                  )}
                  <Button
                    className="size-8"
                    onClick={handleShareLinkedIn}
                    size="icon"
                    title="Share on LinkedIn"
                    variant="outline"
                  >
                    <LinkedinLogoIcon size={14} />
                  </Button>
                  <Button
                    className="size-8"
                    onClick={handleShareTwitter}
                    size="icon"
                    title="Share on X (Twitter)"
                    variant="outline"
                  >
                    <XLogoIcon size={14} />
                  </Button>
                  <Button
                    className="size-8"
                    onClick={handleShareReddit}
                    size="icon"
                    title="Share on Reddit"
                    variant="outline"
                  >
                    <RedditLogoIcon size={14} />
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="min-h-[36px] text-sm"
                    onClick={() => onOpenChange(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="min-h-[36px] text-sm"
                    onClick={handleCopyIconLink}
                  >
                    <CopyIcon className="mr-1.5" size={14} />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons for Private Chats */}
          {selectedVisibilityType === "private" && (
            <div className="flex flex-col justify-end gap-3 px-1 sm:flex-row">
              <Button
                className="order-2 min-h-[40px] sm:order-1"
                onClick={() => onOpenChange(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="order-1 min-h-[40px] sm:order-2"
                disabled={isChangingVisibility}
                onClick={handleShareAndCopyIcon}
              >
                <HugeiconsIcon
                  className="mr-2"
                  color="currentColor"
                  icon={Share03Icon}
                  size={16}
                  strokeWidth={2}
                />
                {isChangingVisibility ? "Sharing..." : "Share & Copy Link"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
