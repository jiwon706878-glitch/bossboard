// ─── Google Calendar Integration ─────────────────
// Helpers for OAuth flow and Calendar API calls.
// All functions gracefully return null/empty when credentials are missing.

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp in seconds
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
}

export interface CreateEventPayload {
  summary: string;
  start: string; // ISO datetime or yyyy-MM-dd for all-day
  end: string;
  description?: string;
}

// ─── OAuth URL ───────────────────────────────────
export function getGoogleAuthUrl(): string | null {
  if (!GOOGLE_CLIENT_ID) return null;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ─── Exchange auth code for tokens ───────────────
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    console.error("Google token exchange failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };
}

// ─── Refresh expired access token ────────────────
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("Google token refresh failed:", await res.text());
    return null;
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // refresh token doesn't change
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };
}

// ─── Fetch events from primary calendar ──────────
export async function fetchGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    console.error("Google events fetch failed:", await res.text());
    return [];
  }

  const data = await res.json();
  return (data.items ?? []) as GoogleEvent[];
}

// ─── Create event in primary calendar ────────────
export async function createGoogleEvent(
  accessToken: string,
  event: CreateEventPayload,
): Promise<GoogleEvent | null> {
  const isAllDay = event.start.length === 10; // yyyy-MM-dd format

  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description ?? "",
  };

  if (isAllDay) {
    body.start = { date: event.start };
    body.end = { date: event.end };
  } else {
    body.start = { dateTime: event.start };
    body.end = { dateTime: event.end };
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    console.error("Google event creation failed:", await res.text());
    return null;
  }

  return (await res.json()) as GoogleEvent;
}
