# BB v3.0 Hotfix 2: UI Improvements + Bug Fixes

Read CLAUDE.md first.

**Issues found in testing:**
1. Default path button doesn't auto-create folder if parent missing
2. Theme toggle does nothing
3. Search bar takes too much space (collapse to icon)
4. Missing notifications + DM icons in titlebar
5. Refresh button missing
6. Google OAuth lock-up if user closes browser before completing
7. Native Windows dialogs need custom styling (alert() etc.)
8. GitHub button breaks login flow

**Important context:** App stays English-only at launch. Multi-language UI is post-launch (v3.1+). Do NOT add Korean or other UI translations now.

---

## Task 1: Fix Default Folder Path Auto-Creation

In `src-tauri/src/commands/workspace.rs`, the `initialize_workspace` should auto-create root + all parents:

```rust
#[tauri::command]
pub async fn initialize_workspace(root_path: String) -> Result<WorkspaceInfo, FsError> {
    let root = PathBuf::from(&root_path);
    
    // CRITICAL: Create root + all parent directories first
    fs::create_dir_all(&root)?;
    
    let dirs = ["Library", "agents", "shared", "private", ".bb"];
    for dir in &dirs {
        fs::create_dir_all(root.join(dir))?;
    }
    
    // ... rest of existing function (workspace.json marker, Getting-Started.md, Roadmap.md)
}
```

If the function is already correct, leave it. Just verify `fs::create_dir_all(&root)` is called before subdirs.

In `src/app/desktop/page.tsx`, replace any `alert()` with inline error UI:

```typescript
const [setupError, setSetupError] = useState<string | null>(null);

async function setupWorkspace(path: string) {
  try {
    setSetupError(null);
    await initializeWorkspace(path);
    localStorage.setItem("bb_workspace_path", path);
    router.replace("/desktop/login");
  } catch (e: any) {
    setSetupError(`Failed to set up workspace: ${e.message || String(e)}`);
  }
}
```

Display inline (NOT alert):

```tsx
{setupError && (
  <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
    <div>{setupError}</div>
    <button onClick={() => setSetupError(null)} className="text-xs underline mt-2">Dismiss</button>
  </div>
)}
```

---

## Task 2: Make Theme Toggle Work

The current Titlebar has `toggleTheme` that toggles a `dark` class but Tailwind isn't configured for it.

### 2.1: Tailwind dark mode

Edit `tailwind.config.ts` (or .js):

```typescript
export default {
  darkMode: 'class',
  // ... rest of existing config
}
```

### 2.2: Theme provider

Create `src/components/desktop/theme-provider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("bb_theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("bb_theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

Update `src/app/desktop/layout.tsx` to wrap with ThemeProvider.

Update titlebar to use `useTheme()` hook instead of local state.

For now, dark mode is the polished default. Light mode works (toggle persists) but may have minor styling gaps; that's acceptable for v3.0.

---

## Task 3: Collapse Search Bar to Icon

In `src/components/desktop/titlebar.tsx`:

```tsx
const [searchExpanded, setSearchExpanded] = useState(false);

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchExpanded(true);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);

// Replace the search section with:
<div data-tauri-drag-region className="flex-1 flex justify-center items-center mx-4">
  {searchExpanded ? (
    <div className="flex items-center gap-2 px-3 py-1 bg-[#141824] border border-blue-500 rounded-md w-96">
      <Search className="w-3.5 h-3.5 text-gray-400" />
      <input
        type="text"
        placeholder="Search BossBoard..."
        autoFocus
        onBlur={() => setSearchExpanded(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setSearchExpanded(false);
        }}
        className="flex-1 bg-transparent text-sm text-white outline-none"
      />
      <span className="text-[10px] text-gray-500">Esc</span>
    </div>
  ) : (
    <button
      onClick={() => setSearchExpanded(true)}
      className="p-1.5 hover:bg-gray-800 rounded"
      title="Search (Ctrl+K)"
    >
      <Search className="w-4 h-4 text-gray-400" />
    </button>
  )}
</div>
```

---

## Task 4: Add Refresh + Notifications + DM Icons

In titlebar imports:
```tsx
import { ArrowLeft, ArrowRight, RefreshCw, Bell, MessageSquare, Search, Sun, Moon, Minus, Square, X } from "lucide-react";
```

Left section (after forward button):
```tsx
<button onClick={() => window.location.reload()} className="p-1.5 hover:bg-gray-800 rounded" title="Refresh (Ctrl+R)">
  <RefreshCw className="w-4 h-4 text-gray-400" />
</button>
```

Right section (before theme toggle):
```tsx
<button className="p-1.5 hover:bg-gray-800 rounded relative" title="Notifications">
  <Bell className="w-4 h-4 text-gray-400" />
</button>
<button className="p-1.5 hover:bg-gray-800 rounded relative" title="Direct Messages">
  <MessageSquare className="w-4 h-4 text-gray-400" />
</button>
```

Both notifications and DM icons are placeholders for now — Week 4 will wire them to real data via Supabase Realtime. Don't add badge counts or click handlers yet.

---

## Task 5: Fix Google OAuth Lock-up

Current issue: `pollForSession` runs for 2 minutes blocking other interactions. User can't switch to email login if they close OAuth browser.

In `src/app/desktop/login/page.tsx`:

```tsx
import { useState, useRef, useEffect } from "react";

// Add states:
const [oauthInProgress, setOauthInProgress] = useState(false);
const oauthCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

async function handleOAuth(provider: "google" | "github") {
  // GitHub not configured yet
  if (provider === "github") {
    setError("GitHub login is not yet configured. Use Google or email/password.");
    return;
  }
  
  setLoading(true);
  setOauthInProgress(true);
  setError(null);
  oauthCancelRef.current = { cancelled: false };
  
  try {
    const redirectTo = `${window.location.origin}/auth/callback`;
    if (isTauri()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true }
      });
      if (error) throw error;
      if (data?.url) {
        await openExternal(data.url);
        pollForSession(oauthCancelRef.current);
      }
    } else {
      await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    }
  } catch (e: any) {
    setError(e.message);
    setLoading(false);
    setOauthInProgress(false);
  }
}

async function pollForSession(cancelRef: { cancelled: boolean }) {
  for (let i = 0; i < 60; i++) {
    if (cancelRef.cancelled) {
      setLoading(false);
      setOauthInProgress(false);
      return;
    }
    await new Promise(r => setTimeout(r, 2000));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.replace("/desktop/dashboard");
      return;
    }
  }
  setError("Login timed out. Please try again.");
  setLoading(false);
  setOauthInProgress(false);
}

function cancelOAuth() {
  oauthCancelRef.current.cancelled = true;
  setLoading(false);
  setOauthInProgress(false);
  setError(null);
}
```

Add cancel UI when OAuth in progress:

```tsx
{oauthInProgress && (
  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-md text-sm">
    <div className="text-blue-300">Waiting for login in browser...</div>
    <div className="text-xs text-gray-400 mt-1">
      Complete the login in the browser window that opened.
    </div>
    <button
      onClick={cancelOAuth}
      className="text-xs text-gray-400 hover:text-white mt-2 underline"
    >
      Cancel and try a different method
    </button>
  </div>
)}
```

This way user can cancel OAuth and switch back to email/password if browser was closed.

---

## Task 6: Custom Modal Component

Create `src/components/desktop/modal.tsx`:

```tsx
"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: "default" | "error" | "warning" | "info";
}

export function Modal({ isOpen, onClose, title, children, variant = "default" }: ModalProps) {
  if (!isOpen) return null;

  const borderColor = {
    default: "border-gray-700",
    error: "border-red-700",
    warning: "border-yellow-700",
    info: "border-blue-700",
  }[variant];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-[#141824] border ${borderColor} rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant={variant === "danger" ? "error" : "default"}>
      <p className="text-gray-300 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border border-gray-700 hover:bg-gray-800 rounded-md"
        >
          {cancelText}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 text-sm rounded-md ${
            variant === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
```

Replace ALL `alert()` calls in `src/app/desktop/` and `src/components/desktop/` with `<Modal>` or inline error UI. Use grep:

```bash
grep -rn "alert(" src/app/desktop/ src/components/desktop/
```

For each one:
- Simple errors → inline error UI (state + display in JSX)
- Confirmations → `<ConfirmDialog>`
- Info messages → `<Modal>` with info variant

---

## Task 7: GitHub Button Doesn't Crash

In `src/app/desktop/login/page.tsx`, the GitHub button should show a friendly message instead of attempting OAuth:

```tsx
<button
  onClick={() => handleOAuth("github")}
  disabled={loading}
  className="w-full p-3 bg-[#24292e] text-white rounded-md font-medium hover:bg-[#333] disabled:opacity-50 flex items-center justify-center gap-2"
>
  Continue with GitHub
  <span className="text-xs text-gray-400">(coming soon)</span>
</button>
```

The early return in `handleOAuth` (Task 5) already handles this — clicking just shows the error message without breaking anything else.

---

## Task 8: Build + Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
git add .
git commit -m "Hotfix 2: UI polish + OAuth fix + custom modals (BB v3.0)"
git log --oneline -5
```

---

## Success Criteria

✓ Default path button auto-creates folders even if parent missing
✓ Theme toggle persists choice (dark/light) — light may have minor gaps, OK for now
✓ Search collapses to icon, expands on click or Ctrl+K
✓ Refresh button works (Ctrl+R or click)
✓ Notifications + DM icons in titlebar (placeholders, no logic yet)
✓ Google OAuth shows "Cancel" button during waiting state
✓ Native alert() replaced with Modal component (or inline UI)
✓ GitHub button shows friendly message, doesn't lock app
✓ All builds pass (TypeScript + Rust)

---

## Reporting

After done:
1. Commits made
2. Build pass status (TS + Rust)
3. Any issues encountered
4. Files modified count

Stop here. Wait for testing feedback before Week 3.
