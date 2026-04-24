# BB v3.0 Week 2: Auth + Library Editor + Local Metadata

Read CLAUDE.md first for full v3.0 context.

**Goal:** Tauri app entry point routes to login first, local auth via Supabase, Library with 3-mode markdown editor, YAML frontmatter, local SQLite metadata index, Obsidian-style attachments.

**Time estimate:** 4-6 hours on i7-7700HQ + 16GB RAM.

---

## Pre-flight

Verify Week 1 completed:
- `src-tauri/` exists
- `/desktop` page exists
- `npx tauri --version` returns 2.x
- `cargo check` passes in `src-tauri/`

---

## Task Group 1: Tauri Entry Point + Workspace Init

### 1.1: Route Tauri to /login by default

Update `src/app/desktop/page.tsx` to redirect based on auth state:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/tauri/fs";
import { 
  selectWorkspaceFolder, 
  initializeWorkspace, 
  isWorkspace,
  getDefaultWorkspacePath 
} from "@/lib/tauri/workspace";

export default function DesktopPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"loading" | "welcome" | "ready">("loading");
  const [defaultPath, setDefaultPath] = useState<string>("");

  useEffect(() => {
    (async () => {
      // Check if workspace initialized
      if (isTauri()) {
        const saved = localStorage.getItem("bb_workspace_path");
        if (saved && (await isWorkspace(saved))) {
          // Workspace OK → check auth
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace("/desktop/dashboard");
          } else {
            router.replace("/desktop/login");
          }
        } else {
          const def = await getDefaultWorkspacePath();
          setDefaultPath(def);
          setStage("welcome");
        }
      } else {
        // Not Tauri — redirect to web
        window.location.href = "/";
      }
    })();
  }, [router]);

  async function handleChooseFolder() {
    const selected = await selectWorkspaceFolder();
    if (selected) await setupWorkspace(selected);
  }

  async function handleUseDefault() {
    await setupWorkspace(defaultPath);
  }

  async function setupWorkspace(path: string) {
    try {
      await initializeWorkspace(path);
      localStorage.setItem("bb_workspace_path", path);
      router.replace("/desktop/login");
    } catch (e) {
      alert(`Error: ${e}`);
    }
  }

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading BossBoard…</div>
      </div>
    );
  }

  if (stage === "welcome") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white p-8">
        <div className="max-w-xl mx-auto mt-20">
          <h1 className="text-4xl font-bold mb-4">Welcome to BossBoard</h1>
          <p className="text-gray-400 mb-8">
            Let's set up your workspace folder. This is where your files will live.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleUseDefault}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-md text-left transition"
            >
              <div className="font-semibold">Use default location</div>
              <div className="text-sm text-gray-200 mt-1">{defaultPath}</div>
            </button>
            
            <button
              onClick={handleChooseFolder}
              className="w-full p-4 border border-gray-700 hover:border-gray-500 rounded-md text-left transition"
            >
              <div className="font-semibold">Choose custom folder</div>
              <div className="text-sm text-gray-400 mt-1">
                Pick where to store your BossBoard files
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

### 1.2: Configure Tauri to load /desktop by default

Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000/desktop",
    "frontendDist": "../out"
  }
}
```

This makes Tauri dev open at `/desktop` instead of `/`.

### 1.3: Commit

```bash
git add .
git commit -m "Tauri entry point routes to desktop (BB v3.0 Week 2)"
```

---

## Task Group 2: Desktop-Only Login Page

### 2.1: Create login page

Create `src/app/desktop/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/tauri/fs";
import { open as openExternal } from "@tauri-apps/plugin-shell";

export default function DesktopLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/desktop/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    try {
      // Open OAuth flow in user's default browser
      const redirectTo = `${window.location.origin}/auth/callback`;
      if (isTauri()) {
        // Generate OAuth URL and open in browser
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true }
        });
        if (error) throw error;
        if (data?.url) {
          await openExternal(data.url);
          // User completes OAuth in browser → redirects back → we poll for session
          pollForSession();
        }
      } else {
        await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  async function pollForSession() {
    // Poll every 2 seconds for up to 2 minutes
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/desktop/dashboard");
        return;
      }
    }
    setError("Login timed out. Please try again.");
    setLoading(false);
  }

  async function handleCreateAccount() {
    if (isTauri()) {
      await openExternal("https://mybossboard.com/signup");
    } else {
      router.push("/signup");
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">BossBoard</h1>
          <p className="text-sm text-gray-400 mt-1">Local-first AI agent workspace</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full p-3 bg-white text-black rounded-md font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            disabled={loading}
            className="w-full p-3 bg-[#24292e] text-white rounded-md font-medium hover:bg-[#333] disabled:opacity-50"
          >
            Continue with GitHub
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0C0F17] px-2 text-gray-500">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-[#141824] border border-gray-700 rounded-md text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-[#141824] border border-gray-700 rounded-md text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 hover:bg-blue-500 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          New to BossBoard?{" "}
          <button onClick={handleCreateAccount} className="text-blue-400 hover:underline">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 2.2: Handle Tauri OAuth callback

Create `src/app/auth/callback/page.tsx` (if doesn't exist) that redirects back to desktop/login after OAuth success. The existing Supabase auth callback should work — verify it handles OAuth properly.

### 2.3: Create desktop dashboard placeholder

Create `src/app/desktop/dashboard/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DesktopDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspacePath, setWorkspacePath] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/desktop/login");
        return;
      }
      setUser(session.user);
      const path = localStorage.getItem("bb_workspace_path") || "";
      setWorkspacePath(path);
    })();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/desktop/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">BossBoard</h1>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-white">
            Sign out
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Signed in as</div>
            <div className="text-lg mt-1">{user.email}</div>
          </div>
          
          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Workspace</div>
            <div className="text-sm text-gray-300 mt-1 font-mono">{workspacePath}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => router.push("/desktop/library")}
              className="p-6 bg-[#141824] rounded-md border border-gray-800 hover:border-blue-500 transition text-left"
            >
              <div className="text-xl font-semibold">Library</div>
              <div className="text-sm text-gray-400 mt-1">Wiki pages and manuals</div>
            </button>
            <button
              disabled
              className="p-6 bg-[#141824] rounded-md border border-gray-800 opacity-50 text-left cursor-not-allowed"
            >
              <div className="text-xl font-semibold">Agents</div>
              <div className="text-sm text-gray-400 mt-1">Coming in Week 3</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.4: Offline detection banner

Create `src/components/desktop/offline-banner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-900/30 border-b border-yellow-800 text-yellow-200 text-sm py-2 px-4 text-center">
      ⚠️ Offline mode — Cloud sync, AI calls, and MCP features unavailable. Local editing still works.
    </div>
  );
}
```

Add to desktop layout `src/app/desktop/layout.tsx`:

```tsx
import { OfflineBanner } from "@/components/desktop/offline-banner";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
```

### 2.5: Commit

```bash
git add .
git commit -m "Desktop login + dashboard placeholder + offline banner (BB v3.0 Week 2)"
```

---

## Task Group 3: Local Metadata Database (SQLite)

### 3.1: SQLite schema + Rust commands

Create `src-tauri/src/commands/metadata.rs`:

```rust
use rusqlite::{Connection, params};
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use super::fs::FsError;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub path: String,
    pub title: String,
    pub tags: Vec<String>,
    pub agent_access: Vec<String>,
    pub hash: String,
    pub size: i64,
    pub modified: i64,
    pub content_preview: String,
}

fn db_path(workspace_root: &str) -> PathBuf {
    PathBuf::from(workspace_root).join(".bb/metadata.sqlite")
}

fn ensure_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS file_metadata (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            tags TEXT,
            agent_access TEXT,
            hash TEXT,
            size INTEGER,
            modified INTEGER,
            content_preview TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_path ON file_metadata(path);
        CREATE INDEX IF NOT EXISTS idx_title ON file_metadata(title);
        CREATE INDEX IF NOT EXISTS idx_modified ON file_metadata(modified);
        CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(
            id, title, tags, content_preview
        );
    "#)?;
    Ok(())
}

#[tauri::command]
pub async fn metadata_upsert(
    workspace_root: String,
    meta: FileMetadata,
) -> Result<(), FsError> {
    let path = db_path(&workspace_root);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    let tags = meta.tags.join(",");
    let agent_access = meta.agent_access.join(",");
    
    conn.execute(
        r#"INSERT OR REPLACE INTO file_metadata
           (id, path, title, tags, agent_access, hash, size, modified, content_preview)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
        params![
            meta.id, meta.path, meta.title, tags, agent_access,
            meta.hash, meta.size, meta.modified, meta.content_preview
        ],
    ).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    conn.execute(
        "INSERT OR REPLACE INTO file_search (id, title, tags, content_preview) VALUES (?1, ?2, ?3, ?4)",
        params![meta.id, meta.title, tags, meta.content_preview],
    ).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    Ok(())
}

#[tauri::command]
pub async fn metadata_list(
    workspace_root: String,
    folder: Option<String>,
) -> Result<Vec<FileMetadata>, FsError> {
    let path = db_path(&workspace_root);
    if !path.exists() {
        return Ok(vec![]);
    }
    let conn = Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    let query = match folder {
        Some(f) => format!(
            "SELECT * FROM file_metadata WHERE path LIKE '{}%' ORDER BY modified DESC", f),
        None => "SELECT * FROM file_metadata ORDER BY modified DESC".to_string(),
    };
    
    let mut stmt = conn.prepare(&query).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        let tags: String = row.get(3).unwrap_or_default();
        let agent_access: String = row.get(4).unwrap_or_default();
        Ok(FileMetadata {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            tags: if tags.is_empty() { vec![] } else { tags.split(',').map(String::from).collect() },
            agent_access: if agent_access.is_empty() { vec![] } else { agent_access.split(',').map(String::from).collect() },
            hash: row.get(5).unwrap_or_default(),
            size: row.get(6).unwrap_or(0),
            modified: row.get(7).unwrap_or(0),
            content_preview: row.get(8).unwrap_or_default(),
        })
    }).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    let mut results = vec![];
    for row in rows {
        if let Ok(r) = row { results.push(r); }
    }
    Ok(results)
}

#[tauri::command]
pub async fn metadata_search(
    workspace_root: String,
    query: String,
) -> Result<Vec<FileMetadata>, FsError> {
    let path = db_path(&workspace_root);
    if !path.exists() {
        return Ok(vec![]);
    }
    let conn = Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    ensure_schema(&conn).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    let sql = r#"
        SELECT m.* FROM file_metadata m
        JOIN file_search s ON m.id = s.id
        WHERE file_search MATCH ?1
        ORDER BY rank
        LIMIT 50
    "#;
    
    let mut stmt = conn.prepare(sql).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    let rows = stmt.query_map(params![query], |row| {
        let tags: String = row.get(3).unwrap_or_default();
        let agent_access: String = row.get(4).unwrap_or_default();
        Ok(FileMetadata {
            id: row.get(0)?,
            path: row.get(1)?,
            title: row.get(2)?,
            tags: if tags.is_empty() { vec![] } else { tags.split(',').map(String::from).collect() },
            agent_access: if agent_access.is_empty() { vec![] } else { agent_access.split(',').map(String::from).collect() },
            hash: row.get(5).unwrap_or_default(),
            size: row.get(6).unwrap_or(0),
            modified: row.get(7).unwrap_or(0),
            content_preview: row.get(8).unwrap_or_default(),
        })
    }).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    
    let mut results = vec![];
    for row in rows {
        if let Ok(r) = row { results.push(r); }
    }
    Ok(results)
}

#[tauri::command]
pub async fn metadata_delete(workspace_root: String, id: String) -> Result<(), FsError> {
    let path = db_path(&workspace_root);
    let conn = Connection::open(&path).map_err(|e| FsError::InvalidPath(e.to_string()))?;
    conn.execute("DELETE FROM file_metadata WHERE id = ?1", params![id])
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    conn.execute("DELETE FROM file_search WHERE id = ?1", params![id])
        .map_err(|e| FsError::InvalidPath(e.to_string()))?;
    Ok(())
}
```

### 3.2: Register commands

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod fs;
pub mod workspace;
pub mod metadata;
```

Update `src-tauri/src/lib.rs` (or main.rs) handler list to include metadata commands.

### 3.3: TypeScript wrapper

Create `src/lib/tauri/metadata.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";

export interface FileMetadata {
  id: string;
  path: string;
  title: string;
  tags: string[];
  agent_access: string[];
  hash: string;
  size: number;
  modified: number;
  content_preview: string;
}

export async function metadataUpsert(workspaceRoot: string, meta: FileMetadata): Promise<void> {
  return invoke("metadata_upsert", { workspaceRoot, meta });
}

export async function metadataList(workspaceRoot: string, folder?: string): Promise<FileMetadata[]> {
  return invoke("metadata_list", { workspaceRoot, folder });
}

export async function metadataSearch(workspaceRoot: string, query: string): Promise<FileMetadata[]> {
  return invoke("metadata_search", { workspaceRoot, query });
}

export async function metadataDelete(workspaceRoot: string, id: string): Promise<void> {
  return invoke("metadata_delete", { workspaceRoot, id });
}
```

### 3.4: Commit

```bash
git add .
git commit -m "Local SQLite metadata + FTS search (BB v3.0 Week 2)"
```

---

## Task Group 4: YAML Frontmatter + File Ops

### 4.1: Frontmatter parser

Install gray-matter:

```bash
npm install gray-matter
```

Create `src/lib/markdown/frontmatter.ts`:

```typescript
import matter from "gray-matter";
import { createHash } from "crypto";

export interface Frontmatter {
  id: string;
  title: string;
  tags?: string[];
  agent_access?: string[];
  created?: string;
  modified?: string;
  hash?: string;
}

export interface ParsedMarkdown {
  frontmatter: Frontmatter;
  content: string;
  raw: string;
}

export function parseMarkdown(raw: string): ParsedMarkdown {
  try {
    const parsed = matter(raw);
    return {
      frontmatter: parsed.data as Frontmatter,
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

export function stringifyMarkdown(fm: Frontmatter, content: string): string {
  return matter.stringify(content, fm as any);
}

export function generateId(): string {
  return `wiki_${Math.random().toString(36).substring(2, 15)}`;
}

export function computeHash(content: string): string {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    // Browser: use subtle crypto (async, simplified to sync fallback)
  }
  // Simple hash fallback
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  }
  return `sha1:${h.toString(16)}`;
}

export function contentPreview(content: string, maxLen = 200): string {
  return content.replace(/\s+/g, " ").trim().slice(0, maxLen);
}
```

### 4.2: Library file service

Create `src/lib/library/service.ts`:

```typescript
import { readFile, writeFile, listDirectory, createDirectory, fileExists } from "@/lib/tauri/fs";
import { parseMarkdown, stringifyMarkdown, generateId, computeHash, contentPreview, type Frontmatter } from "@/lib/markdown/frontmatter";
import { metadataUpsert, metadataDelete, type FileMetadata } from "@/lib/tauri/metadata";

export function getWorkspaceRoot(): string {
  return localStorage.getItem("bb_workspace_path") || "";
}

export function libraryPath(): string {
  return `${getWorkspaceRoot()}/Library`;
}

export interface LibraryFile {
  path: string;
  name: string;
  is_directory: boolean;
  frontmatter?: Frontmatter;
  preview?: string;
}

export async function listLibrary(subfolder = ""): Promise<LibraryFile[]> {
  const target = subfolder ? `${libraryPath()}/${subfolder}` : libraryPath();
  const files = await listDirectory(target);
  const result: LibraryFile[] = [];
  
  for (const f of files) {
    // Skip .assets folders (they're attachments, not content)
    if (f.is_directory && f.name.endsWith(".assets")) continue;
    // Skip hidden files
    if (f.name.startsWith(".")) continue;
    
    if (f.is_directory) {
      result.push({
        path: f.path,
        name: f.name,
        is_directory: true,
      });
    } else if (f.name.endsWith(".md")) {
      try {
        const raw = await readFile(f.path);
        const parsed = parseMarkdown(raw);
        result.push({
          path: f.path,
          name: f.name,
          is_directory: false,
          frontmatter: parsed.frontmatter,
          preview: contentPreview(parsed.content),
        });
      } catch {
        result.push({
          path: f.path,
          name: f.name,
          is_directory: false,
        });
      }
    }
  }
  
  return result;
}

export async function readLibraryFile(path: string) {
  const raw = await readFile(path);
  return parseMarkdown(raw);
}

export async function saveLibraryFile(path: string, frontmatter: Frontmatter, content: string) {
  // Update modified timestamp + hash
  frontmatter.modified = new Date().toISOString();
  frontmatter.hash = computeHash(content);
  
  const raw = stringifyMarkdown(frontmatter, content);
  await writeFile(path, raw);
  
  // Update local metadata DB
  const workspace = getWorkspaceRoot();
  if (workspace) {
    const meta: FileMetadata = {
      id: frontmatter.id,
      path,
      title: frontmatter.title,
      tags: frontmatter.tags || [],
      agent_access: frontmatter.agent_access || [],
      hash: frontmatter.hash,
      size: raw.length,
      modified: Math.floor(Date.now() / 1000),
      content_preview: contentPreview(content),
    };
    await metadataUpsert(workspace, meta);
  }
}

export async function createLibraryFile(name: string, subfolder = ""): Promise<string> {
  const target = subfolder ? `${libraryPath()}/${subfolder}` : libraryPath();
  const path = `${target}/${name}.md`;
  
  if (await fileExists(path)) {
    throw new Error(`File already exists: ${name}.md`);
  }
  
  const fm: Frontmatter = {
    id: generateId(),
    title: name,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
  
  await saveLibraryFile(path, fm, `# ${name}\n\nStart writing...`);
  return path;
}
```

### 4.3: Commit

```bash
git add .
git commit -m "YAML frontmatter parser + library service (BB v3.0 Week 2)"
```

---

## Task Group 5: Library UI — List + Editor

### 5.1: Library list page

Create `src/app/desktop/library/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listLibrary, createLibraryFile, type LibraryFile } from "@/lib/library/service";

export default function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadFiles() {
    try {
      setLoading(true);
      const result = await listLibrary();
      setFiles(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFiles(); }, []);

  async function handleCreate() {
    if (!newFileName.trim()) return;
    setCreating(true);
    try {
      await createLibraryFile(newFileName.trim());
      setNewFileName("");
      await loadFiles();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/desktop/dashboard" className="text-sm text-gray-400 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-2">Library</h1>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="New page name..."
            value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="flex-1 p-2 bg-[#141824] border border-gray-700 rounded-md text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newFileName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : files.length === 0 ? (
          <div className="text-gray-400">No files yet. Create your first page above.</div>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <Link
                key={f.path}
                href={`/desktop/library/edit?path=${encodeURIComponent(f.path)}`}
                className="block p-4 bg-[#141824] rounded-md border border-gray-800 hover:border-blue-500 transition"
              >
                <div className="flex items-center gap-2">
                  <span>{f.is_directory ? "📁" : "📄"}</span>
                  <span className="font-medium">
                    {f.frontmatter?.title || f.name.replace(".md", "")}
                  </span>
                  {f.frontmatter?.tags && f.frontmatter.tags.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {f.frontmatter.tags.map(t => (
                        <span key={t} className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {f.preview && (
                  <div className="text-sm text-gray-400 mt-1 line-clamp-2">{f.preview}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5.2: Editor page (3-mode toggle)

Create `src/app/desktop/library/edit/page.tsx`:

```tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { readLibraryFile, saveLibraryFile } from "@/lib/library/service";
import { type Frontmatter } from "@/lib/markdown/frontmatter";

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const filePath = params.get("path") || "";
  
  const [frontmatter, setFrontmatter] = useState<Frontmatter | null>(null);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"source" | "live" | "preview">("live");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!filePath) return;
    (async () => {
      try {
        const { frontmatter, content } = await readLibraryFile(filePath);
        setFrontmatter(frontmatter);
        setContent(content);
      } catch (e: any) {
        alert(`Failed to load: ${e.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [filePath]);

  async function handleSave() {
    if (!frontmatter) return;
    setSaving(true);
    try {
      await saveLibraryFile(filePath, frontmatter, content);
      setDirty(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Keyboard shortcut: Cmd/Ctrl + S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [frontmatter, content, filePath]);

  if (loading) {
    return <div className="min-h-screen bg-[#0C0F17] text-white p-8">Loading…</div>;
  }

  if (!frontmatter) {
    return <div className="min-h-screen bg-[#0C0F17] text-white p-8">File not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white">
      <div className="sticky top-0 bg-[#0C0F17] border-b border-gray-800 px-6 py-3 flex items-center justify-between z-10">
        <Link href="/desktop/library" className="text-sm text-gray-400 hover:text-white">
          ← Library
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-gray-700">
            {(["source", "live", "preview"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs ${mode === m ? "bg-blue-600" : "bg-[#141824] hover:bg-gray-800"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <input
          type="text"
          value={frontmatter.title}
          onChange={e => { setFrontmatter({ ...frontmatter, title: e.target.value }); setDirty(true); }}
          className="w-full text-3xl font-bold bg-transparent border-none outline-none mb-6"
        />

        {mode === "source" && (
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setDirty(true); }}
            className="w-full h-[60vh] bg-[#141824] border border-gray-700 rounded-md p-4 font-mono text-sm"
          />
        )}

        {mode === "live" && (
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value); setDirty(true); }}
            className="w-full h-[60vh] bg-transparent border border-gray-800 rounded-md p-4 text-base leading-relaxed"
          />
        )}

        {mode === "preview" && (
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap">{content}</pre>
            <p className="text-xs text-gray-500 mt-4">
              Rendered preview will use TipTap/markdown renderer in Week 3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading…</div>}>
      <EditorInner />
    </Suspense>
  );
}
```

### 5.3: Commit

```bash
git add .
git commit -m "Library list + 3-mode editor (BB v3.0 Week 2)"
```

---

## Task Group 6: Final Checks

### 6.1: Build validation

```bash
npx tsc --noEmit
```

Should pass. Fix any type errors.

```bash
cd src-tauri && cargo check
```

Should pass.

### 6.2: Final commit

```bash
git add .
git commit -m "Week 2 complete: auth + Library editor + local SQLite (BB v3.0)"
git log --oneline -10
```

---

## Success Criteria

✓ Tauri app starts on `/desktop` (workspace init or login)  
✓ Google + GitHub OAuth buttons present  
✓ Email/password login works  
✓ Dashboard shows signed-in user + workspace path  
✓ Library page lists files from /BossBoard/Library/  
✓ Create new markdown file works  
✓ Editor opens with 3-mode toggle (source/live/preview)  
✓ Save updates file + SQLite metadata  
✓ Offline banner appears when network off  
✓ `npx tsc --noEmit` passes  
✓ `cargo check` passes

---

## Known Limitations

- Preview mode is placeholder (no rendering yet, Week 3 adds TipTap)
- Attachment handling (.assets folders) not yet implemented
- File watcher (external edit detection) not yet implemented
- Agent features not started (Week 3)

---

## Week 3 Preview

- TipTap rich editor integration
- Attachment drag & drop (Obsidian-style .assets)
- File watcher + auto-reload
- Local MCP server (embedded in Tauri)
- Agent process manager (first agent execution)

Stop after Week 2 and report status.

---

## Reporting

After completion, report:
1. All commits (git log --oneline)
2. Tauri app launches to login screen? (yes/no)
3. Email login works with existing test account? (yes/no)
4. Can create/edit/save markdown file? (yes/no)
5. SQLite metadata DB file exists at /.bb/metadata.sqlite? (yes/no)
6. Any errors or warnings

Then stop and wait for Week 3 instructions.
