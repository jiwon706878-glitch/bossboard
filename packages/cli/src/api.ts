import { getConfig } from "./config";

export async function apiCall(method: string, path: string, body?: unknown) {
  const config = getConfig();
  if (!config.apiKey) {
    console.error("Not authenticated. Run: bb auth login --key <api-key>");
    process.exit(1);
  }
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.error(`Error ${res.status}: ${err.error || res.statusText}`);
    process.exit(1);
  }
  // Handle empty responses (e.g. 204 or DELETE with just { success: true })
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}
