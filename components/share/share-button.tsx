"use client";

import { Share03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CopyIcon, GlobeHemisphereWestIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShareDialog } from "./share-dialog";

type ShareButtonProps = {
  chatId: string | null;
  selectedVisibilityType: "public" | "private";
  onVisibilityChange: (visibility: "public" | "private") => Promise<void>;
  isOwner?: boolean;
  user?: any;
  variant?: "icon" | "button" | "navbar";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
};

export function ShareButton({
  chatId,
  selectedVisibilityType,
  onVisibilityChange,
  isOwner = true,
  user,
  variant = "icon",
  size = "md",
  className = "",
  disabled = false,
}: ShareButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't render if user is not owner or no user
  if (!(user && isOwner && chatId)) {
    return null;
  }

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  const getButtonContent = () => {
    switch (variant) {
      case "navbar":
        if (selectedVisibilityType === "public") {
          return (
            <>
              <GlobeHemisphereWestIcon
                className="text-blue-600 dark:text-blue-400"
                size={16}
              />
              <span className="font-medium text-blue-700 text-sm dark:text-blue-300">
                Shared
              </span>
              <CopyIcon
                className="ml-1 text-blue-600 opacity-70 dark:text-blue-400"
                size={14}
              />
            </>
          );
        }
        return (
          <>
            <HugeiconsIcon
              className="text-muted-foreground"
              color="currentColor"
              icon={Share03Icon}
              size={14}
              strokeWidth={2}
            />
            <span className="font-medium text-muted-foreground text-sm">
              Share
            </span>
          </>
        );
      case "button":
        return (
          <>
            <HugeiconsIcon
              className="mr-2"
              color="currentColor"
              icon={Share03Icon}
              size={16}
              strokeWidth={2}
            />
            {selectedVisibilityType === "public" ? "Manage Share" : "Share"}
          </>
        );
      default:
        return (
          <HugeiconsIcon
            color="currentColor"
            icon={Share03Icon}
            size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
            strokeWidth={2}
          />
        );
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      onClick: handleClick,
      disabled,
      className,
    };

    switch (variant) {
      case "navbar":
        return {
          ...baseProps,
          variant: "secondary" as const,
          size: "sm" as const,
          className: `${className} !h-7 p-auto sm:!p-4 ${
            selectedVisibilityType === "public"
              ? "bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800"
              : ""
          }`,
        };
      case "button":
        return {
          ...baseProps,
          variant: "default" as const,
          size: size === "sm" ? ("sm" as const) : ("default" as const),
        };
      default:
        return {
          ...baseProps,
          variant: "ghost" as const,
          size: "icon" as const,
          className: `${className} ${size === "sm" ? "size-8" : size === "lg" ? "size-10" : "size-9"}`,
        };
    }
  };

  const button = <Button {...getButtonProps()}>{getButtonContent()}</Button>;

  const tooltipContent =
    selectedVisibilityType === "public"
      ? "Manage sharing settings"
      : "Share this chat";

  return (
    <>
      {variant === "icon" ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>{tooltipContent}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}

      <ShareDialog
        chatId={chatId}
        isOpen={isDialogOpen}
        isOwner={isOwner}
        onOpenChange={setIsDialogOpen}
        onVisibilityChange={onVisibilityChange}
        selectedVisibilityType={selectedVisibilityType}
        user={user}
      />
    </>
  );
}
