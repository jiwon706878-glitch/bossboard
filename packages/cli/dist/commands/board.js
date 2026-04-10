"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardCommand = void 0;
const commander_1 = require("commander");
const api_1 = require("../api");
exports.boardCommand = new commander_1.Command("board")
    .description("Manage board posts");
exports.boardCommand
    .command("list")
    .description("List recent board posts")
    .option("--limit <n>", "Max results", "20")
    .action(async (opts) => {
    const data = await (0, api_1.apiCall)("GET", `/api/v1/board?limit=${opts.limit}`);
    const posts = data.posts ?? [];
    if (posts.length === 0) {
        console.log("No board posts found.");
        return;
    }
    for (const post of posts) {
        console.log(`[${post.id.substring(0, 8)}] ${post.title}`);
        console.log(`  ${post.content.substring(0, 120)}${post.content.length > 120 ? "..." : ""}`);
        console.log(`  -- ${post.created_at}`);
        console.log();
    }
});
exports.boardCommand
    .command("create")
    .description("Create a board post")
    .requiredOption("--title <title>", "Post title")
    .requiredOption("--content <content>", "Post content")
    .action(async (opts) => {
    const data = await (0, api_1.apiCall)("POST", "/api/v1/board", {
        title: opts.title,
        content: opts.content,
    });
    console.log(`Created post: ${data.id}`);
    console.log(`Title: ${data.title}`);
});
