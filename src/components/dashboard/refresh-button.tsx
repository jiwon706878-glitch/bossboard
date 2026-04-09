"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRefreshRateLimit } from "@/hooks/use-refresh-rate-limit";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const queryClient = useQueryClient();
  const { canRefresh, blocked, recordClick } = useRefreshRateLimit();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!recordClick()) {
      if (blocked) {
        toast.error("Too many refreshes. Please wait a few minutes.");
      }
      return;
    }

    setSpinning(true);
    try {
      await queryClient.invalidateQueries();
      toast.success("Refreshed");
    } catch {
      toast.error("Refresh failed");
    }
    setTimeout(() => setSpinning(false), 1000);
  }, [queryClient, recordClick, blocked]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRefresh}
          onClick={handleRefresh}
          aria-label="Refresh data"
        >
          <RotateCw
            className={cn(
              "h-4 w-4 transition-transform",
              spinning && "animate-spin"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {blocked ? "Too many requests. Please wait." : "Refresh data"}
      </TooltipContent>
    </Tooltip>
  );
}
