import { Command } from "commander";
import { apiCall } from "../api";

export const searchCommand = new Command("search")
  .description("Search across wiki, board, and todos")
  .argument("<query>", "Search query")
  .option("--limit <n>", "Max results per category", "10")
  .action(async (query: string, opts: { limit: string }) => {
    const params = new URLSearchParams({ q: query, limit: opts.limit });
    const data = await apiCall("GET", `/api/v1/search?${params}`);

    const sops = data.sops ?? [];
    const posts = data.posts ?? [];
    const todos = data.todos ?? [];

    if (sops.length === 0 && posts.length === 0 && todos.length === 0) {
      console.log(`No results for "${query}".`);
      return;
    }

    if (sops.length > 0) {
      console.log(`\n--- Wiki (${sops.length}) ---`);
      for (const s of sops) {
        console.log(`  [${(s.id as string).substring(0, 8)}] ${s.title} (${s.status})`);
      }
    }

    if (posts.length > 0) {
      console.log(`\n--- Board (${posts.length}) ---`);
      for (const p of posts) {
        console.log(`  [${(p.id as string).substring(0, 8)}] ${p.title}`);
      }
    }

    if (todos.length > 0) {
      console.log(`\n--- Todos (${todos.length}) ---`);
      for (const t of todos) {
        const check = t.completed ? "[x]" : "[ ]";
        console.log(`  ${check} ${t.text}  [${(t.id as string).substring(0, 8)}]`);
      }
    }

    console.log();
  });
