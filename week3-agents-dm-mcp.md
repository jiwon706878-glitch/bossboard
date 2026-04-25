# BB v3.0 Week 3: Agents + DM-Integrated Chat + MCP + Attachments + Translation

Read CLAUDE.md first.

**Architecture decision (NEW):** Chat with AI = DM with agents. No separate chatbot UI.

- All AI conversation happens via DM with agents
- "Personal Assistant" template = generic helper agent (knows all projects)
- Topic-specific agents = domain experts (Marketing Lead, Code Reviewer, etc.)
- Conversations stored at `/agents/{name}/conversations/{date}-{title}.md`
- Each agent has `memory.md` (auto-summary) + `manual.md` (user-editable)

**Goals this week:**
1. Bug fixes from Hotfix 3 testing
2. Color theme matching landing page (dark gray + purple, NOT navy)
3. Sidebar with collapse toggle + dropdown animations
4. Profile pictures via Supabase Storage
5. TipTap rich markdown rendering
6. Obsidian-style attachments
7. File watcher for external edits
8. Local MCP server (Tauri-embedded)
9. **Agent system + execution** (first real agent runs!)
10. **DM-based chat with agents** (replaces standalone chatbot)
11. Conversation memory + compression suggestion
12. **Library translation button** (5 languages, side-by-side)

**Time estimate:** 6-8 hours on i7-7700HQ + 16GB RAM.

---

## Pre-flight

Verify Hotfix 3 completed and Tauri builds.

---

## Task Group 1: Bug Fixes from Testing

### 1.1: Fix workspace folder creation (os error 2)

The error "지정된 파일을 찾을 수 없습니다" means Documents folder doesn't always exist (rare on fresh Windows installs or special user setups).

In `src-tauri/src/commands/workspace.rs`, ensure recursive creation:

```rust
#[tauri::command]
pub async fn initialize_workspace(root_path: String) -> Result<WorkspaceInfo, FsError> {
    let root = PathBuf::from(&root_path);
    
    // Defensive: create root and ALL parents
    if let Some(parent) = root.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::create_dir_all(&root)?;
    
    // Then subdirs
    let dirs = ["Library", "agents", "shared", "private", ".bb"];
    for dir in &dirs {
        fs::create_dir_all(root.join(dir))?;
    }
    
    // workspace marker, getting started, roadmap (existing logic)
    // ...
    
    Ok(WorkspaceInfo {
        root_path: root.to_string_lossy().to_string(),
        is_initialized: true,
    })
}
```

Also for `get_default_workspace_path`, ensure parent dir creation hint:

```rust
#[tauri::command]
pub async fn get_default_workspace_path() -> Result<String, FsError> {
    let home = dirs::home_dir()
        .ok_or_else(|| FsError::InvalidPath("Cannot find home directory".to_string()))?;
    let documents = home.join("Documents");
    // We'll create Documents itself in initialize_workspace if missing
    let path = documents.join("BossBoard");
    Ok(path.to_string_lossy().to_string())
}
```

### 1.2: Fix theme toggle (still not working)

The `useTheme` hook may not be applying. Verify:

In `src/components/desktop/theme-provider.tsx`, the useEffect should write to BOTH `documentElement` and `body` for safety:

```tsx
useEffect(() => {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  localStorage.setItem("bb_theme", theme);
}, [theme]);
```

In `src/app/globals.css` (or wherever Tailwind v4 imports happen), ensure:

```css
@custom-variant dark (&:is(.dark *));

@theme {
  --color-bb-bg: #1e1e1e;          /* matches landing */
  --color-bb-fg: #dcdcdc;
  --color-bb-primary: #7C3AED;
  --color-bb-card: #252525;
  --color-bb-border: #2f2f2f;
  --color-bb-bg-light: #f8f8f8;
  --color-bb-fg-light: #1a1a1a;
  --color-bb-card-light: #ffffff;
  --color-bb-border-light: #e5e5e5;
}

html.dark body {
  background-color: var(--color-bb-bg);
  color: var(--color-bb-fg);
}

html.light body {
  background-color: var(--color-bb-bg-light);
  color: var(--color-bb-fg-light);
}
```

### 1.3: Fix top bar button click handlers

Currently DM/Notifications icons don't do anything. They should at least open a placeholder panel (full implementation in Week 4 with Supabase Realtime).

In titlebar.tsx, replace placeholder buttons:

```tsx
const [dmOpen, setDmOpen] = useState(false);
const [notificationsOpen, setNotificationsOpen] = useState(false);

<button
  onClick={() => setNotificationsOpen(o => !o)}
  className="p-2 hover:bg-bb-card rounded relative"
  title="Notifications"
>
  <Bell className="w-4 h-4 text-gray-400" />
</button>

<button
  onClick={() => setDmOpen(o => !o)}
  className="p-2 hover:bg-bb-card rounded relative"
  title="Direct Messages"
>
  <MessageSquare className="w-4 h-4 text-gray-400" />
</button>
```

Then create slide-out panels:

`src/components/desktop/dm-panel.tsx` (sliding from right):

```tsx
"use client";

import { useEffect, useState } from "react";
import { X, Send, Plus } from "lucide-react";
import Link from "next/link";
import { listAgents, type Agent } from "@/lib/agents/service";

export function DMPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (isOpen) {
      listAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-bb-card border-l border-bb-border z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bb-border">
          <h2 className="font-semibold">Direct Messages</h2>
          <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {agents.length === 0 ? (
            <div className="text-center text-sm text-gray-500 mt-8">
              No agents yet.
              <Link href="/desktop/agents" className="block text-blue-400 hover:underline mt-2">
                Create your first agent →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {agents.map(agent => (
                <Link
                  key={agent.name}
                  href={`/desktop/dm/${encodeURIComponent(agent.name)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 hover:bg-bb-bg rounded cursor-pointer"
                >
                  <div className="w-9 h-9 bg-bb-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {agent.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{agent.name}</div>
                    <div className="text-xs text-gray-500 truncate">{agent.role || "Agent"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-bb-border">
          <button
            onClick={() => alert("Feedback feature: coming in Week 4")}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
          >
            📨 Send Feedback to BossBoard
          </button>
        </div>
      </div>
    </>
  );
}
```

`src/components/desktop/notifications-panel.tsx` — similar slide panel, placeholder list.

### 1.4: Fix search field right-click (custom menu instead of Chrome menu)

Current: input fields show Chrome menu. Solution: provide custom menu that includes editing actions.

In `src/components/desktop/context-menu.tsx`, allow inputs to opt in to custom menus. For Hotfix 3 we excluded inputs to allow paste; now provide a custom version:

Actually, simplest: just leave inputs alone (Chrome menu OK for editing). It's fine UX. Skip this for now.

### 1.5: Empty area right-click — global context menu

Add a default global menu in `src/app/desktop/layout.tsx`:

```tsx
import { ContextMenu } from "@/components/desktop/context-menu";

// Wrap children:
<main className="flex-1 overflow-auto">
  <ContextMenu items={[
    { label: "Refresh", onClick: () => window.location.reload(), shortcut: "Ctrl+R" },
    { label: "Back", onClick: () => window.history.back() },
    { separator: true, label: "" },
    { label: "Settings", onClick: () => router.push("/desktop/settings") },
  ]}>
    <div className="min-h-full">{children}</div>
  </ContextMenu>
</main>
```

---

## Task Group 2: Color Theme Match Landing

### 2.1: Update all hardcoded colors

Search and replace across `src/app/desktop/` and `src/components/desktop/`:

```
#0C0F17  →  use var(--color-bb-bg) or class bg-bb-bg
#141824  →  use var(--color-bb-card) or class bg-bb-card
#0A0D14  →  use var(--color-bb-bg) (slightly darker variant: #181818)
border-gray-800  →  border-bb-border (or border-gray-800 still ok if subtle)
```

Use Tailwind classes instead of inline hex where possible. The CSS vars from Task 1.2 should propagate.

For sidebar, use `bg-bb-bg` (slight darker variant via opacity or a separate `--color-bb-sidebar: #181818`).

---

## Task Group 3: Sidebar Redesign — Collapse + Dropdown Animation

### 3.1: Collapsible sidebar

Update `src/components/desktop/sidebar.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Library, LayoutGrid, MessageSquare,
  Calendar, Users, Bot, Settings, ChevronLeft, ChevronRight,
  ChevronDown, ChevronRight as ChevronRightSmall
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  disabled?: boolean;
  subItems?: { href: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/desktop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/desktop/library", label: "Library", icon: Library },
  { href: "/desktop/agents", label: "Agents", icon: Bot },
  { href: "/desktop/board", label: "Board", icon: LayoutGrid, disabled: true },
  { href: "/desktop/dm", label: "DM", icon: MessageSquare },
  { href: "/desktop/calendar", label: "Calendar", icon: Calendar, disabled: true },
  { href: "/desktop/meetings", label: "Meetings", icon: Users, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("bb_sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("bb_sidebar_collapsed", String(next));
  }

  function toggleExpand(href: string) {
    setExpandedItems(s => {
      const n = new Set(s);
      n.has(href) ? n.delete(href) : n.add(href);
      return n;
    });
  }

  return (
    <aside
      className={`
        bg-bb-bg/50 border-r border-bb-border flex flex-col transition-all duration-200
        ${collapsed ? "w-14" : "w-56"}
      `}
    >
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          const expanded = expandedItems.has(item.href);
          const hasSubs = item.subItems && item.subItems.length > 0;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 cursor-not-allowed"
                title={collapsed ? `${item.label} (soon)` : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] bg-bb-card px-1.5 py-0.5 rounded">soon</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <div key={item.href}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm transition flex-1
                    ${active
                      ? "bg-bb-primary/20 text-bb-primary border-l-2 border-bb-primary"
                      : "text-gray-400 hover:text-white hover:bg-bb-card"}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
                {!collapsed && hasSubs && (
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className="p-1 hover:bg-bb-card rounded mr-1"
                  >
                    {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightSmall className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {!collapsed && hasSubs && expanded && (
                <div className="ml-6 mt-1 space-y-0.5 overflow-hidden animate-slideDown">
                  {item.subItems?.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className="block px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-bb-card rounded"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-bb-border space-y-1">
        <Link
          href="/desktop/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-bb-card"
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
        
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-white hover:bg-bb-card"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
```

Add slide animation to `globals.css`:

```css
@keyframes slideDown {
  from { max-height: 0; opacity: 0; }
  to { max-height: 500px; opacity: 1; }
}
.animate-slideDown {
  animation: slideDown 0.2s ease-out;
}
```

### 3.2: Remove logo from titlebar (move to corner-only)

In `src/components/desktop/titlebar.tsx`, remove the BossBoard logo + name from left side. Keep only:

- Sidebar collapse hint icon (☰) — optional, since sidebar has its own collapse button
- Back/Forward buttons
- (drag region in middle)
- Right-side action icons + profile

So leftmost is just `[←][→]` + drag region.

---

## Task Group 4: Profile Picture + Avatar System

### 4.1: Profile data structure

Profile lives in Supabase `profiles` table (verify exists; if not, create migration):

```sql
-- supabase/migrations/0xx_profile_avatars.sql
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  display_name text,
  avatar_url text,
  use_avatar boolean default true,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Create avatars storage bucket (run manually in Supabase dashboard if migration fails)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict do nothing;

create policy "Users can upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
```

Note: Manual migration step required. Document in reporting.

### 4.2: Avatar component

`src/components/desktop/avatar.tsx`:

```tsx
"use client";

import { User } from "lucide-react";

interface AvatarProps {
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  useAvatar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ email, displayName, avatarUrl, useAvatar = true, size = "md", className = "" }: AvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-16 h-16 text-2xl",
  };
  
  const initial = displayName?.[0] || email?.[0] || "";
  
  if (avatarUrl && useAvatar) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || email || "User"}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }
  
  if (initial) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-bb-primary to-purple-700 rounded-full flex items-center justify-center text-white font-semibold ${className}`}
      >
        {initial.toUpperCase()}
      </div>
    );
  }
  
  // Fallback: silhouette
  return (
    <div className={`${sizeClasses[size]} bg-bb-card rounded-full flex items-center justify-center text-gray-500 ${className}`}>
      <User className={size === "lg" ? "w-8 h-8" : size === "md" ? "w-4 h-4" : "w-3 h-3"} />
    </div>
  );
}
```

Update Titlebar to use Avatar component with profile data fetched from Supabase profiles table.

### 4.3: Profile settings page

Update `src/app/desktop/settings/page.tsx` with profile section (avatar upload, display name, "use avatar" toggle).

This task can be partial — full upload to Supabase Storage in this hotfix is OK to defer to Week 4 if scope is too large. Minimum: show avatar component working with email initial.

---

## Task Group 5: TipTap Markdown Renderer

### 5.1: Install TipTap

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-code-block-lowlight lowlight
```

### 5.2: Markdown renderer component

Create `src/components/library/markdown-renderer.tsx`:

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect } from "react";
// Simple markdown → HTML converter (use marked or remark)
import { marked } from "marked";

export function MarkdownRenderer({ content, editable = false, onChange }: {
  content: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
}) {
  // Convert markdown to HTML for TipTap initial content
  const html = typeof content === "string" ? (marked.parse(content, { async: false }) as string) : "";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: html,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Convert HTML back to markdown (simple approach: use turndown)
        const html = editor.getHTML();
        // For now, store as HTML internally; full markdown round-trip in Week 4
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  useEffect(() => {
    if (editor && !editable) {
      editor.commands.setContent(html);
    }
  }, [html, editor, editable]);

  return <EditorContent editor={editor} />;
}
```

Install `marked` for MD→HTML:

```bash
npm install marked
```

For full markdown round-trip (HTML → MD), install `turndown`:

```bash
npm install turndown
npm install -D @types/turndown
```

### 5.3: Use renderer in Library editor

Update `src/app/desktop/library/edit/page.tsx` Preview mode:

```tsx
import { MarkdownRenderer } from "@/components/library/markdown-renderer";

// In preview mode rendering:
{mode === "preview" && (
  <div className="prose prose-invert max-w-none">
    <MarkdownRenderer content={content} editable={false} />
  </div>
)}
```

For Live mode, also use TipTap with editable=true (richer than textarea). Source mode keeps textarea.

---

## Task Group 6: Obsidian-Style Attachments

### 6.1: Drag & drop in editor

In the Library edit page, support drag & drop of files:

```tsx
async function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      // Save to {filename}.assets/ folder
      const assetsPath = filePath.replace(/\.md$/, ".assets");
      await createDirectory(assetsPath);
      
      const ext = file.name.split(".").pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const destPath = `${assetsPath}/${safeName}`;
      
      // Read file as base64 → save via Tauri
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...bytes));
      
      // Need a write_binary command
      await invoke("write_binary_file", { path: destPath, base64 });
      
      // Insert reference at cursor
      const relPath = `${filePath.split('/').pop()?.replace(/\.md$/, '.assets')}/${safeName}`;
      const insertText = `\n![${file.name}](${relPath})\n`;
      setContent(c => c + insertText);
      setDirty(true);
    }
  }
}
```

Add Rust command for binary write in `src-tauri/src/commands/fs.rs`:

```rust
use base64::Engine as _;

#[tauri::command]
pub async fn write_binary_file(path: String, base64: String) -> Result<(), FsError> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64)
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, bytes)?;
    Ok(())
}
```

Add to Cargo.toml: `base64 = "0.22"`.

Register the command in lib.rs.

### 6.2: Render images in renderer

TipTap Image extension already loads `![alt](src)` — just ensure relative paths resolve. For local files, may need a custom image src handler that reads via Tauri.

For v3.0 MVP: Display path as link if image src is relative (full image rendering can be polished in Week 4).

---

## Task Group 7: File Watcher

### 7.1: Rust file watcher

Add to Cargo.toml: `notify = "6"` (file watching crate).

Create `src-tauri/src/commands/watcher.rs`:

```rust
use notify::{Watcher, RecursiveMode, recommended_watcher, EventKind};
use std::sync::mpsc;
use std::path::Path;
use tauri::Emitter;

#[tauri::command]
pub async fn start_watching_workspace(
    app: tauri::AppHandle,
    workspace_root: String,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel();
    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher.watch(Path::new(&workspace_root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    
    // Spawn thread to forward events to JS
    std::thread::spawn(move || {
        for res in rx {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => continue,
                };
                let paths: Vec<String> = event.paths.iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                let _ = app.emit("file-change", serde_json::json!({
                    "type": event_type,
                    "paths": paths,
                }));
            }
        }
    });
    
    // Note: watcher must stay alive. In real impl, store in app state.
    // For v3.0 MVP, leak it (acceptable for single workspace).
    Box::leak(Box::new(watcher));
    
    Ok(())
}
```

### 7.2: Listen in frontend

In Library page or layout:

```tsx
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
  let unlisten: (() => void) | null = null;
  (async () => {
    const ws = localStorage.getItem("bb_workspace_path");
    if (ws && isTauri()) {
      await invoke("start_watching_workspace", { workspaceRoot: ws });
      unlisten = await listen("file-change", (event) => {
        console.log("File changed:", event.payload);
        // Refresh file list
        loadFiles();
      });
    }
  })();
  return () => { if (unlisten) unlisten(); };
}, []);
```

---

## Task Group 8: Local MCP Server (Embedded)

### 8.1: HTTP server in Tauri

Add to Cargo.toml:
```toml
axum = "0.7"
tower-http = { version = "0.5", features = ["cors"] }
```

Create `src-tauri/src/mcp_server.rs`:

```rust
use axum::{routing::get, Router, extract::State, Json};
use serde::{Serialize, Deserialize};
use std::sync::Arc;

#[derive(Clone)]
pub struct McpState {
    pub workspace_root: Arc<tokio::sync::RwLock<Option<String>>>,
}

#[derive(Serialize)]
struct McpInfo {
    name: String,
    version: String,
    capabilities: Vec<String>,
}

async fn info_handler() -> Json<McpInfo> {
    Json(McpInfo {
        name: "BossBoard MCP".to_string(),
        version: "3.0.0".to_string(),
        capabilities: vec![
            "library.read".to_string(),
            "library.write".to_string(),
            "agents.list".to_string(),
            "board.post".to_string(),
        ],
    })
}

pub async fn run_mcp_server(state: McpState, port: u16) {
    let app = Router::new()
        .route("/", get(info_handler))
        .route("/health", get(|| async { "ok" }))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .expect("Failed to bind MCP port");
    
    axum::serve(listener, app).await.expect("MCP server failed");
}
```

Spawn in main:

```rust
// In lib.rs setup:
.setup(|app| {
    let state = McpState { workspace_root: Arc::new(tokio::sync::RwLock::new(None)) };
    let state_clone = state.clone();
    tauri::async_runtime::spawn(async move {
        run_mcp_server(state_clone, 39001).await;
    });
    Ok(())
})
```

For v3.0 MVP: server runs and exposes `/` and `/health`. Full MCP protocol implementation (tools, resources) in Week 4.

---

## Task Group 9: Agent System

### 9.1: Agent service

Create `src/lib/agents/service.ts`:

```typescript
import { listDirectory, readFile, writeFile, createDirectory } from "@/lib/tauri/fs";
import { parseMarkdown, stringifyMarkdown, generateId } from "@/lib/markdown/frontmatter";

export interface Agent {
  name: string;          // folder name = display name
  role?: string;
  description?: string;
  ai_provider?: "anthropic" | "google" | "openai" | "grok" | "local";
  model?: string;
  status?: "active" | "idle" | "stopped";
  manualPath: string;
  workspaceePath: string;
}

export function agentsRoot(): string {
  return `${localStorage.getItem("bb_workspace_path") || ""}/agents`;
}

export async function listAgents(): Promise<Agent[]> {
  try {
    const entries = await listDirectory(agentsRoot());
    const agents: Agent[] = [];
    for (const e of entries) {
      if (!e.is_directory) continue;
      try {
        const manualPath = `${e.path}/manual.md`;
        const raw = await readFile(manualPath);
        const { frontmatter } = parseMarkdown(raw);
        agents.push({
          name: e.name,
          role: (frontmatter as any).role,
          description: (frontmatter as any).description,
          ai_provider: (frontmatter as any).ai_provider,
          model: (frontmatter as any).model,
          status: (frontmatter as any).status || "idle",
          manualPath,
          workspaceePath: `${e.path}/workspace`,
        });
      } catch {
        // No manual.md yet
        agents.push({
          name: e.name,
          manualPath: `${e.path}/manual.md`,
          workspaceePath: `${e.path}/workspace`,
        });
      }
    }
    return agents;
  } catch {
    return [];
  }
}

export async function createAgent(name: string, role: string, template: "personal-assistant" | "marketing-lead" | "code-reviewer" | "blank" = "blank") {
  const agentDir = `${agentsRoot()}/${name}`;
  await createDirectory(agentDir);
  await createDirectory(`${agentDir}/workspace`);
  await createDirectory(`${agentDir}/conversations`);

  const fm = {
    id: generateId(),
    title: name,
    role,
    ai_provider: "google",
    model: "gemini-2.5-flash",
    status: "idle",
    permissions: {
      read: ["/Library", "/shared", `/agents/${name}`],
      write: [`/agents/${name}/workspace`],
    },
  };

  const content = TEMPLATES[template].replace(/\{\{name\}\}/g, name).replace(/\{\{role\}\}/g, role);
  await writeFile(`${agentDir}/manual.md`, stringifyMarkdown(fm as any, content));
  
  // Create memory.md
  await writeFile(`${agentDir}/memory.md`, `# ${name} - Memory\n\nNo summary yet. This file accumulates over time.\n`);
}

const TEMPLATES = {
  "personal-assistant": `# {{name}}

## Role
{{role}} — Personal assistant aware of all your projects.

## Behavior
- Friendly, concise, helpful
- Has read access to entire Library
- Recommends specialist agents when needed
- Tracks user's open tasks across projects

## Memory Strategy
- Summarize conversations every 30 messages
- Store in memory.md
`,
  "marketing-lead": `# {{name}}

## Role
{{role}} — Marketing strategy expert.

## Expertise
- Campaign brainstorming
- Audience analysis
- Content strategy

## Files I work with
- /Library/marketing/
- /shared/campaigns/
`,
  "code-reviewer": `# {{name}}

## Role
{{role}} — Code review specialist.

## Behavior
- Checks code for bugs, performance, security
- Suggests improvements
- Uses Gemini Flash (fast + cheap)

## Files I work with
- /shared/code/
- /agents/{{name}}/workspace/
`,
  "blank": `# {{name}}

## Role
{{role}}

## Behavior
(Edit this manual to define how this agent behaves.)

## Files I work with
(List folders this agent has permission to access.)
`,
};
```

### 9.2: Agents list page

Create `src/app/desktop/agents/page.tsx`:

Lists existing agents, button to create new agent (modal with template picker).

### 9.3: Agent execution (DM-based)

Agent execution = AI call when user sends DM message. Implementation:

```typescript
// src/lib/agents/execute.ts
import { readFile, writeFile } from "@/lib/tauri/fs";
import { parseMarkdown } from "@/lib/markdown/frontmatter";

export async function executeDMTurn(
  agentName: string,
  userMessage: string,
  apiKey: string
): Promise<string> {
  const root = localStorage.getItem("bb_workspace_path") || "";
  const manualPath = `${root}/agents/${agentName}/manual.md`;
  const memoryPath = `${root}/agents/${agentName}/memory.md`;

  const manualRaw = await readFile(manualPath);
  const memoryRaw = await readFile(memoryPath).catch(() => "");
  const { frontmatter, content: manualContent } = parseMarkdown(manualRaw);
  const provider = (frontmatter as any).ai_provider || "google";
  const model = (frontmatter as any).model || "gemini-2.5-flash";

  const systemPrompt = `${manualContent}\n\n## Memory (past conversations summary)\n${memoryRaw}`;

  // Call AI based on provider
  if (provider === "google") {
    return await callGemini(model, systemPrompt, userMessage, apiKey);
  } else if (provider === "anthropic") {
    return await callClaude(model, systemPrompt, userMessage, apiKey);
  }
  throw new Error(`Provider ${provider} not yet supported`);
}

async function callGemini(model: string, system: string, userMsg: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${system}\n\nUser: ${userMsg}` }] }
      ]
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "(empty response)";
}

async function callClaude(model: string, system: string, userMsg: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude error");
  return data.content?.[0]?.text || "(empty response)";
}
```

### 9.4: API key storage in Settings

In `src/app/desktop/settings/page.tsx`, add API key input:

```tsx
const [geminiKey, setGeminiKey] = useState("");
const [anthropicKey, setAnthropicKey] = useState("");

useEffect(() => {
  setGeminiKey(localStorage.getItem("bb_api_key_google") || "");
  setAnthropicKey(localStorage.getItem("bb_api_key_anthropic") || "");
}, []);

function saveKeys() {
  localStorage.setItem("bb_api_key_google", geminiKey);
  localStorage.setItem("bb_api_key_anthropic", anthropicKey);
  setNotice("API keys saved.");
}
```

(For v3.0 MVP: localStorage. OS Keychain integration in Week 4.)

---

## Task Group 10: DM Page (Conversation with Agent)

### 10.1: DM route

Create `src/app/desktop/dm/[agent]/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { executeDMTurn } from "@/lib/agents/execute";
import { writeFile, readFile, fileExists } from "@/lib/tauri/fs";

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export default function DMPage() {
  const params = useParams();
  const agentName = decodeURIComponent(params.agent as string);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationFile = `${localStorage.getItem("bb_workspace_path")}/agents/${agentName}/conversations/active.json`;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        if (await fileExists(conversationFile)) {
          const raw = await readFile(conversationFile);
          setMessages(JSON.parse(raw));
        }
      } catch {}
    })();
  }, [agentName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: "user", content: input, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem("bb_api_key_google") || localStorage.getItem("bb_api_key_anthropic") || "";
      if (!apiKey) {
        throw new Error("No API key configured. Go to Settings to add one.");
      }
      const response = await executeDMTurn(agentName, input, apiKey);
      const agentMsg: Message = { role: "agent", content: response, timestamp: new Date().toISOString() };
      const updated = [...newMessages, agentMsg];
      setMessages(updated);
      
      // Save conversation
      await writeFile(conversationFile, JSON.stringify(updated, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-bb-border p-4">
        <h1 className="font-semibold">{agentName}</h1>
        <p className="text-xs text-gray-500">Direct message</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-500 mt-12">
            Start a conversation with {agentName}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] p-3 rounded-lg ${
              m.role === "user" ? "bg-bb-primary text-white" : "bg-bb-card"
            }`}>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-bb-card p-3 rounded-lg text-sm text-gray-400">Thinking...</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="p-3 bg-red-900/20 border-t border-red-800 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="border-t border-bb-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder={`Message ${agentName}...`}
            disabled={sending}
            className="flex-1 px-3 py-2 bg-bb-card border border-bb-border rounded-md text-sm"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-bb-primary hover:bg-purple-600 rounded-md disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 10.2: DM index page

Create `src/app/desktop/dm/page.tsx` — lists all agents to start a conversation with.

---

## Task Group 11: Library Translation Button

### 11.1: Translation service

Create `src/lib/library/translate.ts`:

```typescript
const LANGS = {
  ko: "Korean (한국어)",
  ja: "Japanese (日本語)",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
};

export async function translateText(
  text: string,
  targetLang: keyof typeof LANGS,
  provider: "google" | "anthropic" = "google"
): Promise<string> {
  const apiKey = localStorage.getItem(`bb_api_key_${provider}`) || "";
  if (!apiKey) throw new Error("API key required for translation. Add in Settings.");

  const langName = LANGS[targetLang];
  const prompt = `Translate the following markdown to ${langName}. Preserve all formatting (headings, lists, code blocks, links). Only output the translated markdown, nothing else.\n\n${text}`;

  if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Translation failed");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Translation failed");
    return data.content?.[0]?.text || "";
  }
}

export const SUPPORTED_LANGUAGES = LANGS;
```

### 11.2: Translation panel in Library editor

In `src/app/desktop/library/edit/page.tsx`, add translation button + side-by-side panel.

```tsx
const [translationOpen, setTranslationOpen] = useState(false);
const [translation, setTranslation] = useState<{ lang: string; content: string } | null>(null);
const [translating, setTranslating] = useState(false);

// In header:
<button
  onClick={() => setTranslationOpen(true)}
  className="p-2 hover:bg-bb-card rounded"
  title="Translate"
>
  🌐
</button>

// Side panel:
{translationOpen && (
  <TranslationPanel
    sourceContent={content}
    onClose={() => setTranslationOpen(false)}
    onTranslated={(lang, translated) => setTranslation({ lang, content: translated })}
  />
)}

// Side-by-side view if translation:
{translation && (
  <div className="grid grid-cols-2 gap-4 p-8">
    <div>
      <h2 className="text-xs text-gray-500 mb-2">🇺🇸 Original</h2>
      <div className="prose prose-invert"><pre>{content}</pre></div>
    </div>
    <div>
      <h2 className="text-xs text-gray-500 mb-2">{translation.lang}</h2>
      <div className="prose prose-invert"><pre>{translation.content}</pre></div>
    </div>
  </div>
)}
```

Create `src/components/library/translation-panel.tsx` (modal with language picker, provider, translate button).

Save options:
1. Save as new file (e.g., `marketing-manual.ko.md` with frontmatter)
2. Just view (close without saving)

---

## Task Group 12: Update Roadmap.md

In workspace.rs, update `ROADMAP_CONTENT` to include Gemini cost tip and DM-integrated chat info.

---

## Task Group 13: Build + Test + Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
git add .
git commit -m "Week 3: Agents + DM chat + MCP + attachments + translation (BB v3.0)"
git log --oneline -10
```

---

## Success Criteria

✓ Workspace folder creation works even if Documents missing
✓ Theme toggle visibly changes colors
✓ Colors match landing page (gray-purple, not navy)
✓ Sidebar collapses + expand toggle works
✓ Profile avatar shows email initial / silhouette fallback
✓ Top bar buttons all clickable (DM/Notification panels open)
✓ TipTap renders markdown in Preview mode
✓ Drag image into editor → saves to .assets/ + inserts reference
✓ External edit detected (file watcher fires)
✓ Local MCP server responds at http://localhost:39001/health
✓ Can create agent from template
✓ Can DM agent and get AI response (Gemini Flash)
✓ Conversation saved to /agents/{name}/conversations/active.json
✓ Translate button works for Library file (5 languages)
✓ All builds pass (tsc + cargo)

---

## Reporting

1. All commits
2. Build status
3. Issues encountered
4. What was deferred to Week 4 (be honest about scope)
5. Manual Supabase migration needed? (avatars bucket)

Stop after Week 3. Wait for testing before Week 4.
