"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingSkeletonProps = {
  count?: number;
  showActions?: boolean;
};

export function LookoutSkeleton({
  showActions = true,
}: {
  showActions?: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

const DEFAULT_SKELETON_COUNT = 3 as const;

export function LoadingSkeletons({
  count = DEFAULT_SKELETON_COUNT,
  showActions = true,
}: LoadingSkeletonProps) {
  // Ensure count is a positive number to prevent rendering issues
  const validCount = Math.max(0, count || DEFAULT_SKELETON_COUNT);

  const ids = useMemo(
    () => Array.from({ length: validCount }, (_, i) => `skeleton-${i}`),
    [validCount]
  );

  if (validCount === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {ids.map((id) => (
        <LookoutSkeleton key={id} showActions={showActions} />
      ))}
    </div>
  );
}
