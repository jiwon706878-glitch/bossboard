# BB v3.0 Final Hardening: Risk Mitigation + Motion + Optimization

Read CLAUDE.md first.

**Goal:** Address all 32 risks identified in security/risk audit + add motion/micro-interactions + code optimization.

**Time estimate:** 8-12 hours autonomous work.

**Important:**
- BE STRICTLY HONEST about deferrals
- Commit after each task group
- If a task is too complex, document in code comments + LAUNCH-CHECKLIST.md
- DO NOT skip tasks silently — always note status in final report

---

## Task Group 1: Critical Pre-launch Defenses

### 1.1: Local AI VRAM warning toast

When user has 2+ agents using `ai_provider: local` and tries to set them all to "Working" simultaneously, show warning.

**Create `src/lib/agents/local-ai-monitor.ts`:**

```typescript
import { listAgents } from "./service";

export async function checkLocalAIConflict(): Promise<{ warn: boolean; count: number }> {
  const agents = await listAgents();
  const localActive = agents.filter(a =>
    a.ai_provider === "local" && a.status === "active"
  );
  return {
    warn: localActive.length >= 2,
    count: localActive.length,
  };
}

export const LOCAL_AI_WARNING = 
  "⚠️ Running multiple Local AI agents simultaneously may exceed your PC's RAM/VRAM. " +
  "Consider sequential execution or using a lightweight model (e.g., Qwen 2.5 7B).";
```

**Wire into agent activation flow** (when status changes to "active"). Show toast.

### 1.2: Translation token estimation + confirmation

In `src/lib/library/translate.ts` and translation panel:

```typescript
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars (English) or 2 chars (CJK)
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
  const otherCount = text.length - cjkCount;
  return Math.ceil(cjkCount / 2 + otherCount / 4);
}

export function estimateCost(tokens: number, provider: string): number {
  const rates: Record<string, { input: number; output: number }> = {
    google: { input: 0.30 / 1_000_000, output: 2.50 / 1_000_000 },
    anthropic: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    openai: { input: 2.50 / 1_000_000, output: 10 / 1_000_000 },
  };
  const rate = rates[provider] || rates.google;
  // Translation = roughly equal input + output tokens
  return tokens * (rate.input + rate.output);
}
```

**In TranslationPanel before calling translate:**

```tsx
const tokens = estimateTokens(content);
const cost = estimateCost(tokens, provider);

if (tokens > 10_000 || cost > 0.10) {
  const confirmed = await showConfirm(
    `This translation will use approximately ${tokens.toLocaleString()} tokens (~$${cost.toFixed(3)}). Continue?`
  );
  if (!confirmed) return;
}
```

### 1.3: 100-user discount counter logic

Document in `LAUNCH-CHECKLIST.md` (manual Paddle config):

The counter should ONLY decrement when:
- User has provided card info via Paddle
- Subscription is active (not just trial signup)
- Free plan signups do NOT count

In landing page banner, ensure copy says:
- "Lock in your 30% lifetime discount (Card required, $0 for 14 days)"

This is mostly a Paddle config + landing page copy issue. Document required flow.

**Commit:** `git commit -m "Local AI warning + translation cost confirmation"`

---

## Task Group 2: Data Integrity

### 2.1: Move SQLite metadata to OS app data folder ⭐ CRITICAL

**Why:** Users put `~/Documents/BossBoard/` in OneDrive/iCloud → SQLite locks corrupt DB.

**In `src-tauri/src/commands/db.rs` (or wherever metadata.sqlite is created):**

```rust
use tauri::Manager;

#[tauri::command]
pub async fn get_metadata_db_path(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| e.to_string())?;
    
    let db_path = app_data_dir.join("metadata.sqlite");
    Ok(db_path.to_string_lossy().to_string())
}
```

**Update all SQLite operations** to use this path instead of `${workspace}/.bb/metadata.sqlite`.

**Migration logic** (one-time on first run after upgrade):
```rust
// If old DB exists in workspace, copy to app data and delete old
let old_path = workspace.join(".bb").join("metadata.sqlite");
let new_path = app_data_dir.join("metadata.sqlite");
if old_path.exists() && !new_path.exists() {
    fs::copy(&old_path, &new_path)?;
    fs::remove_file(&old_path)?;
    log::info!("Migrated metadata.sqlite from workspace to app data");
}
```

### 2.2: Agent infinite loop hard limit

**Create `src/lib/agents/loop-guard.ts`:**

```typescript
interface InteractionLog {
  agent: string;
  topic: string;
  timestamp: number;
}

const RECENT_INTERACTIONS: InteractionLog[] = [];
const HARD_LIMIT = 5;
const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function recordInteraction(agent: string, topic: string): boolean {
  const now = Date.now();
  
  // Clean old entries
  while (RECENT_INTERACTIONS.length > 0 && 
         now - RECENT_INTERACTIONS[0].timestamp > TIME_WINDOW_MS) {
    RECENT_INTERACTIONS.shift();
  }
  
  // Count same agent + topic
  const recentSame = RECENT_INTERACTIONS.filter(i => 
    i.agent === agent && i.topic === topic
  ).length;
  
  if (recentSame >= HARD_LIMIT) {
    return false; // Block
  }
  
  RECENT_INTERACTIONS.push({ agent, topic, timestamp: now });
  return true; // Allow
}

export function detectLoopHash(message: string): string {
  // Simple hash: first 50 chars normalized
  return message.toLowerCase().replace(/\s+/g, " ").slice(0, 50);
}
```

**In `executeDMTurn`:**

```typescript
const topic = detectLoopHash(userMessage);
if (!recordInteraction(agentName, topic)) {
  // Auto-stop the agent
  await updateAgentStatus(agentName, "stopped");
  
  // Notify user
  showToast({
    type: "error",
    message: `Agent "${agentName}" stopped due to repeated interactions (>5 in 5min). Approve to resume.`,
  });
  
  throw new Error("Loop limit exceeded. Agent stopped for safety.");
}
```

### 2.3: Sleep mode queue + throttling

**Create `src/lib/agents/queue.ts`:**

```typescript
class TaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private running = false;
  private readonly delayMs = 3000;
  
  async add(task: () => Promise<void>): Promise<void> {
    this.queue.push(task);
    if (!this.running) {
      this.running = true;
      this.process();
    }
  }
  
  private async process() {
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        await task();
      } catch (e) {
        console.error("Queued task failed:", e);
      }
      await new Promise(r => setTimeout(r, this.delayMs));
    }
    this.running = false;
  }
  
  size(): number {
    return this.queue.length;
  }
}

export const agentQueue = new TaskQueue();

// Listen for OS wake
window.addEventListener("focus", () => {
  if (agentQueue.size() > 0) {
    showToast({
      type: "info",
      message: `Resuming ${agentQueue.size()} queued agent tasks (3s interval)...`,
    });
  }
});
```

**Commit:** `git commit -m "Data integrity: SQLite isolation + loop guard + sleep queue"`

---

## Task Group 3: OS / Desktop Risks

### 3.1: macOS folder permission denial recovery UI

**Create `src/components/desktop/permission-error.tsx`:**

```tsx
import { AlertCircle, ExternalLink } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export function PermissionDeniedScreen({ folderPath }: { folderPath: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
      <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
      <h1 className="text-2xl font-bold mb-3">Permission needed</h1>
      <p className="text-gray-400 mb-6 max-w-md">
        BossBoard needs access to <code className="bg-bb-card px-2 py-1 rounded">{folderPath}</code>. 
        Please grant permission in System Settings.
      </p>
      
      <div className="bg-bb-card border border-bb-border rounded-lg p-4 max-w-md mb-6">
        <h3 className="font-semibold mb-2">How to fix (macOS):</h3>
        <ol className="text-sm text-left space-y-1 text-gray-400">
          <li>1. Open System Settings → Privacy & Security</li>
          <li>2. Click "Files and Folders"</li>
          <li>3. Find BossBoard, enable Documents folder access</li>
          <li>4. Restart BossBoard</li>
        </ol>
      </div>
      
      <button
        onClick={() => invoke("open_system_settings")}
        className="flex items-center gap-2 px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md"
      >
        Open System Settings <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
}
```

**Detect permission errors in workspace.rs and emit event:**
```rust
match fs::read_dir(&path) {
    Err(e) if e.kind() == ErrorKind::PermissionDenied => {
        return Err(FsError::PermissionDenied(path.to_string_lossy().to_string()));
    }
    // ...
}
```

### 3.2: Windows MAX_PATH handling

**In all path operations, normalize and check length:**

```rust
fn safe_path(path: &Path) -> Result<PathBuf, FsError> {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    
    #[cfg(windows)]
    {
        let path_str = canonical.to_string_lossy();
        if path_str.len() > 250 && !path_str.starts_with(r"\\?\") {
            // Use extended-length path prefix on Windows
            return Ok(PathBuf::from(format!(r"\\?\{}", path_str)));
        }
    }
    
    Ok(canonical)
}
```

**Apply to all `fs::write`, `fs::read`, `fs::create_dir_all` calls.**

### 3.3: Uninstall data preservation

**Update `src-tauri/tauri.conf.json` for Windows installer:**

```json
{
  "bundle": {
    "windows": {
      "wix": {
        "componentRefs": [],
        "fragmentPaths": [],
        "preserveUserDataOnUninstall": true
      }
    }
  }
}
```

Document in user manual that workspace folder is NEVER deleted on uninstall.

### 3.4: Sleep mode timestamp drift

**Create `src/lib/system/wake-detector.ts`:**

```typescript
let lastTickTime = Date.now();
const EXPECTED_INTERVAL = 1000;
const SLEEP_THRESHOLD = 5000;

export function startWakeDetector() {
  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastTickTime;
    
    if (elapsed > SLEEP_THRESHOLD) {
      console.log(`Wake detected: ${elapsed}ms elapsed`);
      window.dispatchEvent(new CustomEvent("system-wake", {
        detail: { sleepDuration: elapsed }
      }));
    }
    
    lastTickTime = now;
  }, EXPECTED_INTERVAL);
}

// Listen and resync
window.addEventListener("system-wake", (e: any) => {
  console.log(`Resyncing after ${e.detail.sleepDuration}ms sleep`);
  // Clear pending agent triggers, refresh from cloud
});
```

**Commit:** `git commit -m "OS hardening: permission UI + MAX_PATH + uninstall + wake detector"`

---

## Task Group 4: File System Robustness

### 4.1: File lock conflict (Obsidian concurrent edit)

**Use atomic writes:**

```rust
#[tauri::command]
pub async fn write_file_atomic(path: String, content: String) -> Result<(), FsError> {
    let target = PathBuf::from(&path);
    let temp_path = target.with_extension("tmp");
    
    fs::write(&temp_path, &content)?;
    fs::rename(&temp_path, &target)?;  // Atomic on most filesystems
    
    Ok(())
}
```

**Replace all `write_file` calls with atomic version.**

### 4.2: YAML frontmatter parsing safety

**In `src/lib/markdown/frontmatter.ts`:**

```typescript
import matter from "gray-matter";

export function parseMarkdown(raw: string): ParsedMarkdown {
  try {
    const parsed = matter(raw, {
      excerpt: false,
    });
    
    const validated = FrontmatterSchema.safeParse(parsed.data);
    
    if (!validated.success) {
      console.warn("Frontmatter validation failed, using defaults:", validated.error);
      return {
        frontmatter: {
          id: generateId(),
          title: extractTitleFromContent(parsed.content) || "Untitled",
          schema_version: CURRENT_SCHEMA_VERSION,
        },
        content: parsed.content,
        raw,
        parseError: validated.error.message,
      };
    }
    
    return {
      frontmatter: validated.data,
      content: parsed.content,
      raw,
    };
  } catch (e: any) {
    console.error("YAML parse error:", e);
    
    // Even on YAML error, file appears in library with default frontmatter
    return {
      frontmatter: {
        id: generateId(),
        title: extractFilenameFromPath(raw) || "Untitled (parse error)",
        schema_version: CURRENT_SCHEMA_VERSION,
      },
      content: raw,
      raw,
      parseError: e.message,
    };
  }
}
```

**= File NEVER disappears from library, even if YAML is broken.**

### 4.3: Encoding auto-detection (Korean EUC-KR)

**Add Rust dependency:**
```toml
chardetng = "0.1"
encoding_rs = "0.8"
```

**Create `src-tauri/src/commands/encoding.rs`:**

```rust
use chardetng::EncodingDetector;
use encoding_rs;

#[tauri::command]
pub async fn read_file_smart(path: String) -> Result<String, FsError> {
    let bytes = fs::read(&path)?;
    
    // Try UTF-8 first
    if let Ok(text) = std::str::from_utf8(&bytes) {
        return Ok(text.to_string());
    }
    
    // Fallback: detect encoding
    let mut detector = EncodingDetector::new();
    detector.feed(&bytes, true);
    let encoding = detector.guess(None, true);
    
    let (text, _, had_errors) = encoding.decode(&bytes);
    
    if had_errors {
        return Err(FsError::Custom(format!(
            "File has encoding issues. Detected: {}. Consider re-saving as UTF-8.",
            encoding.name()
        )));
    }
    
    Ok(text.into_owned())
}
```

### 4.4: Symbolic link infinite loop prevention

**In file watcher and indexer:**

```rust
fn is_safe_path(path: &Path, root: &Path) -> bool {
    // Reject symlinks
    if path.is_symlink() {
        log::warn!("Skipping symlink: {:?}", path);
        return false;
    }
    
    // Ensure path is within workspace root (prevents traversal)
    let canonical = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    let root_canonical = match root.canonicalize() {
        Ok(p) => p,
        Err(_) => return false,
    };
    
    canonical.starts_with(&root_canonical)
}
```

### 4.5: NAS/external drive disconnect graceful handling

**Detect workspace unavailable:**

```typescript
let lastSuccessfulRead = Date.now();
const HEALTH_CHECK_INTERVAL = 30_000;

setInterval(async () => {
  try {
    await invoke("check_workspace_health");
    lastSuccessfulRead = Date.now();
  } catch (e) {
    if (Date.now() - lastSuccessfulRead > 60_000) {
      showWorkspaceUnavailableBanner();
    }
  }
}, HEALTH_CHECK_INTERVAL);
```

**Banner:**
```tsx
{workspaceUnavailable && (
  <div className="fixed top-12 left-0 right-0 bg-amber-900/30 border-b border-amber-800 p-2 text-center text-sm text-amber-200">
    ⚠️ Workspace folder unavailable. Please reconnect your drive or change workspace location.
  </div>
)}
```

**Commit:** `git commit -m "File system robustness: atomic writes + safe parsing + encoding + symlink guards"`

---

## Task Group 5: AI / Agent Safeguards

### 5.1: Context window pre-check

**In `src/lib/agents/execute.ts`:**

```typescript
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "gemini-2.5-flash": 1_000_000,
  "gemini-2.5-pro": 1_000_000,
  "claude-sonnet-4-20250514": 200_000,
  "claude-opus-4": 200_000,
  "gpt-4o": 128_000,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export async function executeDMTurn(...) {
  // ... existing setup ...
  
  const limit = MODEL_CONTEXT_LIMITS[modelName] || 100_000;
  const totalTokens = estimateTokens(systemPrompt + userMessage);
  
  if (totalTokens > limit * 0.85) {
    const shouldCompress = await confirm(
      `Conversation context is approaching the limit (${Math.round(totalTokens/limit*100)}% of ${limit.toLocaleString()} tokens). Compress old messages now?`
    );
    
    if (shouldCompress) {
      await compressConversation(agentName);
      // Re-fetch context after compression
      // ... retry ...
    } else {
      throw new Error("Context too long. Compress conversation or use a model with larger context window.");
    }
  }
  
  // ... existing AI call ...
}
```

### 5.2: Trash system (file deletion safety)

**Create `src-tauri/src/commands/trash.rs`:**

```rust
use chrono::Utc;

#[tauri::command]
pub async fn move_to_trash(path: String, workspace_root: String) -> Result<String, FsError> {
    let source = PathBuf::from(&path);
    let workspace = PathBuf::from(&workspace_root);
    let trash_dir = workspace.join(".bb").join("trash");
    
    fs::create_dir_all(&trash_dir)?;
    
    let timestamp = Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let filename = source.file_name()
        .ok_or(FsError::InvalidPath("No filename".to_string()))?
        .to_string_lossy();
    
    let trash_path = trash_dir.join(format!("{}-{}", timestamp, filename));
    fs::rename(&source, &trash_path)?;
    
    Ok(trash_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn restore_from_trash(trash_path: String) -> Result<(), FsError> {
    let source = PathBuf::from(&trash_path);
    let filename = source.file_name()
        .ok_or(FsError::InvalidPath("No filename".to_string()))?
        .to_string_lossy()
        .to_string();
    
    // Strip timestamp prefix (YYYYMMDD-HHMMSS-)
    let original_name = filename.splitn(3, '-').nth(2)
        .unwrap_or(&filename);
    
    let workspace = source.parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .ok_or(FsError::InvalidPath("Bad trash path".to_string()))?;
    
    let restored = workspace.join(original_name);
    fs::rename(&source, &restored)?;
    
    Ok(())
}

#[tauri::command]
pub async fn empty_trash(workspace_root: String) -> Result<u32, FsError> {
    let trash = PathBuf::from(&workspace_root).join(".bb").join("trash");
    let mut count = 0;
    
    if trash.exists() {
        for entry in fs::read_dir(&trash)? {
            let entry = entry?;
            if entry.path().is_dir() {
                fs::remove_dir_all(entry.path())?;
            } else {
                fs::remove_file(entry.path())?;
            }
            count += 1;
        }
    }
    
    Ok(count)
}
```

**Update all delete operations** to call `move_to_trash` instead of direct delete.

**Add trash UI page** at `/desktop/library/trash` showing trashed files with restore + permanent delete.

### 5.3: Local AI timeout handling

**In AI call wrapper:**

```typescript
async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMsg: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

// For local AI:
const timeoutMs = provider === "local" ? 5 * 60 * 1000 : 60 * 1000;
const result = await callWithTimeout(
  () => generateText({ model, ... }),
  timeoutMs,
  `${provider} timed out after ${timeoutMs/1000}s. Try a smaller model or check Ollama is running.`
);
```

### 5.4: API key validation + clear errors

**In AI provider calls, wrap errors:**

```typescript
function wrapAIError(provider: string, error: any): Error {
  const status = error?.statusCode || error?.status;
  const message = error?.message || String(error);
  
  if (status === 401 || /unauthorized/i.test(message)) {
    return new Error(`${provider} API key invalid. Check Settings → AI Providers.`);
  }
  if (status === 429 || /rate.?limit/i.test(message)) {
    return new Error(`${provider} rate limit hit. Wait a moment or switch providers.`);
  }
  if (status === 400 || /context.?length|too.?long/i.test(message)) {
    return new Error(`Context too long for ${provider}. Compress conversation or use larger-context model.`);
  }
  if (status === 402 || /quota|insufficient/i.test(message)) {
    return new Error(`${provider} quota exceeded. Top up your account.`);
  }
  if (status === 500 || status === 502 || status === 503) {
    return new Error(`${provider} server error. Try again or switch providers.`);
  }
  return new Error(`${provider} error: ${message}`);
}

// Wrap all AI SDK calls:
try {
  const { text } = await generateText({ model, ... });
  return text;
} catch (e) {
  throw wrapAIError(provider, e);
}
```

**Commit:** `git commit -m "AI safeguards: context check + trash + timeout + clear errors"`

---

## Task Group 6: Network / MCP

### 6.1: Dynamic port allocation

**In `src-tauri/src/mcp_server.rs`:**

```rust
use std::net::TcpListener;

fn find_available_port(start: u16, end: u16) -> Option<u16> {
    for port in start..=end {
        if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
            return Some(port);
        }
    }
    None
}

pub async fn run_mcp_server(state: McpState) -> u16 {
    let port = find_available_port(39001, 39099)
        .expect("No available ports in range 39001-39099");
    
    log::info!("MCP server starting on port {}", port);
    
    let app = Router::new()
        .route("/", get(info_handler))
        .route("/health", get(|| async { "ok" }))
        .with_state(state);
    
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .expect("Failed to bind MCP port");
    
    // Save port to file so external tools can discover it
    let port_file = std::env::temp_dir().join("bossboard-mcp-port");
    let _ = std::fs::write(&port_file, port.to_string());
    
    tokio::spawn(async move {
        axum::serve(listener, app).await.expect("MCP server failed");
    });
    
    port
}
```

**Expose port to frontend:**
```rust
#[tauri::command]
pub async fn get_mcp_port(state: tauri::State<'_, McpState>) -> Result<u16, String> {
    Ok(*state.port.lock().unwrap())
}
```

### 6.2: SSRF protection

**In MCP server, require Bearer token:**

```rust
async fn auth_middleware<B>(
    State(state): State<McpState>,
    req: Request<B>,
    next: Next<B>,
) -> Result<Response, StatusCode> {
    let auth = req.headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok());
    
    match auth {
        Some(header) if header.starts_with("Bearer ") => {
            let token = &header[7..];
            let valid_token = state.token.lock().unwrap().clone();
            if token == valid_token {
                Ok(next.run(req).await)
            } else {
                Err(StatusCode::UNAUTHORIZED)
            }
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
```

Generate random token on startup, expose to user in Settings → MCP.

### 6.3: Async queue overflow protection

**In agent queue from 2.3, add max size:**

```typescript
class TaskQueue {
  private queue: Array<() => Promise<void>> = [];
  private readonly maxSize = 100;
  
  async add(task: () => Promise<void>): Promise<boolean> {
    if (this.queue.length >= this.maxSize) {
      showToast({
        type: "error",
        message: `Task queue full (${this.maxSize}). Tasks dropped to prevent runaway.`,
      });
      return false;
    }
    this.queue.push(task);
    // ... rest unchanged
    return true;
  }
}
```

**Commit:** `git commit -m "Network/MCP: dynamic port + auth token + queue overflow"`

---

## Task Group 7: Business Logic

### 7.1: Paddle webhook reconciliation

**Create reconciliation cron** at `src/app/api/cron/reconcile-paddle/route.ts`:

```typescript
export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Fetch users with active subscriptions in last 24h from Paddle
  const paddleSubs = await fetch("https://api.paddle.com/subscriptions?status=active", {
    headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
  }).then(r => r.json());
  
  // Compare with Supabase records
  const supabase = await createServerClient();
  const { data: localSubs } = await supabase.from("subscriptions").select("*");
  
  // Find mismatches → log + update
  // (full implementation depends on existing schema)
  
  return Response.json({ checked: paddleSubs.data?.length || 0 });
}
```

Configure as Vercel Cron daily.

### 7.2: Free trial abuse prevention

**Create `src/lib/auth/abuse-detection.ts`:**

```typescript
const TEMP_EMAIL_DOMAINS = [
  "tempmail.com", "throwaway.email", "guerrillamail.com",
  "10minutemail.com", "mailinator.com", "yopmail.com",
  "temp-mail.org", "fakemailgenerator.com",
];

export function isLikelyTempEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  
  if (TEMP_EMAIL_DOMAINS.some(d => domain.includes(d))) return true;
  
  // Disposable patterns
  if (/^[a-z0-9]+mail\.(com|net|org)$/.test(domain)) return true;
  if (/disposable|temp|throw/.test(domain)) return true;
  
  return false;
}
```

**In signup flow**, if `isLikelyTempEmail`, require credit card or email verification before granting trial.

### 7.3: Cloud metadata cleanup (ghost files)

**Add periodic sync check:**

```typescript
async function syncMetadataWithLocal() {
  const localFiles = await listLocalLibraryFiles();
  const localPaths = new Set(localFiles.map(f => f.path));
  
  const supabase = createClient();
  const { data: cloudFiles } = await supabase
    .from("library_metadata")
    .select("*");
  
  // Find ghost files (in cloud but not local)
  const ghosts = cloudFiles?.filter(c => !localPaths.has(c.path)) || [];
  
  if (ghosts.length > 0) {
    await supabase
      .from("library_metadata")
      .delete()
      .in("id", ghosts.map(g => g.id));
  }
}
```

Run on app startup + every 30 min.

**Commit:** `git commit -m "Business: webhook reconciliation + abuse detection + metadata sync"`

---

## Task Group 8: UI / UX Risks

### 8.1: Workspace location sandbox

**In workspace selection UI:**

```typescript
const FORBIDDEN_PATHS = [
  "C:\\",
  "C:\\Windows",
  "C:\\Program Files",
  "/",
  "/System",
  "/usr",
  "/etc",
  "/private",
];

function isPathSafe(path: string): { safe: boolean; reason?: string } {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  
  for (const forbidden of FORBIDDEN_PATHS) {
    const f = forbidden.replace(/\\/g, "/").toLowerCase();
    if (normalized === f || normalized === f + "/") {
      return { safe: false, reason: `Cannot use system root: ${forbidden}` };
    }
  }
  
  // Must be within home directory
  // (use tauri path API to validate)
  
  return { safe: true };
}
```

### 8.2: API key setup video/GIF guide

Create help links pointing to documentation:
- `/docs/setup-gemini` → explains how to get Gemini key with screenshots
- `/docs/setup-anthropic` → Claude key
- etc.

For now, embed in Settings:
```tsx
<details>
  <summary className="cursor-pointer text-sm text-bb-primary hover:underline">
    📺 How do I get a Gemini API key? (5 min)
  </summary>
  <ol className="mt-2 text-sm text-gray-400 space-y-1 list-decimal list-inside">
    <li>Go to https://aistudio.google.com/app/apikey</li>
    <li>Sign in with Google</li>
    <li>Click "Create API Key"</li>
    <li>Copy the key (starts with AIza...)</li>
    <li>Paste it above and click Save</li>
  </ol>
  <p className="mt-2 text-xs text-amber-400">
    💡 Free tier: 250 requests/day with Gemini Flash. No credit card required.
  </p>
</details>
```

Add similar for each provider.

### 8.3: Meeting room cost warning

**Before starting a meeting:**

```typescript
async function startMeeting(agents: string[], rounds: number, topic: string) {
  // Estimate cost
  const avgTokensPerTurn = 500;
  const totalTurns = agents.length * rounds + 1; // +1 for summary
  const totalTokens = avgTokensPerTurn * totalTurns;
  const cost = estimateCost(totalTokens, primaryProvider);
  
  if (cost > 0.50) {
    const confirmed = await confirm(
      `This meeting will use ~${totalTokens.toLocaleString()} tokens (~$${cost.toFixed(2)}). Continue?`
    );
    if (!confirmed) return;
  }
  
  // ... start meeting
}
```

### 8.4: Translation cache (paragraph-level)

**Create `src/lib/library/translation-cache.ts`:**

```typescript
import { createHash } from "crypto";

const cache = new Map<string, string>();

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function translateWithCache(
  content: string,
  targetLang: string,
  provider: string,
  apiKey: string
): Promise<string> {
  const paragraphs = content.split(/\n\n+/);
  const results: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length < 10) {
      results.push(paragraph);
      continue;
    }
    
    const cacheKey = `${hash(paragraph)}:${targetLang}:${provider}`;
    if (cache.has(cacheKey)) {
      results.push(cache.get(cacheKey)!);
      continue;
    }
    
    const translated = await translateText(paragraph, targetLang, provider, apiKey);
    cache.set(cacheKey, translated);
    results.push(translated);
  }
  
  return results.join("\n\n");
}
```

Persist cache to disk: `${workspace}/.bb/translation-cache.json`.

### 8.5: DM panel mobile/touch handling

For desktop only — Tauri runs in WebView, no mobile concerns. But add safeguard:

```tsx
<motion.div
  className="dm-panel"
  drag={false}  // Disable accidental drag on touch
  onTouchStart={(e) => e.stopPropagation()}
  // ...
>
```

**Commit:** `git commit -m "UX risks: workspace sandbox + setup guides + meeting cost + translation cache"`

---

## Task Group 9: DB Migration / File Watcher

### 9.1: SQLite migration safety net

**Create `src-tauri/src/commands/db_migrate.rs`:**

```rust
const SCHEMA_VERSION: i32 = 1;

pub async fn ensure_db_schema(db_path: &Path) -> Result<(), DbError> {
    let conn = Connection::open(db_path)?;
    
    // Check current version
    let current_version: i32 = conn.query_row(
        "PRAGMA user_version",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if current_version >= SCHEMA_VERSION {
        return Ok(());
    }
    
    // Backup before migration
    let backup_path = db_path.with_extension(format!("v{}.backup", current_version));
    fs::copy(db_path, &backup_path)?;
    log::info!("Backed up DB to {:?}", backup_path);
    
    // Run migrations in transaction
    let tx = conn.unchecked_transaction()?;
    
    if current_version < 1 {
        tx.execute_batch("
            CREATE TABLE IF NOT EXISTS metadata (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                title TEXT,
                tags TEXT,
                hash TEXT,
                modified INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_metadata_path ON metadata(path);
            CREATE VIRTUAL TABLE IF NOT EXISTS metadata_fts USING fts5(title, content);
            PRAGMA user_version = 1;
        ")?;
    }
    
    // Future migrations:
    // if current_version < 2 { ... }
    
    tx.commit()?;
    
    log::info!("DB migrated to version {}", SCHEMA_VERSION);
    Ok(())
}
```

If migration fails:
```rust
match ensure_db_schema(&db_path).await {
    Ok(_) => Ok(()),
    Err(e) => {
        log::error!("DB migration failed: {}", e);
        // Restore from backup if exists
        // Or rebuild from scratch (re-index)
        rebuild_index_from_filesystem(&workspace).await
    }
}
```

### 9.2: File watcher ignore patterns

**Update `src-tauri/src/commands/watcher.rs`:**

```rust
const IGNORED_PATTERNS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build",
    ".bb/cache", ".bb/backups", ".bb/trash",
    "__pycache__", ".venv", "venv", ".env",
    ".DS_Store", "Thumbs.db",
    ".next", ".cache",
];

fn should_ignore(path: &Path) -> bool {
    let path_str = path.to_string_lossy();
    
    for pattern in IGNORED_PATTERNS {
        if path_str.contains(&format!("/{}/", pattern)) ||
           path_str.contains(&format!("\\{}\\", pattern)) ||
           path_str.ends_with(pattern) {
            return true;
        }
    }
    
    false
}

// In watcher event handler:
for res in rx {
    if let Ok(event) = res {
        let paths: Vec<String> = event.paths.iter()
            .filter(|p| !should_ignore(p))
            .map(|p| p.to_string_lossy().to_string())
            .collect();
        
        if paths.is_empty() {
            continue;
        }
        // ... emit event
    }
}
```

**Commit:** `git commit -m "DB migration safety + file watcher ignore patterns"`

---

## Task Group 10: Rendering / Security

### 10.1: WebView compatibility

**Test scenarios** (document in code comments):
- TipTap cursor positioning on WebKit (Mac)
- Markdown scroll behavior
- CSS animation differences

For now, add fallback styles:

```css
/* WebKit-specific fixes */
@supports (-webkit-appearance: none) {
  .tiptap {
    -webkit-user-select: text;
    -webkit-touch-callout: default;
  }
}
```

### 10.2: Markdown XSS protection ⭐ CRITICAL

**Install:**
```bash
npm install isomorphic-dompurify
```

**Wrap all rendered HTML:**

```typescript
import DOMPurify from "isomorphic-dompurify";

const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    'h1','h2','h3','h4','h5','h6','p','br','hr',
    'strong','em','u','s','code','pre','blockquote',
    'ul','ol','li','a','img','table','thead','tbody','tr','th','td',
    'span','div'
  ],
  ALLOWED_ATTR: ['href','src','alt','title','class','id'],
  FORBID_TAGS: ['script','iframe','object','embed','form','input','style'],
  FORBID_ATTR: ['onclick','onerror','onload','onmouseover','onfocus','formaction'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, SAFE_CONFIG);
}
```

**Apply in MarkdownRenderer:**

```typescript
// Before rendering with TipTap, sanitize content
const safeContent = sanitizeHTML(html);
editor.commands.setContent(safeContent);
```

### 10.3: VPN/DNS block error messages

**Wrap all network calls:**

```typescript
async function fetchWithDiagnostics(url: string, opts?: RequestInit) {
  try {
    return await fetch(url, opts);
  } catch (e: any) {
    if (e.message?.includes("Failed to fetch") || e.message?.includes("network")) {
      throw new Error(
        `Cannot reach ${new URL(url).host}. ` +
        `If you're on a corporate network/VPN, this domain may be blocked. ` +
        `Try: (1) different network, (2) check VPN settings, (3) ask IT to allowlist.`
      );
    }
    throw e;
  }
}
```

### 10.4: macOS keychain update reassurance

**Add release notes template** in `src-tauri/CHANGELOG-TEMPLATE.md`:

```markdown
## v[VERSION]

🔒 **About the keychain prompt:**
After updating, macOS may ask "BossBoard wants to access your keychain" — this is normal 
because the app's signature changed slightly. Click "Always Allow" to dismiss.

Your data is still safe — only BossBoard can read its own keychain entries.
```

### 10.5: Rust panic logging ⭐ CRITICAL

**Add to Cargo.toml:**
```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
```

**In `src-tauri/src/lib.rs`:**

```rust
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

fn setup_logging(app_data_dir: &Path) {
    let log_dir = app_data_dir.join("logs");
    std::fs::create_dir_all(&log_dir).ok();
    
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        &log_dir,
        "bossboard.log",
    );
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
    
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_writer(non_blocking))
        .with(tracing_subscriber::EnvFilter::from_default_env()
            .add_directive("info".parse().unwrap()))
        .init();
    
    // Forget guard to keep writer alive for the program lifetime
    std::mem::forget(_guard);
    
    // Panic handler
    std::panic::set_hook(Box::new(|info| {
        tracing::error!("PANIC: {}", info);
        if let Some(location) = info.location() {
            tracing::error!("  at {}:{}", location.file(), location.line());
        }
    }));
    
    tracing::info!("BossBoard logging initialized");
}

// In .setup():
.setup(|app| {
    let app_data_dir = app.path().app_data_dir().unwrap();
    setup_logging(&app_data_dir);
    // ... rest
})
```

**Add command to view logs:**

```rust
#[tauri::command]
pub async fn get_logs(app: tauri::AppHandle) -> Result<String, String> {
    let log_path = app.path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("logs")
        .join("bossboard.log");
    
    if !log_path.exists() {
        return Ok("No logs yet.".to_string());
    }
    
    fs::read_to_string(&log_path).map_err(|e| e.to_string())
}
```

**Commit:** `git commit -m "Security: XSS protection + panic logs + VPN diagnostics"`

---

## Task Group 11: Motion + Micro-interactions

### 11.1: Install Framer Motion

```bash
npm install framer-motion
```

### 11.2: Motion tokens

**Create `src/lib/motion/tokens.ts`:**

```typescript
export const MOTION = {
  duration: {
    instant: 100,
    fast: 150,
    base: 200,
    moderate: 300,
    slow: 500,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    inOut: [0.65, 0, 0.35, 1] as const,
    spring: { type: "spring", stiffness: 400, damping: 30 },
    softSpring: { type: "spring", stiffness: 200, damping: 25 },
  },
};
```

### 11.3: DM panel slide-in (Telegram style)

```tsx
import { motion, AnimatePresence } from "framer-motion";

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed top-12 right-0 ..."
    >
      ...
    </motion.div>
  )}
</AnimatePresence>
```

### 11.4: Modal scale + fade

```tsx
<motion.div
  initial={{ scale: 0.95, opacity: 0, y: 10 }}
  animate={{ scale: 1, opacity: 1, y: 0 }}
  exit={{ scale: 0.95, opacity: 0, y: 10 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
>
```

### 11.5: Sidebar smooth collapse

```tsx
<motion.aside
  animate={{ width: collapsed ? 56 : 224 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
```

### 11.6: Active sidebar item slide indicator

```tsx
{pathname?.startsWith(item.href) && (
  <motion.div
    layoutId="sidebar-active"
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    className="absolute inset-0 bg-bb-primary/15 rounded-md"
  />
)}
```

### 11.7: Button hover/tap

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 500, damping: 25 }}
>
```

### 11.8: List stagger animation

```tsx
const containerVariants = {
  animate: { transition: { staggerChildren: 0.04 } }
};
const itemVariants = {
  initial: { y: 8, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

<motion.div variants={containerVariants} initial="initial" animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      ...
    </motion.div>
  ))}
</motion.div>
```

### 11.9: DM message bubble entrance

```tsx
<motion.div
  initial={{ y: 20, opacity: 0, scale: 0.9 }}
  animate={{ y: 0, opacity: 1, scale: 1 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
>
  {message}
</motion.div>
```

### 11.10: Smart typing indicator

**Show different states based on response time:**

```tsx
function TypingIndicator({ provider, elapsedMs }: { provider: string; elapsedMs: number }) {
  // First 3 seconds: regular dots
  if (elapsedMs < 3000) {
    return (
      <div className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm">
        <span className="inline-flex gap-1">
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}>●</motion.span>
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}>●</motion.span>
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}>●</motion.span>
        </span>
      </div>
    );
  }
  
  // 3-15s: thinking message
  if (elapsedMs < 15000) {
    return (
      <div className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
        <span>Thinking</span>
        <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}>...</motion.span>
      </div>
    );
  }
  
  // 15s+: explain delay
  return (
    <div className="bg-bb-bg border border-bb-border px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400">
      <div>Processing complex request{provider === "local" && " (Local AI is slower)"}...</div>
      <div className="text-xs mt-1 opacity-70">{Math.floor(elapsedMs/1000)}s elapsed</div>
    </div>
  );
}
```

Track elapsedMs with state, update every 1s.

### 11.11: Page transitions

```tsx
// src/components/desktop/page-transition.tsx
"use client";
import { motion } from "framer-motion";

export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

Wrap each desktop page.

### 11.12: Skeleton loaders

```tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-bb-card rounded ${className}`}
    />
  );
}
```

Replace spinners with skeleton in Library, Agents, Board.

### 11.13: Toast notifications (replace alert)

```tsx
// src/components/ui/toast.tsx with AnimatePresence
// Spring slide-in from right
// Auto-dismiss 3s
// Replace ALL alert() calls throughout codebase
```

### 11.14: Reduced motion support

In globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Commit:** `git commit -m "Motion + micro-interactions (Framer Motion + smart typing indicator)"`

---

## Task Group 12: Code Optimization

### 12.1: Bundle analysis + tree shaking

**Install bundle analyzer:**
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

**Run analysis:**
```bash
ANALYZE=true npm run build
```

Document any chunks > 100KB in code comments for future optimization.

### 12.2: React component memoization

**For frequently re-rendered components:**

```tsx
import { memo, useMemo, useCallback } from "react";

// Heavy list items
export const FileRow = memo(function FileRow({ file, onClick }) {
  return <div onClick={onClick}>{file.title}</div>;
}, (prev, next) => prev.file.path === next.file.path);

// Stable callbacks
const handleSelect = useCallback((id: string) => {
  setSelected(id);
}, []);

// Expensive computations
const filteredFiles = useMemo(() => 
  files.filter(f => f.title.includes(search)),
  [files, search]
);
```

Apply to: Library file list, Agent cards, DM message list, Board posts.

### 12.3: Lazy loading routes

**Convert heavy pages to lazy:**

```tsx
import dynamic from "next/dynamic";

const TipTapEditor = dynamic(
  () => import("@/components/library/tiptap-editor"),
  { ssr: false, loading: () => <Skeleton className="h-96" /> }
);

const MeetingRoom = dynamic(
  () => import("@/components/meetings/meeting-room"),
  { loading: () => <Skeleton className="h-96" /> }
);
```

### 12.4: Image optimization

**For any user-uploaded images:**

```tsx
import Image from "next/image";

<Image
  src={avatarUrl}
  width={40}
  height={40}
  alt={name}
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/svg+xml..."
/>
```

For Tauri local images (no Next.js optimization), add native `loading="lazy"`.

### 12.5: Memory leak fixes

**Audit useEffect cleanup:**

```tsx
useEffect(() => {
  const interval = setInterval(check, 1000);
  const handler = () => doSomething();
  window.addEventListener("focus", handler);
  
  return () => {
    clearInterval(interval);  // ⭐ ALWAYS cleanup
    window.removeEventListener("focus", handler);
  };
}, []);
```

Audit all `setInterval`, `setTimeout`, `addEventListener`, `subscribe` calls.

### 12.6: Database query optimization

**SQLite:**

```sql
-- Add indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_metadata_modified ON metadata(modified DESC);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON metadata(tags);

-- Use prepared statements
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;  -- 64MB
```

### 12.7: Debounce expensive operations

**Already done for some — audit others:**

```typescript
import { useDeferredValue } from "react";

// Search input
const [search, setSearch] = useState("");
const deferredSearch = useDeferredValue(search);

// Don't re-filter on every keystroke
const filtered = useMemo(() =>
  files.filter(f => f.title.includes(deferredSearch)),
  [files, deferredSearch]
);
```

### 12.8: Rust optimizations

**Cargo.toml release profile:**

```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
strip = true

[profile.dev]
opt-level = 1  # Faster dev builds without sacrificing debugging
```

### 12.9: Virtual scrolling for long lists

**Install:**
```bash
npm install @tanstack/react-virtual
```

**For lists > 100 items:**

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: files.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
  overscan: 5,
});
```

Apply to Library file list when > 100 files.

**Commit:** `git commit -m "Code optimization: memoization + lazy loading + Rust profile + virtual scroll"`

---

## Task Group 13: Final Validation + Commit

```bash
# Full validation
npx tsc --noEmit
npx eslint src/ 
cd src-tauri && cargo check && cargo clippy && cd ..

# Production build smoke test (optional, takes 15-30min)
# npm run tauri:build

# Final commit
git add .
git commit -m "Final hardening + motion + optimization (all 32 risks addressed)"
git log --oneline -30
```

---

## Update LAUNCH-CHECKLIST.md

Add summary of what was just done:

```markdown
## What this hardening pass addressed (additional to polish pass)

- ✅ All 32 risks from security audit addressed
- ✅ SQLite isolated to OS app data folder (OneDrive safe)
- ✅ Agent infinite loop hard limit (5/5min)
- ✅ Sleep mode queue + throttling
- ✅ macOS permission denial recovery UI
- ✅ Windows MAX_PATH handling
- ✅ Atomic file writes (Obsidian conflict safe)
- ✅ Encoding auto-detection (Korean EUC-KR support)
- ✅ Symbolic link safety
- ✅ Workspace disconnect detection
- ✅ Context window pre-check
- ✅ Trash system (file recovery)
- ✅ Local AI timeout (5 min)
- ✅ API key error wrapping
- ✅ Dynamic MCP port allocation
- ✅ MCP Bearer token auth
- ✅ Workspace location sandbox (no C:\)
- ✅ Translation paragraph cache
- ✅ DB migration safety + backup
- ✅ File watcher ignore patterns (node_modules etc)
- ✅ Markdown XSS protection (DOMPurify)
- ✅ Network diagnostic error messages
- ✅ Rust panic file logging
- ✅ Framer Motion throughout
- ✅ Smart typing indicator (3s/15s/long)
- ✅ Code optimization (memo, lazy, virtual scroll, Rust release profile)

Still requires manual setup (no change from earlier list).
```

---

## Final Reporting

1. **Commits made:** count + names
2. **Build status:** TS, Rust, ESLint
3. **Strict deferrals** (with reasoning):
   - What was attempted but not completed
   - What was completed but with simplifications
   - Any tasks that need follow-up
4. **Files added/modified:** counts
5. **Risk coverage matrix:** which of 32 risks were addressed (✅/⚠️/❌)
6. **Time spent**

Stop after this. No further changes. Wait for user testing.
