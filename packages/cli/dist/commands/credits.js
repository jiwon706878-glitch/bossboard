"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditsCommand = void 0;
const commander_1 = require("commander");
const api_1 = require("../api");
exports.creditsCommand = new commander_1.Command("credits")
    .description("View credit balance and usage");
exports.creditsCommand
    .command("balance")
    .description("Show current credit balance")
    .action(async () => {
    const data = await (0, api_1.apiCall)("GET", "/api/v1/credits");
    const b = data.balance;
    console.log("\n  Credit Balance");
    console.log("  ─────────────────────────");
    console.log(`  Monthly:    ${b.monthlyUsed} / ${b.monthly} used`);
    console.log(`  Purchased:  ${b.purchasedUsed} / ${b.purchased} used`);
    console.log(`  Available:  ${b.available}`);
    console.log();
});
exports.creditsCommand
    .command("usage")
    .description("Show recent credit usage")
    .action(async () => {
    const data = await (0, api_1.apiCall)("GET", "/api/v1/credits");
    const usage = data.recentUsage ?? [];
    if (usage.length === 0) {
        console.log("No recent usage.");
        return;
    }
    console.log("\n  Recent Usage");
    console.log("  ─────────────────────────");
    for (const u of usage) {
        console.log(`  ${u.feature}  -${u.credits_used} credits  (${u.created_at})`);
    }
    console.log();
});
