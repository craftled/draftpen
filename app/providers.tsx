"use client";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { UserProvider } from "@/contexts/user-context";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 0.5, // 30 seconds
      refetchOnWindowFocus: true, // Enable for real-time updates
      gcTime: 1000 * 60 * 0.5, // 30 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <DataStreamProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </DataStreamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
