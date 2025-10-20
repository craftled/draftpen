"use client";

import {
  Activity01Icon,
  AlertCircleIcon,
  ArrowUpRightIcon,
  Cancel01Icon,
  Chart01Icon,
  CheckmarkCircle01Icon,
  PlayIcon,
  Settings01Icon,
  TestTubeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import Link from "next/link";
import React from "react";
import { BorderTrail } from "@/components/core/border-trail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BORDERTRAIL_SIZE_RUNNING_SM = 14 as const;

const ICON_SIZE_TINY = 10 as const;

const ICON_SIZE_SM = 14 as const;
const BORDERTRAIL_SIZE_RUNNING_BADGE = 20 as const;
const ICON_STROKE_WIDTH = 1.5 as const;

const MS_PER_SECOND = 1000 as const;

const PERCENT_100 = 100 as const;
const SECONDS_PER_MINUTE = 60 as const;
const MINUTES_PER_HOUR = 60 as const;
const HOURS_PER_DAY = 24 as const;
const DAYS_IN_WEEK = 7 as const;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE;
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;
const ERROR_HISTORY_LIMIT = 3 as const;

type LookoutRun = {
  runAt: string;
  chatId: string;
  status: "success" | "error" | "timeout";
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
};

type LookoutWithHistory = {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: "active" | "paused" | "archived" | "running";
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  runHistory: LookoutRun[];
  createdAt: Date;
  updatedAt: Date;
};

type LookoutDetailsSidebarProps = {
  lookout: LookoutWithHistory;
  allLookouts: LookoutWithHistory[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLookoutChange?: (lookout: LookoutWithHistory) => void;
  onEditLookout?: (lookout: LookoutWithHistory) => void;
  onTest?: (id: string) => void;
};

export function LookoutDetailsSidebar({
  lookout,
  allLookouts,
  isOpen: _isOpen,
  onOpenChange: _onOpenChange,
  onLookoutChange,
  onEditLookout,
  onTest,
}: LookoutDetailsSidebarProps) {
  const runHistory = lookout.runHistory || [];
  const totalRuns = runHistory.length;
  const successfulRuns = runHistory.filter(
    (run) => run.status === "success"
  ).length;
  const failedRuns = runHistory.filter((run) => run.status === "error").length;
  const successRate =
    totalRuns > 0 ? (successfulRuns / totalRuns) * PERCENT_100 : 0;

  const averageDuration =
    runHistory.length > 0
      ? runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) /
        runHistory.length
      : 0;

  const lastWeekRuns = runHistory.filter(
    (run) =>
      new Date(run.runAt) > new Date(Date.now() - DAYS_IN_WEEK * MS_PER_DAY)
  ).length;

  // Get currently running lookouts
  const runningLookouts = allLookouts.filter((l) => l.status === "running");

  // Analytics view state
  const [showAnalytics, setShowAnalytics] = React.useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return (
          <HugeiconsIcon
            className="text-green-500"
            color="currentColor"
            icon={CheckmarkCircle01Icon}
            size={ICON_SIZE_SM}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        );
      case "error":
        return (
          <HugeiconsIcon
            className="text-red-500"
            color="currentColor"
            icon={Cancel01Icon}
            size={ICON_SIZE_SM}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        );
      case "timeout":
        return (
          <HugeiconsIcon
            className="text-yellow-500"
            color="currentColor"
            icon={AlertCircleIcon}
            size={ICON_SIZE_SM}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        );
      default:
        return (
          <HugeiconsIcon
            className="text-gray-500"
            color="currentColor"
            icon={Activity01Icon}
            size={ICON_SIZE_SM}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            className="bg-green-100 text-green-800 text-xs dark:bg-green-900 dark:text-green-200"
            variant="default"
          >
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge className="text-xs" variant="secondary">
            Paused
          </Badge>
        );
      case "running":
        return (
          <Badge
            className="relative gap-1 overflow-hidden border-primary/20 bg-primary/10 text-primary text-xs"
            variant="default"
          >
            <BorderTrail
              className="bg-primary/60"
              size={BORDERTRAIL_SIZE_RUNNING_BADGE}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <HugeiconsIcon
              color="currentColor"
              icon={PlayIcon}
              size={ICON_SIZE_TINY}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            Running
          </Badge>
        );
      case "archived":
        return (
          <Badge className="text-xs" variant="outline">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge className="text-xs" variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getTestTooltip = (status: string) => {
    if (status === "running") {
      return "Cannot test while running";
    }
    if (status === "archived") {
      return "Cannot test archived lookout";
    }
    return "Run test now";
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4 sm:px-4">
        {showAnalytics ? (
          /* Analytics View */
          <div className="space-y-5">
            <div>
              <h3 className="mb-3 font-medium text-foreground text-sm">
                Performance Metrics
              </h3>
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Success Rate
                  </span>
                  <span className="font-medium text-sm">
                    {successRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Average Duration
                  </span>
                  <span className="font-medium text-sm">
                    {averageDuration > 0
                      ? `${(averageDuration / MS_PER_SECOND).toFixed(1)}s`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Total Runs
                  </span>
                  <span className="font-medium text-sm">{totalRuns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Failed Runs
                  </span>
                  <span className="font-medium text-red-600 text-sm">
                    {failedRuns}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-foreground text-sm">
                Activity Summary
              </h3>
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    This Week
                  </span>
                  <span className="font-medium text-sm">
                    {lastWeekRuns} runs
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Frequency
                  </span>
                  <span className="font-medium text-sm capitalize">
                    {lookout.frequency}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Timezone
                  </span>
                  <span className="font-medium text-sm">
                    {lookout.timezone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <span className="font-medium text-sm capitalize">
                    {lookout.status}
                  </span>
                </div>
              </div>
            </div>

            {failedRuns > 0 && (
              <div>
                <h3 className="mb-3 font-medium text-foreground text-sm">
                  Recent Errors
                </h3>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {runHistory
                    .filter((run) => run.status === "error")
                    .slice(-ERROR_HISTORY_LIMIT)
                    .map((run) => (
                      <div
                        className="rounded border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950/20"
                        key={run.chatId}
                      >
                        <div className="mb-1 font-medium text-red-700 text-xs dark:text-red-400">
                          {format(new Date(run.runAt), "MMM d, h:mm a")}
                        </div>
                        <div className="text-red-600 text-xs leading-tight dark:text-red-300">
                          {run.error || "Unknown error"}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal View */
          <>
            {/* Currently Running Lookouts */}
            {runningLookouts.length > 0 && (
              <>
                <div>
                  <h3 className="mb-3 font-medium text-foreground text-sm">
                    Currently Running ({runningLookouts.length})
                  </h3>
                  <div className="space-y-2">
                    {runningLookouts.map((runningLookout) => (
                      <button
                        className={`w-full cursor-pointer rounded-md border p-3 text-left transition-colors hover:bg-muted/50 ${
                          runningLookout.id === lookout.id
                            ? "border-primary/30 bg-muted"
                            : ""
                        }`}
                        key={runningLookout.id}
                        onClick={() => onLookoutChange?.(runningLookout)}
                        type="button"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative overflow-hidden rounded border border-primary/20 p-1">
                            <BorderTrail
                              className="bg-primary/60"
                              size={BORDERTRAIL_SIZE_RUNNING_SM}
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
                              size={ICON_SIZE_TINY}
                              strokeWidth={ICON_STROKE_WIDTH}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {runningLookout.title}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {runningLookout.frequency} •{" "}
                              {runningLookout.timezone}
                            </p>
                          </div>
                          {runningLookout.id === lookout.id && (
                            <Badge className="text-xs" variant="outline">
                              Current
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Basic Info */}
            <div>
              <div className="mb-4">
                <h2 className="mb-2 font-semibold text-base text-foreground">
                  {lookout.title}
                </h2>
                <div className="flex items-center gap-2">
                  {getStatusBadge(lookout.status)}
                  <Badge className="text-xs" variant="outline">
                    {lookout.frequency}
                  </Badge>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-muted-foreground text-xs">
                <p>
                  Created {format(new Date(lookout.createdAt), "MMM d, yyyy")}
                </p>
                {lookout.nextRunAt && lookout.status === "active" && (
                  <p>
                    Next run{" "}
                    {format(new Date(lookout.nextRunAt), "MMM d, h:mm a")}
                  </p>
                )}
              </div>

              <div className="gap-2 rounded-md border bg-muted/50 p-3">
                <p className="text-xs leading-relaxed">{lookout.prompt}</p>
                <p className="mt-2 border-t pt-2 text-xs leading-relaxed">
                  Grok 4・Extreme Research
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h3 className="mb-3 font-medium text-foreground text-sm">
                Statistics
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 text-muted-foreground text-xs">
                    Total Runs
                  </div>
                  <div className="font-semibold text-lg">{totalRuns}</div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 text-muted-foreground text-xs">
                    Success Rate
                  </div>
                  <div className="font-semibold text-lg">
                    {successRate.toFixed(1)}%
                  </div>
                  <Progress className="mt-2 h-1" value={successRate} />
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 text-muted-foreground text-xs">
                    This Week
                  </div>
                  <div className="font-semibold text-lg">{lastWeekRuns}</div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="mb-1 text-muted-foreground text-xs">
                    Avg Duration
                  </div>
                  <div className="font-semibold text-lg">
                    {averageDuration > 0
                      ? `${(averageDuration / MS_PER_SECOND).toFixed(1)}s`
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Runs */}
            <div>
              <h3 className="mb-3 font-medium text-foreground text-sm">
                Recent Runs ({runHistory.length})
              </h3>
              <div className="space-y-2">
                {runHistory
                  .slice(-10)
                  .reverse()
                  .map((run, index) => (
                    <div
                      className="rounded-md border p-3 transition-colors hover:bg-muted/30"
                      key={`${run.chatId}-${index}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-1 items-start gap-2">
                          {getStatusIcon(run.status)}
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(run.runAt), "MMM d, h:mm a")}
                              </span>
                              {run.duration && (
                                <Badge
                                  className="h-4 text-xs"
                                  variant="outline"
                                >
                                  {(run.duration / MS_PER_SECOND).toFixed(1)}s
                                </Badge>
                              )}
                            </div>
                            {run.error && (
                              <p className="mb-1 text-red-600 text-xs leading-tight">
                                {run.error}
                              </p>
                            )}
                            {typeof run.searchesPerformed === "number" && (
                              <p className="text-muted-foreground text-xs">
                                {run.searchesPerformed} searches
                              </p>
                            )}
                          </div>
                        </div>
                        {run.status === "success" && (
                          <Link href={`/search/${run.chatId}`}>
                            <Button
                              className="h-6 w-6 p-0"
                              size="sm"
                              variant="ghost"
                            >
                              <HugeiconsIcon
                                color="currentColor"
                                icon={ArrowUpRightIcon}
                                size={12}
                                strokeWidth={ICON_STROKE_WIDTH}
                              />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}

                {runHistory.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 p-3">
                      <HugeiconsIcon
                        className="opacity-50"
                        color="currentColor"
                        icon={Activity01Icon}
                        size={16}
                        strokeWidth={ICON_STROKE_WIDTH}
                      />
                    </div>
                    <p className="text-xs">No runs yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t px-3 py-3 sm:px-4">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 flex-1 text-xs"
                disabled={lookout.status === "running"}
                onClick={() => onEditLookout?.(lookout)}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon
                  className="mr-1"
                  color="currentColor"
                  icon={Settings01Icon}
                  size={14}
                  strokeWidth={1.5}
                />
                Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {lookout.status === "running"
                  ? "Cannot edit while running"
                  : "Edit lookout settings"}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 flex-1 text-xs"
                disabled={
                  lookout.status === "running" || lookout.status === "archived"
                }
                onClick={() => onTest?.(lookout.id)}
                size="sm"
                variant="outline"
              >
                <HugeiconsIcon
                  className="mr-1"
                  color="currentColor"
                  icon={TestTubeIcon}
                  size={ICON_SIZE_SM}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                Test
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getTestTooltip(lookout.status)}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 flex-1 text-xs"
                onClick={() => setShowAnalytics(!showAnalytics)}
                size="sm"
                variant={showAnalytics ? "default" : "outline"}
              >
                <HugeiconsIcon
                  className="mr-1"
                  color="currentColor"
                  icon={Chart01Icon}
                  size={14}
                  strokeWidth={ICON_STROKE_WIDTH}
                />
                {showAnalytics ? "Overview" : "Analytics"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showAnalytics ? "Show overview" : "Show analytics"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
