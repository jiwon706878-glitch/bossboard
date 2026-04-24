# BB v3.0 Week 1: Tauri Foundation + File System Bridge

Read CLAUDE.md first for full v3.0 context.

**Goal:** Set up Tauri v2 desktop app, establish file system access patterns, create the foundation for local-first architecture. NO feature logic yet — just infrastructure.

**Time estimate:** 2-3 hours on i7-7700HQ + 16GB RAM.

---

## Pre-flight

Verify before starting:
```bash
node --version       # should be 20+
rustc --version      # should be 1.80+
npx tauri --version  # should be 2.x
```

If any missing, STOP and report.

---

## Task Group 1: Tauri Project Initialization

### 1.1: Initialize Tauri in the project

```bash
npx tauri init
```

Answer the prompts:
- App name: `BossBoard`
- Window title: `BossBoard`
- Web assets location: `../out` (we'll configure static export)
- Dev server URL: `http://localhost:3000`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

This creates `src-tauri/` directory with Rust project.

### 1.2: Configure `src-tauri/tauri.conf.json`

Set these values:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "BossBoard",
  "version": "3.0.0",
  "identifier": "com.mybossboard.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "BossBoard",
        "width": 1280,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "dmg"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "externalBin": [],
    "copyright": "© 2026 BossBoard",
    "category": "Productivity",
    "shortDescription": "Local-first AI agent workspace",
    "longDescription": "Where humans and AI agents collaborate on your local files. Bring your own AI keys, keep your data on your machine."
  }
}
```

### 1.3: Generate app icons

Create a simple placeholder icon first. Use this script to generate a BB logo:

```bash
# Create a 1024x1024 placeholder PNG
mkdir -p src-tauri/icons/source
```

Create `src-tauri/icons/source/app-icon.png` as a 1024x1024 placeholder (solid color with "BB" text). Any basic image works — user will replace with real logo later.

If you have ImageMagick or similar, generate a simple icon. Otherwise, create a minimal PNG programmatically or leave a TODO comment instructing user to add icon.

Then run:
```bash
npx tauri icon src-tauri/icons/source/app-icon.png
```

This auto-generates all required sizes (32x32, 128x128, icns, ico).

### 1.4: Add Tauri plugins to Cargo.toml

Edit `src-tauri/Cargo.toml` to add needed plugins:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-notification = "2"
tauri-plugin-os = "2"
tauri-plugin-process = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
rusqlite = { version = "0.31", features = ["bundled"] }
sha2 = "0.10"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "1"
```

### 1.5: Commit

```bash
git add src-tauri/ package.json package-lock.json
git commit -m "Tauri v2 project initialization (BB v3.0 Week 1)"
```

---

## Task Group 2: File System Bridge (Core)

### 2.1: Create Rust commands directory

```bash
mkdir -p src-tauri/src/commands
```

### 2.2: Implement file system commands

Create `src-tauri/src/commands/fs.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: i64,  // Unix timestamp
}

#[derive(Debug, thiserror::Error)]
pub enum FsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    #[error("Access denied: {0}")]
    AccessDenied(String),
}

impl serde::Serialize for FsError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer {
        serializer.serialize_str(&self.to_string())
    }
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, FsError> {
    let content = fs::read_to_string(&path)?;
    Ok(content)
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), FsError> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, content)?;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, FsError> {
    let entries = fs::read_dir(&path)?;
    let mut files = Vec::new();
    for entry in entries {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let modified = metadata.modified()?
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        files.push(FileInfo {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified,
        });
    }
    Ok(files)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), FsError> {
    fs::create_dir_all(&path)?;
    Ok(())
}

#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), FsError> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(&p)?;
    } else {
        fs::remove_file(&p)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn file_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}
```

### 2.3: Create commands module

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod fs;
```

### 2.4: Wire commands into main.rs

Edit `src-tauri/src/main.rs`:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::fs::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            list_directory,
            create_directory,
            delete_file,
            file_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2.5: Create TypeScript wrappers

Create `src/lib/tauri/fs.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
  path: string;
  name: string;
  is_directory: boolean;
  size: number;
  modified: number;
}

export async function readFile(path: string): Promise<string> {
  return invoke("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_file", { path, content });
}

export async function listDirectory(path: string): Promise<FileInfo[]> {
  return invoke("list_directory", { path });
}

export async function createDirectory(path: string): Promise<void> {
  return invoke("create_directory", { path });
}

export async function deleteFile(path: string): Promise<void> {
  return invoke("delete_file", { path });
}

export async function fileExists(path: string): Promise<boolean> {
  return invoke("file_exists", { path });
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
```

### 2.6: Commit

```bash
git add src-tauri/src/commands/ src/lib/tauri/
git commit -m "File system bridge commands (BB v3.0 Week 1)"
```

---

## Task Group 3: Folder Selection + First-Run Wizard

### 3.1: Create BB folder structure initialization

Create `src-tauri/src/commands/workspace.rs`:

```rust
use std::path::PathBuf;
use std::fs;
use serde::{Serialize, Deserialize};
use super::fs::FsError;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub root_path: String,
    pub is_initialized: bool,
}

#[tauri::command]
pub async fn initialize_workspace(root_path: String) -> Result<WorkspaceInfo, FsError> {
    let root = PathBuf::from(&root_path);
    
    // Create BB folder structure
    let dirs = [
        "Library",
        "agents",
        "shared",
        "private",
        ".bb",
    ];
    
    for dir in &dirs {
        fs::create_dir_all(root.join(dir))?;
    }
    
    // Create .bb/workspace.json marker
    let marker = root.join(".bb/workspace.json");
    if !marker.exists() {
        let info = serde_json::json!({
            "version": "3.0.0",
            "created": chrono::Utc::now().to_rfc3339(),
        });
        fs::write(&marker, serde_json::to_string_pretty(&info).unwrap())?;
    }
    
    // Create initial Getting Started
    let getting_started = root.join("Library/Getting-Started.md");
    if !getting_started.exists() {
        fs::write(&getting_started, GETTING_STARTED_CONTENT)?;
    }
    
    // Create Roadmap
    let roadmap = root.join("Library/Roadmap.md");
    if !roadmap.exists() {
        fs::write(&roadmap, ROADMAP_CONTENT)?;
    }
    
    Ok(WorkspaceInfo {
        root_path: root.to_string_lossy().to_string(),
        is_initialized: true,
    })
}

#[tauri::command]
pub async fn is_workspace(root_path: String) -> bool {
    let marker = PathBuf::from(&root_path).join(".bb/workspace.json");
    marker.exists()
}

const GETTING_STARTED_CONTENT: &str = r#"---
id: "getting-started"
title: "Getting Started with BossBoard"
tags: ["guide", "onboarding"]
created: "2026-04-24T00:00:00Z"
---

# Welcome to BossBoard

BossBoard is a local-first AI agent workspace. Your files stay on your machine.

## Quick Start

1. **Connect an AI provider** — Settings → AI Providers → Add your key
2. **Create your first agent** — Agents → New Agent → Pick a template
3. **Write a manual** — Edit /agents/{agent-name}/manual.md
4. **Start collaborating** — DM your agent, post to the board

## Folder Structure

- `/Library/` — Your wiki pages (this file is here)
- `/agents/{name}/` — Each agent's workspace
- `/shared/` — Files multiple agents can access
- `/private/` — User-only, agents blocked

## Learn More

- Check out `/Library/Roadmap.md` for coming features
- Visit mybossboard.com/docs for full documentation
"#;

const ROADMAP_CONTENT: &str = r#"---
id: "roadmap"
title: "BossBoard Roadmap"
tags: ["roadmap", "future"]
created: "2026-04-24T00:00:00Z"
---

# BossBoard Roadmap

## Current (v3.0)
- Local-first file storage
- BYOK AI providers
- Multi-agent collaboration
- GitHub + Google Drive MCP integration
- Desktop app (Windows + macOS)

## Coming Soon

### v3.1 (6 weeks)
- Telegram Bot integration (remote agent commands)
- External read-only web UI
- Global hotkeys

### v3.2 (12 weeks)
- Custom MCP Tools (user scripts)
- Cloud MCP Server (connect from Claude Code directly)
- Smart Search (semantic, BYOK)
- Multi-device beta

### v4.0 (6 months)
- Marketplace (agent manuals)
- Community board (cross-workspace)
- Mobile PWA (monitoring)

## Feedback

Contact: jay@mybossboard.com
"#;
```

### 3.2: Register workspace commands

Update `src-tauri/src/commands/mod.rs`:

```rust
pub mod fs;
pub mod workspace;
```

Update `src-tauri/src/main.rs` handler list:

```rust
.invoke_handler(tauri::generate_handler![
    read_file, write_file, list_directory, create_directory, delete_file, file_exists,
    commands::workspace::initialize_workspace,
    commands::workspace::is_workspace,
])
```

### 3.3: TypeScript wrapper for workspace

Create `src/lib/tauri/workspace.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";

export interface WorkspaceInfo {
  root_path: string;
  is_initialized: boolean;
}

export async function initializeWorkspace(rootPath: string): Promise<WorkspaceInfo> {
  return invoke("initialize_workspace", { rootPath });
}

export async function isWorkspace(rootPath: string): Promise<boolean> {
  return invoke("is_workspace", { rootPath });
}

export async function selectWorkspaceFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select BossBoard folder",
  });
  if (typeof selected === "string") {
    return selected;
  }
  return null;
}

export async function getDefaultWorkspacePath(): Promise<string> {
  const home = await homeDir();
  return `${home}/BossBoard`;
}
```

### 3.4: Add dialog plugin config

In `src-tauri/tauri.conf.json`, ensure plugins are enabled. Also create `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for the app",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:default",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-mkdir",
    "notification:default",
    "os:default",
    "process:default"
  ]
}
```

### 3.5: Commit

```bash
git add src-tauri/src/commands/workspace.rs src-tauri/src/commands/mod.rs src-tauri/src/main.rs src/lib/tauri/workspace.ts src-tauri/capabilities/
git commit -m "Workspace initialization + folder selection (BB v3.0 Week 1)"
```

---

## Task Group 4: First-Run Detection + Desktop Entry Point

### 4.1: Create desktop app entry route

Create `src/app/desktop/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri/fs";
import { 
  selectWorkspaceFolder, 
  initializeWorkspace, 
  isWorkspace,
  getDefaultWorkspacePath 
} from "@/lib/tauri/workspace";

export default function DesktopPage() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [step, setStep] = useState<"loading" | "welcome" | "select" | "ready">("loading");
  const [defaultPath, setDefaultPath] = useState<string>("");

  useEffect(() => {
    if (!isTauri()) {
      setStep("ready"); // Browser fallback
      return;
    }

    (async () => {
      // Check for saved workspace path in localStorage
      const saved = localStorage.getItem("bb_workspace_path");
      if (saved && (await isWorkspace(saved))) {
        setWorkspacePath(saved);
        setStep("ready");
      } else {
        const def = await getDefaultWorkspacePath();
        setDefaultPath(def);
        setStep("welcome");
      }
    })();
  }, []);

  async function handleChooseFolder() {
    const selected = await selectWorkspaceFolder();
    if (selected) {
      await setupWorkspace(selected);
    }
  }

  async function handleUseDefault() {
    await setupWorkspace(defaultPath);
  }

  async function setupWorkspace(path: string) {
    try {
      await initializeWorkspace(path);
      localStorage.setItem("bb_workspace_path", path);
      setWorkspacePath(path);
      setStep("ready");
    } catch (e) {
      console.error("Failed to initialize workspace:", e);
      alert(`Error: ${e}`);
    }
  }

  if (step === "loading") {
    return <div className="p-8 text-white">Loading…</div>;
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white p-8">
        <div className="max-w-xl mx-auto mt-20">
          <h1 className="text-4xl font-bold mb-4">Welcome to BossBoard</h1>
          <p className="text-gray-400 mb-8">
            Your AI agents need a workspace. Let's set up the folder where your files will live.
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
          
          <p className="text-xs text-gray-500 mt-8">
            BossBoard will create subfolders: Library, agents, shared, private
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <h1 className="text-3xl font-bold mb-4">BossBoard</h1>
      <p className="text-gray-400 mb-4">Workspace: {workspacePath}</p>
      <p className="text-green-400">Ready! Next: Dashboard will be built in Week 2.</p>
    </div>
  );
}
```

### 4.2: Install Tauri API packages

```bash
npm install @tauri-apps/api@next @tauri-apps/plugin-dialog @tauri-apps/plugin-fs @tauri-apps/plugin-notification @tauri-apps/plugin-os @tauri-apps/plugin-shell
```

### 4.3: Configure Next.js for static export

Update `next.config.js` or `next.config.mjs` to support Tauri static build:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.TAURI_BUILD === "true" ? "export" : undefined,
  images: {
    unoptimized: process.env.TAURI_BUILD === "true",
  },
  // Keep existing config for web build
  ...existingConfig
};

module.exports = nextConfig;
```

### 4.4: Add Tauri build scripts

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "cross-env TAURI_BUILD=true next build && tauri build"
  }
}
```

Install cross-env if not present:
```bash
npm install -D cross-env
```

### 4.5: Commit

```bash
git add src/app/desktop/ next.config.* package.json package-lock.json
git commit -m "Desktop entry point + first-run wizard (BB v3.0 Week 1)"
```

---

## Task Group 5: Smoke Test

### 5.1: Test development mode

```bash
npm run tauri:dev
```

This should:
1. Start Next.js dev server on localhost:3000
2. Launch Tauri window with the app
3. Load the desktop page at /desktop (or root)
4. First run shows welcome screen

If errors occur:
- Check Cargo.toml versions
- Run `cargo clean` in src-tauri/ if Rust build fails
- Check WebView2 installation on Windows

### 5.2: Test file operations

In the Tauri window console (right-click → Inspect):

```javascript
// Test reading a file (any existing file)
const { readFile } = await import('/lib/tauri/fs');
await readFile('C:\\Windows\\system32\\drivers\\etc\\hosts');  // Windows example
```

Should return file content without errors.

### 5.3: Test workspace initialization

In browser, navigate to /desktop and click "Use default location". Verify:
- BossBoard folder created at ~/BossBoard
- Subfolders exist: Library, agents, shared, private, .bb
- Library has Getting-Started.md and Roadmap.md
- .bb/workspace.json created

### 5.4: Document any issues

If anything fails, document in a new file `week1-issues.md` with:
- Exact error message
- Platform (Windows 10/11)
- What step failed
- Any workarounds attempted

### 5.5: Final commit

```bash
git add .
git commit -m "Week 1 complete: Tauri foundation + FS bridge (BB v3.0)"
git log --oneline -10
```

---

## Success Criteria

✓ `npx tauri --version` returns 2.x  
✓ `npm run tauri:dev` launches desktop window  
✓ First-run wizard shows welcome screen  
✓ Workspace initialization creates /BossBoard/ structure  
✓ Getting-Started.md and Roadmap.md are created with content  
✓ TypeScript check passes: `npx tsc --noEmit`  
✓ No critical errors in dev console

---

## Known Constraints

- First Rust build takes 10-20 minutes on i7-7700HQ
- Subsequent builds are much faster (~30s)
- Production build `tauri:build` takes 15-30 minutes
- Keep Chrome tabs minimal during dev to preserve RAM

---

## Week 2 Preview

Week 2 will cover:
- Library markdown editor (3-mode toggle)
- YAML frontmatter parser
- File metadata sync to Supabase
- Local SQLite search index
- Obsidian-style attachment handling

Do NOT start Week 2 tasks. Complete Week 1 and report status.

---

## Reporting

After completion, report:
1. All commits made (git log --oneline)
2. `npm run tauri:dev` working? (yes/no)
3. Workspace initialization tested? (yes/no)
4. Any errors or warnings encountered
5. Time taken (rough estimate)

Then stop and wait for Week 2 instructions.
