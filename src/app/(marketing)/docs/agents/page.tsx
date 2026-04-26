import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Building agents — BossBoard Docs",
};

export default function AgentsDocPage() {
  return (
    <main className="py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert dark:prose-invert">
        <Link
          href="/docs"
          className="text-sm text-primary hover:underline no-underline"
        >
          ← Docs
        </Link>
        <h1>Building agents</h1>
        <p>
          An agent is a folder under <code>agents/{`{name}`}/</code> with three
          files:
        </p>
        <ul>
          <li>
            <code>manual.md</code> — the agent&apos;s identity, role, behavior
            rules, and file scope. The system prompt.
          </li>
          <li>
            <code>memory.md</code> — long-term notes the agent maintains across
            sessions. Compressed conversation summaries land here.
          </li>
          <li>
            <code>conversations/active.json</code> — current DM transcript.
            Older transcripts archive automatically.
          </li>
        </ul>

        <h2>Templates</h2>
        <p>
          The 4-step <strong>New agent wizard</strong> ships four starting
          templates:
        </p>
        <ul>
          <li>
            <strong>Personal Assistant</strong> — your daily helper. Reads
            entire workspace, supports the user.
          </li>
          <li>
            <strong>Domain Specialist</strong> — a peer (not an assistant) with
            a specific role like &ldquo;Marketing Lead&rdquo;.
          </li>
          <li>
            <strong>Code Reviewer</strong> — opinionated reviewer with a fixed
            checklist + output format.
          </li>
          <li>
            <strong>Custom (blank)</strong> — start from scratch.
          </li>
        </ul>

        <h2>The manual frontmatter</h2>
        <pre>
          <code>{`---
id: "agent_xyz"
title: "Marketing-Lead"
role: "Marketing Lead"
ai_provider: anthropic
model: claude-sonnet-4-6
ai_key_id: "uuid-of-specific-key"
status: idle
permissions:
  read: ["/Library", "/shared", "/agents/Marketing-Lead"]
  write: ["/agents/Marketing-Lead/workspace"]
---

# Marketing-Lead Manual
...`}</code>
        </pre>

        <h2>BB-System-Reference injection</h2>
        <p>
          On every DM turn, BossBoard prepends an auto-generated{" "}
          <code>/Library/BB-System-Reference.md</code> to the agent&apos;s
          system prompt. The reference covers the workspace tree, the four
          critical rules (search before answering, save outputs systematically,
          respect permissions, communicate in user&apos;s locale), and the
          active agent roster.
        </p>
        <p>
          The reference regenerates whenever you create or delete an agent so
          new agents see existing ones.
        </p>

        <h2>Memory compression</h2>
        <p>
          When a DM thread crosses 30 messages, the DM panel shows a sparkles
          icon you can click to summarize older turns into <code>memory.md</code>.
          The recent 10 messages stay in the active transcript; everything
          else moves to <code>conversations/archive-{`{ts}`}.json</code>.
        </p>

        <h2>Loop guard</h2>
        <p>
          If the same prompt hits the same agent more than 5 times in 5
          minutes, BossBoard refuses to send it. Prevents runaway loops when
          an agent calls itself or when retry logic goes wrong.
        </p>
      </div>
    </main>
  );
}
