# BB v3.0 Hotfix 2: UI Improvements + Bug Fixes

Read CLAUDE.md first.

**Issues found in testing:**
1. Default path button doesn't auto-create folder if missing
2. Theme toggle does nothing
3. Search bar takes too much space (collapse to icon)
4. Missing notifications + DM icons in titlebar
5. Refresh button missing
6. Google OAuth lock-up if user closes browser before completing
7. Native Windows dialogs need custom styling
8. Login window opens too big (browser style)

---

## Task 1: Fix Default Folder Path Auto-Creation

In `src-tauri/src/commands/workspace.rs`, the `initialize_workspace` should auto-create parent dirs. Verify it does:

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
    
    // ... rest of function
}
```

If `Documents` folder itself doesn't exist (rare but possible), this will create it.

In `src/app/desktop/page.tsx`, ensure error handling:

```typescript
async function setupWorkspace(path: string) {
  try {
    await initializeWorkspace(path);
    localStorage.setItem("bb_workspace_path", path);
    router.replace("/desktop/login");
  } catch (e: any) {
    // Show user-friendly error in app, not OS dialog
    setSetupError(`Failed to set up workspace: ${e.message || e}`);
  }
}
```

Add `setupError` state and display inline (NOT alert):

```tsx
{setupError && (
  <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
    {setupError}
    <button onClick={() => setSetupError(null)} className="ml-2 underline">Dismiss</button>
  </div>
)}
```

---

## Task 2: Make Theme Toggle Work

The current Titlebar has `toggleTheme` that toggles a `dark` class but Tailwind isn't configured for it. Add proper theme support:

### 2.1: Tailwind dark mode

Edit `tailwind.config.ts` (or .js):

```typescript
export default {
  darkMode: 'class',
  // ... rest
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

Update `src/app/desktop/layout.tsx`:

```tsx
import { ThemeProvider } from "@/components/desktop/theme-provider";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  // ...
  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-[#0C0F17] dark:bg-[#0C0F17] text-white dark:text-white overflow-hidden">
        {/* ... */}
      </div>
    </ThemeProvider>
  );
}
```

Update titlebar to use the theme:

```tsx
import { useTheme } from "./theme-provider";

export function Titlebar() {
  const { theme, toggleTheme } = useTheme();
  // ... use theme === "dark" instead of isDark state
}
```

Note: For v3.0 launch, dark mode is fine as default. Light mode polish can come later. Just make the toggle persist the choice.

---

## Task 3: Collapse Search Bar to Icon

Update `src/components/desktop/titlebar.tsx`:

```tsx
const [searchExpanded, setSearchExpanded] = useState(false);

// In the JSX:
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

// Add Ctrl+K shortcut globally
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
```

---

## Task 4: Add Refresh Button + Notifications + DM Icons

In titlebar, add icons next to back/forward:

```tsx
import { ArrowLeft, ArrowRight, RefreshCw, Bell, MessageSquare, Search, Sun, Moon, Minus, Square, X } from "lucide-react";

// In left nav section:
<div className="flex items-center gap-1">
  <button onClick={handleBack} className="p-1.5 hover:bg-gray-800 rounded" title="Back">
    <ArrowLeft className="w-4 h-4 text-gray-400" />
  </button>
  <button onClick={handleForward} className="p-1.5 hover:bg-gray-800 rounded" title="Forward">
    <ArrowRight className="w-4 h-4 text-gray-400" />
  </button>
  <button onClick={() => window.location.reload()} className="p-1.5 hover:bg-gray-800 rounded" title="Refresh (Ctrl+R)">
    <RefreshCw className="w-4 h-4 text-gray-400" />
  </button>
</div>

// Right side, before theme toggle:
<button className="p-1.5 hover:bg-gray-800 rounded relative" title="Notifications">
  <Bell className="w-4 h-4 text-gray-400" />
  {/* Unread badge - hide for now, wire to Supabase realtime later */}
</button>
<button className="p-1.5 hover:bg-gray-800 rounded relative" title="Direct Messages">
  <MessageSquare className="w-4 h-4 text-gray-400" />
</button>
```

---

## Task 5: Fix Google OAuth Lock-up

Current issue: `pollForSession` runs for 2 minutes, blocking other interactions.

Fix in `src/app/desktop/login/page.tsx`:

```tsx
const [oauthInProgress, setOauthInProgress] = useState(false);
const oauthCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

async function handleOAuth(provider: "google" | "github") {
  setLoading(true);
  setOauthInProgress(true);
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

Add cancel button when OAuth in progress:

```tsx
{oauthInProgress && (
  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-md text-sm">
    <div className="text-blue-300">Waiting for login in browser...</div>
    <button
      onClick={cancelOAuth}
      className="text-xs text-gray-400 hover:text-white mt-2 underline"
    >
      Cancel and try a different method
    </button>
  </div>
)}
```

This way user can cancel OAuth and switch to email/password if browser was closed.

---

## Task 6: Custom Window Dialogs (Optional polish)

Native browser `alert()` and OS dialog use OS styling. For BB-branded experience, replace with custom modals.

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`bg-[#141824] border ${borderColor} rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded"
            >
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

Replace ALL `alert()` calls in the desktop app with `<Modal>` or toast notifications. Search for `alert(` in `src/app/desktop/` and `src/components/desktop/` and replace.

---

## Task 7: GitHub OAuth Setup Optional

For now, keep GitHub button visible but show "Coming soon" tooltip. Don't break login if user clicks it:

```tsx
<button
  onClick={() => setError("GitHub login is not yet configured. Use Google or email/password.")}
  disabled={loading}
  className="w-full p-3 bg-[#24292e] text-white rounded-md font-medium hover:bg-[#333] disabled:opacity-50"
>
  Continue with GitHub <span className="text-xs text-gray-400 ml-2">(soon)</span>
</button>
```

---

## Task 8: Build + Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
git add .
git commit -m "Hotfix 2: UI polish + OAuth fix + custom dialogs (BB v3.0)"
```

---

## Success Criteria

✓ Default path button creates folder even if Documents missing  
✓ Theme toggle persists choice (dark/light)  
✓ Search bar collapses to icon, expands on click or Ctrl+K  
✓ Refresh button works (Ctrl+R)  
✓ Notifications + DM icons in titlebar (placeholders OK)  
✓ Google OAuth has cancel button  
✓ Native alert() replaced with Modal component  
✓ GitHub button doesn't crash login flow  
✓ All builds pass

---

## Reporting

Report:
1. Commits made
2. Tested in Tauri app? (yes/no for each)
3. Any errors

Stop here. After verification we move to Week 3 (TipTap + agents).
