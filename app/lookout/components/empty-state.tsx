"use client";

import { Archive01Icon, BinocularsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type React from "react";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  icon?: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  description: string;
  children?: React.ReactNode;
  variant?: "default" | "dashed";
};

export function EmptyState({
  icon = BinocularsIcon,
  title,
  description,
  children,
  variant = "dashed",
}: EmptyStateProps) {
  return (
    <Card
      className={
        variant === "dashed" ? "border-dashed shadow-none" : "shadow-none"
      }
    >
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon
            className="text-muted-foreground"
            color="currentColor"
            icon={icon}
            size={20}
            strokeWidth={1.5}
          />
        </div>
        <h3 className="mb-1 font-medium text-lg">{title}</h3>
        <p className="mb-4 max-w-sm text-center text-muted-foreground text-sm">
          {description}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

// Preset empty states for common scenarios
export function NoActiveLookoutsEmpty() {
  return (
    <EmptyState
      description="Schedule a lookout to automate searches and get reminders when they complete."
      icon={BinocularsIcon}
      title="Get started by adding a lookout"
    />
  );
}

export function NoArchivedLookoutsEmpty() {
  return (
    <EmptyState
      description="Archived lookouts will appear here."
      icon={Archive01Icon}
      title="No archived lookouts"
      variant="default"
    />
  );
}
