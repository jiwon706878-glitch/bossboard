"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Copy, Check, Plug, Lightbulb, Terminal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="absolute top-2 right-2 rounded-md border bg-card p-1.5 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-md bg-muted/50 p-3 overflow-x-auto">
      <pre className="text-xs font-mono whitespace-pre-wrap">{code}</pre>
      <CopyButton text={code} />
    </div>
  );
}

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "bossboard": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://mybossboard.com/api/mcp"],
      "env": {
        "API_KEY": "bb_live_your_key_here"
      }
    }
  }
}`;

const CURSOR_CONFIG = `{
  "mcpServers": {
    "bossboard": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-remote", "https://mybossboard.com/api/mcp"],
      "env": {
        "API_KEY": "bb_live_your_key_here"
      }
    }
  }
}`;

const PYTHON_EXAMPLE = `import requests

API_KEY = "bb_live_your_key_here"
BASE_URL = "https://mybossboard.com/api/v1"
HEADERS = {"x-api-key": API_KEY}

# Get business context
context = requests.get(f"{BASE_URL}/context", headers=HEADERS).json()
print(f"Business: {context['business']['name']}")
print(f"SOPs: {context['stats']['sop_count']}")

# List published documents
docs = requests.get(
    f"{BASE_URL}/sops?status=published&limit=5",
    headers=HEADERS
).json()
for doc in docs["sops"]:
    print(f"  - {doc['title']} ({doc['type']})")

# Get a specific document
if docs["sops"]:
    sop = requests.get(
        f"{BASE_URL}/sops/{docs['sops'][0]['id']}",
        headers=HEADERS
    ).json()
    print(f"\\nContent of '{sop['title']}':")
    print(sop["content_markdown"][:200])

# Create a new document
new_doc = requests.post(
    f"{BASE_URL}/sops",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={"title": "New SOP from Python", "status": "draft"}
).json()
print(f"\\nCreated: {new_doc['id']}")

# Write an agent note
requests.post(
    f"{BASE_URL}/context/write",
    headers={**HEADERS, "Content-Type": "application/json"},
    json={"content": "Automated check completed at " + __import__("datetime").datetime.now().isoformat()}
)`;

const MCP_TOOLS = [
  { name: "bossboard_get_context", desc: "Get business info, SOP count, recent docs, and agent notes" },
  { name: "bossboard_list_sops", desc: "List documents with optional filters (folder, type, status, limit)" },
  { name: "bossboard_get_sop", desc: "Read full document content as markdown" },
  { name: "bossboard_create_sop", desc: "Create a new document (SOP, note, or policy)" },
  { name: "bossboard_update_sop", desc: "Update an existing document's title, content, or status" },
  { name: "bossboard_write_note", desc: "Save a note to business memory for cross-session persistence" },
  { name: "bossboard_search", desc: "Search documents by keyword, optionally with AI-powered answer" },
];

const TABS = ["Claude Desktop", "Cursor / Windsurf", "Python / Other"] as const;

export default function McpGuidePage() {
  const [activeTab, setActiveTab] = useState<string>("Claude Desktop");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MCP Connection Guide</h1>
        <p className="text-muted-foreground">Connect your AI tools to BossBoard using the Model Context Protocol.</p>
      </div>

      {/* What is MCP? */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plug className="h-4 w-4 text-primary" />What is MCP?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Model Context Protocol (MCP) lets AI tools like Claude Desktop, Cursor, and Windsurf directly access your BossBoard data.
            Your AI can read documents, create SOPs, and search your wiki — all through a secure, authenticated connection.
          </p>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Setup</h2>

        {/* Step 1 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
              <div>
                <h3 className="text-sm font-medium">Get your API key</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Go to <Link href="/dashboard/settings" className="text-primary hover:underline">Settings</Link> &rarr; Developer Mode &rarr; API Keys and create a new key.
                  Copy the key — you&apos;ll need it in the next step.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
              <div>
                <h3 className="text-sm font-medium">Configure your AI tool</h3>
                <p className="mt-1 text-sm text-muted-foreground">Add BossBoard as an MCP server in your tool&apos;s settings.</p>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex rounded-lg bg-muted p-1 gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Claude Desktop" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Open Claude Desktop &rarr; Settings &rarr; Developer &rarr; Edit Config. Add this to your <code className="rounded bg-muted px-1 text-[10px] font-mono">claude_desktop_config.json</code>:
                </p>
                <CodeBlock code={CLAUDE_CONFIG} />
                <p className="text-xs text-muted-foreground">Replace <code className="rounded bg-muted px-1 text-[10px] font-mono">bb_live_your_key_here</code> with your actual API key. Restart Claude Desktop.</p>
              </div>
            )}

            {activeTab === "Cursor / Windsurf" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Create <code className="rounded bg-muted px-1 text-[10px] font-mono">.cursor/mcp.json</code> in your project root (or <code className="rounded bg-muted px-1 text-[10px] font-mono">~/.cursor/mcp.json</code> for global):
                </p>
                <CodeBlock code={CURSOR_CONFIG} />
                <p className="text-xs text-muted-foreground">For Windsurf, use the same config format in your MCP settings.</p>
              </div>
            )}

            {activeTab === "Python / Other" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Use the REST API directly. The MCP endpoint is at <code className="rounded bg-muted px-1 text-[10px] font-mono">https://mybossboard.com/api/mcp</code> (JSON-RPC),
                  or use the v1 REST endpoints:
                </p>
                <CodeBlock code={PYTHON_EXAMPLE} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
              <div>
                <h3 className="text-sm font-medium">Test the connection</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask your AI: <span className="italic">&quot;What documents are in my BossBoard?&quot;</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check <Link href="/dashboard/agent-activity" className="text-primary hover:underline">Agent Activity</Link> to see if the request came through.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Tools */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Terminal className="h-5 w-5 text-primary" />Available MCP Tools</h2>
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {MCP_TOOLS.map((tool) => (
                <div key={tool.name} className="flex items-start gap-3">
                  <code className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">{tool.name}</code>
                  <span className="text-sm text-muted-foreground">{tool.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-500" />Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Call <code className="rounded bg-muted px-1 text-[10px] font-mono">bossboard_get_context</code> first to orient your AI with business info and recent docs.</li>
            <li>Use <code className="rounded bg-muted px-1 text-[10px] font-mono">bossboard_write_note</code> to save important decisions or preferences that should persist across sessions.</li>
            <li>Search before creating — check if a similar document already exists with <code className="rounded bg-muted px-1 text-[10px] font-mono">bossboard_search</code>.</li>
            <li>Create documents as &quot;draft&quot; first, then update to &quot;published&quot; after review.</li>
            <li>Monitor agent actions in <Link href="/dashboard/agent-activity" className="text-primary hover:underline">Agent Activity</Link> to audit what your AI tools are doing.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
