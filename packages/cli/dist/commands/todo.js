"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todoCommand = void 0;
const commander_1 = require("commander");
const api_1 = require("../api");
exports.todoCommand = new commander_1.Command("todo")
    .description("Manage todos");
exports.todoCommand
    .command("list")
    .description("List todos")
    .option("--all", "Include completed todos")
    .option("--done", "Show only completed todos")
    .option("--limit <n>", "Max results", "50")
    .action(async (opts) => {
    const params = new URLSearchParams({ limit: opts.limit });
    if (opts.done)
        params.set("completed", "true");
    else if (!opts.all)
        params.set("completed", "false");
    const data = await (0, api_1.apiCall)("GET", `/api/v1/todos?${params}`);
    const todos = data.todos ?? [];
    if (todos.length === 0) {
        console.log("No todos found.");
        return;
    }
    for (const t of todos) {
        const check = t.completed ? "[x]" : "[ ]";
        const due = t.due_date ? ` (due: ${t.due_date})` : "";
        console.log(`${check} ${t.text}${due}  [${t.id.substring(0, 8)}]`);
    }
});
exports.todoCommand
    .command("add <text>")
    .description("Add a new todo")
    .option("--due <date>", "Due date (YYYY-MM-DD)")
    .option("--priority <n>", "Priority (0-3)", "0")
    .action(async (text, opts) => {
    const body = { text };
    if (opts.due)
        body.due_date = opts.due;
    body.priority = parseInt(opts.priority);
    const data = await (0, api_1.apiCall)("POST", "/api/v1/todos", body);
    console.log(`Added: ${data.text}  [${data.id}]`);
});
exports.todoCommand
    .command("done <id>")
    .description("Mark a todo as completed")
    .action(async (id) => {
    const data = await (0, api_1.apiCall)("PATCH", `/api/v1/todos/${id}`, { completed: true });
    console.log(`Completed: ${data.text}`);
});
exports.todoCommand
    .command("undo <id>")
    .description("Mark a todo as not completed")
    .action(async (id) => {
    const data = await (0, api_1.apiCall)("PATCH", `/api/v1/todos/${id}`, { completed: false });
    console.log(`Reopened: ${data.text}`);
});
exports.todoCommand
    .command("rm <id>")
    .description("Delete a todo")
    .action(async (id) => {
    await (0, api_1.apiCall)("DELETE", `/api/v1/todos/${id}`);
    console.log("Deleted.");
});
