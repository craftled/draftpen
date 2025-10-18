import { useQuery } from "@tanstack/react-query";
import { getUserMessageCount } from "@/app/actions";
import type { User } from "@/lib/db/schema";

export function useUsageData(user: User | null, enabled = true) {
  return useQuery({
    queryKey: ["user-usage", user?.id],
    queryFn: () => getUserMessageCount(),
    enabled: enabled && !!user,
    staleTime: 1000 * 60 * 1, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
