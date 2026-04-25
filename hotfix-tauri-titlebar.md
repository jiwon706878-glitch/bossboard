# BB v3.0 Hotfix: Tauri Routing + Custom Titlebar + Sidebar Nav

Read CLAUDE.md first.

**Problem:** Tauri app shows landing page (`/`) instead of `/desktop`. The `isTauri()` check fails because `window.__TAURI__` isn't set synchronously in Tauri v2.

**Goal:** Fix routing + add custom titlebar + sidebar navigation.

---

## Task 1: Fix Tauri Detection

### 1.1: Update isTauri() helper

Edit `src/lib/tauri/fs.ts`:

Replace the existing `isTauri()` function with a more reliable check:

```typescript
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  // Tauri v2: check for __TAURI_INTERNALS__ (always set)
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}
```

### 1.2: Update desktop/page.tsx to handle timing

Edit `src/app/desktop/page.tsx`. The issue: redirect to `/` happens before Tauri globals load.

Replace the useEffect with:

```typescript
useEffect(() => {
  // Wait briefly for Tauri globals to initialize
  let checkCount = 0;
  const maxChecks = 20; // 2 seconds max
  
  const checkTauri = async () => {
    if (isTauri()) {
      // We're in Tauri — proceed with workspace/auth check
      const saved = localStorage.getItem("bb_workspace_path");
      if (saved && (await isWorkspace(saved))) {
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
      return;
    }
    
    checkCount++;
    if (checkCount >= maxChecks) {
      // Definitively not Tauri — send to web
      window.location.href = "/";
      return;
    }
    
    setTimeout(checkTauri, 100);
  };
  
  checkTauri();
}, [router]);
```

---

## Task 2: Create BB Documents Workspace (if needed)

The Rust `get_default_workspace_path` should return `~/Documents/BossBoard`. Verify in `src-tauri/src/commands/workspace.rs`:

```rust
#[tauri::command]
pub async fn get_default_workspace_path() -> Result<String, FsError> {
    let home = dirs::home_dir()
        .ok_or_else(|| FsError::InvalidPath("Cannot find home directory".to_string()))?;
    let path = home.join("Documents").join("BossBoard");
    Ok(path.to_string_lossy().to_string())
}
```

If not already correct, fix it.

---

## Task 3: Custom Titlebar Component

### 3.1: Disable native titlebar

Edit `src-tauri/tauri.conf.json`:

```json
"windows": [
  {
    "title": "BossBoard",
    "width": 1280,
    "height": 800,
    "minWidth": 900,
    "minHeight": 600,
    "resizable": true,
    "fullscreen": false,
    "decorations": false,
    "transparent": false
  }
]
```

### 3.2: Add window control permissions

Edit `src-tauri/capabilities/default.json` to add window permissions:

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-close",
    "core:window:allow-start-dragging",
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

### 3.3: Create Titlebar component

Create `src/components/desktop/titlebar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Minus, Square, X, Search, Sun, Moon } from "lucide-react";
import { isTauri } from "@/lib/tauri/fs";

export function Titlebar() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Track history state
    const updateNav = () => {
      setCanGoBack(window.history.length > 1);
    };
    updateNav();
    window.addEventListener("popstate", updateNav);
    return () => window.removeEventListener("popstate", updateNav);
  }, []);

  async function handleMinimize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  }

  async function handleMaximize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  }

  async function handleClose() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }

  function handleBack() {
    router.back();
  }

  function handleForward() {
    router.forward();
  }

  function toggleTheme() {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-[#0C0F17] border-b border-gray-800 flex items-center justify-between px-2 select-none"
    >
      {/* Left: Navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="p-1.5 hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleForward}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Forward"
        >
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Center: Search (draggable region) */}
      <div
        data-tauri-drag-region
        className="flex-1 flex justify-center items-center mx-4"
      >
        <div className="flex items-center gap-2 px-3 py-1 bg-[#141824] border border-gray-800 rounded-md text-xs text-gray-500 w-96 cursor-text">
          <Search className="w-3.5 h-3.5" />
          <span>Search BossBoard...</span>
          <span className="ml-auto text-[10px] text-gray-600">Ctrl+K</span>
        </div>
      </div>

      {/* Right: Window controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Toggle theme"
        >
          {isDark ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
        </button>
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <button
          onClick={handleMinimize}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Minimize"
        >
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Maximize"
        >
          <Square className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-red-600 rounded"
          title="Close"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
```

---

## Task 4: Sidebar Navigation

### 4.1: Create Sidebar component

Create `src/components/desktop/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  LayoutGrid,
  MessageSquare,
  Calendar,
  Users,
  Bot,
  Settings,
  LogOut
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/desktop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/desktop/library", label: "Library", icon: Library },
  { href: "/desktop/board", label: "Board", icon: LayoutGrid, disabled: true },
  { href: "/desktop/dm", label: "DM", icon: MessageSquare, disabled: true },
  { href: "/desktop/calendar", label: "Calendar", icon: Calendar, disabled: true },
  { href: "/desktop/meetings", label: "Meetings", icon: Users, disabled: true },
  { href: "/desktop/agents", label: "Agents", icon: Bot, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/desktop/login");
  }

  return (
    <aside className="w-56 bg-[#0A0D14] border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="font-bold text-white">BossBoard</div>
        <div className="text-xs text-gray-500 mt-0.5">v3.0 beta</div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 cursor-not-allowed"
                title="Coming soon"
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] bg-gray-800 px-1.5 py-0.5 rounded">soon</span>
              </div>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                active
                  ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-800">
        <Link
          href="/desktop/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
```

---

## Task 5: Update Desktop Layout

Edit `src/app/desktop/layout.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide sidebar on auth pages (login, welcome)
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";
  
  return (
    <div className="h-screen flex flex-col bg-[#0C0F17] text-white overflow-hidden">
      <Titlebar />
      <OfflineBanner />
      
      <div className="flex-1 flex overflow-hidden">
        {!isAuthPage && <Sidebar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Task 6: Update dashboard to not show redundant header

Edit `src/app/desktop/dashboard/page.tsx` to remove the top bar (now in layout) and sign-out button (now in sidebar):

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

  if (!user) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome back, {user.email}</p>

        <div className="space-y-4">
          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Workspace</div>
            <div className="text-sm text-gray-300 mt-1 font-mono">{workspacePath}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
              <div className="text-xs text-gray-500 uppercase">Agents</div>
              <div className="text-3xl font-bold mt-2">0</div>
              <div className="text-xs text-gray-500 mt-1">Coming in Week 3</div>
            </div>
            <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
              <div className="text-xs text-gray-500 uppercase">Library Pages</div>
              <div className="text-3xl font-bold mt-2">—</div>
              <div className="text-xs text-gray-500 mt-1">Check Library</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 7: Install needed packages

```bash
npm install lucide-react
```

If already installed, skip.

---

## Task 8: Validation + Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
git add .
git commit -m "Fix Tauri routing + custom titlebar + sidebar navigation (BB v3.0 Hotfix)"
git log --oneline -5
```

---

## Success Criteria

✓ Tauri app opens to `/desktop` (workspace welcome or login)
✓ No native Windows titlebar (custom one instead)
✓ Back/forward buttons work
✓ Minimize/maximize/close buttons work
✓ Sidebar appears after login with nav items
✓ Library link in sidebar goes to library page
✓ Sign out from sidebar works
✓ `npx tsc --noEmit` passes
✓ `cargo check` passes

---

## Reporting

After done:
1. All commits
2. Any errors encountered
3. Whether build passes
