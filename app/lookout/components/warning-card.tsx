"use client";

import { AlarmClockIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { Card, CardContent } from "@/components/ui/card";

const ICON_SIZE_SM = 16 as const;

type WarningCardProps = {
  type: "total-limit" | "daily-limit" | "custom";
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  message?: string;
  className?: string;
};

const warningConfig = {
  "total-limit": {
    icon: Alert02Icon,
    message:
      "You've reached the maximum of 10 lookouts. Delete existing lookouts to create new ones.",
  },
  "daily-limit": {
    icon: AlarmClockIcon,
    message:
      "You've reached the maximum of 5 active daily lookouts. Pause or delete existing daily lookouts to create new ones.",
  },
  custom: {
    icon: Alert02Icon,
    message: "",
  },
};

export function WarningCard({
  type,
  icon,
  message,
  className = "",
}: WarningCardProps) {
  const config = warningConfig[type];
  const IconComponent = icon || config.icon;
  const displayMessage = message || config.message;

  return (
    <Card
      className={`mb-6 border-orange-200 bg-orange-50 shadow-none dark:border-orange-900 dark:bg-orange-950/20 ${className}`}
    >
      <CardContent className="flex items-center gap-2 py-3">
        <HugeiconsIcon
          className="flex-shrink-0 text-orange-600 dark:text-orange-400"
          color="currentColor"
          icon={IconComponent}
          size={ICON_SIZE_SM}
          strokeWidth={1.5}
        />
        <p className="text-orange-600 text-sm dark:text-orange-400">
          {displayMessage}
        </p>
      </CardContent>
    </Card>
  );
}

// Preset warning components for common scenarios
export function TotalLimitWarning() {
  return <WarningCard type="total-limit" />;
}

export function DailyLimitWarning() {
  return <WarningCard type="daily-limit" />;
}
