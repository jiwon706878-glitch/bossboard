# BB v3.0 Hotfix 3: Critical Routing + Top Bar Redesign + Context Menu

Read CLAUDE.md first.

**Critical issues from testing:**
1. 404 errors redirect to landing page instead of staying in app
2. Settings page returns 404 (not implemented)
3. Auto-login lands on web `/dashboard` instead of `/desktop/dashboard`
4. Web `/dashboard` route should be deleted (moved to Tauri)
5. Top bar layout needs redesign (icons right-aligned, profile avatar)
6. No custom right-click context menu (uses Chrome default)
7. "Remember me" checkbox missing on login

---

## Task 1: Fix Auto-Login Routing (CRITICAL)

The Supabase auth callback redirects to `/dashboard` (web) but Tauri users should land on `/desktop/dashboard`.

### 1.1: Create a desktop-specific callback route

Create `src/app/auth/callback-desktop/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = "/desktop/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/desktop/login?error=auth`);
}
```

### 1.2: Update OAuth redirectTo in desktop login

In `src/app/desktop/login/page.tsx`, change the redirectTo:

```typescript
const redirectTo = `${window.location.origin}/auth/callback-desktop`;
```

(Was previously `/auth/callback` which redirects to web `/dashboard`.)

### 1.3: Add session persistence check on /desktop entry

Update `src/app/desktop/page.tsx` to handle returning sessions reliably. The redirect logic should be:

```typescript
// Inside checkTauri():
if (isTauri()) {
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
    // ... welcome flow
  }
  return;
}
```

This is already correct — the issue is the OAuth callback. Task 1.1 + 1.2 fix it.

---

## Task 2: Delete Web Dashboard (Cleanup)

The web has `/dashboard` route still active from v2.6. Since v3.0 moves all dashboard features into Tauri, the web `/dashboard` should redirect to download or delete entirely.

### 2.1: Find existing web dashboard

```bash
ls src/app/(dashboard)/
```

### 2.2: Replace with redirect

Replace `src/app/(dashboard)/dashboard/page.tsx` with a redirect:

```tsx
import { redirect } from "next/navigation";

export default function DashboardRedirect() {
  redirect("/download");
}
```

For all other routes under `(dashboard)/` (like `/sops`, `/board`, `/dm`, `/calendar`, `/agents`, etc.), do the same — replace each `page.tsx` with a redirect to `/download`.

OR (cleaner): Delete the entire `src/app/(dashboard)/` folder. The web only needs:
- `/` (landing)
- `/login`, `/signup`
- `/download`
- `/pricing`, `/faq`, `/terms`, `/privacy`
- `/auth/callback*`

### 2.3: Add 404 handler for desktop routes

Create `src/app/desktop/not-found.tsx`:

```tsx
"use client";

import Link from "next/link";

export default function DesktopNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-gray-400 mb-6">This feature isn't built yet or the link is broken.</p>
      <Link
        href="/desktop/dashboard"
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
```

This way 404s within `/desktop/*` stay in the app instead of falling through to the marketing 404 (which redirects to landing).

### 2.4: Create placeholder Settings page

Since Settings is linked from sidebar, create a stub:

`src/app/desktop/settings/page.tsx`:

```tsx
"use client";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure BossBoard preferences</p>

        <div className="space-y-4">
          <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
            <h2 className="font-semibold mb-2">Coming in Week 3-4</h2>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>AI Provider (BYOK keys: Anthropic, Google, OpenAI, Local)</li>
              <li>Workspace folder location</li>
              <li>Theme + appearance</li>
              <li>Notifications</li>
              <li>Integrations (GitHub, Google Drive)</li>
              <li>Account &amp; billing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 3: Top Bar Redesign

Reference layout (right-aligned icons, profile avatar):

```
[Logo BossBoard]                    [🔍] [🔔] [💬] [🌙] [J]
                                                         ↑ profile
```

### 3.1: Get user info into Titlebar

Update `src/components/desktop/titlebar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, RefreshCw, Bell, MessageSquare,
  Search, Sun, Moon, Minus, Square, X
} from "lucide-react";
import { isTauri } from "@/lib/tauri/fs";
import { useTheme } from "./theme-provider";
import { createClient } from "@/lib/supabase/client";

export function Titlebar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [user, setUser] = useState<{ email: string; initial: string } | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUser({
          email: session.user.email,
          initial: session.user.email[0].toUpperCase(),
        });
      } else {
        setUser(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUser({ email: session.user.email, initial: session.user.email[0].toUpperCase() });
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/desktop/login");
    setProfileMenuOpen(false);
  }

  return (
    <div
      data-tauri-drag-region
      className="h-12 bg-[#0C0F17] border-b border-gray-800 flex items-center px-3 select-none relative"
    >
      {/* Left: Logo + brand */}
      <div className="flex items-center gap-2 min-w-0 mr-4">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md flex items-center justify-center font-bold text-white text-sm shadow-md">
          B
        </div>
        <div className="font-semibold text-white">BossBoard</div>
      </div>

      {/* Optional: Back/Forward (small, subtle) */}
      <div className="flex items-center gap-0.5 mr-2">
        <button
          onClick={() => router.back()}
          disabled={!canGoBack}
          className="p-1.5 hover:bg-gray-800 rounded disabled:opacity-30"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={() => router.forward()}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Forward"
        >
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Middle: drag region (flex-1) */}
      <div data-tauri-drag-region className="flex-1 h-full" />

      {/* Right: action icons + profile */}
      <div className="flex items-center gap-1">
        {/* Search */}
        {searchExpanded ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#141824] border border-blue-500 rounded-md w-72 mr-1">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search BossBoard..."
              autoFocus
              onBlur={() => setSearchExpanded(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setSearchExpanded(false); }}
              className="flex-1 bg-transparent text-sm text-white outline-none"
            />
            <span className="text-[10px] text-gray-500">Esc</span>
          </div>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-2 hover:bg-gray-800 rounded"
            title="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-gray-400" />
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="p-2 hover:bg-gray-800 rounded"
          title="Refresh (Ctrl+R)"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>

        <button className="p-2 hover:bg-gray-800 rounded relative" title="Notifications">
          <Bell className="w-4 h-4 text-gray-400" />
        </button>

        <button className="p-2 hover:bg-gray-800 rounded" title="Direct Messages">
          <MessageSquare className="w-4 h-4 text-gray-400" />
        </button>

        <button onClick={toggleTheme} className="p-2 hover:bg-gray-800 rounded" title="Toggle theme">
          {theme === "dark" ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
        </button>

        {/* Profile avatar */}
        {user && (
          <div className="relative ml-1">
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-blue-400 transition"
              title={user.email}
            >
              {user.initial}
            </button>
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 w-56 bg-[#141824] border border-gray-700 rounded-md shadow-xl z-50">
                  <div className="p-3 border-b border-gray-800">
                    <div className="text-xs text-gray-500">Signed in as</div>
                    <div className="text-sm truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={() => { router.push("/desktop/settings"); setProfileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Window controls */}
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <button onClick={handleMinimize} className="p-2 hover:bg-gray-800 rounded" title="Minimize">
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <button onClick={handleMaximize} className="p-2 hover:bg-gray-800 rounded" title="Maximize">
          <Square className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button onClick={handleClose} className="p-2 hover:bg-red-600 rounded" title="Close">
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
```

### 3.2: Update Sidebar — remove sign-out (now in profile menu)

Edit `src/components/desktop/sidebar.tsx` — remove the Sign out button at the bottom (it's in profile menu now). Keep Settings link.

```tsx
<div className="p-2 border-t border-gray-800">
  <Link
    href="/desktop/settings"
    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800"
  >
    <Settings className="w-4 h-4" />
    <span>Settings</span>
  </Link>
</div>
```

---

## Task 4: Custom Right-Click Context Menu

### 4.1: Disable browser default + create context menu component

Create `src/components/desktop/context-menu.tsx`:

```tsx
"use client";

import { ReactNode, useEffect, useState, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [open]);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const adjustments: { x?: number; y?: number } = {};
    if (rect.right > window.innerWidth) {
      adjustments.x = window.innerWidth - rect.width - 8;
    }
    if (rect.bottom > window.innerHeight) {
      adjustments.y = window.innerHeight - rect.height - 8;
    }
    if (adjustments.x !== undefined || adjustments.y !== undefined) {
      setPosition(p => ({
        x: adjustments.x !== undefined ? adjustments.x : p.x,
        y: adjustments.y !== undefined ? adjustments.y : p.y,
      }));
    }
  }, [open]);

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[200px] bg-[#1a1f2e] border border-gray-700 rounded-md shadow-2xl py-1"
          style={{ left: position.x, top: position.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => {
            if (item.separator) {
              return <div key={i} className="my-1 border-t border-gray-800" />;
            }
            return (
              <button
                key={i}
                onClick={() => {
                  if (!item.disabled && item.onClick) {
                    item.onClick();
                    setOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full text-left px-3 py-1.5 text-sm flex items-center gap-2
                  ${item.disabled
                    ? "text-gray-600 cursor-not-allowed"
                    : item.danger
                      ? "text-red-400 hover:bg-red-900/30"
                      : "text-gray-200 hover:bg-blue-600/20"
                  }
                `}
              >
                {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-gray-500">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### 4.2: Disable browser default context menu globally on desktop

In `src/app/desktop/layout.tsx`, add a useEffect to disable default right-click:

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";
import { ThemeProvider } from "@/components/desktop/theme-provider";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  useEffect(() => {
    // Disable browser default context menu, allow only ours
    const handler = (e: MouseEvent) => {
      // Allow right-click on input/textarea (so user can paste etc.)
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (!isEditable) {
        // Only block if no custom ContextMenu wrapper handled it
        // (our ContextMenu component calls preventDefault itself)
        // This catch-all prevents the OS/Chrome menu on bare areas
        if (!(e as any)._bbHandled) {
          e.preventDefault();
        }
      }
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-[#0C0F17] dark:bg-[#0C0F17] text-white overflow-hidden">
        <Titlebar />
        <OfflineBanner />
        <div className="flex-1 flex overflow-hidden">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
```

### 4.3: Apply ContextMenu to Library file list

In `src/app/desktop/library/page.tsx`, wrap each file row with ContextMenu:

```tsx
import { ContextMenu, type ContextMenuItem } from "@/components/desktop/context-menu";

// Inside the file mapping:
{files.map(f => {
  const items: ContextMenuItem[] = [
    {
      label: "Open",
      onClick: () => router.push(`/desktop/library/edit?path=${encodeURIComponent(f.path)}`),
      shortcut: "Enter",
    },
    {
      label: "Open in new tab (soon)",
      disabled: true,
    },
    { separator: true, label: "" },
    {
      label: "Rename",
      onClick: () => alert("Rename coming in Week 3"),
      shortcut: "F2",
    },
    {
      label: "Duplicate",
      onClick: () => alert("Duplicate coming in Week 3"),
    },
    {
      label: "Translate (soon)",
      disabled: true,
    },
    { separator: true, label: "" },
    {
      label: "Show in folder",
      onClick: () => alert(`Path: ${f.path}`),
    },
    {
      label: "Copy path",
      onClick: () => navigator.clipboard.writeText(f.path),
    },
    { separator: true, label: "" },
    {
      label: "Delete",
      danger: true,
      onClick: () => alert("Delete coming in Week 3"),
      shortcut: "Del",
    },
  ];
  
  return (
    <ContextMenu key={f.path} items={items}>
      <Link
        href={`/desktop/library/edit?path=${encodeURIComponent(f.path)}`}
        className="block p-4 bg-[#141824] rounded-md border border-gray-800 hover:border-blue-500 transition"
      >
        {/* ... existing content */}
      </Link>
    </ContextMenu>
  );
})}
```

(For now, the placeholder `alert()` calls are OK — actual rename/delete logic comes in Week 3. Just wire the menu shape.)

### 4.4: Default global context menu (when right-clicking empty area)

Add a default global menu in the layout for right-clicks on bare canvas. Skip this for now if too much scope — just having the disabled native menu + Library item menu is enough for Hotfix 3.

---

## Task 5: "Remember Me" Checkbox

In `src/app/desktop/login/page.tsx`, add checkbox:

```tsx
const [rememberMe, setRememberMe] = useState(true); // Default ON for desktop

// In the form (between password and submit button):
<div className="flex items-center justify-between text-sm">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
      className="rounded border-gray-700 bg-[#141824]"
    />
    <span className="text-gray-300">Remember me</span>
  </label>
  <button
    type="button"
    onClick={() => alert("Password reset coming soon. Contact jay@mybossboard.com")}
    className="text-blue-400 hover:underline"
  >
    Forgot password?
  </button>
</div>
```

For now, "Remember me" is mostly visual — Supabase already persists sessions by default. When unchecked, we should clear session on app close. Since Tauri doesn't have a clean "on close" hook for this without more work, document it as: 
- Checked (default): Session persists across app restarts.
- Unchecked: User must log in each time. (Implementation: on signin, set sessionStorage flag; on app start, if flag present and session exists, sign out.)

```tsx
async function handleEmailLogin(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!rememberMe) {
      sessionStorage.setItem("bb_session_only", "true");
    } else {
      sessionStorage.removeItem("bb_session_only");
    }
    router.replace("/desktop/dashboard");
  } catch (e: any) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}
```

In `src/app/desktop/page.tsx` (or layout), check on app start:

```tsx
// On Tauri app start, if "session only" flag was set in a prior session,
// it means the user had unchecked "remember me". Clear session.
useEffect(() => {
  if (typeof window === "undefined") return;
  const sessionOnly = sessionStorage.getItem("bb_session_only");
  // sessionStorage clears between app restarts in Tauri/browsers,
  // so if it's missing but we have a Supabase session AND localStorage flag exists, sign out.
  // For simplicity: just leave Supabase default for v3.0. The checkbox is UX-visible.
}, []);
```

(Full implementation of "session only" can be Week 4 polish. The checkbox shows good intent now.)

---

## Task 6: Build + Commit

```bash
npx tsc --noEmit
cd src-tauri && cargo check && cd ..
git add .
git commit -m "Hotfix 3: Auth routing fix + top bar redesign + context menu (BB v3.0)"
git log --oneline -5
```

---

## Success Criteria

✓ OAuth callback redirects to `/desktop/dashboard` (not web)
✓ Web `/dashboard` route deleted or redirects to `/download`
✓ 404 within `/desktop/*` shows in-app error (not landing page)
✓ Settings page exists (placeholder)
✓ Top bar: logo left, icons right, profile avatar with dropdown
✓ Profile dropdown shows email + Settings + Sign out
✓ Right-click on Library file shows custom menu (Open / Rename / Translate / Delete)
✓ Right-click on bare areas blocked (no Chrome menu)
✓ Right-click in inputs/textarea still works (paste etc.)
✓ "Remember me" checkbox on login (default checked)
✓ "Forgot password?" link
✓ All builds pass

---

## Reporting

1. Commits made
2. Build status
3. Web /dashboard handling (deleted vs redirect)
4. Any issues

Stop after this. We test and proceed to Week 3.
