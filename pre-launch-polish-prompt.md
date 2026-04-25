# BB v3.0 Pre-Launch Polish: Automated Improvements

Read CLAUDE.md first.

**Goal:** Apply all "🔴 immediate" improvements that don't require manual external account setup. Run autonomously while user is away.

**Time estimate:** 4-6 hours autonomous work.

**Important:**
- BE HONEST about deferrals. If something requires external setup (Apple Dev account, Sentry DSN, Posthog key, code signing certificate), STOP that task and document it in `LAUNCH-CHECKLIST.md` for manual handling.
- Commit after each task group.
- Report status after each major section.

---

## Task Group 1: Tauri / Rust Improvements

### 1.1: OS Keychain for API keys

Replace localStorage API key storage with OS Keychain (Windows Credential Manager / Mac Keychain).

**Add Rust dependency:**

```toml
# src-tauri/Cargo.toml
[dependencies]
keyring = "2"
```

**Create `src-tauri/src/commands/keychain.rs`:**

```rust
use keyring::Entry;
use serde::{Serialize, Deserialize};

#[derive(Debug, thiserror::Error)]
pub enum KeychainError {
    #[error("Keychain error: {0}")]
    Keychain(String),
}

impl serde::Serialize for KeychainError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

const SERVICE_PREFIX: &str = "BossBoard.";

#[tauri::command]
pub async fn keychain_set(key: String, value: String) -> Result<(), KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, "default")
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    entry.set_password(&value)
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn keychain_get(key: String) -> Result<Option<String>, KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, "default")
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(KeychainError::Keychain(e.to_string())),
    }
}

#[tauri::command]
pub async fn keychain_delete(key: String) -> Result<(), KeychainError> {
    let service = format!("{}{}", SERVICE_PREFIX, key);
    let entry = Entry::new(&service, "default")
        .map_err(|e| KeychainError::Keychain(e.to_string()))?;
    let _ = entry.delete_password(); // Ignore "not found" errors
    Ok(())
}
```

**Register in `src-tauri/src/lib.rs` (or main.rs):**

```rust
mod commands;
use commands::keychain::*;

// Add to invoke_handler:
keychain_set, keychain_get, keychain_delete,
```

**TypeScript wrapper `src/lib/tauri/keychain.ts`:**

```typescript
import { invoke } from "@tauri-apps/api/core";

export async function setKey(key: string, value: string): Promise<void> {
  return invoke("keychain_set", { key, value });
}

export async function getKey(key: string): Promise<string | null> {
  return invoke("keychain_get", { key });
}

export async function deleteKey(key: string): Promise<void> {
  return invoke("keychain_delete", { key });
}

// Convenience wrappers for common keys
export const ApiKeys = {
  google: () => getKey("api_key_google"),
  anthropic: () => getKey("api_key_anthropic"),
  openai: () => getKey("api_key_openai"),
  grok: () => getKey("api_key_grok"),
  
  setGoogle: (k: string) => setKey("api_key_google", k),
  setAnthropic: (k: string) => setKey("api_key_anthropic", k),
  setOpenai: (k: string) => setKey("api_key_openai", k),
  setGrok: (k: string) => setKey("api_key_grok", k),
};
```

**Migrate Settings page** to use keychain instead of localStorage:

```typescript
// On load: read from keychain, fall back to localStorage (for migration)
useEffect(() => {
  (async () => {
    let key = await ApiKeys.google();
    if (!key) {
      // Migrate from localStorage
      key = localStorage.getItem("bb_api_key_google") || null;
      if (key) {
        await ApiKeys.setGoogle(key);
        localStorage.removeItem("bb_api_key_google"); // Cleanup
      }
    }
    setGeminiKey(key || "");
  })();
}, []);

// On save: write to keychain
async function saveKeys() {
  if (geminiKey) await ApiKeys.setGoogle(geminiKey);
  if (anthropicKey) await ApiKeys.setAnthropic(anthropicKey);
  setNotice("API keys saved securely to OS keychain.");
}
```

**Migrate executeDMTurn** to read from keychain:

```typescript
// src/lib/agents/execute.ts
import { ApiKeys } from "@/lib/tauri/keychain";

export async function executeDMTurn(agentName: string, userMessage: string) {
  // Read manual to determine provider
  const { frontmatter } = ...;
  const provider = (frontmatter as any).ai_provider || "google";
  
  // Get key from keychain (not localStorage)
  let apiKey: string | null = null;
  if (provider === "google") apiKey = await ApiKeys.google();
  else if (provider === "anthropic") apiKey = await ApiKeys.anthropic();
  else if (provider === "openai") apiKey = await ApiKeys.openai();
  else if (provider === "grok") apiKey = await ApiKeys.grok();
  
  if (!apiKey) throw new Error(`No ${provider} API key. Add in Settings.`);
  
  // ... rest unchanged
}
```

**Add capability:** `src-tauri/capabilities/default.json`:
- No new permissions needed (keyring crate works without Tauri permissions)

**Commit:**
```
git add .
git commit -m "OS Keychain for API keys (Windows Credential Manager / Mac Keychain)"
```

---

### 1.2: File watcher lifecycle (fix Box::leak)

**In `src-tauri/src/commands/watcher.rs`:**

Replace the `Box::leak` approach with proper state management:

```rust
use notify::{Watcher, RecursiveMode, recommended_watcher, EventKind, RecommendedWatcher};
use std::sync::{Arc, Mutex, mpsc};
use std::path::Path;
use tauri::{Emitter, State};

pub struct WatcherState {
    pub watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn start_watching_workspace(
    app: tauri::AppHandle,
    state: State<'_, WatcherState>,
    workspace_root: String,
) -> Result<(), String> {
    // Drop existing watcher (releases previous resources)
    let mut watcher_guard = state.watcher.lock()
        .map_err(|e| e.to_string())?;
    *watcher_guard = None;
    drop(watcher_guard);
    
    let (tx, rx) = mpsc::channel();
    let mut watcher = recommended_watcher(tx).map_err(|e| e.to_string())?;
    watcher.watch(Path::new(&workspace_root), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    
    let app_handle = app.clone();
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
                let _ = app_handle.emit("file-change", serde_json::json!({
                    "type": event_type,
                    "paths": paths,
                }));
            }
        }
    });
    
    // Store watcher in state (replaces previous)
    let mut watcher_guard = state.watcher.lock()
        .map_err(|e| e.to_string())?;
    *watcher_guard = Some(watcher);
    
    Ok(())
}

#[tauri::command]
pub async fn stop_watching_workspace(
    state: State<'_, WatcherState>,
) -> Result<(), String> {
    let mut watcher_guard = state.watcher.lock()
        .map_err(|e| e.to_string())?;
    *watcher_guard = None; // Drop watcher
    Ok(())
}
```

**Register state in `lib.rs`:**

```rust
.manage(WatcherState::default())
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    start_watching_workspace,
    stop_watching_workspace,
])
```

**Commit:**
```
git commit -m "File watcher proper lifecycle (replace Box::leak with State<>)"
```

---

### 1.3: Markdown round-trip (TipTap → real Markdown)

Currently TipTap returns HTML. Switch to true markdown round-trip.

**Install:**
```bash
npm install tiptap-markdown
```

**Update `src/components/library/markdown-renderer.tsx`:**

```typescript
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

export function MarkdownRenderer({ content, editable = false, onChange }: {
  content: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,                  // Don't allow raw HTML
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
      }),
      Link.configure({ openOnClick: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,                          // Pass markdown directly (gets parsed by tiptap-markdown)
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Get real markdown back (not HTML)
        const markdown = editor.storage.markdown.getMarkdown();
        onChange(markdown);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
```

**Update Library editor** to use markdown directly (no marked.js conversion):

In `src/app/desktop/library/edit/page.tsx`, the Live mode and Preview mode now both use MarkdownRenderer with markdown content. Source mode keeps textarea with raw markdown.

**Test case:** Edit a file in BB → save → open in VSCode → should be clean markdown (not HTML tags).

**Commit:**
```
git commit -m "TipTap markdown round-trip (replace HTML with tiptap-markdown)"
```

---

### 1.4: Tauri Asset Protocol (image rendering)

Enable local image rendering in TipTap.

**Update `src-tauri/tauri.conf.json`:**

```json
{
  "app": {
    "security": {
      "csp": null,
      "assetProtocol": {
        "enable": true,
        "scope": [
          "$DOCUMENT/BossBoard/**",
          "$HOME/Documents/BossBoard/**"
        ]
      }
    }
  }
}
```

**Add capability `src-tauri/capabilities/default.json`:**

```json
{
  "permissions": [
    // ... existing
    "core:asset:default",
    "core:asset:allow-read"
  ]
}
```

**Create image transformer for TipTap renderer:**

```typescript
// src/lib/library/image-resolver.ts
import { convertFileSrc } from "@tauri-apps/api/core";

export function resolveImagePath(src: string, currentFilePath: string): string {
  // Already a full URL or data URL
  if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("asset:")) {
    return src;
  }
  
  // Relative path → resolve against current file's directory
  const fileDir = currentFilePath.substring(0, currentFilePath.lastIndexOf("/"));
  const absolutePath = `${fileDir}/${src}`;
  
  return convertFileSrc(absolutePath);
}
```

**Update TipTap Image extension to use resolver:**

```typescript
import Image from "@tiptap/extension-image";

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        renderHTML: (attrs) => {
          const resolved = resolveImagePath(attrs.src, currentFilePath);
          return { src: resolved };
        },
      },
    };
  },
});
```

**Test:** Drop image into editor → save → reload page → image should render.

**Commit:**
```
git commit -m "Tauri asset protocol for local image rendering in TipTap"
```

---

## Task Group 2: Build / Performance

### 2.1: Turbopack activation

**Update `package.json`:**

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    // ... rest unchanged
  }
}
```

Verify Turbopack works:
```bash
npm run dev
# Should show "Turbopack" in output
```

If errors arise, fall back to `next dev` without `--turbo` and document the issue.

**Commit:**
```
git commit -m "Enable Turbopack for faster dev server"
```

---

### 2.2: Frontmatter migration system

**Create `src/lib/markdown/migrate.ts`:**

```typescript
import { type Frontmatter } from "./frontmatter";

interface Migration {
  version: number;
  description: string;
  migrate: (fm: any) => any;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Add agent_access array",
    migrate: (fm) => ({
      ...fm,
      agent_access: fm.agent_access || [],
    }),
  },
  {
    version: 2,
    description: "Add tags array",
    migrate: (fm) => ({
      ...fm,
      tags: fm.tags || [],
    }),
  },
  {
    version: 3,
    description: "Add created/modified timestamps",
    migrate: (fm) => ({
      ...fm,
      created: fm.created || new Date().toISOString(),
      modified: fm.modified || new Date().toISOString(),
    }),
  },
];

const CURRENT_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export function migrateFrontmatter(fm: any): { frontmatter: Frontmatter; migrated: boolean } {
  let current = fm.schema_version || 0;
  let migrated = false;
  
  if (current >= CURRENT_VERSION) {
    return { frontmatter: fm as Frontmatter, migrated: false };
  }
  
  let result = { ...fm };
  for (const migration of MIGRATIONS) {
    if (current < migration.version) {
      result = migration.migrate(result);
      current = migration.version;
      migrated = true;
    }
  }
  
  result.schema_version = CURRENT_VERSION;
  return { frontmatter: result as Frontmatter, migrated };
}
```

**Apply migration when reading files:**

In `src/lib/library/service.ts`, in `readLibraryFile`:

```typescript
import { migrateFrontmatter } from "@/lib/markdown/migrate";

export async function readLibraryFile(path: string) {
  const raw = await readFile(path);
  const parsed = parseMarkdown(raw);
  
  const { frontmatter, migrated } = migrateFrontmatter(parsed.frontmatter);
  
  if (migrated) {
    // Save migrated version back
    await saveLibraryFile(path, frontmatter, parsed.content);
  }
  
  return { frontmatter, content: parsed.content, raw };
}
```

**Commit:**
```
git commit -m "Frontmatter schema migration system (auto-upgrade old files)"
```

---

## Task Group 3: AI / Streaming

### 3.1: Vercel AI SDK + Streaming

**Install:**
```bash
npm install ai @ai-sdk/google @ai-sdk/anthropic @ai-sdk/openai
```

**Refactor `src/lib/agents/execute.ts`:**

```typescript
import { streamText, generateText, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { ApiKeys } from "@/lib/tauri/keychain";
import { readFile } from "@/lib/tauri/fs";
import { parseMarkdown } from "@/lib/markdown/frontmatter";

async function getModel(provider: string, modelName: string): Promise<LanguageModel> {
  if (provider === "google") {
    const key = await ApiKeys.google();
    if (!key) throw new Error("No Google API key. Add in Settings.");
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = key; // SDK reads from env
    return google(modelName || "gemini-2.5-flash");
  }
  if (provider === "anthropic") {
    const key = await ApiKeys.anthropic();
    if (!key) throw new Error("No Anthropic API key. Add in Settings.");
    process.env.ANTHROPIC_API_KEY = key;
    return anthropic(modelName || "claude-sonnet-4-20250514");
  }
  if (provider === "openai") {
    const key = await ApiKeys.openai();
    if (!key) throw new Error("No OpenAI API key. Add in Settings.");
    process.env.OPENAI_API_KEY = key;
    return openai(modelName || "gpt-4o");
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

export async function executeDMTurn(
  agentName: string,
  userMessage: string,
  onChunk?: (chunk: string) => void  // For streaming
): Promise<string> {
  const root = localStorage.getItem("bb_workspace_path") || "";
  const manualPath = `${root}/agents/${agentName}/manual.md`;
  const memoryPath = `${root}/agents/${agentName}/memory.md`;

  const manualRaw = await readFile(manualPath);
  const memoryRaw = await readFile(memoryPath).catch(() => "");
  const { frontmatter, content: manualContent } = parseMarkdown(manualRaw);
  const provider = (frontmatter as any).ai_provider || "google";
  const modelName = (frontmatter as any).model || "";

  const systemPrompt = `${manualContent}\n\n## Memory (past conversations summary)\n${memoryRaw}`;

  const model = await getModel(provider, modelName);

  if (onChunk) {
    // Streaming mode
    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: userMessage,
      maxTokens: 4096,
    });
    
    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
      onChunk(chunk);
    }
    return fullText;
  } else {
    // Non-streaming
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userMessage,
      maxTokens: 4096,
    });
    return text;
  }
}
```

**Update DM panel to use streaming:**

```typescript
// In dm-panel.tsx send():
async function send() {
  // ... existing setup
  
  // Add empty agent message (will fill via streaming)
  const agentMsg: Message = { role: "agent", content: "", timestamp: new Date().toISOString() };
  let updated = [...newMessages, agentMsg];
  setMessages(updated);
  
  try {
    await executeDMTurn(selectedAgent, input, (chunk) => {
      // Append chunk to last message
      setMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = {
          ...newArr[newArr.length - 1],
          content: newArr[newArr.length - 1].content + chunk,
        };
        return newArr;
      });
    });
    
    // Save final state
    const finalMessages = ...; // get latest state
    await writeFile(path, JSON.stringify(finalMessages, null, 2));
  } catch (e: any) {
    setError(e.message);
  } finally {
    setSending(false);
  }
}
```

**Note:** AI SDK uses fetch which works in Tauri. May need to add CSP exception for AI provider URLs if CSP enabled.

**Commit:**
```
git commit -m "Vercel AI SDK + streaming responses (typing effect)"
```

---

## Task Group 4: Data / Privacy

### 4.1: Data export feature

**Install JSZip:**
```bash
npm install jszip
```

**Create `src/lib/export/data-export.ts`:**

```typescript
import JSZip from "jszip";
import { readFile, listDirectory } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";

async function readAllFiles(path: string, basePath: string = path): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const entries = await listDirectory(path);
  
  for (const entry of entries) {
    if (entry.is_directory) {
      const sub = await readAllFiles(entry.path, basePath);
      for (const [k, v] of sub) files.set(k, v);
    } else {
      try {
        const content = await readFile(entry.path);
        const relative = entry.path.replace(basePath, "").replace(/^\/+/, "");
        files.set(relative, content);
      } catch (e) {
        console.error(`Failed to read ${entry.path}:`, e);
      }
    }
  }
  return files;
}

export async function exportUserData(): Promise<Blob> {
  const zip = new JSZip();
  const supabase = createClient();
  
  // 1. Profile + cloud data
  const { data: { user } } = await supabase.auth.getUser();
  const cloudData: any = {
    exported_at: new Date().toISOString(),
    user_id: user?.id,
    email: user?.email,
  };
  
  // Profile
  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    cloudData.profile = profile;
  } catch {}
  
  // Board posts
  try {
    const { data: posts } = await supabase.from("board_posts").select("*").eq("user_id", user?.id);
    cloudData.board_posts = posts || [];
  } catch {}
  
  // Calendar events
  try {
    const { data: events } = await supabase.from("calendar_events").select("*").eq("user_id", user?.id);
    cloudData.calendar_events = events || [];
  } catch {}
  
  zip.file("cloud-data.json", JSON.stringify(cloudData, null, 2));
  
  // 2. Local workspace files
  const workspace = localStorage.getItem("bb_workspace_path");
  if (workspace) {
    const files = await readAllFiles(workspace);
    const workspaceFolder = zip.folder("workspace")!;
    for (const [path, content] of files) {
      workspaceFolder.file(path, content);
    }
  }
  
  // 3. README
  zip.file("README.md", `# BossBoard Data Export

Exported: ${new Date().toISOString()}
Email: ${user?.email}

## Contents

- \`cloud-data.json\` - Your profile, board posts, calendar events
- \`workspace/\` - All your local files (Library, agents, conversations, etc.)

## Privacy

This export contains all data BossBoard has about you.

If you want to delete your account:
1. Settings → Account → Delete account
2. Or email jay@mybossboard.com

## Importing elsewhere

The \`workspace/\` folder is plain markdown — usable in any editor (VSCode, Obsidian, etc.).
The \`cloud-data.json\` is for reference only.
`);
  
  return zip.generateAsync({ type: "blob" });
}

export async function downloadExport() {
  const blob = await exportUserData();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bossboard-export-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Add to Settings page:**

```tsx
// In Settings:
<section className="mt-8">
  <h2 className="text-lg font-semibold mb-2">Data & Privacy</h2>
  
  <div className="p-4 bg-bb-card rounded-md border border-bb-border">
    <h3 className="font-medium">Export your data</h3>
    <p className="text-sm text-gray-400 mb-3">
      Download all your BossBoard data as a ZIP file (GDPR compliant).
    </p>
    <button
      onClick={async () => {
        try {
          await downloadExport();
        } catch (e: any) {
          alert(`Export failed: ${e.message}`);
        }
      }}
      className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
    >
      Export all data (.zip)
    </button>
  </div>
  
  <div className="mt-3 p-4 bg-bb-card rounded-md border border-red-900">
    <h3 className="font-medium text-red-400">Delete account</h3>
    <p className="text-sm text-gray-400 mb-3">
      Permanently delete your BossBoard account and all cloud data. Your local workspace folder will remain on your PC.
    </p>
    <button
      onClick={() => alert("To delete your account, please email jay@mybossboard.com. Self-service deletion coming in v3.1.")}
      className="px-4 py-2 border border-red-900 text-red-400 hover:bg-red-900/20 rounded-md text-sm"
    >
      Delete account
    </button>
  </div>
</section>
```

**Commit:**
```
git commit -m "Data export feature (GDPR compliance) + delete account placeholder"
```

---

### 4.2: Auto-backup foundation

**Create `src-tauri/src/commands/backup.rs`:**

```rust
use std::path::PathBuf;
use std::fs;
use chrono::Utc;
use super::fs::FsError;

#[tauri::command]
pub async fn create_workspace_backup(workspace_root: String) -> Result<String, FsError> {
    let workspace = PathBuf::from(&workspace_root);
    let backup_dir = workspace.join(".bb").join("backups");
    fs::create_dir_all(&backup_dir)?;
    
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_path = backup_dir.join(format!("backup-{}.zip", timestamp));
    
    // For v3.0: just create metadata snapshot. Full ZIP backup = post-launch.
    // (Full ZIP would require zip crate — keeping deps minimal for now)
    
    let info = serde_json::json!({
        "timestamp": timestamp,
        "workspace": workspace_root,
        "type": "metadata-snapshot",
        "note": "Full ZIP backup coming in v3.1. For now, your files are already saved as markdown — copy the workspace folder anywhere to back up."
    });
    
    fs::write(&backup_path.with_extension("json"), serde_json::to_string_pretty(&info).unwrap())?;
    
    Ok(backup_path.to_string_lossy().to_string())
}
```

**Register and expose** in lib.rs.

**Commit:**
```
git commit -m "Backup foundation (metadata snapshot, full ZIP in v3.1)"
```

---

## Task Group 5: Code Quality

### 5.1: Zod runtime validation

**Install:**
```bash
npm install zod
```

**Create `src/lib/markdown/schema.ts`:**

```typescript
import { z } from "zod";

export const FrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()).default([]),
  agent_access: z.array(z.string()).default([]),
  created: z.string().optional(),
  modified: z.string().optional(),
  hash: z.string().optional(),
  schema_version: z.number().optional(),
}).passthrough(); // Allow extra fields (for agent manuals etc.)

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export const AgentManualFrontmatterSchema = FrontmatterSchema.extend({
  role: z.string().optional(),
  ai_provider: z.enum(["anthropic", "google", "openai", "grok", "local"]).default("google"),
  model: z.string().default("gemini-2.5-flash"),
  temperature: z.number().min(0).max(2).default(0.7),
  status: z.enum(["active", "idle", "stopped"]).default("idle"),
  permissions: z.object({
    read: z.array(z.string()).default([]),
    write: z.array(z.string()).default([]),
    file_request: z.boolean().default(true),
  }).optional(),
});
```

**Use in parser:**

```typescript
import { FrontmatterSchema } from "./schema";

export function parseMarkdown(raw: string): ParsedMarkdown {
  try {
    const parsed = matter(raw);
    const validated = FrontmatterSchema.safeParse(parsed.data);
    return {
      frontmatter: validated.success ? validated.data : { id: generateId(), title: "Untitled" },
      content: parsed.content,
      raw,
    };
  } catch {
    return {
      frontmatter: { id: generateId(), title: "Untitled" },
      content: raw,
      raw,
    };
  }
}
```

**Commit:**
```
git commit -m "Zod runtime validation for frontmatter schema"
```

---

### 5.2: Sentry activation

**Already configured in project:** Check `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.

**Update to actually capture errors:**

`sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "", // User adds DSN later
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,        // Privacy: mask user content
      blockAllMedia: true,
    }),
  ],
  
  beforeSend(event) {
    // Strip API keys / secrets
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
    }
    return event;
  },
});
```

**Add error boundary** at desktop layout:

```typescript
// src/app/desktop/error.tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-gray-400 mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = "/desktop/dashboard"}
          className="px-4 py-2 border border-bb-border hover:bg-bb-card rounded-md text-sm"
        >
          Back to Dashboard
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-6">
        Error reported automatically. Email jay@mybossboard.com if it persists.
      </p>
    </div>
  );
}
```

**Document in LAUNCH-CHECKLIST.md:** Sentry DSN required (free tier, manual setup).

**Commit:**
```
git commit -m "Sentry error tracking + error boundary"
```

---

## Task Group 6: ESLint Strengthening

**Update `.eslintrc.json` (or eslint.config.mjs):**

```javascript
// eslint.config.mjs
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({});

export default [
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("plugin:@typescript-eslint/recommended"),
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off", // Too aggressive
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
```

**Run linter:**
```bash
npx eslint src/ --fix
```

**Commit changes:**
```
git commit -m "ESLint strengthening + auto-fix"
```

---

## Task Group 7: Final Build Validation

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint src/

# Rust check
cd src-tauri && cargo check && cd ..

# Production build test (skip if takes too long)
# npm run build

# Final commit
git add .
git commit -m "Pre-launch polish complete: keychain + lifecycle + AI SDK + Zod + Sentry + export"
git log --oneline -20
```

---

## LAUNCH-CHECKLIST.md (Manual tasks for user)

After this Claude Code session, create `LAUNCH-CHECKLIST.md` in project root with manual tasks the user needs to handle. Include:

```markdown
# BossBoard Launch Checklist (Manual Tasks)

These tasks require external accounts/services and must be done manually by Jay.

## 🔴 Required before beta launch

### 1. Sentry DSN setup
- Sign up at https://sentry.io (free tier)
- Create new project (Next.js)
- Copy DSN
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
  ```

### 2. Apple Developer Program (Mac signing)
- Sign up at https://developer.apple.com/programs/
- $99/year
- 1-3 day approval
- After approval: configure signing in Tauri build

### 3. Windows Code Signing (optional but recommended)
- Option A: Sectigo OV Certificate (~$200/year)
- Option B: Azure Trusted Signing (~$10/month, recommended)
- Option C: SignPath (free for open source)

### 4. Production builds + test
- Run `npm run tauri:build` (15-30 min)
- Test .msi installer on a CLEAN PC (not your dev machine)
- Verify first-run wizard works
- Verify auto-update channel configured

### 5. Cloudflare security
- DNS Full SSL (Strict)
- HSTS enabled
- Bot Fight Mode on
- Rate limiting on /api/auth/*
- DNSSEC enabled
- WAF Managed Rules

### 6. Supabase production
- Verify all tables have RLS
- Test Paddle webhook with real payment
- Backup current database before launch
- Set up daily backup (Pro tier $25/mo)

### 7. Paddle setup
- Verify product IDs match your config
- Test sandbox checkout flow
- Configure tax settings
- Set up payout method

### 8. Domain + email
- mybossboard.com pointing to Vercel
- jay@mybossboard.com email forwarding (Namecheap)
- Test transactional emails (Resend)

### 9. Marketing assets
- Landing page final review
- Pricing page final review
- FAQ updated for v3.0
- Terms of Service + Privacy Policy reviewed
- README.md / changelog

## 🟡 Post-launch (v3.1 prep)

### Posthog analytics
- Sign up at https://posthog.com (free 1M events/month)
- Add `NEXT_PUBLIC_POSTHOG_KEY` to env
- Implement event tracking

### GitHub Actions CI/CD
- Setup `.github/workflows/release.yml`
- Auto-build on git tag

### Tauri Auto-Updater
- Generate update signing key
- Setup update server (Vercel route)
- Configure tauri.conf.json with public key

## 🟢 Long-term

- Apple notarization automation
- Windows SmartScreen reputation building
- Code review by external developer (security audit)
- GDPR compliance review
- SOC2 (if targeting enterprise)
```

---

## Reporting

After all tasks complete, report:

1. All commits made (count + names)
2. Build status (TS + Rust)
3. What was deferred and why
4. Files created (new components, schemas, etc.)
5. LAUNCH-CHECKLIST.md location and key items
6. Any errors encountered
7. Time spent

Stop after Task Group 7. User will run final tests when back.
