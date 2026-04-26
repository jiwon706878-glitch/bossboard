import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MCP — BossBoard Docs",
};

export default function McpDocPage() {
  return (
    <main className="py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert dark:prose-invert">
        <Link
          href="/docs"
          className="text-sm text-primary hover:underline no-underline"
        >
          ← Docs
        </Link>
        <h1>MCP integration</h1>
        <p>
          BossBoard runs an embedded{" "}
          <a
            href="https://modelcontextprotocol.io/"
            target="_blank"
            rel="noreferrer"
          >
            Model Context Protocol
          </a>{" "}
          server on <code>localhost:39001</code> while the desktop app is open.
          External tools (Claude Code, Cursor, your own scripts) can read from
          and write to your workspace through this server.
        </p>

        <h2>Authentication</h2>
        <p>
          Every request needs a bearer token. BossBoard issues one per session;
          find it in <strong>Settings → Integrations → MCP token</strong>{" "}
          (coming with the v3.1 MCP client surface). For now, query{" "}
          <code>get_mcp_info</code> from the Tauri command shell.
        </p>
        <pre>
          <code>{`curl -H "Authorization: Bearer bb_<your-token>" \\
  http://localhost:39001/`}</code>
        </pre>

        <h2>Available endpoints (v3.0)</h2>
        <ul>
          <li>
            <code>GET /health</code> — unauthenticated, returns &ldquo;ok&rdquo;.
            Use it for liveness checks.
          </li>
          <li>
            <code>GET /</code> — server info: name, version, capabilities.
          </li>
        </ul>

        <h2>Coming in v3.1</h2>
        <ul>
          <li>
            <code>tools/list</code> — full MCP tools list. Includes{" "}
            <code>library_search</code>, <code>library_read</code>,{" "}
            <code>library_write</code>, <code>agent_dm</code>,{" "}
            <code>board_post</code>.
          </li>
          <li>
            <code>tools/call</code> — invoke a tool. Path-traversal validated
            via the existing Rust <code>validate_path_within_workspace</code>
            helper so external tools can&apos;t escape the workspace.
          </li>
          <li>
            <code>resources/list</code> — enumerate Library files as MCP
            resources.
          </li>
          <li>
            Search results capped at top-5 / 10K chars total to prevent
            token bombs.
          </li>
        </ul>

        <h2>Connecting Claude Code</h2>
        <p>
          v3.1 will ship a one-click profile that adds BossBoard as an MCP
          server in Claude Code&apos;s config:
        </p>
        <pre>
          <code>{`{
  "mcpServers": {
    "bossboard": {
      "url": "http://localhost:39001",
      "headers": {
        "Authorization": "Bearer bb_..."
      }
    }
  }
}`}</code>
        </pre>
        <p>
          Until then, you can prototype by hitting <code>/health</code> and{" "}
          <code>/</code> directly.
        </p>
      </div>
    </main>
  );
}
