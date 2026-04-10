import { createClient } from "@/lib/supabase/client";

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DAILY_PURGE_LIMIT = 900; // Buffer from 1000/day free limit

/**
 * Purge specific URLs from Cloudflare cache.
 * Gracefully no-ops if credentials are missing (dev mode).
 * Never throws — failures are logged and returned.
 */
export async function purgeUrls(urls: string[]): Promise<{
  success: boolean;
  errors?: string[];
}> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Cloudflare] No credentials, skipping purge");
    }
    return { success: true };
  }

  if (urls.length === 0) return { success: true };

  const supabase = createClient();

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("cloudflare_purge_log")
    .select("id", { count: "exact", head: true })
    .gte("purged_at", `${today}T00:00:00Z`);

  if ((count ?? 0) >= DAILY_PURGE_LIMIT) {
    console.warn("[Cloudflare] Daily purge limit reached, skipping");
    return { success: false, errors: ["Daily limit reached"] };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls.slice(0, 30) }), // CF max 30 URLs/request
      },
    );
    const data = await response.json() as { success: boolean; errors?: Array<{ message: string }> };

    // Log purges
    const logEntries = urls.map((url) => ({
      url,
      success: data.success,
      purged_at: new Date().toISOString(),
    }));
    await supabase.from("cloudflare_purge_log").insert(logEntries).then(() => {});

    return {
      success: data.success,
      errors: data.errors?.map((e) => e.message),
    };
  } catch (error) {
    console.error("[Cloudflare] Purge failed:", error);
    return { success: false, errors: [String(error)] };
  }
}
