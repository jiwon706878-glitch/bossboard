"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCommand = void 0;
const commander_1 = require("commander");
const config_1 = require("../config");
exports.authCommand = new commander_1.Command("auth")
    .description("Authenticate with BossBoard");
exports.authCommand
    .command("login")
    .description("Save your API key")
    .requiredOption("--key <api-key>", "Your BossBoard API key")
    .option("--url <url>", "API base URL (default: https://mybossboard.com)")
    .action(async (opts) => {
    const updates = { apiKey: opts.key };
    if (opts.url)
        updates.apiUrl = opts.url;
    (0, config_1.saveConfig)(updates);
    console.log("API key saved. Testing connection...");
    try {
        const config = (0, config_1.getConfig)();
        const res = await fetch(`${config.apiUrl}/api/v1/context`, {
            headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) {
            console.error(`Authentication failed (${res.status}). Check your API key.`);
            process.exit(1);
        }
        const data = await res.json();
        console.log(`Connected to: ${data.business?.name || "your workspace"}`);
    }
    catch (err) {
        console.error("Could not reach the API. Check your URL and network.");
        process.exit(1);
    }
});
exports.authCommand
    .command("status")
    .description("Show current authentication status")
    .action(() => {
    const config = (0, config_1.getConfig)();
    if (!config.apiKey) {
        console.log("Not authenticated. Run: bb auth login --key <api-key>");
        return;
    }
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`API Key: ${config.apiKey.substring(0, 8)}...**`);
});
exports.authCommand
    .command("logout")
    .description("Remove saved credentials")
    .action(() => {
    (0, config_1.saveConfig)({ apiKey: "" });
    console.log("Credentials removed.");
});
