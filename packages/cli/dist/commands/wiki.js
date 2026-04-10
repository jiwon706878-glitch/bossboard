"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wikiCommand = void 0;
const commander_1 = require("commander");
const api_1 = require("../api");
exports.wikiCommand = new commander_1.Command("wiki")
    .description("Manage wiki pages (SOPs)");
exports.wikiCommand
    .command("list")
    .description("List all wiki pages")
    .option("--status <status>", "Filter by status (draft, published, archived)")
    .option("--type <type>", "Filter by type (sop, note, policy)")
    .option("--limit <n>", "Max results", "50")
    .action(async (opts) => {
    const params = new URLSearchParams();
    if (opts.status)
        params.set("status", opts.status);
    if (opts.type)
        params.set("type", opts.type);
    params.set("limit", opts.limit);
    const data = await (0, api_1.apiCall)("GET", `/api/v1/sops?${params}`);
    const sops = data.sops ?? [];
    if (sops.length === 0) {
        console.log("No wiki pages found.");
        return;
    }
    console.table(sops.map((s) => ({
        id: s.id.substring(0, 8),
        title: s.title,
        type: s.doc_type || "sop",
        status: s.status,
        updated: s.updated_at,
    })));
});
exports.wikiCommand
    .command("read <id>")
    .description("Read a wiki page")
    .action(async (id) => {
    const data = await (0, api_1.apiCall)("GET", `/api/v1/sops/${id}`);
    console.log(`\n# ${data.title}\n`);
    console.log(`Type: ${data.doc_type || "sop"}  |  Status: ${data.status}  |  Version: ${data.version}`);
    console.log("---");
    if (data.content_markdown) {
        console.log(data.content_markdown);
    }
    else {
        console.log(data.summary || "(no content)");
    }
});
exports.wikiCommand
    .command("create")
    .description("Create a wiki page")
    .requiredOption("--title <title>", "Page title")
    .option("--content <content>", "Page content (plain text or markdown)")
    .option("--type <type>", "Document type (sop, note, policy)")
    .option("--status <status>", "Status (draft, published)")
    .action(async (opts) => {
    const body = { title: opts.title };
    if (opts.content)
        body.content = opts.content;
    if (opts.type)
        body.type = opts.type;
    if (opts.status)
        body.status = opts.status;
    const data = await (0, api_1.apiCall)("POST", "/api/v1/sops", body);
    console.log(`Created: ${data.id}`);
    console.log(`Title: ${data.title}`);
});
exports.wikiCommand
    .command("update <id>")
    .description("Update a wiki page")
    .option("--title <title>", "New title")
    .option("--content <content>", "New content")
    .option("--status <status>", "New status")
    .action(async (id, opts) => {
    const body = {};
    if (opts.title)
        body.title = opts.title;
    if (opts.content)
        body.content = opts.content;
    if (opts.status)
        body.status = opts.status;
    if (Object.keys(body).length === 0) {
        console.error("Provide at least one field to update (--title, --content, --status).");
        process.exit(1);
    }
    const data = await (0, api_1.apiCall)("PUT", `/api/v1/sops/${id}`, body);
    console.log(`Updated: ${data.id}`);
    console.log(`Title: ${data.title}  |  Status: ${data.status}`);
});
