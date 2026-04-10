import { Command } from "commander";
import { apiCall } from "../api";

export const todoCommand = new Command("todo")
  .description("Manage todos");

todoCommand
  .command("list")
  .description("List todos")
  .option("--all", "Include completed todos")
  .option("--done", "Show only completed todos")
  .option("--limit <n>", "Max results", "50")
  .action(async (opts: { all?: boolean; done?: boolean; limit: string }) => {
    const params = new URLSearchParams({ limit: opts.limit });
    if (opts.done) params.set("completed", "true");
    else if (!opts.all) params.set("completed", "false");

    const data = await apiCall("GET", `/api/v1/todos?${params}`);
    const todos = data.todos ?? [];
    if (todos.length === 0) {
      console.log("No todos found.");
      return;
    }
    for (const t of todos) {
      const check = t.completed ? "[x]" : "[ ]";
      const due = t.due_date ? ` (due: ${t.due_date})` : "";
      console.log(`${check} ${t.text}${due}  [${(t.id as string).substring(0, 8)}]`);
    }
  });

todoCommand
  .command("add <text>")
  .description("Add a new todo")
  .option("--due <date>", "Due date (YYYY-MM-DD)")
  .option("--priority <n>", "Priority (0-3)", "0")
  .action(async (text: string, opts: { due?: string; priority: string }) => {
    const body: Record<string, unknown> = { text };
    if (opts.due) body.due_date = opts.due;
    body.priority = parseInt(opts.priority);

    const data = await apiCall("POST", "/api/v1/todos", body);
    console.log(`Added: ${data.text}  [${data.id}]`);
  });

todoCommand
  .command("done <id>")
  .description("Mark a todo as completed")
  .action(async (id: string) => {
    const data = await apiCall("PATCH", `/api/v1/todos/${id}`, { completed: true });
    console.log(`Completed: ${data.text}`);
  });

todoCommand
  .command("undo <id>")
  .description("Mark a todo as not completed")
  .action(async (id: string) => {
    const data = await apiCall("PATCH", `/api/v1/todos/${id}`, { completed: false });
    console.log(`Reopened: ${data.text}`);
  });

todoCommand
  .command("rm <id>")
  .description("Delete a todo")
  .action(async (id: string) => {
    await apiCall("DELETE", `/api/v1/todos/${id}`);
    console.log("Deleted.");
  });
