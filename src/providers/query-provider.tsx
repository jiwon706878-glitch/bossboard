"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Show cached data immediately, refresh in background
            staleTime: 2 * 60 * 1000, // Data is "fresh" for 2 minutes
            gcTime: 10 * 60 * 1000,   // Keep unused cache for 10 minutes
            refetchOnWindowFocus: false, // Prevents flicker/data loss on tab switch
            refetchOnMount: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
