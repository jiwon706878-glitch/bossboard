import { Command } from "commander";
import { getConfig, saveConfig } from "../config";

export const authCommand = new Command("auth")
  .description("Authenticate with BossBoard");

authCommand
  .command("login")
  .description("Save your API key")
  .requiredOption("--key <api-key>", "Your BossBoard API key")
  .option("--url <url>", "API base URL (default: https://mybossboard.com)")
  .action(async (opts: { key: string; url?: string }) => {
    const updates: Record<string, string> = { apiKey: opts.key };
    if (opts.url) updates.apiUrl = opts.url;
    saveConfig(updates);
    console.log("API key saved. Testing connection...");

    try {
      const config = getConfig();
      const res = await fetch(`${config.apiUrl}/api/v1/context`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!res.ok) {
        console.error(`Authentication failed (${res.status}). Check your API key.`);
        process.exit(1);
      }
      const data = await res.json();
      console.log(`Connected to: ${data.business?.name || "your workspace"}`);
    } catch (err) {
      console.error("Could not reach the API. Check your URL and network.");
      process.exit(1);
    }
  });

authCommand
  .command("status")
  .description("Show current authentication status")
  .action(() => {
    const config = getConfig();
    if (!config.apiKey) {
      console.log("Not authenticated. Run: bb auth login --key <api-key>");
      return;
    }
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`API Key: ${config.apiKey.substring(0, 8)}...**`);
  });

authCommand
  .command("logout")
  .description("Remove saved credentials")
  .action(() => {
    saveConfig({ apiKey: "" });
    console.log("Credentials removed.");
  });
