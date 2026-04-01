"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy, Check, Key, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-400/10 text-emerald-600",
  POST: "bg-blue-400/10 text-blue-600",
  PUT: "bg-amber-400/10 text-amber-600",
  DELETE: "bg-red-400/10 text-red-600",
};

interface Endpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  curl: string;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST", path: "/api/v1/auth", title: "Verify API Key",
    description: "Check if an API key is valid and return the associated user and business info.",
    curl: `curl -X POST https://mybossboard.com/api/v1/auth \\
  -H "x-api-key: bb_live_abc123..."`,
    response: `{
  "valid": true,
  "user_id": "uuid-...",
  "business_id": "uuid-...",
  "business_name": "Jay's Cafe"
}`,
  },
  {
    method: "GET", path: "/api/v1/context", title: "Get Business Context",
    description: "Returns business info, SOP count, recent documents, and agent notes. Call this first to orient your AI agent.",
    curl: `curl https://mybossboard.com/api/v1/context \\
  -H "x-api-key: bb_live_abc123..."`,
    response: `{
  "business": {
    "name": "Jay's Cafe",
    "type": "cafe",
    "menu_or_services": "Specialty lattes, avocado toast..."
  },
  "stats": { "sop_count": 12, "checklist_count": 5 },
  "recent_docs": [
    { "id": "uuid", "title": "Opening Procedures", "type": "sop", "updated_at": "2026-03-28T..." }
  ],
  "agent_notes": [
    { "content": "Owner prefers concise language", "created_at": "2026-03-29T..." }
  ]
}`,
  },
  {
    method: "POST", path: "/api/v1/context/write", title: "Write Agent Note",
    description: "Save a note to business memory. Useful for AI agents to remember preferences or decisions across sessions.",
    params: [
      { name: "content", type: "string", required: true, description: "Note text (max 2000 chars)" },
    ],
    curl: `curl -X POST https://mybossboard.com/api/v1/context/write \\
  -H "x-api-key: bb_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Owner prefers formal tone for policies"}'`,
    response: `{ "success": true, "id": "uuid-..." }`,
  },
  {
    method: "GET", path: "/api/v1/sops", title: "List Documents",
    description: "List all documents (SOPs, notes, policies) with optional filters.",
    params: [
      { name: "folder", type: "string", required: false, description: "Filter by folder ID" },
      { name: "type", type: "string", required: false, description: "Filter by doc type: sop, note, policy" },
      { name: "status", type: "string", required: false, description: "Filter by status: draft, published" },
      { name: "limit", type: "number", required: false, description: "Max results (default 50)" },
    ],
    curl: `curl "https://mybossboard.com/api/v1/sops?type=sop&status=published&limit=10" \\
  -H "x-api-key: bb_live_abc123..."`,
    response: `{
  "sops": [
    {
      "id": "uuid",
      "title": "Opening Procedures",
      "type": "sop",
      "status": "published",
      "folder_id": "uuid",
      "updated_at": "2026-03-28T10:30:00Z"
    }
  ],
  "total": 1
}`,
  },
  {
    method: "GET", path: "/api/v1/sops/:id", title: "Get Document",
    description: "Get full document content as markdown, including metadata.",
    curl: `curl https://mybossboard.com/api/v1/sops/uuid-of-sop \\
  -H "x-api-key: bb_live_abc123..."`,
    response: `{
  "id": "uuid",
  "title": "Opening Procedures",
  "content_markdown": "# Opening Procedures\\n\\n## Step 1: Unlock...",
  "type": "sop",
  "status": "published",
  "category": "operations",
  "version": 3,
  "updated_at": "2026-03-28T10:30:00Z"
}`,
  },
  {
    method: "POST", path: "/api/v1/sops", title: "Create Document",
    description: "Create a new document. Returns the created document with its ID.",
    params: [
      { name: "title", type: "string", required: true, description: "Document title" },
      { name: "content", type: "object", required: false, description: "TipTap JSON content" },
      { name: "type", type: "string", required: false, description: "sop, note, or policy (default: sop)" },
      { name: "folder_id", type: "string", required: false, description: "Target folder UUID" },
      { name: "status", type: "string", required: false, description: "draft or published (default: draft)" },
    ],
    curl: `curl -X POST https://mybossboard.com/api/v1/sops \\
  -H "x-api-key: bb_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Closing Procedures", "status": "draft"}'`,
    response: `{
  "id": "uuid-new",
  "title": "Closing Procedures",
  "status": "draft",
  "type": "sop",
  "created_at": "2026-04-02T..."
}`,
  },
  {
    method: "PUT", path: "/api/v1/sops/:id", title: "Update Document",
    description: "Update an existing document's title, content, status, type, or folder.",
    params: [
      { name: "title", type: "string", required: false, description: "New title" },
      { name: "content", type: "object", required: false, description: "New TipTap JSON content" },
      { name: "status", type: "string", required: false, description: "draft or published" },
      { name: "type", type: "string", required: false, description: "sop, note, or policy" },
      { name: "folder_id", type: "string", required: false, description: "Move to folder" },
    ],
    curl: `curl -X PUT https://mybossboard.com/api/v1/sops/uuid-of-sop \\
  -H "x-api-key: bb_live_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"status": "published"}'`,
    response: `{
  "id": "uuid-of-sop",
  "title": "Closing Procedures",
  "status": "published",
  "updated_at": "2026-04-02T..."
}`,
  },
  {
    method: "GET", path: "/api/v1/agent-log", title: "Get Activity Log",
    description: "View recent API activity for auditing agent actions.",
    params: [
      { name: "limit", type: "number", required: false, description: "Max entries (default 50)" },
    ],
    curl: `curl "https://mybossboard.com/api/v1/agent-log?limit=10" \\
  -H "x-api-key: bb_live_abc123..."`,
    response: `{
  "logs": [
    {
      "id": "uuid",
      "endpoint": "/api/v1/sops",
      "method": "POST",
      "status_code": 200,
      "created_at": "2026-04-02T14:30:00Z"
    }
  ]
}`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="absolute top-2 right-2 rounded-md border bg-card p-1.5 text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <Badge variant="secondary" className={cn("font-mono text-[10px] px-2 py-0.5 shrink-0", METHOD_COLORS[ep.method])}>{ep.method}</Badge>
        <code className="text-sm font-mono text-muted-foreground flex-1 truncate">{ep.path}</code>
        <span className="text-sm font-medium shrink-0">{ep.title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <CardContent className="border-t pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{ep.description}</p>
          {ep.params && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Parameters</h4>
              <div className="rounded-md border text-sm">
                <div className="flex border-b px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="w-28">Name</span><span className="w-20">Type</span><span className="w-16">Required</span><span className="flex-1">Description</span>
                </div>
                {ep.params.map((p) => (
                  <div key={p.name} className="flex px-3 py-1.5 border-b last:border-0">
                    <code className="w-28 font-mono text-xs">{p.name}</code>
                    <span className="w-20 text-xs text-muted-foreground">{p.type}</span>
                    <span className="w-16 text-xs">{p.required ? "Yes" : "No"}</span>
                    <span className="flex-1 text-xs text-muted-foreground">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Example Request</h4>
            <div className="relative rounded-md bg-muted/50 p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{ep.curl}</pre>
              <CopyButton text={ep.curl} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Example Response</h4>
            <div className="relative rounded-md bg-muted/50 p-3 overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap">{ep.response}</pre>
              <CopyButton text={ep.response} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Reference</h1>
        <p className="text-muted-foreground">Integrate BossBoard with your tools and workflows.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4 text-primary" />Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">All API requests require an <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">x-api-key</code> header. Generate keys in Settings &rarr; Developer Mode &rarr; API Keys.</p>
          <div className="relative rounded-md bg-muted/50 p-3">
            <pre className="text-xs font-mono">curl https://mybossboard.com/api/v1/context \{"\n"}  -H &quot;x-api-key: bb_live_your_key_here&quot;</pre>
            <CopyButton text={'curl https://mybossboard.com/api/v1/context \\\n  -H "x-api-key: bb_live_your_key_here"'} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Endpoints</h2>
        {ENDPOINTS.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border text-sm">
            <div className="flex border-b px-4 py-2 text-xs text-muted-foreground"><span className="w-32">Plan</span><span>Monthly Limit</span></div>
            <div className="flex px-4 py-2 border-b"><span className="w-32">Starter</span><span className="font-mono">1,000 requests</span></div>
            <div className="flex px-4 py-2 border-b"><span className="w-32">Pro</span><span className="font-mono">10,000 requests</span></div>
            <div className="flex px-4 py-2"><span className="w-32">Business</span><span className="font-mono">100,000 requests</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
