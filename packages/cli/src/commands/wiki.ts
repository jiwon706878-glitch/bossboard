import { Command } from "commander";
import { apiCall } from "../api";

export const wikiCommand = new Command("wiki")
  .description("Manage wiki pages (SOPs)");

wikiCommand
  .command("list")
  .description("List all wiki pages")
  .option("--status <status>", "Filter by status (draft, published, archived)")
  .option("--type <type>", "Filter by type (sop, note, policy)")
  .option("--limit <n>", "Max results", "50")
  .action(async (opts: { status?: string; type?: string; limit: string }) => {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.type) params.set("type", opts.type);
    params.set("limit", opts.limit);

    const data = await apiCall("GET", `/api/v1/sops?${params}`);
    const sops = data.sops ?? [];
    if (sops.length === 0) {
      console.log("No wiki pages found.");
      return;
    }
    console.table(sops.map((s: Record<string, unknown>) => ({
      id: (s.id as string).substring(0, 8),
      title: s.title,
      type: s.doc_type || "sop",
      status: s.status,
      updated: s.updated_at,
    })));
  });

wikiCommand
  .command("read <id>")
  .description("Read a wiki page")
  .action(async (id: string) => {
    const data = await apiCall("GET", `/api/v1/sops/${id}`);
    console.log(`\n# ${data.title}\n`);
    console.log(`Type: ${data.doc_type || "sop"}  |  Status: ${data.status}  |  Version: ${data.version}`);
    console.log("---");
    if (data.content_markdown) {
      console.log(data.content_markdown);
    } else {
      console.log(data.summary || "(no content)");
    }
  });

wikiCommand
  .command("create")
  .description("Create a wiki page")
  .requiredOption("--title <title>", "Page title")
  .option("--content <content>", "Page content (plain text or markdown)")
  .option("--type <type>", "Document type (sop, note, policy)")
  .option("--status <status>", "Status (draft, published)")
  .action(async (opts: { title: string; content?: string; type?: string; status?: string }) => {
    const body: Record<string, string> = { title: opts.title };
    if (opts.content) body.content = opts.content;
    if (opts.type) body.type = opts.type;
    if (opts.status) body.status = opts.status;

    const data = await apiCall("POST", "/api/v1/sops", body);
    console.log(`Created: ${data.id}`);
    console.log(`Title: ${data.title}`);
  });

wikiCommand
  .command("update <id>")
  .description("Update a wiki page")
  .option("--title <title>", "New title")
  .option("--content <content>", "New content")
  .option("--status <status>", "New status")
  .action(async (id: string, opts: { title?: string; content?: string; status?: string }) => {
    const body: Record<string, string> = {};
    if (opts.title) body.title = opts.title;
    if (opts.content) body.content = opts.content;
    if (opts.status) body.status = opts.status;

    if (Object.keys(body).length === 0) {
      console.error("Provide at least one field to update (--title, --content, --status).");
      process.exit(1);
    }

    const data = await apiCall("PUT", `/api/v1/sops/${id}`, body);
    console.log(`Updated: ${data.id}`);
    console.log(`Title: ${data.title}  |  Status: ${data.status}`);
  });
