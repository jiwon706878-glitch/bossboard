# BB v3.0 Week 4: Final Features + Polish

Read CLAUDE.md first.

**Goal:** Complete all remaining features for beta launch. Apply Week 3 testing feedback. Final QA.

**Time estimate:** 6-8 hours.

---

## Pre-flight

Verify Week 3 commit exists. Verify these work:
- Login → Dashboard
- Library file CRUD
- Agent creation + DM with Gemini

---

## Task Group 1: Week 3 Testing Feedback (Critical UX Fixes)

### 1.1: DM as Telegram-style side panel (NOT separate page)

Replace `/desktop/dm/[agent]/page.tsx` with a side-panel approach.

**Architecture:**
- DM is a slide-in panel from the right (like Telegram)
- Available from anywhere via top bar 💬 icon or sidebar DM link
- When opened, persists as user navigates between Library/Board/etc.
- Selected agent conversation stays loaded

Create `src/components/desktop/dm-panel.tsx` (full implementation, replacing Week 3 placeholder):

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { X, Send, ArrowLeft } from "lucide-react";
import { Avatar } from "./avatar";
import { listAgents, type Agent } from "@/lib/agents/service";
import { executeDMTurn } from "@/lib/agents/execute";
import { writeFile, readFile, fileExists } from "@/lib/tauri/fs";

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export function DMPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedAgent) {
      setMessages([]);
      return;
    }
    (async () => {
      const path = `${localStorage.getItem("bb_workspace_path")}/agents/${selectedAgent}/conversations/active.json`;
      try {
        if (await fileExists(path)) {
          const raw = await readFile(path);
          setMessages(JSON.parse(raw));
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    })();
  }, [selectedAgent]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending || !selectedAgent) return;
    const userMsg: Message = { role: "user", content: input, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem("bb_api_key_google") || localStorage.getItem("bb_api_key_anthropic") || "";
      if (!apiKey) throw new Error("No API key. Add one in Settings.");
      
      const response = await executeDMTurn(selectedAgent, input, apiKey);
      const agentMsg: Message = { role: "agent", content: response, timestamp: new Date().toISOString() };
      const updated = [...newMessages, agentMsg];
      setMessages(updated);
      
      const path = `${localStorage.getItem("bb_workspace_path")}/agents/${selectedAgent}/conversations/active.json`;
      await writeFile(path, JSON.stringify(updated, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed top-12 right-0 h-[calc(100vh-3rem)] w-96 bg-bb-card border-l border-bb-border z-40 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-bb-border">
        {selectedAgent && (
          <button onClick={() => setSelectedAgent(null)} className="p-1 hover:bg-bb-bg rounded">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <h2 className="flex-1 font-semibold text-sm">
          {selectedAgent || "Direct Messages"}
        </h2>
        <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!selectedAgent ? (
        // Agent list
        <div className="flex-1 overflow-auto">
          {agents.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No agents yet. Create one in /agents.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {agents.map(agent => (
                <button
                  key={agent.name}
                  onClick={() => setSelectedAgent(agent.name)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-bb-bg rounded text-left"
                >
                  <Avatar displayName={agent.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{agent.name}</div>
                    <div className="text-xs text-gray-500 truncate">{agent.role || "Agent"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-bb-border">
            <button
              onClick={() => alert("Feedback to BB team — coming soon")}
              className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
            >
              📨 Send Feedback to BossBoard team
            </button>
          </div>
        </div>
      ) : (
        // Conversation
        <>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-gray-500 mt-12">
                Start a conversation with {selectedAgent}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-bb-primary text-white rounded-br-sm"
                    : "bg-bb-bg text-gray-100 rounded-bl-sm border border-bb-border"
                }`}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-900/20 border-t border-red-800 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div className="border-t border-bb-border p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={`Message ${selectedAgent}...`}
                disabled={sending}
                className="flex-1 px-3 py-2 bg-bb-bg border border-bb-border rounded-lg text-sm focus:outline-none focus:border-bb-primary"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="px-3 bg-bb-primary hover:bg-bb-primary-hover rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

Wire DMPanel into `src/app/desktop/layout.tsx` so it's globally available, with state controlled by titlebar button.

Remove standalone `/desktop/dm/[agent]/page.tsx` (or convert to redirect to home with panel auto-opened).

### 1.2: Move sidebar collapse button to top bar (left side)

In `src/components/desktop/titlebar.tsx`, add collapse button at the very left:

```tsx
import { PanelLeftClose, PanelLeft } from "lucide-react";

const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

useEffect(() => {
  setSidebarCollapsed(localStorage.getItem("bb_sidebar_collapsed") === "true");
}, []);

function toggleSidebar() {
  const next = !sidebarCollapsed;
  setSidebarCollapsed(next);
  localStorage.setItem("bb_sidebar_collapsed", String(next));
  // Notify sidebar via custom event
  window.dispatchEvent(new CustomEvent("bb-sidebar-toggle", { detail: { collapsed: next } }));
}

// In JSX, before back/forward buttons:
<button
  onClick={toggleSidebar}
  className="p-2 hover:bg-bb-card rounded"
  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
>
  {sidebarCollapsed ? <PanelLeft className="w-4 h-4 text-gray-400" /> : <PanelLeftClose className="w-4 h-4 text-gray-400" />}
</button>
```

In `sidebar.tsx`, listen for the event:

```tsx
useEffect(() => {
  const handler = (e: CustomEvent) => setCollapsed(e.detail.collapsed);
  window.addEventListener("bb-sidebar-toggle", handler as EventListener);
  return () => window.removeEventListener("bb-sidebar-toggle", handler as EventListener);
}, []);
```

Remove the collapse button from sidebar bottom (it's in titlebar now).

### 1.3: Light mode text visibility fix

In `src/app/globals.css`, ensure light mode has sufficient contrast:

```css
html.light {
  --color-bb-bg: #f8f8f8;
  --color-bb-fg: #1a1a1a;
  --color-bb-card: #ffffff;
  --color-bb-border: #e5e5e5;
  --color-bb-primary: #4A6CF7;
  --color-bb-primary-hover: #5b7bf8;
}

html.light body {
  background-color: var(--color-bb-bg);
  color: var(--color-bb-fg);
}

/* Ensure all text classes work in both modes */
html.light .text-gray-400 { color: #6b7280; }
html.light .text-gray-500 { color: #4b5563; }
html.light .text-white { color: #1a1a1a; }
html.dark .text-white { color: #ffffff; }
```

Audit titlebar.tsx, sidebar.tsx, dm-panel.tsx, library pages — replace hardcoded `text-white` with `text-bb-fg` where it should adapt to theme.

### 1.4: Create Agent form — remove placeholder examples

In the agent creation modal/page, change:

```tsx
// Bad (current):
<input placeholder="e.g., Marketing Lead, Code Reviewer..." />

// Good:
<input placeholder="Agent name" />
<input placeholder="Role" />
```

Allow name === role (no validation against same-string).

### 1.5: Add "Domain Specialist" template + fix Personal Assistant persona

In `src/lib/agents/service.ts`, update TEMPLATES:

```typescript
const TEMPLATES = {
  "personal-assistant": `# {{name}}

## Identity
I am {{name}}, a personal assistant for the user.
I have read access to the entire workspace and help track tasks across all projects.

## Behavior
- I am the user's assistant — I help them
- I track open tasks and recommend specialist agents when needed
- I do not pretend to be a team member; I support the user

## Files I work with
- /Library/ (read all)
- /shared/ (read all)
- /agents/{{name}}/workspace/ (write)
`,

  "domain-specialist": `# {{name}}

## Identity
I am {{name}}, the {{role}} for this team.
I work alongside the user as a team member, NOT as their assistant.

## Behavior
- I am a domain specialist — I have my own role
- I do my own work in my workspace
- I collaborate with the user and other agents
- When asked who I am, I describe my role on the team, not as an assistant

## Example responses
User: "Who are you?"
Me: "I'm {{name}}, the {{role}} on this team. I focus on [domain]. How can I help with your work?"

## Files I work with
- /Library/ (read)
- /shared/ (read + write)
- /agents/{{name}}/workspace/ (write)
`,

  "code-reviewer": `# {{name}}

## Identity
I am {{name}}, a code review specialist.

## Expertise
- Code quality, bugs, performance, security
- Best practices and patterns
- Refactoring suggestions

## Behavior
- Direct and focused on code
- I cite specific lines and reasons
- I suggest concrete improvements

## Files I work with
- /shared/code/ (read)
- /agents/{{name}}/workspace/ (write reviews)
`,

  "blank": `# {{name}}

## Identity
{{role}}

## Behavior
(Edit this file to define how this agent behaves.)
`,
};
```

In `createAgent`, use the template based on user choice in UI.

### 1.6: Polish DM message bubbles

Already included in 1.1 (Telegram-style with rounded corners + tails). Verify it renders correctly in both light/dark modes.

---

## Task Group 2: Board (Channels)

### 2.1: Board database schema (Supabase)

Already exists in v2.6 schema. Verify these tables work:

```sql
-- Verify or create:
create table if not exists public.board_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text not null default 'general', -- general, team, agent_activity, announcements
  created_at timestamptz default now()
);

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  channel_id uuid references board_channels not null,
  agent_name text, -- null if posted by user
  content text not null,
  created_at timestamptz default now()
);

alter table board_channels enable row level security;
alter table board_posts enable row level security;

create policy "users own channels" on board_channels for all using (auth.uid() = user_id);
create policy "users own posts" on board_posts for all using (auth.uid() = user_id);
```

Skip if tables already exist from v2.6 — note it in reporting.

### 2.2: Board page

Create `src/app/desktop/board/page.tsx`:

- Channel list on left (General, Team, Agent Activity, Announcements + custom)
- Posts feed on right
- "New post" button at top
- Each post: avatar (user or agent), content, timestamp
- Filter by channel
- Real-time updates via Supabase Realtime

Implementation pattern follows v2.6 board logic but uses Tauri DM panel for "Reply via DM" actions.

### 2.3: Auto-post agent activity

When `executeDMTurn` runs, post a summary to "Agent Activity" channel:

```typescript
// In executeDMTurn after getting response:
await postToBoard({
  channel: "agent_activity",
  agent_name: agentName,
  content: `Responded to user: "${userMessage.slice(0, 80)}..."`,
});
```

---

## Task Group 3: Calendar

### 3.1: Calendar schema (Supabase)

```sql
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  all_day boolean default false,
  agent_assignees text[], -- agent names
  created_at timestamptz default now()
);

alter table calendar_events enable row level security;
create policy "users own events" on calendar_events for all using (auth.uid() = user_id);
```

### 3.2: Calendar page

Create `src/app/desktop/calendar/page.tsx`:

- Month grid view (default)
- Week / Day view toggle
- Click day → modal to create event
- Click event → edit/delete
- Sidebar shows upcoming events

Use `react-big-calendar` or build simple calendar grid.

### 3.3: .ics export

Add export button:

```typescript
function exportICS(events) {
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BossBoard//v3.0//EN
${events.map(e => `BEGIN:VEVENT
UID:${e.id}
DTSTART:${formatICSDate(e.start_time)}
DTEND:${formatICSDate(e.end_time)}
SUMMARY:${e.title}
DESCRIPTION:${e.description || ''}
END:VEVENT`).join('\n')}
END:VCALENDAR`;
  
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bossboard-calendar.ics';
  a.click();
}
```

---

## Task Group 4: AI Meeting Room

### 4.1: Meetings page

Create `src/app/desktop/meetings/page.tsx`:

- List past meetings
- "New meeting" button → modal:
  - Title
  - Topic / question to discuss
  - Select participating agents (multi-select)
  - Number of rounds (default 3)

### 4.2: Meeting execution logic

Create `src/lib/meetings/execute.ts`:

```typescript
export async function runMeeting(
  topic: string,
  agentNames: string[],
  rounds: number = 3,
  apiKey: string
) {
  const messages: Array<{ agent: string; content: string; round: number }> = [];
  
  for (let round = 1; round <= rounds; round++) {
    for (const agentName of agentNames) {
      const context = `
Meeting topic: ${topic}

Previous discussion:
${messages.map(m => `[Round ${m.round}] ${m.agent}: ${m.content}`).join('\n\n')}

You are ${agentName}. Round ${round} of ${rounds}. 
${round === 1 ? 'Share your initial perspective.' : 
  round === rounds ? 'Provide your final position before we conclude.' : 
  'Respond to the discussion so far and add your viewpoint.'}
Keep responses concise (3-5 sentences).
`;
      const response = await executeDMTurn(agentName, context, apiKey);
      messages.push({ agent: agentName, content: response, round });
    }
  }
  
  // Generate conclusion
  const conclusion = await summarizeMeeting(topic, messages, apiKey);
  
  return { messages, conclusion };
}

async function summarizeMeeting(topic: string, messages: any[], apiKey: string): Promise<string> {
  // Use Gemini Flash to summarize
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const transcript = messages.map(m => `${m.agent}: ${m.content}`).join('\n\n');
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `Summarize this meeting and provide a clear conclusion.\n\nTopic: ${topic}\n\nDiscussion:\n${transcript}\n\nProvide:\n1. Key points raised\n2. Areas of agreement\n3. Areas of disagreement\n4. Recommended action items` }]
      }]
    })
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Meeting concluded without summary.";
}
```

### 4.3: Save meeting result

Save meeting to `/Library/meetings/{date}-{title}.md` with full transcript + conclusion.

Auto-post conclusion to "Announcements" board channel.

---

## Task Group 5: GitHub MCP Integration

### 5.1: Settings → Integrations

In Settings page, add Integrations section:

```tsx
<section>
  <h3>Integrations</h3>
  <IntegrationCard
    name="GitHub"
    description="Connect agents to GitHub repos for code work"
    icon={<GitHubLogo />}
    connected={!!githubToken}
    onConnect={connectGitHub}
    onDisconnect={disconnectGitHub}
  />
  <IntegrationCard
    name="Google Drive"
    description="Access Google Drive files from agents"
    icon={<GDriveLogo />}
    connected={!!gdriveToken}
    onConnect={connectGDrive}
    onDisconnect={disconnectGDrive}
  />
</section>
```

### 5.2: GitHub OAuth flow (via web)

Since we're a Tauri app, GitHub OAuth needs:
1. User clicks Connect → opens browser
2. GitHub auth → redirects to mybossboard.com/integrations/github/callback
3. Callback page shows code, user pastes back into Tauri app
4. Or use device flow (better for desktop)

For v3.0 MVP, use **Personal Access Token (PAT)** approach:

```tsx
<input
  placeholder="GitHub Personal Access Token (https://github.com/settings/tokens)"
  type="password"
  value={githubToken}
  onChange={e => setGithubToken(e.target.value)}
/>
<button onClick={() => localStorage.setItem("bb_github_token", githubToken)}>
  Save
</button>
```

Document: User creates classic PAT with `repo, read:user` scopes, pastes in Settings.

OAuth flow can come in v3.1.

### 5.3: GitHub MCP server (proxy)

Don't reinvent GitHub MCP. Use the official `@modelcontextprotocol/server-github` reference: spawn it as a subprocess from Tauri Rust if needed, OR proxy GitHub API calls directly from BB.

Simpler approach for v3.0: Direct GitHub API calls when agents need repo data. Add functions to `executeDMTurn` system prompt:

```
Available tools:
- github_list_repos(): List user's repos
- github_read_file(owner, repo, path): Read a file
- github_create_issue(owner, repo, title, body): Create issue
```

Implement tool-calling for Gemini and Claude. This is bigger scope — for v3.0 MVP, just store the token and let users instruct agents manually ("Read this GitHub URL: ..."). Full agent tool-use can be v3.1.

**Simplification: Skip Group 5 implementation, just add Settings UI for storing the token.** Note in reporting.

---

## Task Group 6: Google Drive MCP Integration

Same as Group 5 — for v3.0 MVP, just add Settings UI placeholder for connecting/storing token. Full implementation = v3.1.

---

## Task Group 7: Admin Build Separation

### 7.1: Build flag

Add to `package.json`:

```json
{
  "scripts": {
    "tauri:build:user": "cross-env BB_BUILD=user TAURI_BUILD=true next build && tauri build",
    "tauri:build:admin": "cross-env BB_BUILD=admin TAURI_BUILD=true next build && tauri build --config src-tauri/tauri.admin.conf.json"
  }
}
```

### 7.2: Conditional admin code

In any admin pages or components, gate with:

```tsx
const isAdminBuild = process.env.NEXT_PUBLIC_BB_BUILD === "admin";

if (!isAdminBuild) {
  return <NotFound />;
}
```

For v3.0 MVP, admin features can be minimal:
- View all users (read-only)
- View system health
- Send announcements

If no admin code exists yet, defer to post-launch. Document in reporting.

### 7.3: Admin tauri.conf

Create `src-tauri/tauri.admin.conf.json`:

```json
{
  "productName": "BossBoard Admin",
  "identifier": "com.mybossboard.admin",
  "app": {
    "windows": [{
      "title": "BossBoard Admin"
    }]
  }
}
```

Output: `BossBoard-Admin_3.0.0_x64_en-US.msi`

---

## Task Group 8: Week 3 Deferred Items

### 8.1: OS Keychain for API keys

Use Tauri's `keyring` crate or `tauri-plugin-stronghold`:

```toml
# Cargo.toml
keyring = "2"
```

Create Rust commands `keychain_set`, `keychain_get`, `keychain_delete`. Update Settings page to use keychain instead of localStorage for API keys.

If implementation is complex, defer with note. localStorage works for v3.0 MVP.

### 8.2: Translation save as new file

In `src/components/library/translation-panel.tsx`, add Save button:

```tsx
async function saveAsNewFile() {
  const ext = ".md";
  const baseName = currentFilePath.split("/").pop()?.replace(ext, "") || "untitled";
  const newName = `${baseName}.${targetLang}${ext}`;
  const dir = currentFilePath.substring(0, currentFilePath.lastIndexOf("/"));
  const newPath = `${dir}/${newName}`;
  
  const fm = {
    id: generateId(),
    title: `${originalTitle} (${LANGS[targetLang]})`,
    translated_from: currentFilePath.split("/").pop(),
    language: targetLang,
    translation_provider: provider,
    translation_date: new Date().toISOString(),
    tags: ["translation"],
  };
  
  await writeFile(newPath, stringifyMarkdown(fm, translatedContent));
  alert(`Saved as ${newName}`);
}
```

### 8.3: Conversation memory compression

Add "Compress" button to DM panel that triggers:

```typescript
async function compressConversation(agentName: string) {
  const messages = ...; // Load active.json
  const apiKey = ...;
  
  // Use Gemini Flash to summarize old messages
  const oldMessages = messages.slice(0, -10); // Keep last 10
  const summaryPrompt = `Summarize these conversation messages concisely. Preserve key facts, decisions, and context. Output as markdown.\n\n${oldMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`;
  
  const summary = await callGemini("gemini-2.5-flash", "", summaryPrompt, apiKey);
  
  // Update memory.md
  const memoryPath = `${ws}/agents/${agentName}/memory.md`;
  const existing = await readFile(memoryPath).catch(() => "");
  await writeFile(memoryPath, `${existing}\n\n## Compressed ${new Date().toISOString()}\n\n${summary}`);
  
  // Archive old messages
  await writeFile(`${ws}/agents/${agentName}/conversations/archive-${Date.now()}.json`, JSON.stringify(oldMessages));
  
  // Keep only recent in active.json
  await writeFile(`${ws}/agents/${agentName}/conversations/active.json`, JSON.stringify(messages.slice(-10)));
}
```

Auto-suggest compression when active.json exceeds 30 messages.

### 8.4: Image rendering in TipTap (relative .assets paths)

Use Tauri's `convertFileSrc` to render local images:

```typescript
import { convertFileSrc } from "@tauri-apps/api/core";

// In MarkdownRenderer image transformer:
const localPath = `${workspaceRoot}/${currentFolder}/${imgSrc}`;
const tauriUrl = convertFileSrc(localPath);
// Use tauriUrl in <img src=...>
```

May require updating `tauri.conf.json` `assetProtocol` config.

---

## Task Group 9: Final Polish

### 9.1: Keyboard shortcuts

Document and implement:

| Shortcut | Action |
|---|---|
| Ctrl+K | Open search |
| Ctrl+R | Refresh |
| Ctrl+S | Save (in editor) |
| Ctrl+, | Settings |
| Ctrl+/ | Show all shortcuts |
| Ctrl+B | Toggle sidebar |
| Ctrl+Shift+D | Toggle DM panel |
| Esc | Close panels/modals |

### 9.2: Help/About menu

Profile dropdown → Add:
- "Keyboard Shortcuts" → Modal showing all
- "About BossBoard" → Version, links to docs/website
- "Send Feedback" → Opens email client to jay@mybossboard.com

### 9.3: First-run tour (skip-able)

After first login, show overlay tooltips:
1. "This is your sidebar — navigate here"
2. "Library is for your wiki and documents"
3. "Agents work here, talk to them via DM"
4. "Click here to add your AI key in Settings"

Use a simple library like `intro.js` or build custom. Skip-able with persistent dismiss.

If too much scope, defer to post-launch and add a static "Getting Started" page.

### 9.4: Error tracking

Wrap top-level error boundary:

```tsx
"use client";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("BB Error:", error, info);
    // Optional: send to Sentry
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap layout.

---

## Task Group 10: Build + Final Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..

# Final commit
git add .
git commit -m "Week 4 complete: Board + Calendar + Meetings + MCP + Polish (BB v3.0)"
git log --oneline -15

# Production build test (optional, takes 15-30min)
# npm run tauri:build
```

---

## Success Criteria

✓ DM as Telegram-style side panel (persists across navigation)
✓ Sidebar collapse button moved to top bar
✓ Light mode text fully readable
✓ Create Agent form has clean placeholders
✓ Domain Specialist template added
✓ Personal Assistant persona is correct (says "I am your assistant" not "I am the team's specialist")
✓ DM messages have rounded bubble design
✓ Board page works with channels
✓ Calendar page works with event CRUD + .ics export
✓ AI Meeting Room runs multi-agent discussions
✓ GitHub Settings stores PAT
✓ Google Drive Settings placeholder
✓ Admin build flag system in place
✓ At least 3 of 4 Week 3 deferred items handled
✓ Keyboard shortcuts work
✓ Error boundary catches crashes
✓ All builds pass

---

## Reporting

1. All commits
2. What was implemented vs deferred (be honest about scope)
3. Build status
4. Any production-blocking issues
5. Recommended next steps before beta launch

Stop here. Wait for testing pass. After Week 4 verification → ready for beta launch preparation.
