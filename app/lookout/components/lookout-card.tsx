"use client";

import { BinocularsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type React from "react";
import { BorderTrail } from "@/components/core/border-trail";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatNextRun } from "../utils/time-utils";
import { ActionButtons } from "./action-buttons";
import { StatusBadge } from "./status-badge";

interface Lookout {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: "active" | "paused" | "archived" | "running";
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  createdAt: Date;
  cronSchedule?: string;
}

interface LookoutCardProps {
  lookout: Lookout;
  isMutating?: boolean;
  onStatusChange: (
    id: string,
    status: "active" | "paused" | "archived" | "running"
  ) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOpenDetails: (lookout: Lookout) => void;
  showActions?: boolean;
}

export function LookoutCard({
  lookout,
  isMutating = false,
  onStatusChange,
  onDelete,
  onTest,
  onOpenDetails,
  showActions = true,
}: LookoutCardProps) {
  const handleCardClick = () => {
    onOpenDetails(lookout);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden border border-primary/50 shadow-none hover:border-primary/40 ${
        lookout.status === "running" ? "border-primary/30" : ""
      } ${lookout.status === "archived" ? "opacity-75" : ""}`}
      onClick={handleCardClick}
    >
      {/* Border trail for running lookouts */}
      {lookout.status === "running" && (
        <BorderTrail
          className="bg-primary/60"
          size={40}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="font-medium text-base transition-colors hover:text-primary">
              {lookout.title}
            </CardTitle>
            <CardDescription className="text-sm">
              <StatusBadge status={lookout.status} />
            </CardDescription>
          </div>

          {showActions && (
            <div onClick={handleActionClick}>
              <ActionButtons
                isMutating={isMutating}
                lookoutId={lookout.id}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onTest={onTest}
                status={lookout.status}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1">
          {/* Next run information */}
          {lookout.nextRunAt && lookout.status === "active" && (
            <p className="text-muted-foreground text-xs">
              Next Run: {formatNextRun(lookout.nextRunAt, lookout.timezone)}
            </p>
          )}

          {/* Last run information */}
          {lookout.lastRunAt && (
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs">
                Last Run: {formatNextRun(lookout.lastRunAt, lookout.timezone)}
              </p>
              {lookout.lastRunChatId && (
                <Link
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-xs transition-colors hover:bg-primary/20"
                  href={`/search/${lookout.lastRunChatId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <HugeiconsIcon
                    color="currentColor"
                    icon={BinocularsIcon}
                    size={12}
                    strokeWidth={1.5}
                  />
                  View Results
                </Link>
              )}
            </div>
          )}

          {/* Completed state for once frequency */}
          {!lookout.lastRunAt &&
            lookout.frequency === "once" &&
            lookout.status === "paused" && (
              <p className="text-muted-foreground text-xs">Completed</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
