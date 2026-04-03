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

// PATCH /api/calendar/google — move an event to a different date
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await getValidTokens(supabase, user.id);
  if (!tokens) return NextResponse.json({ error: "Not connected" }, { status: 400 });

  const { eventId, date } = await request.json();
  if (!eventId || !date) return NextResponse.json({ error: "Missing eventId or date" }, { status: 400 });

  try {
    // Get existing event
    const getRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    if (!getRes.ok) throw new Error("Failed to fetch event");
    const event = await getRes.json();

    // Update the date while preserving time
    if (event.start.date) {
      // All-day event
      event.start.date = date;
      event.end.date = date;
    } else if (event.start.dateTime) {
      // Timed event — preserve the time portion
      const startTime = event.start.dateTime.split("T")[1];
      const endTime = event.end.dateTime.split("T")[1];
      event.start.dateTime = `${date}T${startTime}`;
      event.end.dateTime = `${date}T${endTime}`;
    }

    // Update event
    const putRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
        }),
      }
    );
    if (!putRes.ok) throw new Error("Failed to update event");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH calendar error:", err);
    return NextResponse.json({ error: "Failed to move event" }, { status: 500 });
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
