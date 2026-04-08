"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface GoogleCalendarCardProps {
  isConnected: boolean;
  googleAuthUrl: string | null;
  onDisconnect: () => Promise<void>;
}

export function GoogleCalendarCard({ isConnected, googleAuthUrl, onDisconnect }: GoogleCalendarCardProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    await onDisconnect();
    setDisconnecting(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>Sync your Google Calendar events to the BossBoard calendar.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="press-effect"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {googleAuthUrl ? (
              <Button asChild className="press-effect">
                <a href={googleAuthUrl}>Connect Google Calendar</a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Google Calendar integration is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
