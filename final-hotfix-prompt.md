# BB v3.0 Final Hotfix: Bug Fixes + Motion + Optimization

Read CLAUDE.md first.

**Goal:** Final pre-launch hotfix. Apply user-found issues, implement Framer Motion suite (deferred from previous pass), and complete code optimization tasks.

**Time:** 6-10 hours autonomous work.

**Important:**
- Be HONEST about deferrals
- Commit after each major group
- Final report = comprehensive

---

## Group A: User-found bugs

### A.1: Library width + responsive font

**Problem:** Library page is too narrow, hard to read.

**File:** `src/app/desktop/library/[[...slug]]/page.tsx` (or wherever the library content container is)

```tsx
// Current container likely has max-w-4xl
// Change to:
<div className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
  {/* content */}
</div>

// For very large screens, optionally:
// max-w-[1400px] or w-full with px-12
```

**Add responsive font sizing in `src/app/globals.css`:**

```css
.library-content {
  font-size: clamp(0.9375rem, 0.5vw + 0.75rem, 1.0625rem);
  line-height: 1.7;
}

.library-content h1 {
  font-size: clamp(1.5rem, 1vw + 1.25rem, 2rem);
}

.library-content h2 {
  font-size: clamp(1.25rem, 0.8vw + 1rem, 1.625rem);
}

.library-content h3 {
  font-size: clamp(1.125rem, 0.5vw + 1rem, 1.375rem);
}
```

Apply `library-content` class to TipTap renderer container.

### A.2: Remove translation feature completely

**Files to delete:**
- `src/lib/library/translate.ts`
- `src/lib/library/translation-cache.ts`
- `src/components/library/translation-panel.tsx` (if exists)
- Any translation-related buttons in library UI

**Files to modify:**
- Remove translation imports from library pages
- Remove "Translate" button from library file menu/toolbar
- Remove translation-related strings from i18n if any

**Replacement messaging:**
If user looks for translation, suggest using a chatbot:

```tsx
// In library help/empty states (if applicable):
<p className="text-sm text-gray-500">
  Need to translate? Just ask any agent in DM:
  "Translate this document to Korean"
</p>
```

### A.3: 404 page → desktop dashboard for Tauri

**File:** `src/app/not-found.tsx`

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [isTauri, setIsTauri] = useState(false);
  
  useEffect(() => {
    setIsTauri(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
  }, []);
  
  const homeUrl = isTauri ? "/desktop/dashboard" : "/";
  const homeLabel = isTauri ? "Go to Dashboard" : "Go Home";
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-400 mb-6">Page not found</p>
      <Link 
        href={homeUrl}
        className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-white"
      >
        {homeLabel}
      </Link>
    </div>
  );
}
```

Also check `src/app/desktop/[...]/not-found.tsx` if it exists, and use `/desktop/dashboard`.

### A.4: PPTX/DOCX/PDF preview notice with "don't show again"

**Create `src/components/library/format-notice.tsx`:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface FormatNoticeProps {
  format: "pptx" | "docx" | "pdf" | "xlsx";
}

const NOTICES = {
  pptx: "PPTX previews are static — animations and slide transitions are not rendered. Full support coming in v3.1.",
  docx: "DOCX previews show simplified formatting. Full layout support coming in v3.1.",
  pdf: "PDF preview is read-only. Full PDF support coming in v3.1.",
  xlsx: "XLSX previews show data only — formulas and charts not rendered. Full support coming in v3.1.",
};

export function FormatNotice({ format }: FormatNoticeProps) {
  const [hidden, setHidden] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  
  useEffect(() => {
    const key = `bb-hide-format-notice-${format}`;
    const stored = localStorage.getItem(key);
    setHidden(stored === "true");
  }, [format]);
  
  const handleDismiss = () => {
    if (dontShowAgain) {
      const key = `bb-hide-format-notice-${format}`;
      localStorage.setItem(key, "true");
    }
    setHidden(true);
  };
  
  if (hidden) return null;
  
  return (
    <div className="bg-amber-900/20 border-l-4 border-amber-600 p-3 mb-4 rounded-r-md flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm text-amber-100">ℹ️ {NOTICES[format]}</p>
        <label className="flex items-center gap-2 mt-2 text-xs text-amber-200/80 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded"
          />
          Don't show this again
        </label>
      </div>
      <button
        onClick={handleDismiss}
        className="text-amber-200/60 hover:text-amber-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

Show this above PPTX/DOCX/PDF/XLSX previews when implemented.

For now, show it as a placeholder for unsupported formats:

```tsx
{format === "pptx" && (
  <>
    <FormatNotice format="pptx" />
    <div className="text-center p-12 text-gray-400">
      Preview not available yet. Coming in v3.1.
    </div>
  </>
)}
```

### A.5: Remove ICS export (calendar simplification)

**Remove:**
- ICS export button in calendar UI
- Any ICS generation code

**Add notice in calendar page:**

```tsx
<div className="text-xs text-gray-500 p-2 border-t border-bb-border">
  💡 BB Calendar = Project schedules only.
  For personal events, use Google or Apple Calendar.
</div>
```

**Commit:** `git commit -m "Group A: User-found bugs (library width, translate removal, 404, format notices, ICS removal)"`

---

## Group B: API Key UI redesign (+ button)

### B.1: New API Key data model

**Create `src/lib/ai/keys.ts`:**

```typescript
export interface APIKey {
  id: string;           // unique
  provider: "google" | "anthropic" | "openai" | "xai" | "local" | "custom";
  name: string;         // user-given label
  key: string;          // the actual key
  notes?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export const PROVIDERS = {
  google: { 
    label: "Google (Gemini)", 
    icon: "🟢",
    keyPrefix: "AIza",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  anthropic: { 
    label: "Anthropic (Claude)", 
    icon: "🟠",
    keyPrefix: "sk-ant-",
    docsUrl: "https://console.anthropic.com/account/keys",
  },
  openai: { 
    label: "OpenAI (GPT)", 
    icon: "⚪",
    keyPrefix: "sk-",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  xai: { 
    label: "xAI (Grok)", 
    icon: "⚫",
    keyPrefix: "xai-",
    docsUrl: "https://x.ai/api",
  },
  local: { 
    label: "Local (Ollama)", 
    icon: "🏠",
    keyPrefix: "",
    docsUrl: "https://ollama.ai",
  },
  custom: { 
    label: "Custom", 
    icon: "🔧",
    keyPrefix: "",
    docsUrl: "",
  },
};
```

### B.2: Settings UI redesign

**File:** `src/app/desktop/settings/api-keys/page.tsx` (or wherever API keys settings is)

Replace the per-provider input fields with a list + add button:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  
  useEffect(() => {
    loadKeys().then(setKeys);
  }, []);
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI Provider Keys</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
        >
          <Plus className="w-4 h-4" /> Add API Key
        </button>
      </div>
      
      {keys.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-bb-border rounded-lg">
          <p className="text-gray-400 mb-4">No API keys configured yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
          >
            Add your first key
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <KeyCard
              key={key.id}
              apiKey={key}
              onEdit={() => setEditingKey(key)}
              onDelete={() => handleDelete(key.id)}
            />
          ))}
        </div>
      )}
      
      <AnimatePresence>
        {(showAddModal || editingKey) && (
          <KeyModal
            existingKey={editingKey}
            onSave={async (key) => {
              await saveKey(key);
              setKeys(await loadKeys());
              setShowAddModal(false);
              setEditingKey(null);
            }}
            onClose={() => {
              setShowAddModal(false);
              setEditingKey(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function KeyCard({ apiKey, onEdit, onDelete }) {
  const provider = PROVIDERS[apiKey.provider];
  const maskedKey = apiKey.key.slice(0, 6) + "..." + apiKey.key.slice(-4);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 bg-bb-card rounded-lg border border-bb-border hover:border-bb-primary/50 transition-colors"
    >
      <span className="text-2xl">{provider.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{apiKey.name}</div>
        <div className="text-xs text-gray-400">
          {provider.label} · {maskedKey}
        </div>
        {apiKey.notes && (
          <div className="text-xs text-gray-500 mt-1">{apiKey.notes}</div>
        )}
      </div>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-1.5 hover:bg-bb-bg rounded">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 hover:bg-red-900/20 hover:text-red-400 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function KeyModal({ existingKey, onSave, onClose }) {
  const [provider, setProvider] = useState(existingKey?.provider || "google");
  const [name, setName] = useState(existingKey?.name || "");
  const [keyValue, setKeyValue] = useState(existingKey?.key || "");
  const [notes, setNotes] = useState(existingKey?.notes || "");
  
  const handleSubmit = () => {
    if (!name || !keyValue) return;
    onSave({
      id: existingKey?.id || crypto.randomUUID(),
      provider,
      name,
      key: keyValue,
      notes,
      createdAt: existingKey?.createdAt || new Date().toISOString(),
    });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-bb-bg border border-bb-border rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          {existingKey ? "Edit API Key" : "Add API Key"}
        </h2>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-400">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="w-full mt-1 p-2 bg-bb-card border border-bb-border rounded-md"
            >
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>{p.icon} {p.label}</option>
              ))}
            </select>
            {PROVIDERS[provider].docsUrl && (
              <a
                href={PROVIDERS[provider].docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-bb-primary hover:underline mt-1 inline-block"
              >
                Get your {PROVIDERS[provider].label} key →
              </a>
            )}
          </div>
          
          <div>
            <label className="text-sm text-gray-400">Name (for your reference)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production, Personal, Test Account"
              className="w-full mt-1 p-2 bg-bb-card border border-bb-border rounded-md"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400">API Key</label>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={PROVIDERS[provider].keyPrefix + "..."}
              className="w-full mt-1 p-2 bg-bb-card border border-bb-border rounded-md font-mono text-sm"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-400">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Free tier 250 req/day"
              className="w-full mt-1 p-2 bg-bb-card border border-bb-border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-bb-card rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !keyValue}
            className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover disabled:opacity-50 rounded-md"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

### B.3: Migration from old single-key format

In `src/lib/ai/keys.ts`:

```typescript
export async function migrateOldKeys(): Promise<void> {
  const oldGoogle = await getKeychainKey("google_api_key");
  const oldAnthropic = await getKeychainKey("anthropic_api_key");
  const oldOpenAI = await getKeychainKey("openai_api_key");
  
  const existing = await loadKeys();
  if (existing.length > 0) return; // Already migrated
  
  const migrated: APIKey[] = [];
  
  if (oldGoogle) migrated.push({
    id: crypto.randomUUID(),
    provider: "google",
    name: "Default",
    key: oldGoogle,
    createdAt: new Date().toISOString(),
  });
  
  if (oldAnthropic) migrated.push({
    id: crypto.randomUUID(),
    provider: "anthropic",
    name: "Default",
    key: oldAnthropic,
    createdAt: new Date().toISOString(),
  });
  
  if (oldOpenAI) migrated.push({
    id: crypto.randomUUID(),
    provider: "openai",
    name: "Default",
    key: oldOpenAI,
    createdAt: new Date().toISOString(),
  });
  
  if (migrated.length > 0) {
    await saveKeys(migrated);
    console.log(`Migrated ${migrated.length} old keys to new format`);
  }
}
```

Run on app startup (in main desktop layout effect).

### B.4: Update agent execution to use new keys format

In `src/lib/agents/execute.ts`:

```typescript
// Before: getKeychainKey("google_api_key")
// After: 

const keys = await loadKeys();
const matchingKeys = keys.filter(k => k.provider === agent.ai_provider);

if (matchingKeys.length === 0) {
  throw new Error(`No ${agent.ai_provider} API key configured. Add one in Settings.`);
}

// Use the key specified by agent (or first matching)
const key = agent.ai_key_id 
  ? matchingKeys.find(k => k.id === agent.ai_key_id) 
  : matchingKeys[0];

if (!key) {
  throw new Error("Specified API key not found");
}

// Use key.key as the API key
```

Add `ai_key_id` field to agent frontmatter so users can pick specific key per agent.

### B.5: Add xAI Grok provider

In Vercel AI SDK calls, add Grok:

```typescript
import { createXai } from "@ai-sdk/xai";

case "xai": {
  const xai = createXai({ apiKey });
  const model = xai(modelName || "grok-4-fast");
  // ... rest
}
```

Install: `npm install @ai-sdk/xai`

Default model names:
- Grok: `grok-4-fast` (or `grok-4` for premium)

**Commit:** `git commit -m "Group B: API key + button UI + xAI Grok support"`

---

## Group C: Framer Motion suite

### C.1: Install Framer Motion

```bash
npm install framer-motion
```

### C.2: Motion tokens

**Create `src/lib/motion/tokens.ts`:**

```typescript
export const MOTION = {
  duration: {
    instant: 0.1,
    fast: 0.15,
    base: 0.2,
    moderate: 0.3,
    slow: 0.5,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    inOut: [0.65, 0, 0.35, 1] as const,
  },
  spring: {
    default: { type: "spring" as const, stiffness: 400, damping: 30 },
    soft: { type: "spring" as const, stiffness: 200, damping: 25 },
    snappy: { type: "spring" as const, stiffness: 500, damping: 25 },
  },
};
```

### C.3: DM Panel slide-in (Telegram style)

**File:** `src/components/desktop/dm-panel.tsx`

```tsx
import { motion, AnimatePresence } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={MOTION.spring.default}
      className="fixed top-12 right-0 bottom-0 w-96 bg-bb-bg border-l border-bb-border z-40 flex flex-col"
    >
      {/* DM panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

### C.4: Modal scale + fade

Apply to all modals (Settings sub-modals, confirm dialogs, etc.):

```tsx
<motion.div
  initial={{ scale: 0.95, opacity: 0, y: 10 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  exit={{ scale: 0.95, opacity: 0, y: 10 }}
  transition={{ duration: 0.2, ease: MOTION.ease.out }}
>
```

### C.5: Sidebar smooth collapse

**File:** Sidebar component

```tsx
<motion.aside
  animate={{ width: collapsed ? 56 : 224 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="bg-bb-card border-r border-bb-border flex flex-col"
>
```

### C.6: Active sidebar item indicator

```tsx
{pathname?.startsWith(item.href) && (
  <motion.div
    layoutId="sidebar-active"
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    className="absolute inset-0 bg-bb-primary/15 rounded-md"
  />
)}
<span className="relative z-10">{item.label}</span>
```

### C.7: Button hover/tap

Create a reusable button component or apply to existing:

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={MOTION.spring.snappy}
  className="..."
>
```

### C.8: List stagger animation

For Library file lists, Agent cards, Board posts:

```tsx
const containerVariants = {
  animate: { transition: { staggerChildren: 0.04 } }
};

const itemVariants = {
  initial: { y: 8, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.2 } },
};

<motion.div variants={containerVariants} initial="initial" animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      <ItemCard item={item} />
    </motion.div>
  ))}
</motion.div>
```

### C.9: DM message bubble entrance

**File:** DM message component

```tsx
<motion.div
  initial={{ y: 20, opacity: 0, scale: 0.9 }}
  animate={{ y: 0, opacity: 1, scale: 1 }}
  transition={MOTION.spring.snappy}
  className="message-bubble"
>
  {content}
</motion.div>
```

### C.10: Smart typing indicator (3s/15s/long)

**Create `src/components/desktop/typing-indicator.tsx`:**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  provider: string;
  startTime: number;
}

export function TypingIndicator({ provider, startTime }: Props) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 500);
    return () => clearInterval(interval);
  }, [startTime]);
  
  // 0-3s: classic dots
  if (elapsed < 3000) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bb-card border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm inline-block"
      >
        <span className="inline-flex gap-1">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.span
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay }}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full"
            />
          ))}
        </span>
      </motion.div>
    );
  }
  
  // 3-15s: thinking
  if (elapsed < 15000) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bb-card border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm inline-flex items-center gap-2 text-sm text-gray-400"
      >
        <span>Thinking</span>
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          ...
        </motion.span>
      </motion.div>
    );
  }
  
  // 15s+: explain delay
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-bb-card border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400 max-w-xs"
    >
      <div>
        Processing complex request
        {provider === "local" && " (Local AI is slower)"}
        ...
      </div>
      <div className="text-xs mt-1 opacity-70">
        {Math.floor(elapsed / 1000)}s elapsed
      </div>
    </motion.div>
  );
}
```

Wire into DM panel: show when AI is generating, hide when first chunk arrives.

### C.11: Page transitions

**Create `src/components/desktop/page-transition.tsx`:**

```tsx
"use client";

import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: MOTION.ease.out }}
    >
      {children}
    </motion.div>
  );
}
```

Wrap each desktop page (or apply in layout).

### C.12: Skeleton loaders

**Create `src/components/ui/skeleton.tsx`:**

```tsx
"use client";

import { motion } from "framer-motion";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-bb-card rounded ${className}`}
    />
  );
}

export function LibrarySkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="p-4 bg-bb-card rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}
```

Replace any spinner-only loading states with these skeletons.

### C.13: Toast notifications

**Create `src/components/ui/toast.tsx`:**

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  show: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (type, message) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().show("success", msg),
  error: (msg: string) => useToastStore.getState().show("error", msg),
  info: (msg: string) => useToastStore.getState().show("info", msg),
  warning: (msg: string) => useToastStore.getState().show("warning", msg),
};

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-bb-card border border-bb-border rounded-lg p-3 shadow-lg flex items-start gap-3 min-w-[300px] max-w-md pointer-events-auto"
          >
            {ICONS[t.type]}
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

Add `<ToastContainer />` to desktop root layout.

Replace ALL `alert()` calls with `toast.success()` / `toast.error()` / etc.

### C.14: Replace alerts throughout codebase

Find all `alert(` calls and replace with `toast.X()`:

```bash
grep -r "alert(" src/ --include="*.tsx" --include="*.ts"
```

For each:
- Confirmations → use a proper Confirm modal (different component)
- Info messages → `toast.info()`
- Errors → `toast.error()`
- Success → `toast.success()`

**Commit:** `git commit -m "Group C: Framer Motion suite + smart typing indicator + toasts"`

---

## Group D: Code optimization (deferred from previous pass)

### D.1: Bundle analyzer

```bash
npm install -D @next/bundle-analyzer
```

**Update `next.config.ts`:**

```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer({
  // existing config
});
```

Run `ANALYZE=true npm run build` once; document any chunks >100KB in code comments. Don't block on this.

### D.2: Memoization audit

Apply `memo` + `useCallback` + `useMemo` where re-renders are heavy:

**Library file list:**
```tsx
const FileRow = memo(function FileRow({ file, onClick }) {
  return <div onClick={onClick}>...</div>;
}, (prev, next) => prev.file.path === next.file.path && prev.file.modified === next.file.modified);
```

**Agent cards:** Same pattern.

**DM message list:** Same pattern (essential — most re-renders).

**Heavy computations:**
```tsx
const filteredAgents = useMemo(() =>
  agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase())),
  [agents, search]
);
```

### D.3: Lazy load heavy components

```tsx
import dynamic from "next/dynamic";

const TipTapEditor = dynamic(
  () => import("@/components/library/tiptap-editor"),
  { ssr: false, loading: () => <LibrarySkeleton /> }
);

const MeetingRoom = dynamic(
  () => import("@/components/meetings/meeting-room"),
  { loading: () => <Skeleton className="h-96" /> }
);

const SettingsAdvanced = dynamic(
  () => import("@/components/settings/advanced"),
  { loading: () => <Skeleton className="h-64" /> }
);
```

### D.4: Image optimization

For Tauri local images, ensure native lazy loading:

```tsx
<img
  src={imageUrl}
  loading="lazy"
  decoding="async"
  alt={alt}
/>
```

### D.5: Memory leak audit

Audit ALL `useEffect` hooks for cleanup:

```bash
grep -rn "useEffect" src/ --include="*.tsx" --include="*.ts" | head -30
```

For each found:
- Has `setInterval`? → ensure `clearInterval` in cleanup
- Has `addEventListener`? → ensure `removeEventListener`
- Has subscription? → ensure unsubscribe
- Has fetch? → ensure abort controller

Document any without cleanup as TODO comments.

### D.6: Search input debounce

Library search, agent search, board search:

```tsx
import { useDeferredValue, useState, useMemo } from "react";

const [search, setSearch] = useState("");
const deferredSearch = useDeferredValue(search);

const filtered = useMemo(() =>
  items.filter(i => i.name.includes(deferredSearch)),
  [items, deferredSearch]
);
```

### D.7: Virtual scrolling for long lists

```bash
npm install @tanstack/react-virtual
```

Apply to Library list when files > 100, DM messages when > 200:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  overscan: 5,
});

return (
  <div ref={parentRef} className="h-[600px] overflow-auto">
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <div
          key={virtualItem.key}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: virtualItem.size,
            transform: `translateY(${virtualItem.start}px)`,
          }}
        >
          <ItemRow item={items[virtualItem.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

**Commit:** `git commit -m "Group D: Code optimization (memo, lazy, debounce, virtual scroll)"`

---

## Group E: Final validation

### E.1: TypeScript check

```bash
npx tsc --noEmit
```

Fix any errors.

### E.2: Lint check

```bash
npx eslint src/ --max-warnings 50
```

Fix critical errors. Warnings can stay.

### E.3: Rust check

```bash
cd src-tauri
cargo check
cargo clippy
cd ..
```

Fix any new warnings.

### E.4: Smoke test (manual after commit)

User will test:
- Library page wider, responsive font
- Translation removed everywhere
- 404 → /desktop/dashboard for Tauri
- Format notice on PPTX/DOCX placeholder
- API key + button UI works
- xAI Grok addable
- DM panel slides smoothly
- Typing indicator shows correctly
- Toasts replace alerts

### E.5: Final commit

```bash
git add .
git commit -m "Final hotfix: bugs + motion + optimization (BB v3.0 beta-ready)"
git log --oneline -10
```

---

## Update LAUNCH-CHECKLIST.md

Add at the top:

```markdown
## What this final hotfix shipped

✅ User-found bugs:
   - Library width + responsive font
   - Translation feature removed
   - 404 → /desktop/dashboard for Tauri
   - PPTX/DOCX format notices ("don't show again")
   - ICS export removed (calendar simplified)

✅ API key UX:
   - +button UI with multiple keys per provider
   - xAI Grok support added
   - Migration from old single-key format

✅ Framer Motion suite:
   - DM panel slide
   - Modal scale + fade
   - Sidebar smooth collapse + active indicator
   - Button hover/tap
   - List stagger
   - Message bubble entrance
   - Smart typing indicator (3s/15s/long)
   - Page transitions
   - Skeleton loaders
   - Toast notifications (replaces alert())

✅ Code optimization:
   - Bundle analyzer set up
   - Memoization on heavy components
   - Lazy load heavy modules
   - Image lazy loading
   - Memory leak audit
   - Search debounce
   - Virtual scroll for long lists

Ready for beta launch after manual smoke test.
```

---

## Final Reporting

In your response:

1. **Commits made:** count + descriptions
2. **Build status:** TS, Rust, ESLint
3. **Files added/modified:** counts
4. **Strict deferrals:** anything not done + reasons
5. **Known issues:** any bugs or compromises
6. **Smoke test items:** what user should verify

Stop after this. Wait for user testing before further changes.
