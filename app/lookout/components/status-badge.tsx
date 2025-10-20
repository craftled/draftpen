"use client";

import {
  Archive01Icon,
  Clock01Icon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { BorderTrail } from "@/components/core/border-trail";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status: "active" | "paused" | "running" | "archived";
  size?: "sm" | "md";
};

const ICON_SIZE_SM = 12 as const;
const ICON_SIZE_MD = 16 as const;

const BORDERTRAIL_SIZE_RUNNING = 20 as const;

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const iconSize = size === "sm" ? ICON_SIZE_SM : ICON_SIZE_MD;
  const badgeClasses =
    size === "sm" ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-3 py-1 text-sm";

  const statusConfig = {
    active: {
      variant: "default" as const,
      icon: Clock01Icon,
      label: "Scheduled",
      className: badgeClasses,
    },
    paused: {
      variant: "secondary" as const,
      icon: PauseIcon,
      label: "Paused",
      className: badgeClasses,
    },
    running: {
      variant: "outline" as const,
      icon: PlayIcon,
      label: "Running",
      className: `${badgeClasses} bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors relative overflow-hidden`,
    },
    archived: {
      variant: "outline" as const,
      icon: Archive01Icon,
      label: "Archived",
      className: badgeClasses,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={config.className} variant={config.variant}>
      {status === "running" && (
        <BorderTrail
          className="bg-primary/60"
          size={BORDERTRAIL_SIZE_RUNNING}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      )}
      <HugeiconsIcon
        color="currentColor"
        icon={config.icon}
        size={iconSize}
        strokeWidth={1.5}
      />
      {config.label}
    </Badge>
  );
}
