import { Command } from "commander";
import { apiCall } from "../api";

export const boardCommand = new Command("board")
  .description("Manage board posts");

boardCommand
  .command("list")
  .description("List recent board posts")
  .option("--limit <n>", "Max results", "20")
  .action(async (opts: { limit: string }) => {
    const data = await apiCall("GET", `/api/v1/board?limit=${opts.limit}`);
    const posts = data.posts ?? [];
    if (posts.length === 0) {
      console.log("No board posts found.");
      return;
    }
    for (const post of posts) {
      console.log(`[${(post.id as string).substring(0, 8)}] ${post.title}`);
      console.log(`  ${(post.content as string).substring(0, 120)}${(post.content as string).length > 120 ? "..." : ""}`);
      console.log(`  -- ${post.created_at}`);
      console.log();
    }
  });

boardCommand
  .command("create")
  .description("Create a board post")
  .requiredOption("--title <title>", "Post title")
  .requiredOption("--content <content>", "Post content")
  .action(async (opts: { title: string; content: string }) => {
    const data = await apiCall("POST", "/api/v1/board", {
      title: opts.title,
      content: opts.content,
    });
    console.log(`Created post: ${data.id}`);
    console.log(`Title: ${data.title}`);
  });
