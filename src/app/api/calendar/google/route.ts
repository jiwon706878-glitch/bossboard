import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchGoogleEvents,
  refreshAccessToken,
  createGoogleEvent,
  type GoogleTokens,
  type CreateEventPayload,
} from "@/lib/google-calendar";

async function getValidTokens(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<GoogleTokens | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_calendar_tokens")
    .eq("id", userId)
    .single();

  const tokens = profile?.google_calendar_tokens as GoogleTokens | null;
  if (!tokens?.access_token || !tokens?.refresh_token) return null;

  // Check if token is expired (with 60s buffer)
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at > now + 60) {
    return tokens;
  }

  // Refresh the token
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  if (!refreshed) return null;

  // Save the new token back
  await supabase
    .from("profiles")
    .update({ google_calendar_tokens: refreshed })
    .eq("id", userId);

  return refreshed;
}

// GET /api/calendar/google?timeMin=...&timeMax=...
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ events: [], connected: false }, { status: 401 });
    }

    const tokens = await getValidTokens(supabase, user.id);
    if (!tokens) {
      return NextResponse.json({ events: [], connected: false });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 });
    }

    const events = await fetchGoogleEvents(tokens.access_token, timeMin, timeMax);
    return NextResponse.json({ events, connected: true });
  } catch (err) {
    console.error("Google calendar GET error:", err);
    return NextResponse.json({ events: [], connected: false }, { status: 500 });
  }
}

// POST /api/calendar/google — create an event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await getValidTokens(supabase, user.id);
    if (!tokens) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
    }

    const body = (await request.json()) as CreateEventPayload;
    if (!body.summary || !body.start || !body.end) {
      return NextResponse.json({ error: "summary, start, and end are required" }, { status: 400 });
    }

    const event = await createGoogleEvent(tokens.access_token, body);
    if (!event) {
      return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }

    return NextResponse.json({ event });
  } catch (err) {
    console.error("Google calendar POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
