"use client";

import { Button } from "@/components/ui/button";
import { Eye, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadTrackingProps {
  readBy: { id: string; full_name: string | null; signed: boolean }[];
  teamSize: number;
  signedOff: boolean;
  signingOff: boolean;
  onSignOff: () => void;
}

export function ReadTracking({
  readBy,
  teamSize,
  signedOff,
  signingOff,
  onSignOff,
}: ReadTrackingProps) {
  return (
    <div className="no-print space-y-4">
      {/* Read by count + avatars */}
      {readBy.length > 0 && (
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Read by{" "}
            <span className="font-mono font-semibold text-foreground">
              {readBy.length}/{teamSize}
            </span>{" "}
            team {teamSize === 1 ? "member" : "members"}
          </span>
          <div className="flex -space-x-2">
            {readBy.slice(0, 8).map((reader) => (
              <div
                key={reader.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-accent text-accent-foreground text-[10px] font-bold"
                title={`${reader.full_name ?? "User"}${reader.signed ? " (signed off)" : ""}`}
              >
                {reader.full_name
                  ? reader.full_name.charAt(0).toUpperCase()
                  : "?"}
              </div>
            ))}
            {readBy.length > 8 && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-muted-foreground text-[10px] font-medium"
              >
                +{readBy.length - 8}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign-off button */}
      <Button
        variant={signedOff ? "secondary" : "outline"}
        size="sm"
        onClick={onSignOff}
        disabled={signingOff}
        className="gap-2"
      >
        {signingOff ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck
            className={cn("h-4 w-4", signedOff && "text-emerald-400")}
          />
        )}
        {signedOff ? "Signed Off" : "Sign Off"}
      </Button>
    </div>
  );
}
