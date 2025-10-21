import { useQuery } from "@tanstack/react-query";

const ONE_MINUTE_MS = 60_000 as const;
const TEN_MINUTES_MS = 600_000 as const;

import { getUserMessageCount } from "@/app/actions";
import type { User } from "@/lib/db/schema";

export function useUsageData(user: User | null, enabled = true) {
  return useQuery({
    queryKey: ["user-usage", user?.id],
    queryFn: () => getUserMessageCount(),
    enabled: enabled && !!user,
    staleTime: ONE_MINUTE_MS, // 1 minute
    gcTime: TEN_MINUTES_MS, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
