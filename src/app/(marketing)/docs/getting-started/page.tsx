import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Getting Started — BossBoard Docs",
};

export default function GettingStartedPage() {
  return (
    <main className="py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert dark:prose-invert">
        <Link href="/docs" className="text-sm text-primary hover:underline no-underline">
          ← Docs
        </Link>
        <h1>Getting started</h1>
        <p>
          BossBoard is a desktop app. You install it, point it at a folder on
          your machine, add an AI provider key, and create your first agent.
          Total time: about 5 minutes.
        </p>

        <h2>1. Download &amp; install</h2>
        <p>
          Grab the Windows installer from{" "}
          <Link href="/download">/download</Link>. Mac is on a waitlist —
          first 200 signups get 50% off.
        </p>
        <p className="text-sm text-muted-foreground">
          On Windows, SmartScreen may warn the first time you run the
          installer because we&apos;re not yet on a major code-signing
          certificate. Click <em>More info → Run anyway</em>. Code signing is
          tracked in our launch checklist.
        </p>

        <h2>2. Pick a workspace folder</h2>
        <p>
          On first run, the app asks where to put your <code>BossBoard/</code>
          folder. Default is <code>~/Documents/BossBoard/</code>. You can pick
          anywhere — but avoid system folders, OneDrive sync roots, or
          read-only drives.
        </p>
        <p>
          The folder gets four subdirectories: <code>Library/</code> (your
          markdown notes), <code>agents/</code> (one folder per AI agent),
          <code>shared/</code> (multi-agent), <code>private/</code> (agents
          blocked).
        </p>

        <h2>3. Add an AI provider key</h2>
        <p>
          Go to <strong>Settings → AI Providers → Add API key</strong>.
          Cheapest option for trying the app is{" "}
          <strong>Google Gemini Flash</strong> (generous free tier).
        </p>
        <p>
          See <Link href="/docs/byok">BYOK guide</Link> for per-provider
          signup steps.
        </p>

        <h2>4. Create your first agent</h2>
        <p>
          Sidebar → <strong>Agents → New agent</strong>. Pick the{" "}
          <em>Personal Assistant</em> template, name it, optionally tweak the
          manual, then create. The agent shows up in the Agents list and in
          the DM panel.
        </p>

        <h2>5. Open DM</h2>
        <p>
          Press <kbd>Ctrl+Shift+D</kbd> or click the chat icon in the title
          bar. Pick your agent, ask anything. The agent reads its{" "}
          <code>manual.md</code>, its <code>memory.md</code>, and the auto-
          generated <code>BB-System-Reference.md</code> in your Library so it
          knows what BossBoard is and what files it can touch.
        </p>

        <h2>That&apos;s it</h2>
        <p>
          From here, drop notes into Library, build more agents (
          <Link href="/docs/agents">guide</Link>), or wire up an external
          MCP client (<Link href="/docs/mcp">guide</Link>).
        </p>
      </div>
    </main>
  );
}
