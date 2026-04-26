# BB v3.0 Final Polish Prompt — Beta Launch Ready

Read CLAUDE.md first.

**Goal:** Final polish before beta launch. All decisions consolidated. After this, manual smoke test → beta launch.

**Time:** 10-15 hours autonomous work (this is bigger than previous passes).

**Honesty rules:**
- Be STRICTLY HONEST about deferrals
- Commit after each major group
- If a task is too complex, document in code comments + LAUNCH-CHECKLIST.md
- Final report = comprehensive

---

## Group A: Critical Data Safety (가장 중요)

### A.1: Schema migration system (강화)

**Problem:** Updates can break user data (agent errors, library missing, etc.)

**Files:** `src-tauri/src/commands/db_migrate.rs`, `src/lib/markdown/migrate.ts`

**Implement:**

```rust
// src-tauri/src/commands/db_migrate.rs
const SCHEMA_VERSION: i32 = 2;

pub async fn ensure_db_schema(db_path: &Path) -> Result<(), DbError> {
    let conn = Connection::open(db_path)?;
    
    let current_version: i32 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .unwrap_or(0);
    
    if current_version >= SCHEMA_VERSION {
        return Ok(());
    }
    
    // CRITICAL: Backup before migration
    let backup_path = db_path.with_extension(format!("v{}.backup.sqlite", current_version));
    fs::copy(db_path, &backup_path)?;
    log::info!("Backed up DB to {:?}", backup_path);
    
    // Wrap in transaction
    let tx = conn.unchecked_transaction()?;
    
    // Migration: v0 → v1
    if current_version < 1 {
        tx.execute_batch("
            CREATE TABLE IF NOT EXISTS metadata (...);
            CREATE INDEX IF NOT EXISTS idx_metadata_path ON metadata(path);
            PRAGMA user_version = 1;
        ")?;
    }
    
    // Migration: v1 → v2
    if current_version < 2 {
        tx.execute_batch("
            ALTER TABLE metadata ADD COLUMN tags TEXT;
            CREATE INDEX IF NOT EXISTS idx_metadata_tags ON metadata(tags);
            PRAGMA user_version = 2;
        ")?;
    }
    
    tx.commit()?;
    
    log::info!("DB migrated to version {}", SCHEMA_VERSION);
    Ok(())
}

#[tauri::command]
pub async fn restore_db_backup(version: i32) -> Result<(), DbError> {
    let db_path = get_db_path()?;
    let backup_path = db_path.with_extension(format!("v{}.backup.sqlite", version));
    
    if !backup_path.exists() {
        return Err(DbError::Custom("Backup not found".into()));
    }
    
    fs::copy(&backup_path, &db_path)?;
    log::info!("Restored DB from {:?}", backup_path);
    Ok(())
}
```

### A.2: Frontmatter migration (이미 있음, 강화)

**Verify:** `src/lib/markdown/migrate.ts` handles all old formats and never loses files.

```typescript
export function migrateFrontmatter(raw: string): MigrationResult {
  try {
    const parsed = matter(raw);
    
    // Default values for missing fields
    const migrated = {
      id: parsed.data.id || generateId(),
      title: parsed.data.title || extractTitleFromContent(parsed.content) || "Untitled",
      schema_version: CURRENT_SCHEMA_VERSION,
      created_at: parsed.data.created_at || new Date().toISOString(),
      modified_at: parsed.data.modified_at || new Date().toISOString(),
      tags: parsed.data.tags || [],
      ...parsed.data,
    };
    
    return {
      success: true,
      frontmatter: migrated,
      content: parsed.content,
      changed: !deepEqual(parsed.data, migrated),
    };
  } catch (e) {
    // YAML parse error - DON'T lose the file
    return {
      success: false,
      frontmatter: {
        id: generateId(),
        title: extractFilenameAsTitle() || "Untitled (parse error)",
        schema_version: CURRENT_SCHEMA_VERSION,
        parse_error: String(e),
      },
      content: raw,  // Treat entire file as content
      changed: true,
    };
  }
}
```

### A.3: Auto-backup system (강화)

**On every app start:**

```rust
#[tauri::command]
pub async fn create_startup_backup(workspace: String) -> Result<(), FsError> {
    let workspace_path = PathBuf::from(&workspace);
    let backup_dir = workspace_path.join(".bb").join("backups");
    fs::create_dir_all(&backup_dir)?;
    
    let date = Utc::now().format("%Y-%m-%d");
    let backup_path = backup_dir.join(format!("auto-{}.zip", date));
    
    // Don't re-backup if today's backup exists
    if backup_path.exists() {
        return Ok(());
    }
    
    // Create zip of metadata only (small, fast)
    create_metadata_backup(&workspace_path, &backup_path)?;
    
    // Cleanup: keep only last 7 days
    cleanup_old_backups(&backup_dir, 7)?;
    
    Ok(())
}
```

### A.4: Agent error recovery

**When agent file is corrupted:**

```typescript
// src/lib/agents/load.ts
export async function loadAgent(name: string): Promise<Agent | null> {
  try {
    const manualPath = `agents/${name}/manual.md`;
    const memoryPath = `agents/${name}/memory.md`;
    
    const manual = await readFileWithRecovery(manualPath);
    const memory = await readFileWithRecovery(memoryPath);
    
    return {
      name,
      manual: manual.content,
      memory: memory.content,
      hasErrors: manual.error || memory.error,
    };
  } catch (e) {
    // Even if catastrophic failure, don't crash
    console.error(`Failed to load agent ${name}:`, e);
    
    // Show user-friendly error in UI
    return {
      name,
      manual: "",
      memory: "",
      hasErrors: true,
      errorMessage: `Could not load agent. Files may be corrupted: ${e}`,
      recoveryActions: ["Restore from backup", "Reset to template", "Delete agent"],
    };
  }
}
```

**UI for agent errors:**
- Show error card instead of broken state
- Offer recovery actions
- Don't crash entire app

### A.5: User notification for breaking changes

```typescript
// src/lib/notifications/breaking-changes.ts
export const BREAKING_CHANGES = [
  {
    version: "v3.0.1",
    title: "Frontmatter format updated",
    description: "Your existing agents have been auto-migrated. Backups available in .bb/backups/",
    action: "View backup",
  },
];

// Show in app on update
```

**Commit:** `git commit -m "Group A: Critical data safety (migration + backup + recovery)"`

---

## Group B: i18n (10 languages)

### B.1: Install next-intl

```bash
npm install next-intl
```

### B.2: Configuration

**`src/i18n/config.ts`:**

```typescript
export const SUPPORTED_LOCALES = [
  "en",      // English (primary)
  "ko",      // Korean (Jay's verification)
  "ja",      // Japanese
  "zh-CN",   // Chinese Simplified
  "es",      // Spanish
  "pt-BR",   // Portuguese (Brazil)
  "de",      // German
  "fr",      // French
  "ru",      // Russian
  "hi",      // Hindi
] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "中文",
  es: "Español",
  "pt-BR": "Português",
  de: "Deutsch",
  fr: "Français",
  ru: "Русский",
  hi: "हिन्दी",
};
```

### B.3: Translation files

Create `messages/{locale}.json` for each.

**`messages/en.json`:**

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "library": "Library",
    "agents": "Agents",
    "board": "Board",
    "calendar": "Calendar",
    "meetings": "Meetings",
    "settings": "Settings"
  },
  "library": {
    "title": "Library",
    "newFile": "New File",
    "newFolder": "New Folder",
    "search": "Search files...",
    "empty": "No files yet. Create your first file or drop one here."
  },
  "agents": {
    "title": "Agents",
    "newAgent": "New Agent",
    "templates": {
      "personalAssistant": "Personal Assistant",
      "domainSpecialist": "Domain Specialist",
      "codeReviewer": "Code Reviewer",
      "blank": "Blank"
    }
  },
  "settings": {
    "title": "Settings",
    "general": "General",
    "aiProviders": "AI Providers",
    "integrations": "Integrations",
    "workspace": "Workspace",
    "theme": "Theme",
    "language": "Language",
    "themes": {
      "dark": "Dark",
      "light": "Light",
      "system": "System"
    }
  },
  "beta": {
    "label": "Beta v0.1",
    "translationNotice": "Translations are AI-generated. Please report issues."
  }
}
```

**For other locales:** Use AI to translate. Add note in beta UI:
```
"Translation: AI-generated. Report issues at [feedback link]"
```

### B.4: AI agent language

**`src/lib/agents/execute.ts`:**

```typescript
const userLocale = await getUserLocale(); // From settings

const systemPrompt = `
You are ${agent.name}.
${agent.manual}

User's preferred language: ${LOCALE_NAMES[userLocale]} (${userLocale})

Language rules:
- Default to ${LOCALE_NAMES[userLocale]} for responses
- If user explicitly asks for another language, use that
- Code, commands, and proper nouns can stay in English
`;
```

### B.5: Locale switcher

**Settings → General:**

```tsx
<Select
  value={locale}
  onChange={async (newLocale) => {
    await setUserLocale(newLocale);
    router.refresh();
  }}
>
  {SUPPORTED_LOCALES.map(l => (
    <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
  ))}
</Select>
```

**Commit:** `git commit -m "Group B: i18n with 10 languages + AI agent locale support"`

---

## Group C: Library — Obsidian-style ⭐

### C.1: Folder tree sidebar

**`src/app/desktop/library/library-sidebar.tsx`:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, FileText, Star, Clock, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LibrarySidebar({ onSelectFile }: { onSelectFile: (path: string) => void }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  
  useEffect(() => {
    loadTree().then(setTree);
    loadFavorites().then(setFavorites);
    loadRecent().then(setRecent);
  }, []);
  
  const toggleExpanded = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  
  return (
    <div className="w-64 border-r border-bb-border h-full flex flex-col">
      {/* Special sections */}
      <Section title="Favorites" icon={<Star className="w-4 h-4" />}>
        {favorites.map(path => (
          <FileItem key={path} path={path} onClick={onSelectFile} />
        ))}
      </Section>
      
      <Section title="Recent" icon={<Clock className="w-4 h-4" />}>
        {recent.slice(0, 5).map(path => (
          <FileItem key={path} path={path} onClick={onSelectFile} />
        ))}
      </Section>
      
      <Section title="Tags" icon={<Tag className="w-4 h-4" />}>
        <TagList />
      </Section>
      
      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="text-xs text-gray-500 uppercase font-semibold px-2 py-1">
          Folders
        </div>
        <TreeView
          nodes={tree}
          expanded={expanded}
          onToggle={toggleExpanded}
          onSelectFile={onSelectFile}
        />
      </div>
      
      {/* Quick actions */}
      <div className="p-2 border-t border-bb-border">
        <button className="w-full text-left text-sm hover:bg-bb-card p-2 rounded flex items-center gap-2">
          <Folder className="w-4 h-4" />
          New Folder
        </button>
      </div>
    </div>
  );
}

function TreeView({ nodes, expanded, onToggle, onSelectFile, depth = 0 }) {
  return (
    <ul className={depth > 0 ? "ml-4" : ""}>
      {nodes.map(node => (
        <li key={node.path}>
          {node.type === "folder" ? (
            <>
              <button
                onClick={() => onToggle(node.path)}
                className="flex items-center gap-1 w-full hover:bg-bb-card px-2 py-1 rounded text-sm"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("path", node.path)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  const sourcePath = e.dataTransfer.getData("path");
                  await moveFile(sourcePath, node.path);
                }}
              >
                {expanded.has(node.path) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Folder className="w-4 h-4 text-amber-400" />
                <span className="truncate">{node.name}</span>
              </button>
              <AnimatePresence>
                {expanded.has(node.path) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <TreeView
                      nodes={node.children || []}
                      expanded={expanded}
                      onToggle={onToggle}
                      onSelectFile={onSelectFile}
                      depth={depth + 1}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <button
              onClick={() => onSelectFile(node.path)}
              className="flex items-center gap-1 w-full hover:bg-bb-card px-2 py-1 rounded text-sm"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("path", node.path)}
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="truncate">{node.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

### C.2: Sorting options

```tsx
<div className="flex items-center gap-2 p-2 border-b border-bb-border">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="text-sm bg-transparent"
  >
    <option value="name">Name</option>
    <option value="modified">Modified</option>
    <option value="created">Created</option>
    <option value="size">Size</option>
    <option value="type">Type</option>
  </select>
  
  <button onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}>
    {sortOrder === "asc" ? "↑" : "↓"}
  </button>
</div>
```

### C.3: Drag and drop

```tsx
// Already shown in TreeView above
// Also handle external file drops:

<div
  onDragOver={(e) => e.preventDefault()}
  onDrop={async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      await invoke("write_binary_file", {
        path: `${currentFolder}/${file.name}`,
        data: Array.from(new Uint8Array(buffer)),
      });
    }
  }}
>
  {/* Library content */}
</div>
```

### C.4: Right-click menu

```tsx
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";

<ContextMenu>
  <ContextMenuTrigger asChild>
    <FileRow file={file} />
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={() => openFile(file.path)}>Open</ContextMenuItem>
    <ContextMenuItem onClick={() => renameFile(file.path)}>Rename (F2)</ContextMenuItem>
    <ContextMenuItem onClick={() => duplicateFile(file.path)}>Duplicate</ContextMenuItem>
    <ContextMenuItem onClick={() => moveFileDialog(file.path)}>Move to...</ContextMenuItem>
    <ContextMenuItem onClick={() => toggleFavorite(file.path)}>
      {isFavorite ? "Remove from favorites" : "Add to favorites"}
    </ContextMenuItem>
    <ContextMenuItem onClick={() => copyPath(file.path)}>Copy path</ContextMenuItem>
    <ContextMenuItem onClick={() => openInExternal(file.path)}>Open with default app</ContextMenuItem>
    <ContextMenuItem onClick={() => showInFolder(file.path)}>Show in folder</ContextMenuItem>
    <hr />
    <ContextMenuItem onClick={() => deleteFile(file.path)} className="text-red-400">
      Move to trash
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### C.5: Keyboard shortcuts

```typescript
// src/lib/library/shortcuts.ts
export function setupLibraryShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!isLibraryFocused()) return;
    
    // Ctrl+N: New file
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      openNewFileDialog();
    }
    
    // Ctrl+Shift+N: New folder
    if (e.ctrlKey && e.shiftKey && e.key === "N") {
      e.preventDefault();
      openNewFolderDialog();
    }
    
    // F2: Rename
    if (e.key === "F2") {
      e.preventDefault();
      renameSelectedFile();
    }
    
    // Delete: Move to trash
    if (e.key === "Delete") {
      e.preventDefault();
      deleteSelectedFiles();
    }
    
    // Ctrl+F: Search
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      focusSearchInput();
    }
    
    // Ctrl+P: Quick open
    if (e.ctrlKey && e.key === "p") {
      e.preventDefault();
      openQuickFinder();
    }
  });
}
```

### C.6: Multi-select (Ctrl/Shift)

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());

const handleClick = (path: string, e: React.MouseEvent) => {
  if (e.ctrlKey || e.metaKey) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  } else if (e.shiftKey && lastSelected) {
    // Range select
    selectRange(lastSelected, path);
  } else {
    setSelected(new Set([path]));
  }
};
```

### C.7: Quick finder (Ctrl+P)

```tsx
<QuickFinder
  isOpen={isQuickFinderOpen}
  onClose={() => setIsQuickFinderOpen(false)}
  onSelect={(path) => {
    onSelectFile(path);
    setIsQuickFinderOpen(false);
  }}
>
  {/* Fuzzy search across all files */}
  <input placeholder="Search files..." autoFocus />
  {/* Results list */}
</QuickFinder>
```

### C.8: Tags system

Files with `tags: [marketing, q3]` in frontmatter:

```tsx
<TagList>
  {allTags.map(tag => (
    <button onClick={() => filterByTag(tag)}>
      #{tag} ({tagCounts[tag]})
    </button>
  ))}
</TagList>
```

**Commit:** `git commit -m "Group C: Library Obsidian-style (folder tree + sort + drag + shortcuts + tags)"`

---

## Group D: UI/UX Improvements (전체)

### D.1: Visual consistency

**Update `src/app/globals.css`:**

```css
:root {
  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Typography scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
  
  /* Shadows (elevation) */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.1);
}

/* Apply consistently */
.card {
  background: var(--bb-card);
  border: 1px solid var(--bb-border);
  border-radius: 0.5rem;
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--bb-primary);
}
```

### D.2: Empty states

Replace boring empty states with welcoming designs:

```tsx
// src/components/ui/empty-state.tsx
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-bb-card flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-bb-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
```

Use throughout:
- Library empty: "No files yet. Drop one here or create your first."
- Agents empty: "Create your first AI teammate to get started."
- Board empty: "Be the first to post."
- DM empty: "Select an agent to start chatting."

### D.3: Loading states

Replace all spinners with skeletons (already in motion suite).

### D.4: Error states

```tsx
// src/components/ui/error-state.tsx
import { AlertCircle, RotateCw } from "lucide-react";

export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-gray-400 mb-6 max-w-md font-mono text-sm">{error}</p>
      {retry && (
        <button
          onClick={retry}
          className="flex items-center gap-2 px-4 py-2 bg-bb-card border border-bb-border hover:border-bb-primary rounded-md"
        >
          <RotateCw className="w-4 h-4" /> Try again
        </button>
      )}
    </div>
  );
}
```

### D.5: Confirm dialogs (replace `confirm()`)

```tsx
// src/components/ui/confirm-dialog.tsx
export function useConfirm() {
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  
  const confirm = (cfg: ConfirmConfig): Promise<boolean> => {
    return new Promise(resolve => {
      setConfig({
        ...cfg,
        onConfirm: () => { resolve(true); setConfig(null); },
        onCancel: () => { resolve(false); setConfig(null); },
      });
    });
  };
  
  const ConfirmComponent = config ? (
    <ConfirmDialog {...config} />
  ) : null;
  
  return { confirm, ConfirmComponent };
}

// Usage:
const { confirm, ConfirmComponent } = useConfirm();

const handleDelete = async () => {
  const ok = await confirm({
    title: "Delete this file?",
    description: "It will be moved to trash. You can restore it within 30 days.",
    confirmLabel: "Move to trash",
    confirmVariant: "danger",
  });
  if (ok) deleteFile();
};

return <>...{ConfirmComponent}</>;
```

### D.6: Focus states (accessibility)

```css
:focus-visible {
  outline: 2px solid var(--bb-primary);
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

### D.7: Hover effects

```css
.interactive {
  transition: all 0.2s ease;
}
.interactive:hover {
  background: var(--bb-card-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
```

**Commit:** `git commit -m "Group D: UI/UX consistency (empty states, errors, confirms, hovers)"`

---

## Group E: App routing + landing block

### E.1: Block landing page in Tauri

**`src/app/page.tsx`:**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Tauri = redirect immediately
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      router.replace("/desktop/dashboard");
    }
  }, [router]);
  
  // Web users see landing
  return <WebLanding />;
}
```

### E.2: Middleware for Tauri user agent

**`middleware.ts`** (or `proxy.ts` if Next.js 16):

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  const isTauri = userAgent.includes("Tauri") || req.cookies.get("bb-platform")?.value === "tauri";
  
  // Tauri → only /desktop/* allowed
  if (isTauri && !req.nextUrl.pathname.startsWith("/desktop") && !req.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/desktop/dashboard", req.url));
  }
  
  // Web → block /desktop (sort of, since it's auth-protected anyway)
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### E.3: Tauri-aware error pages

**`src/app/not-found.tsx`:**

```tsx
"use client";

import { TitleBar } from "@/components/desktop/title-bar";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [isTauri, setIsTauri] = useState(false);
  
  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
  }, []);
  
  return (
    <>
      {isTauri && <TitleBar />}
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <h1 className="text-6xl font-bold mb-2 text-bb-primary">404</h1>
        <p className="text-gray-400 mb-6">Page not found</p>
        <a
          href={isTauri ? "/desktop/dashboard" : "/"}
          className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
        >
          {isTauri ? "Back to Dashboard" : "Back to Home"}
        </a>
      </div>
    </>
  );
}
```

**`src/app/desktop/error.tsx`:**

Similar with TitleBar always shown.

### E.4: TitleBar component (always shows window controls)

```tsx
// src/components/desktop/title-bar.tsx
"use client";

import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";

export function TitleBar() {
  const [windowApi, setWindowApi] = useState<any>(null);
  
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        setWindowApi(getCurrentWindow());
      });
    }
  }, []);
  
  return (
    <div data-tauri-drag-region className="h-12 bg-bb-card border-b border-bb-border flex items-center justify-between px-4">
      <div data-tauri-drag-region className="flex items-center gap-2">
        <img src="/logo.png" className="w-6 h-6" />
        <span className="text-sm font-semibold">BossBoard</span>
        <span className="text-xs text-gray-500 px-2 py-0.5 bg-bb-bg rounded">Beta v0.1</span>
      </div>
      
      <div className="flex items-center gap-1">
        <button onClick={() => windowApi?.minimize()} className="hover:bg-bb-bg p-2 rounded">
          <Minus className="w-3 h-3" />
        </button>
        <button onClick={() => windowApi?.toggleMaximize()} className="hover:bg-bb-bg p-2 rounded">
          <Square className="w-3 h-3" />
        </button>
        <button onClick={() => windowApi?.close()} className="hover:bg-red-600 p-2 rounded">
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
```

**Commit:** `git commit -m "Group E: Routing + landing block + Tauri-aware error pages"`

---

## Group F: Profile menu + Go to Dashboard

### F.1: Profile dropdown

```tsx
// src/components/desktop/profile-menu.tsx
"use client";

import { Home, Settings, LogOut, RefreshCw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 hover:bg-bb-card rounded-md"
      >
        <Avatar user={user} size="sm" />
        <span className="text-sm">{user.name || user.email}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-bb-card border border-bb-border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-3 border-b border-bb-border">
              <div className="text-sm font-medium">{user.name || "User"}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            
            <button
              onClick={() => { router.push("/desktop/dashboard"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bb-bg text-sm"
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </button>
            
            <button
              onClick={() => { router.push("/desktop/settings"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bb-bg text-sm"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            
            <button
              onClick={() => location.reload()}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-bb-bg text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reload App
            </button>
            
            <div className="border-t border-bb-border" />
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-900/20 hover:text-red-400 text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Commit:** `git commit -m "Group F: Profile menu with Go to Dashboard"`

---

## Group G: AI Providers vs Integrations split

### G.1: Settings sidebar restructure

```tsx
// src/app/desktop/settings/layout.tsx
const SETTINGS_NAV = [
  { id: "general", label: "General", icon: Settings },
  { id: "ai-providers", label: "AI Providers", icon: Sparkles },     // ⭐ NEW
  { id: "integrations", label: "Integrations", icon: Plug },          // ⭐ NEW (separate)
  { id: "workspace", label: "Workspace", icon: Folder },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & Privacy", icon: Lock },
  { id: "about", label: "About", icon: Info },
];
```

### G.2: AI Providers page (model keys only)

```tsx
// src/app/desktop/settings/ai-providers/page.tsx
// Already implemented in previous polish (B.2)
// Just ensure it's the dedicated page now
```

### G.3: Integrations page (external tool keys)

```tsx
// src/app/desktop/settings/integrations/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

interface Integration {
  id: string;
  service: "github" | "notion" | "slack" | "linear" | "google-drive" | "custom";
  name: string;
  credentials: { [key: string]: string };  // PAT, API key, OAuth tokens, etc.
  type: "pat" | "oauth" | "webhook" | "api-key";
  notes?: string;
}

const SERVICES = {
  "github": { label: "GitHub", icon: "🐙", type: "pat", docsUrl: "https://github.com/settings/tokens" },
  "notion": { label: "Notion", icon: "📝", type: "api-key", docsUrl: "https://www.notion.so/my-integrations" },
  "slack": { label: "Slack", icon: "💬", type: "webhook", docsUrl: "https://api.slack.com/apps" },
  "linear": { label: "Linear", icon: "📊", type: "api-key", docsUrl: "https://linear.app/settings/api" },
  "google-drive": { label: "Google Drive", icon: "📁", type: "oauth" },
  "custom": { label: "Custom", icon: "🔧", type: "api-key" },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  // Same UI pattern as AI Providers (+ button, list, modal)
  // ...
}
```

**Commit:** `git commit -m "Group G: AI Providers and Integrations split"`

---

## Group H: BB-System-Reference auto-generation ⭐

### H.1: Generator

```typescript
// src/lib/agents/system-reference.ts
import { writeFileAtomic } from "@/lib/tauri/fs";

export async function generateSystemReference(workspacePath: string) {
  const userInfo = await getUserInfo();
  const agents = await listAgents();
  
  const content = `# BB-System-Reference

This file is auto-generated and updated by BossBoard.
AI agents in this workspace should reference this file to understand BB.

## You are operating in BossBoard

BossBoard (BB) is a local-first AI workspace where humans collaborate with AI agents.

## Core principles

- **Local-first**: All files stored on user's machine
- **BYOK**: Bring Your Own Key (Anthropic, Google, OpenAI, xAI, Ollama)
- **MCP-native**: Open standard for tool interoperability
- **Privacy-respecting**: Data never leaves user's machine without permission

## Workspace structure

\`\`\`
${workspacePath}/
├── Library/              # User's knowledge base, references, finished docs
├── agents/
│   ├── ${userInfo.assistantName || "Personal-Assistant"}/
│   │   ├── manual.md     # Behavior rules, role definition
│   │   ├── memory.md     # Long-term memory summary
│   │   ├── conversations/  # DM history
│   │   ├── workspace/    # Agent's working files
│   │   └── reports/      # Periodic activity logs
│   └── (other agents)
├── shared/               # Multi-agent shared workspace
├── private/              # User-only (agents blocked)
└── .bb/
    ├── workspace.json
    ├── trash/
    ├── backups/
    └── logs/
\`\`\`

## Your capabilities (tools)

- \`search_library(query)\` — Search user's library by content/title
- \`read_file(path)\` — Read any file in /Library or your own folder
- \`write_file(path, content)\` — Write to /agents/{your-name}/workspace/
- \`list_files(folder)\` — List files in a folder
- \`post_to_board(title, content)\` — Post to user's board
- \`send_dm(message)\` — Reply to user (default action)
- \`create_event(title, time)\` — Add calendar event
- \`update_memory(notes)\` — Update your memory.md

## Critical rules

### Rule 1: Search before answering

For ANY question about user's work, projects, decisions, or specific information:
- You MUST call \`search_library()\` first
- Never answer from memory alone for factual questions
- If search returns nothing, say "I couldn't find that in your library"

### Rule 2: Save outputs systematically

- Working drafts → \`/agents/{your-name}/workspace/\`
- Polished, finished outputs → propose to user, then save to \`/Library/\`
- Daily activity logs → \`/agents/{your-name}/reports/{date}.md\`

### Rule 3: Respect permissions

- Read access: \`/Library/\`, \`/shared/\`, your own folder
- Write access: ONLY your own \`/agents/{your-name}/workspace/\` by default
- Never write to other agents' folders
- Never write to \`/private/\`

### Rule 4: Communicate clearly

- Default response language: ${userInfo.locale || "en"}
- Match user's tone (formal/casual)
- Always cite sources when using library content

## User context

- Name: ${userInfo.name || "Unknown"}
- Role: ${userInfo.role || "Unknown"}
- Project: ${userInfo.projectName || "Personal"}
- Timezone: ${userInfo.timezone || "UTC"}
- Language: ${userInfo.locale || "en"}

## Active agents in this workspace

${agents.map(a => `- **${a.name}** (${a.role || "general"}): ${a.description || "—"}`).join("\n")}

## How to grow

- Update your \`memory.md\` after each session with new learnings
- Ask user to clarify their preferences over time
- Check \`/Library/\` regularly for new context
- Review \`/agents/{your-name}/reports/\` to see your past work

---

*Last updated: ${new Date().toISOString()}*
*Auto-regenerates on workspace startup and agent creation*
`;

  await writeFileAtomic(`${workspacePath}/Library/BB-System-Reference.md`, content);
  
  // Also generate user-facing version
  await generateUserManual(workspacePath, userInfo);
}

async function generateUserManual(workspacePath: string, userInfo: UserInfo) {
  const content = `# Welcome to BossBoard

This is your AI workspace. Here's how to use it.

## What is BossBoard?

BossBoard is your AI team workspace. You have:
- A **Library** for all your files and notes
- AI **Agents** that help with specific tasks
- A **Board** for team discussions
- A **Calendar** for events and schedules
- **DM** to chat with any agent
- **Meetings** for multi-agent discussions

## Quick start

1. **Create your first agent**: Settings → Agents → New Agent
2. **Talk to your agent**: Open DM (Ctrl+Shift+D), select your agent, send a message
3. **Add knowledge**: Drop files into Library, your agents can read them
4. **Get organized**: Use Calendar for schedules, Board for team posts

## Tips

- **Be specific in agent manuals**: The more detail, the better responses
- **Use frontmatter tags**: Helps search and organization
- **Trust the trash**: Deleted files go to .bb/trash/, recoverable for 30 days
- **Privacy first**: Your data stays on this PC unless you enable cloud sync

## Need help?

- Click your Personal Assistant in DM, ask anything
- Check this file for capabilities
- Visit https://docs.mybossboard.com for full docs

---

*Last updated: ${new Date().toISOString()}*
`;

  await writeFileAtomic(`${workspacePath}/Library/Welcome.md`, content);
}
```

### H.2: Trigger generation

```typescript
// On workspace creation (first run)
await generateSystemReference(workspacePath);

// On agent creation
await generateSystemReference(workspacePath);  // Refresh

// On settings change
// (user updates name, role, project, language)
await generateSystemReference(workspacePath);
```

### H.3: Inject into agent system prompt

```typescript
// src/lib/agents/execute.ts
const systemRef = await readFile(`${workspacePath}/Library/BB-System-Reference.md`);

const systemPrompt = `
${systemRef}

# Your specific role

You are ${agent.name}.

${agent.manual}

# Your memory

${agent.memory}
`;
```

**Commit:** `git commit -m "Group H: BB-System-Reference auto-generation"`

---

## Group I: Agent manual templates (강화)

### I.1: Rich templates

**`src/lib/agents/templates.ts`:**

```typescript
export const AGENT_TEMPLATES = {
  "personal-assistant": {
    name: "Personal Assistant",
    description: "Your daily AI assistant for everything",
    manual: `# Personal Assistant Manual

## Role
I am your personal AI assistant. I help you stay organized, manage your day,
and provide thoughtful answers to your questions.

## My priorities
1. Save your time
2. Anticipate your needs
3. Always search Library before answering factual questions
4. Maintain context across conversations

## My approach
- Friendly but efficient
- Honest about what I don't know
- Proactive in suggesting next steps
- Match your communication style

## What I can do
- Manage your todos and schedule
- Summarize documents
- Draft emails and messages
- Research topics
- Take meeting notes
- Track action items

## What I can't do (yet)
- Send emails on your behalf without approval
- Make purchases
- Access external systems without integration setup

## How to work with me best
- Tell me about yourself, your role, your goals
- Update my memory.md when priorities change
- Use Ctrl+P to find files, then ask me about them
- I learn from our conversations - keep talking!`,
  },
  
  "domain-specialist": {
    name: "Domain Specialist",
    description: "Expert in a specific domain (marketing, design, etc.)",
    manual: `# Domain Specialist Manual

## Role
I am a specialist in [DOMAIN]. Customize this manual with your specific domain.

## My expertise
- [Skill 1]
- [Skill 2]
- [Skill 3]

## My workflow
1. Receive request from user
2. Search Library for relevant context
3. Analyze with domain expertise
4. Provide actionable recommendations
5. Save outputs to my workspace

## Frameworks I use
- [Framework 1]
- [Framework 2]

## When to escalate to user
- High-stakes decisions
- Cost > $X
- Anything affecting other team members

## Key files I reference
- /Library/[domain]/strategy.md
- /Library/[domain]/research/
- /agents/{my-name}/memory.md

## Customize this template!
Edit the [DOMAIN] and brackets to match your specialist.`,
  },
  
  "code-reviewer": {
    name: "Code Reviewer",
    description: "Reviews code for quality, security, and best practices",
    manual: `# Code Reviewer Manual

## Role
I review code for quality, security, and maintainability.

## My review checklist
1. **Functionality**: Does it work as intended?
2. **Security**: Any vulnerabilities (SQL injection, XSS, etc.)?
3. **Performance**: O(n²) where O(n) possible?
4. **Readability**: Clear naming, comments where needed?
5. **Tests**: Coverage, edge cases?
6. **Documentation**: README, JSDoc, types?

## Languages I know well
- JavaScript/TypeScript
- Python
- Rust
- Go
- (add yours)

## My output format
For each review:
- Summary (1-2 sentences)
- Critical issues (must fix)
- Suggestions (nice to have)
- Praise (what's done well)

## My principles
- Be specific, not vague ("This is slow" → "This loop is O(n²), use Map")
- Reference docs when claiming
- Suggest fixes, not just problems
- Acknowledge good code

## Save reviews to
/agents/{my-name}/reports/{date}-{pr-id}.md`,
  },
  
  "blank": {
    name: "Custom Agent",
    description: "Start from scratch",
    manual: `# {Agent Name} Manual

## Role
[Describe what this agent does]

## Priorities
1. [Top priority]
2. [Second priority]

## Approach
[How does this agent communicate and work?]

## Capabilities
- [What can it do?]

## Limitations
- [What can't it do?]

## How to work with this agent best
[Tips for the user]`,
  },
};
```

### I.2: Agent creation wizard

```tsx
// src/app/desktop/agents/new/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function NewAgentPage() {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<keyof typeof AGENT_TEMPLATES>("personal-assistant");
  const [name, setName] = useState("");
  const [customManual, setCustomManual] = useState("");
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === 1 && (
        <Step1ChooseTemplate
          template={template}
          onSelect={setTemplate}
          onNext={() => setStep(2)}
        />
      )}
      
      {step === 2 && (
        <Step2NameAgent
          template={AGENT_TEMPLATES[template]}
          name={name}
          onChange={setName}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      
      {step === 3 && (
        <Step3CustomizeManual
          template={AGENT_TEMPLATES[template]}
          name={name}
          manual={customManual}
          onChange={setCustomManual}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      
      {step === 4 && (
        <Step4Review
          name={name}
          manual={customManual || AGENT_TEMPLATES[template].manual}
          onBack={() => setStep(3)}
          onCreate={async () => {
            await createAgent({ name, manual: customManual || AGENT_TEMPLATES[template].manual });
            router.push("/desktop/agents");
          }}
        />
      )}
    </div>
  );
}
```

**Commit:** `git commit -m "Group I: Agent manual templates + creation wizard"`

---

## Group J: Welcome screen (간단)

### J.1: First-run welcome

```tsx
// src/app/desktop/welcome/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  
  const STEPS = [
    {
      title: "Welcome to BossBoard",
      content: "Your local-first AI team workspace.",
      cta: "Let's get started",
    },
    {
      title: "Tell me about yourself (optional)",
      content: <UserInfoForm />,
      cta: "Continue",
      skip: true,
    },
    {
      title: "Create your Personal Assistant",
      content: "I'll be your daily AI assistant. Start with the default or customize.",
      cta: "Create",
      skip: true,  // Can skip and create later
    },
  ];
  
  const current = STEPS[step];
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <h1 className="text-3xl font-bold mb-4">{current.title}</h1>
        <div className="mb-8">{current.content}</div>
        
        <div className="flex gap-2 justify-center">
          {current.skip && (
            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(step + 1);
                else router.push("/desktop/dashboard");
              }}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Skip
            </button>
          )}
          <button
            onClick={() => {
              if (step < STEPS.length - 1) setStep(step + 1);
              else router.push("/desktop/dashboard");
            }}
            className="px-6 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
          >
            {current.cta}
          </button>
        </div>
        
        <div className="mt-8 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i <= step ? "bg-bb-primary" : "bg-bb-border"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
```

**Trigger:** First time user logs in (no agents, no library files).

**Commit:** `git commit -m "Group J: Welcome screen (skippable)"`

---

## Group K: Calendar simplification

### K.1: Remove ICS export

Find any ICS-related code and remove:
- "Export to ICS" buttons
- ICS generation functions
- "Project schedules only" messages

### K.2: Just "Calendar"

Simple description, no special messaging. Users figure it out.

**Commit:** `git commit -m "Group K: Calendar simplification (no ICS, no messaging)"`

---

## Group L: Free plan changes

### L.1: Update plan config

```typescript
// src/config/plans.ts
export const PLANS = {
  free: {
    price: 0,
    features: {
      agents: 3,
      devices: 1,                      // ⭐ NEW: 1 device only
      workspaces: 1,
      cloudSync: { dms: false, board: true, calendar: true },  // ⭐ DM local only
      aiMeeting: false,
      smartSearch: false,
      teamCollaboration: false,
    },
  },
  starter: {
    price: 19,
    features: {
      agents: 10,
      devices: 2,                      // PC + mobile
      workspaces: 1,
      cloudSync: { dms: true, board: true, calendar: true },   // ⭐ All cloud
      aiMeeting: "basic",
      smartSearch: false,
      teamCollaboration: false,
    },
  },
  pro: {
    price: 49,
    features: {
      agents: 50,
      devices: "unlimited",
      workspaces: 3,
      cloudSync: { dms: true, board: true, calendar: true },
      aiMeeting: "full",                // Free discussion mode etc.
      smartSearch: true,
      teamCollaboration: false,
    },
  },
  business: {
    price: 129,
    features: {
      agents: "unlimited",
      devices: "unlimited",
      workspaces: "unlimited",
      cloudSync: "all",
      aiMeeting: "full",
      smartSearch: true,
      teamCollaboration: true,
    },
  },
};

// Beta discount: first 100 paying users
export const BETA_DISCOUNT = {
  percent: 30,
  lifetime: true,
  remaining: 100,  // Track in DB
};
```

### L.2: Pricing page update

Update landing/pricing page to reflect new plans.

**Commit:** `git commit -m "Group L: Free plan changes (1 device, DM local only)"`

---

## Group M: Beta v0.1 label

### M.1: App-wide

- TitleBar shows "Beta v0.1"
- Settings → About: "BossBoard Beta v0.1"
- API responses include `X-BB-Version: 3.0.0-beta.1`

### M.2: Landing page

- Header: "BossBoard Beta"
- Subtitle: "Public beta - your feedback shapes v1.0"

**Commit:** `git commit -m "Group M: Beta v0.1 label everywhere"`

---

## Group N: Public website (랜딩 + 모든 페이지)

### N.1: Landing page (English first)

```tsx
// src/app/page.tsx (web users only - Tauri redirects)

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ValueProps />
      <ChatGPTComparison />
      <Features />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="py-20 text-center">
      <h1 className="text-5xl font-bold mb-4">
        Your AI team. Your data. Your control.
      </h1>
      <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
        BossBoard is the local-first AI workspace where humans and AI agents
        actually collaborate. Bring your own AI keys. Keep your data on your machine.
      </p>
      <div className="flex gap-4 justify-center">
        <a href="/download" className="px-6 py-3 bg-bb-primary hover:bg-bb-primary-hover rounded-md">
          Download for Windows
        </a>
        <a href="#how-it-works" className="px-6 py-3 border border-bb-border hover:border-bb-primary rounded-md">
          See how it works
        </a>
      </div>
      <p className="text-sm text-gray-500 mt-4">
        Mac coming soon · <a href="#newsletter" className="underline">Get notified</a>
      </p>
    </section>
  );
}

function ValueProps() {
  return (
    <section className="py-16">
      <h2 className="text-3xl font-bold text-center mb-12">Why BossBoard?</h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card icon="🔒" title="Local-first">
          Your files stay on your PC. We never see your data.
        </Card>
        <Card icon="🔑" title="BYOK">
          Bring Your Own AI Key. Use Gemini, Claude, GPT, or local models.
        </Card>
        <Card icon="🔌" title="MCP-native">
          Open standard for AI tools. Works with Claude Code, Cursor, and more.
        </Card>
      </div>
    </section>
  );
}

function ChatGPTComparison() {
  return (
    <section className="py-16 bg-bb-card">
      <h2 className="text-3xl font-bold text-center mb-12">
        ChatGPT Workspace Agents vs BossBoard
      </h2>
      <table className="max-w-3xl mx-auto">
        <thead>
          <tr>
            <th>Feature</th>
            <th>ChatGPT</th>
            <th>BossBoard</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Data location</td><td>OpenAI cloud</td><td>Your PC</td></tr>
          <tr><td>AI models</td><td>OpenAI only</td><td>Any (BYOK)</td></tr>
          <tr><td>Pricing</td><td>$25/user + credits</td><td>$19/user + your AI bill</td></tr>
          <tr><td>Multi-agent meetings</td><td>—</td><td>✓</td></tr>
          <tr><td>Local AI (Ollama)</td><td>—</td><td>✓</td></tr>
          <tr><td>MCP integration</td><td>—</td><td>✓ Native</td></tr>
          <tr><td>Offline use</td><td>—</td><td>✓ (with local AI)</td></tr>
        </tbody>
      </table>
    </section>
  );
}
```

### N.2: Other pages

Create these pages with global, English-first content:

- `/download` — Download page (Windows .msi, "Mac coming soon")
- `/docs` — Documentation hub
- `/docs/getting-started` — First steps
- `/docs/byok` — How to set up API keys
- `/docs/agents` — Agent guide
- `/docs/library` — Library guide
- `/docs/mcp` — MCP integration
- `/privacy` — Privacy policy (local-first emphasis)
- `/terms` — Terms of service
- `/pricing` — Pricing tiers
- `/faq` — FAQ
- `/changelog` — Version history

### N.3: Download page

```tsx
// src/app/download/page.tsx
export default function DownloadPage() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">Download BossBoard Beta v0.1</h1>
      
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <DownloadCard
          os="Windows"
          icon="🪟"
          available={true}
          version="v3.0.0-beta.1"
          size="~25 MB"
          requirements="Windows 10/11, 4GB RAM"
          fileType=".msi"
          downloadUrl="/downloads/BossBoard-3.0.0-beta.1-x64.msi"
        />
        
        <DownloadCard
          os="macOS"
          icon="🍎"
          available={false}
          comingSoon={true}
          requirements="macOS 11+"
        >
          <NewsletterSignup placeholder="Get notified when Mac is ready" />
        </DownloadCard>
      </div>
      
      <SystemRequirements />
      <InstallationGuide />
      <SecurityNote />
    </div>
  );
}
```

### N.4: FAQ

```tsx
const FAQS = [
  {
    q: "What is BYOK?",
    a: "Bring Your Own Key. You use your own API keys for AI providers (Anthropic, Google, OpenAI, etc.). BossBoard charges only for the workspace; you pay providers directly for AI usage. This means you control costs, choose models, and never share data with us.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT stores everything on OpenAI servers and only uses OpenAI models. BossBoard runs as a desktop app: your files stay on your machine, you choose any AI provider, and you can use offline-capable local models like Ollama.",
  },
  {
    q: "Where is my data stored?",
    a: "All files (Library, agents, conversations) are stored locally in ~/Documents/BossBoard/. Some metadata (board posts, calendar events, profile) is synced to our cloud (Supabase) for multi-device access. DMs are local-only by default.",
  },
  {
    q: "Can I use multiple AI models?",
    a: "Yes! Add multiple API keys (e.g., Anthropic for one agent, Gemini for another). You can also set up multiple keys for the same provider (Production, Test, etc.).",
  },
  {
    q: "Is it really free for personal use?",
    a: "The Free plan gives you 3 agents and 1 device. You pay your AI provider directly (Gemini Flash has a generous free tier). Beta launch: first 100 paying users get 30% lifetime discount.",
  },
  // ... more FAQs
];
```

**Commit:** `git commit -m "Group N: Public website (landing + all pages, English first)"`

---

## Group O: Admin page (진짜 모든 거)

### O.1: Admin dashboard

```tsx
// src/app/admin/page.tsx
// Protected route - only Jay's email

export default function AdminDashboard() {
  return (
    <div className="grid grid-cols-12 gap-4 p-6">
      {/* Top stats */}
      <StatCard label="Total Users" value={stats.totalUsers} />
      <StatCard label="DAU" value={stats.dau} />
      <StatCard label="WAU" value={stats.wau} />
      <StatCard label="MAU" value={stats.mau} />
      <StatCard label="MRR" value={`$${stats.mrr}`} />
      <StatCard label="Beta Slots" value={`${stats.betaUsed}/100`} />
      
      {/* Charts */}
      <div className="col-span-6">
        <UserGrowthChart />
      </div>
      <div className="col-span-6">
        <RevenueChart />
      </div>
      
      {/* OS breakdown */}
      <div className="col-span-4">
        <OSBreakdown />  {/* Windows / Mac / Linux */}
      </div>
      
      {/* Country breakdown */}
      <div className="col-span-4">
        <CountryBreakdown />
      </div>
      
      {/* Plan breakdown */}
      <div className="col-span-4">
        <PlanBreakdown />
      </div>
      
      {/* Sections */}
      <Section title="Recent Feedback" link="/admin/feedback" />
      <Section title="Bug Reports" link="/admin/bugs" />
      <Section title="Active Sessions" link="/admin/sessions" />
      <Section title="Sentry Errors" link="/admin/errors" />
    </div>
  );
}
```

### O.2: Feedback page

```tsx
// src/app/admin/feedback/page.tsx
export default function FeedbackPage() {
  return (
    <div>
      <Filters>
        <Filter label="OS" options={["All", "Windows", "Mac"]} />
        <Filter label="Priority" options={["All", "Critical", "High", "Medium", "Low"]} />
        <Filter label="Category" options={["Bug", "Feature", "UI", "Performance"]} />
        <DateRange />
      </Filters>
      
      <FeedbackTable>
        {feedbacks.map(f => (
          <FeedbackRow
            user={f.user}
            os={f.os}                    {/* ⭐ OS */}
            version={f.version}
            priority={f.priority}
            category={f.category}
            content={f.content}
            createdAt={f.createdAt}
          />
        ))}
      </FeedbackTable>
      
      <ExportButton format="excel" />
      <ExportButton format="csv" />
    </div>
  );
}
```

### O.3: User events tracking

```typescript
// src/lib/admin/track.ts
export async function trackEvent(event: {
  user_id: string;
  event_name: string;
  metadata?: any;
  os?: "windows" | "mac" | "linux";  // ⭐ Auto-detected
  version?: string;
}) {
  const supabase = createClient();
  await supabase.from("events").insert({
    ...event,
    os: detectOS(),
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
}

function detectOS(): "windows" | "mac" | "linux" | "unknown" {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}
```

### O.4: Realtime alerts

```typescript
// Critical errors → Telegram
if (event.priority === "critical") {
  await sendTelegram({
    text: `🚨 Critical: ${event.message}\nUser: ${event.user.email}\nOS: ${event.os}`,
  });
}
```

**Commit:** `git commit -m "Group O: Admin dashboard with full visibility (OS, country, plan, feedback)"`

---

## Group P: Final validation

```bash
npx tsc --noEmit
npx eslint src/
cd src-tauri && cargo check && cargo clippy && cd ..
```

Fix any new errors. Warnings are OK.

**Update LAUNCH-CHECKLIST.md:**

```markdown
## What this final polish shipped

### Critical data safety:
- DB schema migration with auto-backup
- Frontmatter migration (never lose files)
- Auto-backup on app start (7-day retention)
- Agent error recovery UI

### i18n:
- 10 languages (English primary, AI-translated others)
- Beta translation feedback notice
- AI agent locale awareness

### Library:
- Obsidian-style folder tree
- Sort by name/date/size/type
- Drag-and-drop file move
- Right-click menu (rename, duplicate, move, etc.)
- Multi-select (Ctrl/Shift+click)
- Keyboard shortcuts (Ctrl+N, F2, Ctrl+P, etc.)
- Tags system
- Favorites + Recent

### UI/UX:
- Empty states
- Error states with retry
- Skeleton loaders
- Toast notifications (alert replaced)
- Confirm dialogs
- Focus accessibility
- Hover effects

### Routing:
- Tauri redirects to /desktop/dashboard
- Web blocks /desktop access
- Error pages keep TitleBar (window controls)

### Profile:
- Dropdown menu with Go to Dashboard
- Reload App option
- Sign out

### Settings:
- AI Providers separate (model API keys)
- Integrations separate (external tools)

### Agents:
- BB-System-Reference auto-generated
- User-facing Welcome.md auto-generated
- Rich manual templates (Personal, Specialist, Reviewer, Blank)
- 4-step creation wizard
- Forced library search rule

### Welcome screen:
- Optional, skippable
- Tells user about BB
- Encourages Personal Assistant creation

### Calendar:
- Simplified (no ICS export)

### Plans:
- Free: 1 device, DM local only
- Starter: 2 devices
- Pro: unlimited devices, AI Meeting full
- Business: unlimited everything + team

### Public website:
- Landing page (English first)
- ChatGPT comparison
- Download page (Windows now, Mac coming)
- Docs (getting-started, BYOK, agents, MCP)
- Privacy (local-first emphasis)
- Terms
- Pricing
- FAQ
- Changelog

### Admin:
- Full dashboard (users, MRR, beta slots)
- Feedback with OS/priority filters
- OS breakdown (Windows/Mac/Linux)
- Country/plan breakdown
- Excel export
- Realtime Telegram alerts

### Beta v0.1 label:
- TitleBar
- Settings → About
- All API responses
```

**Final commit:**
```bash
git add .
git commit -m "Final polish: data safety + i18n + library + UX + routing + admin (BB v3.0 beta-ready)"
git log --oneline -20
```

---

## Reporting

In your final response include:
1. Commits made (count + list)
2. Build status
3. Files added/modified
4. Strict deferrals with reasons
5. Known compromises
6. What user should test before launch

Stop after this. No further changes. Wait for Jay's smoke test.
