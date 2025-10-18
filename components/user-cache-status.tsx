"use client";

import { Clock, Crown, RefreshCw, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/contexts/user-context";

interface UserCacheStatusProps {
  className?: string;
}

export function UserCacheStatus({ className }: UserCacheStatusProps) {
  const {
    user,
    isLoading,
    isProUser,
    isCached,
    clearCache,
    refetch,
    isRefetching,
    subscriptionStatus,
    proSource,
  } = useUser();

  const handleClearCache = () => {
    clearCache();
    // Optionally refetch after clearing
    setTimeout(() => refetch(), 100);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-medium text-sm">
          <User className="h-4 w-4" />
          User Cache Status
          <div className="ml-auto flex gap-1">
            <Badge
              className="text-xs"
              variant={isCached ? "default" : "secondary"}
            >
              {isCached ? "💾 Cached" : "🌐 Fresh"}
            </Badge>
            {isLoading && (
              <Badge className="text-xs" variant="outline">
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Loading
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Info */}
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Name:</span>
              <span className="font-medium text-sm">{user.name || "N/A"}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Email:</span>
              <span className="max-w-[150px] truncate font-medium text-sm">
                {user.email || "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Pro Status:</span>
              <div className="flex items-center gap-1">
                {isProUser && <Crown className="h-3 w-3 text-yellow-500" />}
                <span className="font-medium text-sm">
                  {isProUser ? "Pro User" : "Free User"}
                </span>
              </div>
            </div>

            {isProUser && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Source:</span>
                  <Badge className="text-xs" variant="outline">
                    {proSource}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Subscription:
                  </span>
                  <Badge
                    className="text-xs"
                    variant={
                      subscriptionStatus === "active" ? "default" : "secondary"
                    }
                  >
                    {subscriptionStatus}
                  </Badge>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">User ID:</span>
              <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                {user.id.slice(-8)}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-muted-foreground text-sm">
              No user data available
            </p>
            {isLoading && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-xs">Fetching user data...</span>
              </div>
            )}
          </div>
        )}

        {/* Cache Performance Info */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-muted-foreground">
                Load Time: {isCached ? "~0ms" : "~300ms"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`h-2 w-2 rounded-full ${isCached ? "bg-green-500" : "bg-blue-500"}`}
              />
              <span className="text-muted-foreground">
                {isCached ? "Instant" : "Network"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1"
            disabled={isRefetching}
            onClick={() => refetch()}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`mr-1 h-3 w-3 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            className="flex-1"
            disabled={!isCached}
            onClick={handleClearCache}
            size="sm"
            variant="outline"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Clear Cache
          </Button>
        </div>

        {/* Cache Info */}
        {isCached && (
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-muted-foreground text-xs">
              💡 This data was loaded instantly from localStorage cache. Fresh
              data is being fetched in the background for next time.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
