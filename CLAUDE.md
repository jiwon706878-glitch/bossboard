# BossBoard — Project Context (v3.0)

## What is BossBoard v3.0?

**Local-first AI agent workspace.** Desktop app (Tauri) where humans and AI agents collaborate on files stored locally on the user's machine.

**Slogan:** "Hire AI Agents. Manage Them Like a Pro."

## Architecture (CRITICAL)

**Local-first.** Files on user's PC. Cloud = metadata + auth + board posts + DM only.

```
User's PC /BossBoard/ folder:
  /Library/          - Wiki pages (markdown + YAML frontmatter)
  /agents/{name}/    - Each agent's manual + workspace
  /shared/           - Multi-agent shared files
  /private/          - User-only, agents blocked
  /.bb/              - Hidden: metadata.sqlite, sync-state.json

Cloud (Supabase):
  - Auth (accounts)
  - File METADATA only (path, hash, tags)
  - Board posts, DM, calendar events
  - Meeting records
  - Admin announcements
  - Payment info (Paddle)
```

## Tech Stack

### Desktop App (PRIMARY)
- Tauri v2 (Rust backend + WebView frontend)
- React + TypeScript (reused from v2.6)
- TipTap editor (3-mode: Source / Live / Preview)
- SQLite (local metadata cache)
- Tauri plugins: notification, tray, updater, fs, dialog

### Web (SECONDARY — landing/auth only)
- Next.js 14
- Supabase Auth
- Paddle checkout
- Vercel hosting

### Cloud Backend
- Supabase (PostgreSQL + Auth + Realtime)
- Cloudflare (DNS, CDN, WAF)
- Resend (minimal transactional email)

## Data Storage Rules

1. **User-created content** → LOCAL files in /BossBoard/
   - Wiki, attachments, agent manuals, agent workspaces
2. **Metadata** → Cloud Supabase
   - File paths, hashes, tags, titles — for search
3. **Activity/Communication** → Cloud
   - Board posts, DM, meeting messages (short text)
4. **API keys** → OS Keychain (never in code or files)
5. **Payment** → Paddle (never touches our DB)

## File Format (YAML Frontmatter)

Every /BossBoard/ markdown file starts with:

```markdown
---
id: "wiki_abc123"
title: "Page Title"
tags: ["tag1", "tag2"]
agent_access: ["Agent-Name-1", "Agent-Name-2"]
created: "2026-04-23T10:00:00Z"
modified: "2026-04-23T14:30:00Z"
hash: "sha256:xxxxx"
---

# Page Title

Content in markdown...
```

## Attachment Convention (Obsidian-style)

`/Library/page.md` attachments → `/Library/page.assets/` folder.

Renaming asset → BB auto-updates references in all .md files.

## Agent Execution (CRITICAL)

Agents run **inside Tauri app process**, not in cloud:

1. User creates agent → Tauri spawns async task
2. Agent reads /BossBoard/agents/{name}/manual.md
3. Agent waits for trigger (event/schedule/manual)
4. On trigger: agent calls AI API with BYOK key
5. Agent reads/writes local files within permissions
6. Agent posts to cloud board (activity log)
7. Agent sleeps until next trigger

Per-agent AI provider configured in manual frontmatter:
```yaml
ai_provider: anthropic    # anthropic|google|openai|grok|local
model: claude-sonnet-4
temperature: 0.7
trigger: event            # event|scheduled|manual
permissions:
  read: ["/Library", "/shared"]
  write: ["/agents/Marketing-Lead", "/shared"]
```

## MCP Server (Local)

Tauri app runs embedded MCP server on `localhost:39001`.

Authentication via `Bearer bb_{agent_key}`.

External tools (Claude Code, Cursor) can connect when BB app is running.

## Security Requirements

1. Every cloud table has RLS
2. API routes verify auth
3. Paddle webhooks: signature verification + idempotent
4. No environment secrets in client
5. XSS prevention (no dangerouslySetInnerHTML with user content)
6. API keys: OS Keychain only
7. File permission checks on every fs.read/fs.write

## Build Commands

```powershell
# Development
npm run dev              # Next.js web dev server
npm run tauri dev        # Tauri app dev mode

# Production builds
npm run build            # Web (Vercel deploy)
npm run tauri build      # Tauri desktop (user app)

# Testing
npx tsc --noEmit
```

## Admin Build Separation

Same codebase, two builds via build flag:
- `BossBoard-User.exe` — no admin code bundled
- `BossBoard-Admin.exe` — admin-only features

User .exe decompiled reveals NO admin functionality.

## Current State

**Transition v2.6 → v3.0:**

**Reusing:**
- Landing/auth/pricing pages (web, already complete)
- Terms/Privacy (v2.6 content, BYOK language)
- React components (Button, Card, Dialog, etc.)
- Supabase Auth integration
- Paddle integration structure

**Rebuilding:**
- Library (cloud DB → local markdown files)
- Agent execution (cloud orchestration → Tauri local process)
- MCP server (cloud → local)
- Search (DB → local SQLite + cloud metadata)
- File uploads (Backblaze B2 → local file system)

**Deprecating:**
- Backblaze B2 storage
- Cloud agent execution
- Most /api/* routes (moved to Tauri local commands)

## Commit Convention

```
Feature description (BB v3.0 Week N)

Example:
Tauri foundation + file system bridge (BB v3.0 Week 1)
Library local-first migration (BB v3.0 Week 2)
```

## Platform Targets

- Windows 10/11 x64 (primary)
- macOS 11+ (Apple Silicon + Intel)
- Linux (community only)

## Out of Scope for v3.0

- Mobile apps (v4.0)
- Cloud agents (always local)
- Multi-device sync (v3.2)
- Custom MCP tools (v3.2)
- Telegram bot (v3.1)
- Marketplace (v4.0)

## Sacred Rules

1. **User's files stay on user's PC.** Never upload without explicit action.
2. **BYOK always.** BB pays $0 for AI. Ever.
3. **Privacy first.** Never use user content for AI training. Ever.
4. **Local-first, not local-only.** Cloud for metadata, auth, collaboration. Truth is local.
5. **Admin code never ships to users.** Build-time separation enforced.
