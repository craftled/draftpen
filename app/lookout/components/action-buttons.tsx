"use client";

import {
  Archive01Icon,
  Delete02Icon,
  PauseIcon,
  PlayIcon,
  TestTubeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { BorderTrail } from "@/components/core/border-trail";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActionButtonsProps = {
  lookoutId: string;
  status: "active" | "paused" | "running" | "archived";
  isMutating?: boolean;
  onStatusChange: (
    id: string,
    status: "active" | "paused" | "archived" | "running"
  ) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
};

export function ActionButtons({
  lookoutId,
  status,
  isMutating = false,
  onStatusChange,
  onDelete,
  onTest,
}: ActionButtonsProps) {
  const handleStatusChange = (
    newStatus: "active" | "paused" | "archived" | "running"
  ) => {
    onStatusChange(lookoutId, newStatus);
  };

  const handleDelete = () => {
    onDelete(lookoutId);
  };

  const handleTest = () => {
    onTest(lookoutId);
  };

  // Don't show actions for archived lookouts in main view - they only get delete
  if (status === "archived") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-8 w-8"
            disabled={isMutating}
            onClick={handleDelete}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={Delete02Icon}
              size={16}
              strokeWidth={1.5}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete lookout</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Primary action button - pause/resume/running indicator */}
      {status === "active" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-8 w-8"
              disabled={isMutating}
              onClick={() => handleStatusChange("paused")}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon
                color="currentColor"
                icon={PauseIcon}
                size={16}
                strokeWidth={1.5}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pause lookout</p>
          </TooltipContent>
        </Tooltip>
      )}

      {status === "paused" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-8 w-8"
              disabled={isMutating}
              onClick={() => handleStatusChange("active")}
              size="icon"
              variant="ghost"
            >
              <HugeiconsIcon
                color="currentColor"
                icon={PlayIcon}
                size={16}
                strokeWidth={1.5}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Resume lookout</p>
          </TooltipContent>
        </Tooltip>
      )}

      {status === "running" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="relative h-8 w-8 overflow-hidden"
              disabled={true}
              size="icon"
              variant="ghost"
            >
              <BorderTrail
                className="bg-primary/60"
                size={24}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
              <HugeiconsIcon
                className="text-primary"
                color="currentColor"
                icon={PlayIcon}
                size={16}
                strokeWidth={1.5}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lookout is currently running</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Test button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-8 w-8"
            disabled={isMutating || status === "running"}
            onClick={handleTest}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={TestTubeIcon}
              size={16}
              strokeWidth={1.5}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "running"
              ? "Cannot test while running"
              : "Test lookout now"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Archive button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-8 w-8"
            disabled={isMutating || status === "running"}
            onClick={() => handleStatusChange("archived")}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={Archive01Icon}
              size={16}
              strokeWidth={1.5}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "running"
              ? "Cannot archive while running"
              : "Archive lookout"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Delete button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-8 w-8"
            disabled={isMutating || status === "running"}
            onClick={handleDelete}
            size="icon"
            variant="ghost"
          >
            <HugeiconsIcon
              color="currentColor"
              icon={Delete02Icon}
              size={16}
              strokeWidth={1.5}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === "running"
              ? "Cannot delete while running"
              : "Delete lookout"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
