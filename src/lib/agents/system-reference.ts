import { writeFile } from "@/lib/tauri/fs";
import { stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";
import { listAgents, workspaceRoot } from "@/lib/agents/service";

interface UserInfo {
  email?: string;
  locale?: string;
  timezone?: string;
}

function readUserInfo(): UserInfo {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return {};
  return {
    email: localStorage.getItem("bb_user_email") ?? undefined,
    locale: navigator?.language ?? "en",
    timezone:
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined,
  };
}

/**
 * Writes /Library/BB-System-Reference.md and /Library/Welcome.md based on the
 * current workspace state. Idempotent — safe to call from workspace init,
 * agent create / delete, and locale change. Failures are swallowed so a
 * missing /Library doesn't break the calling flow.
 */
export async function generateSystemReference(): Promise<void> {
  try {
    const workspace = workspaceRoot();
    if (!workspace) return;

    const agents = await listAgents().catch(() => []);
    const user = readUserInfo();

    const refContent = `BossBoard runtime reference — auto-generated. Do not edit by hand.

This file is regenerated whenever you create / delete an agent or change locale.
AI agents in this workspace should consume this file as part of their system prompt
so they understand the runtime they live in.

## What is BossBoard

BossBoard is a local-first AI workspace where humans collaborate with AI agents.

- **Local-first**: All workspace files live on the user's machine under \`${workspace}/\`.
- **BYOK**: Users bring their own API keys (Anthropic, Google, OpenAI, xAI, local Ollama).
- **MCP-native**: Open standard for tool interoperability (port 39001 by default).
- **Privacy-respecting**: User content never leaves the machine without explicit action.

## Workspace structure

\`\`\`
${workspace}/
├── Library/              # User's knowledge base (markdown + frontmatter)
├── agents/
│   └── {agent-name}/
│       ├── manual.md     # Behavior rules, role definition
│       ├── memory.md     # Long-term memory summary (compressed conversations)
│       ├── conversations/  # active.json + archive-{ts}.json
│       └── workspace/    # Agent's working files
├── shared/               # Multi-agent shared workspace
├── private/              # User-only, agents blocked
└── .bb/                  # Hidden: backups, trash, sync-state
\`\`\`

## Critical rules for agents

### Rule 1: Search before answering

For any factual question about the user's projects, decisions, or notes:
- Read from \`/Library/\` first using your file-read capability.
- Never answer from training-time memory alone for user-specific facts.
- If you don't find it, say "I couldn't find that in your library."

### Rule 2: Save outputs systematically

- Working drafts → \`/agents/{your-name}/workspace/\`
- Polished, finished outputs → propose to user before writing to \`/Library/\`
- Conversations are stored in \`/agents/{your-name}/conversations/active.json\`
- Memory updates go to \`/agents/{your-name}/memory.md\`

### Rule 3: Respect permissions

- Read access: \`/Library/\`, \`/shared/\`, your own \`/agents/{your-name}/\` folder.
- Write access: ONLY your own \`/agents/{your-name}/workspace/\` and \`memory.md\` by default.
- Never write to other agents' folders.
- Never read or write \`/private/\`.

### Rule 4: Communicate clearly

- Default response language: ${user.locale ?? "en"}
- Match the user's tone (formal / casual)
- Always cite sources when using library content

## User context

- Email: ${user.email ?? "—"}
- Locale: ${user.locale ?? "en"}
- Timezone: ${user.timezone ?? "UTC"}

## Active agents in this workspace (${agents.length})

${agents.length === 0
        ? "_No agents yet. Create one from the Agents page._"
        : agents
          .map(
            (a) => `- **${a.name}** (${a.role ?? "general"}): ${a.description ?? "—"}`,
          )
          .join("\n")
      }

## Tips for growth

- Update \`memory.md\` after each session with new learnings.
- Review past conversations in \`/agents/{your-name}/conversations/\`.
- Check \`/Library/\` for new context the user has added.

---

_Last updated: ${new Date().toISOString()}_
_Auto-regenerated on workspace startup, agent create / delete, and locale change._
`;

    const refPath = `${workspace}/Library/BB-System-Reference.md`;
    const refFm = {
      id: "bb_system_reference",
      title: "BB-System-Reference",
      tags: ["system", "auto-generated"],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    await writeFile(refPath, stringifyMarkdown(refFm as never, refContent));

    const welcomeContent = `Welcome to BossBoard. This is your AI workspace.

## What's here

- **Library** — your knowledge base. Anything you put here is searchable, and your agents can read it.
- **Agents** — AI teammates with their own manuals (behavior) and memory (long-term context).
- **DM** — chat with any agent privately (Ctrl+Shift+D).
- **Meetings** — multi-agent discussions on a topic.
- **Calendar** — project schedules. (Use Google or Apple Calendar for personal events.)

## Quick start

1. **Add an AI key** — Settings → AI Providers → Add API key. Google Gemini Flash is the cheapest.
2. **Create your first agent** — Agents → New Agent → pick a template.
3. **Drop notes into Library** — markdown files, your agents can read and search them.
4. **Open DM** — Ctrl+Shift+D, pick your agent, ask anything.

## Tips

- The more detail you put in an agent's manual, the better its responses.
- Tag your library files (\`tags: [marketing, q3]\`) — helps both you and your agents search.
- Deleted files go to \`.bb/trash/\` — recoverable for 30 days.
- Your data stays on this PC. Cloud sync for DMs is opt-in (Pro plan).

---

_This file regenerates when you change locale or add agents — feel free to edit it._
_Last updated: ${new Date().toISOString()}_
`;

    const welcomePath = `${workspace}/Library/Welcome.md`;
    const welcomeFm = {
      id: generateId(),
      title: "Welcome to BossBoard",
      tags: ["onboarding"],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
    await writeFile(welcomePath, stringifyMarkdown(welcomeFm as never, welcomeContent));
  } catch (e) {
    console.warn("generateSystemReference failed:", e);
  }
}
