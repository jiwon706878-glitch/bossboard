# BB v3.0 Final Polish — Additions (마지막 결정사항)

**적용 방식:** 기존 `final-polish-prompt.md`를 먼저 실행한 후, 이 파일의 추가 그룹들을 별도 커밋으로 적용.

또는 한 번에 함께 적용 (Claude Code가 통합 처리).

**기존 final-polish-prompt.md에 이미 포함된 것:**
- ✅ 데이터 안전 (마이그레이션, 백업)
- ✅ 라이브러리 옵시디언 스타일
- ✅ UI/UX 개선
- ✅ i18n 10개 언어
- ✅ 글로벌 페이지
- ✅ Tauri 라우팅
- ✅ AI Providers vs Integrations 분리
- ✅ 캘린더 단순화
- ✅ Free 1 기기, DM 로컬 only
- ✅ Beta v0.1 라벨
- ✅ Mac coming soon
- ✅ BB-System-Reference 자동 생성
- ✅ 매뉴얼 템플릿
- ✅ 강제 검색 룰
- ✅ Telegram 알림 (기본)

**이 파일에서 추가:**
1. DM 클라우드 동기화 토글 (Pro+ 옵션) — 사용자 선택권
2. 어드민 페이지 OS 분리 검출 (Windows vs Mac 통계)
3. 디바이스 등록 시스템 (1기기 제한 백엔드)
4. 환영 화면 (단순, 스킵 가능)
5. 프로필 메뉴 "Go to Dashboard" 추가
6. 에러 페이지 TitleBar 유지 (404 + error.tsx)

---

## Addition Group 1: DM 클라우드 동기화 토글 (Pro+)

### 1.1 Settings → DM Sync 페이지 추가

**파일:** `src/app/[locale]/desktop/settings/dm-sync/page.tsx` (신규)

**핵심:**
- Free 플랜 = 토글 잠김 (회색)
- "Available on Starter ($19/mo) and above" 메시지
- Pro+ = 토글 활성화 가능
- 활성화 시 = 기존 로컬 DM 클라우드 업로드
- 비활성화 = 클라우드 데이터 삭제 (로컬은 유지)

```tsx
"use client";
import { useState, useEffect } from "react";
import { Cloud, Lock, Check, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { invoke } from "@tauri-apps/api/core";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

export default function DMSyncPage() {
  const t = useTranslations("Settings.dmSync");
  const [enabled, setEnabled] = useState(false);
  const [plan, setPlan] = useState<"free" | "starter" | "pro" | "business">("free");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const settings = await invoke<{
      cloud_sync_enabled: boolean;
      plan: string;
      last_synced_at: string | null;
    }>("get_dm_sync_settings");
    setEnabled(settings.cloud_sync_enabled);
    setPlan(settings.plan as any);
    setLastSync(settings.last_synced_at);
  }

  async function handleToggle(value: boolean) {
    if (value && plan === "free") {
      alert("DM cloud sync requires Starter ($19/mo) or above. Upgrade your plan to enable.");
      return;
    }

    setSyncing(true);
    try {
      await invoke("set_dm_sync_enabled", { enabled: value });
      setEnabled(value);

      if (value) {
        // 기존 로컬 메시지 클라우드 업로드
        await invoke("sync_dms_to_cloud");
        const now = new Date().toISOString();
        setLastSync(now);
      }
    } catch (e) {
      alert(`Failed: ${e}`);
    } finally {
      setSyncing(false);
    }
  }

  const isAvailable = plan !== "free";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">DM Cloud Sync</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync your direct messages across devices. Local files always remain on your machine.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            <Cloud className="size-5 mt-0.5 text-primary" />
            <div className="flex-1">
              <div className="font-medium">Enable cloud sync for DMs</div>
              <div className="text-sm text-muted-foreground mt-1">
                {enabled
                  ? "Your DMs are syncing across all your devices"
                  : "DMs are stored only on this device"}
              </div>
              {!isAvailable && (
                <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Lock className="size-3" />
                  Available on Starter ($19/mo) and above
                </div>
              )}
              {enabled && lastSync && (
                <div className="text-xs text-muted-foreground mt-2">
                  Last synced: {new Date(lastSync).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <Switch
            checked={enabled}
            disabled={!isAvailable || syncing}
            onCheckedChange={handleToggle}
          />
        </div>
      </motion.div>

      {/* Privacy 안내 */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-4 text-sm space-y-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <span>
            <strong>Library files always remain local.</strong> Only DM messages sync to cloud.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <span>Encrypted in transit (TLS 1.3) and at rest (AES-256).</span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <span>Disable any time — local copies always remain.</span>
        </div>
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <span>Never used for AI training. We don't read your DMs.</span>
        </div>
      </div>

      {/* 비용 안내 (Pro+ 사용자) */}
      {isAvailable && (
        <div className="rounded-lg border p-4 text-sm bg-muted/30">
          <div className="font-medium mb-2">What's included</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Unlimited DM history sync</li>
            <li>• Real-time updates across devices</li>
            <li>• {plan === "starter" ? "2" : "Unlimited"} devices</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 1.2 Tauri 명령어 추가

**파일:** `src-tauri/src/commands/dm_sync.rs` (신규)

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct DMSyncSettings {
    pub cloud_sync_enabled: bool,
    pub plan: String,
    pub last_synced_at: Option<String>,
}

#[tauri::command]
pub async fn get_dm_sync_settings(state: tauri::State<'_, AppState>) -> Result<DMSyncSettings, String> {
    let conn = state.db.lock().await;
    let row = conn.query_row(
        "SELECT cloud_sync_enabled, last_synced_at FROM dm_sync_settings WHERE user_id = ?1",
        [&state.user_id],
        |r| Ok((r.get::<_, bool>(0)?, r.get::<_, Option<String>>(1)?)),
    ).optional().map_err(|e| e.to_string())?;

    let plan = get_user_plan(&state.user_id).await?;

    Ok(DMSyncSettings {
        cloud_sync_enabled: row.map(|r| r.0).unwrap_or(false),
        plan,
        last_synced_at: row.and_then(|r| r.1),
    })
}

#[tauri::command]
pub async fn set_dm_sync_enabled(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let plan = get_user_plan(&state.user_id).await?;
    if plan == "free" && enabled {
        return Err("DM cloud sync requires Starter or above".to_string());
    }

    let conn = state.db.lock().await;
    conn.execute(
        "INSERT INTO dm_sync_settings (user_id, cloud_sync_enabled, last_synced_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id) DO UPDATE SET cloud_sync_enabled = ?2",
        rusqlite::params![&state.user_id, enabled, chrono::Utc::now().to_rfc3339()],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn sync_dms_to_cloud(state: tauri::State<'_, AppState>) -> Result<usize, String> {
    // 모든 로컬 DM 읽기 → Supabase 업로드
    // 이미 클라우드에 있는 메시지 = idempotent (id 기반 upsert)
    let count = upload_all_local_dms(&state).await?;
    Ok(count)
}
```

### 1.3 메시지 보낼 때마다 백그라운드 동기화

**파일:** `src-tauri/src/dm.rs` (확장)

```rust
pub async fn send_dm(
    agent_name: &str,
    message: &Message,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // 1. 로컬 디스크 저장 (atomic)
    save_dm_locally(agent_name, message)?;

    // 2. 클라우드 동기화 (활성화된 경우)
    let settings = get_dm_sync_settings(state.clone()).await?;
    if settings.cloud_sync_enabled {
        // 백그라운드 태스크 (블로킹 X)
        tokio::spawn({
            let msg = message.clone();
            let user_id = state.user_id.clone();
            let agent_name = agent_name.to_string();
            async move {
                if let Err(e) = sync_single_dm(&user_id, &agent_name, &msg).await {
                    tracing::warn!("DM sync failed: {}", e);
                    // 실패해도 로컬은 OK, 다음 sync에서 재시도
                }
            }
        });
    }

    Ok(())
}
```

### 1.4 다른 기기에서 가져오기

**시나리오:** 사용자가 두 번째 기기에서 로그인 → 클라우드에서 DM 다운로드

```rust
#[tauri::command]
pub async fn pull_dms_from_cloud(state: tauri::State<'_, AppState>) -> Result<usize, String> {
    let settings = get_dm_sync_settings(state.clone()).await?;
    if !settings.cloud_sync_enabled {
        return Ok(0);
    }

    // Supabase에서 last_synced_at 이후 메시지 가져오기
    let new_messages = fetch_dms_since(&state.user_id, settings.last_synced_at.as_deref()).await?;

    // 로컬에 저장 (이미 있으면 skip)
    for msg in &new_messages {
        save_dm_locally_if_new(&msg.agent_name, msg)?;
    }

    // last_synced_at 업데이트
    update_last_sync(&state.user_id).await?;

    Ok(new_messages.len())
}
```

**자동 호출:**
- 앱 시작 시 (활성화된 경우)
- 매 5분 백그라운드 (활성화된 경우)
- 사용자가 수동 "Sync now" 버튼 클릭

---

## Addition Group 2: 어드민 페이지 OS 분리 ⭐

### 2.1 디바이스 정보 수집

**파일:** `src/lib/analytics/device-info.ts` (신규)

```typescript
export interface DeviceInfo {
  os: "windows" | "mac" | "linux" | "unknown";
  os_version?: string;
  app_version: string;
  locale: string;
  timezone: string;
}

export function detectDevice(): DeviceInfo {
  const ua = typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  let os: DeviceInfo["os"] = "unknown";
  let os_version: string | undefined;

  if (ua.includes("win")) {
    os = "windows";
    const match = ua.match(/windows nt ([\d.]+)/);
    if (match) os_version = `Windows NT ${match[1]}`;
  } else if (ua.includes("mac")) {
    os = "mac";
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) os_version = match[1].replace(/_/g, ".");
  } else if (ua.includes("linux")) {
    os = "linux";
  }

  return {
    os,
    os_version,
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
    locale: typeof window !== "undefined" ? navigator.language : "en",
    timezone: typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  };
}

export async function trackDeviceInfo(userId: string) {
  const info = detectDevice();
  await fetch("/api/track/device", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, ...info }),
  });
}
```

### 2.2 Supabase 테이블

**파일:** `supabase/migrations/0003_devices_tracking.sql`

```sql
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  os TEXT NOT NULL CHECK (os IN ('windows', 'mac', 'linux', 'unknown')),
  os_version TEXT,
  app_version TEXT NOT NULL,
  locale TEXT,
  timezone TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_devices_os ON devices(os);
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);
```

### 2.3 어드민 API — OS 통계

**파일:** `src/app/api/admin/stats/route.ts` (확장)

```typescript
import { createServerClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin-check";

export async function GET(req: Request) {
  const session = await getSession();
  if (!isAdmin(session?.user?.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createServerClient();

  // OS 분포
  const { data: osStats } = await supabase
    .from("devices")
    .select("os, count(*)")
    .group("os");

  const by_os = {
    windows: 0, mac: 0, linux: 0, unknown: 0,
    ...Object.fromEntries(osStats?.map((s) => [s.os, s.count]) || []),
  };

  // 활성 사용자 (24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: activeOsStats } = await supabase
    .from("devices")
    .select("os, count(*)")
    .gte("last_seen", since)
    .group("os");

  const active_by_os = {
    windows: 0, mac: 0, linux: 0, unknown: 0,
    ...Object.fromEntries(activeOsStats?.map((s) => [s.os, s.count]) || []),
  };

  // 다른 통계
  const stats = {
    total_users: ...,
    active_today: ...,
    by_os,                    // ⭐ 전체 OS 분포
    active_by_os,             // ⭐ 활성 OS 분포
    by_country: ...,
    by_locale: ...,
    by_plan: ...,
    feedback_pending: ...,
    feedback_critical: ...,
    errors_24h: ...,
    panics_24h: ...,
  };

  return Response.json(stats);
}
```

### 2.4 어드민 대시보드 UI

**파일:** `src/app/[locale]/admin/page.tsx` (확장)

```tsx
{/* OS 분포 카드 */}
<Card title="Users by OS" icon={Monitor}>
  <div className="grid grid-cols-4 gap-4">
    <OSStatCard
      icon={<Window className="size-6" />}
      os="Windows"
      total={stats.by_os.windows}
      active={stats.active_by_os.windows}
      color="blue"
    />
    <OSStatCard
      icon={<Apple className="size-6" />}
      os="macOS"
      total={stats.by_os.mac}
      active={stats.active_by_os.mac}
      color="gray"
      note={stats.by_os.mac === 0 ? "Coming Soon" : undefined}
    />
    <OSStatCard
      icon={<Linux className="size-6" />}
      os="Linux"
      total={stats.by_os.linux}
      active={stats.active_by_os.linux}
      color="orange"
    />
    <OSStatCard
      icon={<Help className="size-6" />}
      os="Unknown"
      total={stats.by_os.unknown}
      active={stats.active_by_os.unknown}
      color="muted"
    />
  </div>

  {/* 시각적 차트 (작은 막대) */}
  <div className="mt-4">
    <OSDistributionChart data={stats.by_os} />
  </div>
</Card>

{/* 인사이트 */}
<Card title="Insights">
  <div className="space-y-2 text-sm">
    {stats.by_os.mac > 100 && (
      <div className="flex items-center gap-2 text-amber-600">
        <AlertTriangle className="size-4" />
        Mac users exceeded 100 — prioritize Mac native release
      </div>
    )}
    {stats.by_os.linux > 0 && (
      <div className="flex items-center gap-2 text-blue-600">
        <Info className="size-4" />
        {stats.by_os.linux} Linux users — consider AppImage build
      </div>
    )}
    {stats.active_by_os.windows < stats.by_os.windows * 0.3 && (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle className="size-4" />
        Low Windows retention ({Math.round(stats.active_by_os.windows / stats.by_os.windows * 100)}%) — investigate
      </div>
    )}
  </div>
</Card>
```

### 2.5 OS 별 텔레그램 알림

**파일:** `src/app/api/admin/send-telegram-summary/route.ts`

```typescript
const message = `
🤖 *BB Admin Daily Summary*

📊 *Users*: ${stats.total_users} (${stats.active_today} active today)

💻 *By OS:*
  • Windows: ${stats.by_os.windows} (${stats.active_by_os.windows} active)
  • macOS: ${stats.by_os.mac} ${stats.by_os.mac === 0 ? "(coming soon)" : `(${stats.active_by_os.mac} active)`}
  • Linux: ${stats.by_os.linux}
  • Unknown: ${stats.by_os.unknown}

🚨 *Issues:*
  • Critical feedback: ${stats.feedback_critical}
  • Pending feedback: ${stats.feedback_pending}
  • Errors (24h): ${stats.errors_24h}
  • Panics (24h): ${stats.panics_24h}

💰 *Plans:*
  • Free: ${stats.by_plan.free}
  • Starter: ${stats.by_plan.starter}
  • Pro: ${stats.by_plan.pro}
  • Business: ${stats.by_plan.business}

[View Full Dashboard](https://admin.mybossboard.com)
`;

await sendTelegram(message);
```

---

## Addition Group 3: 디바이스 등록 시스템 (1기기 제한)

### 3.1 Supabase Function

**파일:** `supabase/migrations/0004_device_registration.sql`

```sql
CREATE OR REPLACE FUNCTION register_device(
  p_device_id TEXT,
  p_os TEXT,
  p_os_version TEXT,
  p_app_version TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_plan TEXT;
  v_max_devices INT;
  v_current_count INT;
  v_existing BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT plan INTO v_plan FROM users WHERE id = v_user_id;

  v_max_devices := CASE v_plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'pro' THEN 99
    WHEN 'business' THEN 99
    ELSE 1
  END;

  -- 이미 등록된 기기인지 체크
  SELECT EXISTS (
    SELECT 1 FROM devices WHERE user_id = v_user_id AND device_id = p_device_id
  ) INTO v_existing;

  IF v_existing THEN
    -- 기존 기기 = last_seen 업데이트만
    UPDATE devices
    SET last_seen = NOW(), os = p_os, os_version = p_os_version, app_version = p_app_version
    WHERE user_id = v_user_id AND device_id = p_device_id;
    RETURN json_build_object('success', true, 'is_new', false);
  END IF;

  -- 새 기기 = 한도 체크
  SELECT COUNT(*) INTO v_current_count FROM devices WHERE user_id = v_user_id;

  IF v_current_count >= v_max_devices THEN
    RETURN json_build_object(
      'success', false,
      'error', 'device_limit_reached',
      'current', v_current_count,
      'max', v_max_devices,
      'plan', v_plan
    );
  END IF;

  -- 등록
  INSERT INTO devices (user_id, device_id, os, os_version, app_version)
  VALUES (v_user_id, p_device_id, p_os, p_os_version, p_app_version);

  RETURN json_build_object('success', true, 'is_new', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.2 앱 시작 시 등록 시도

**파일:** `src-tauri/src/lib.rs` (확장)

```rust
async fn register_device_on_startup(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let device_id = get_or_create_device_id();
    let os = std::env::consts::OS;
    let app_version = env!("CARGO_PKG_VERSION");

    let response = supabase_client()
        .rpc("register_device")
        .params(serde_json::json!({
            "p_device_id": device_id,
            "p_os": os,
            "p_os_version": get_os_version(),
            "p_app_version": app_version,
        }))
        .execute()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if !result["success"].as_bool().unwrap_or(false) {
        let error = result["error"].as_str().unwrap_or("");
        if error == "device_limit_reached" {
            // 사용자에게 안내
            return Err(format!(
                "Device limit reached ({}/{}). Upgrade to Starter or higher to add more devices.",
                result["current"], result["max"]
            ));
        }
        return Err(error.to_string());
    }

    Ok(())
}
```

### 3.3 한도 도달 시 UI

```tsx
// 첫 실행 시 register_device 호출
// 거부됨 → 모달 표시

{deviceLimitError && (
  <DeviceLimitModal
    currentDevices={2}
    plan="free"
    onUpgrade={() => router.push("/pricing")}
    onSignOut={() => signOut()}
  />
)}
```

```tsx
function DeviceLimitModal({ currentDevices, plan, onUpgrade, onSignOut }) {
  return (
    <Modal>
      <div className="text-center p-6">
        <Lock className="size-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Device limit reached</h2>
        <p className="text-muted-foreground mb-6">
          Your {plan} plan allows {plan === "free" ? "1 device" : "2 devices"}.
          You're already signed in on {currentDevices} device(s).
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={onUpgrade}>
            Upgrade to Starter ($19/mo)
          </Button>
          <Button variant="outline" className="w-full" onClick={onSignOut}>
            Sign out from another device first
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          You can manage your devices in Settings on any signed-in device.
        </p>
      </div>
    </Modal>
  );
}
```

---

## Addition Group 4: 환영 화면 (단순, 스킵 가능)

### 4.1 환영 화면 컴포넌트

**파일:** `src/app/[locale]/desktop/welcome/page.tsx`

```tsx
"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, ArrowRight, SkipForward, FolderOpen, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";

export default function WelcomePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("Welcome");

  const [step, setStep] = useState<"intro" | "workspace" | "agent" | "done">("intro");
  const [workspacePath, setWorkspacePath] = useState<string>("");
  const [creating, setCreating] = useState(false);

  async function handleSelectWorkspace() {
    const path = await invoke<string | null>("select_folder");
    if (path) setWorkspacePath(path);
  }

  async function handleSetupWorkspace() {
    setCreating(true);
    try {
      await invoke("setup_workspace", { path: workspacePath });
      setStep("agent");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateAssistant() {
    setCreating(true);
    try {
      await invoke("create_agent", {
        name: "Jarvis",
        template_id: "personal-assistant",
      });
      await markOnboardingComplete();
      router.replace(`/${locale}/desktop/agents/Jarvis`);
    } finally {
      setCreating(false);
    }
  }

  async function handleSkipAssistant() {
    await markOnboardingComplete();
    router.replace(`/${locale}/desktop/dashboard`);
  }

  async function markOnboardingComplete() {
    await invoke("mark_onboarding_complete");
  }

  if (step === "intro") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg text-center"
        >
          <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="size-8 text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-3">{t("title")}</h1>
          <p className="text-lg text-muted-foreground mb-8">{t("subtitle")}</p>

          {/* 핵심 가치 3개 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Feature icon={<FolderOpen />} label="Local files" />
            <Feature icon={<User />} label="AI agents" />
            <Feature icon={<Zap />} label="Your AI keys" />
          </div>

          <Button size="lg" className="w-full" onClick={() => setStep("workspace")}>
            Get Started
            <ArrowRight className="size-4 ml-2" />
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Beta v0.1 · This will only take a minute
          </p>
        </motion.div>
      </div>
    );
  }

  if (step === "workspace") {
    return (
      <StepContainer step={2} total={3}>
        <h2 className="text-2xl font-semibold mb-2">Choose your workspace</h2>
        <p className="text-muted-foreground mb-6">
          Where do you want to store your files? This is just on your computer — nothing is uploaded.
        </p>

        <Button
          variant="outline"
          size="lg"
          className="w-full justify-start mb-3"
          onClick={handleSelectWorkspace}
        >
          <FolderOpen className="size-4 mr-2" />
          {workspacePath || "Select a folder..."}
        </Button>

        <p className="text-xs text-muted-foreground mb-6">
          Default: ~/Documents/BossBoard. You can change this later in Settings.
        </p>

        <Button
          size="lg"
          className="w-full"
          disabled={!workspacePath || creating}
          onClick={handleSetupWorkspace}
        >
          {creating ? "Setting up..." : "Continue"}
          <ArrowRight className="size-4 ml-2" />
        </Button>
      </StepContainer>
    );
  }

  if (step === "agent") {
    return (
      <StepContainer step={3} total={3}>
        <h2 className="text-2xl font-semibold mb-2">Create your Personal Assistant</h2>
        <p className="text-muted-foreground mb-6">
          Your first AI agent. It can answer questions, take notes, and help coordinate other agents.
        </p>

        <div className="rounded-lg border p-4 bg-primary/5 mb-6">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
              👤
            </div>
            <div>
              <div className="font-medium">Jarvis</div>
              <div className="text-sm text-muted-foreground">
                Your always-on AI helper
              </div>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full mb-3"
          disabled={creating}
          onClick={handleCreateAssistant}
        >
          {creating ? "Creating..." : "Create Personal Assistant"}
          <ArrowRight className="size-4 ml-2" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={handleSkipAssistant}
        >
          <SkipForward className="size-4 mr-2" />
          Skip — I'll explore on my own
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-6">
          You can always create more agents later
        </p>
      </StepContainer>
    );
  }
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function StepContainer({ step, total, children }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-md w-full"
      >
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i < step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        {children}
      </motion.div>
    </div>
  );
}
```

### 4.2 첫 진입 라우팅

**파일:** `src/app/[locale]/desktop/dashboard/page.tsx` (수정)

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { invoke } from "@tauri-apps/api/core";

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    const completed = await invoke<boolean>("is_onboarding_complete");
    if (!completed) {
      router.replace(`/${locale}/desktop/welcome`);
    }
  }

  // ... 기존 대시보드 UI
}
```

---

## Addition Group 5: 프로필 메뉴 "Go to Dashboard"

### 5.1 프로필 메뉴 컴포넌트

**파일:** `src/components/desktop/profile-menu.tsx` (이미 final-polish-prompt.md에 있음, 검증)

검증 사항:
- [x] "Go to Dashboard" 항목 포함
- [x] 어디서든 클릭하면 `/desktop/dashboard`로 이동
- [x] TitleBar 유지

추가 검증: **"Go to Dashboard" 클릭 시 가능한 모든 경로에서 작동**

테스트 시나리오:
- /desktop/agents/Jarvis → 클릭 → /desktop/dashboard ✓
- /desktop/library/projects/file.md (편집 중) → 클릭 → 저장 후 /desktop/dashboard
- /desktop/settings/ai-providers → 클릭 → /desktop/dashboard
- /desktop/welcome (온보딩 중) → 메뉴 안 보임 (의도)

---

## Addition Group 6: 에러 페이지 TitleBar 유지

### 6.1 not-found.tsx (404)

**파일:** `src/app/[locale]/desktop/not-found.tsx`

이미 final-polish-prompt.md에 있음. 검증:
- [x] TitleBar 컴포넌트 import + 표시
- [x] "Back to Dashboard" 버튼
- [x] "Go Back" 버튼
- [x] Tauri 환경에서도 정상

### 6.2 error.tsx (런타임 에러)

**파일:** `src/app/[locale]/desktop/error.tsx`

이미 final-polish-prompt.md에 있음. 검증:
- [x] TitleBar 표시
- [x] Sentry 자동 보고
- [x] "Try again" 버튼
- [x] "Back to Dashboard" 버튼

### 6.3 글로벌 에러 (root)

**파일:** `src/app/global-error.tsx` (신규, Tauri 외에서도 안전)

```tsx
"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
          <h1 className="text-2xl font-semibold mb-3">Critical error</h1>
          <p className="text-muted-foreground mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
```

---

## ✅ 추가 검증 체크리스트

작업 완료 후:

- [ ] DM Sync 토글: Free 잠김, Pro+ 활성화
- [ ] 디바이스 등록: Free 1기기, Starter 2기기 한도 작동
- [ ] 두 번째 기기 로그인 시도 → 에러 모달 표시
- [ ] OS 검출: Windows 표시 (Mac/Linux는 0 — 정상)
- [ ] 어드민 통계 API: by_os 카운트 정확
- [ ] 텔레그램 알림: OS 분포 포함
- [ ] 환영 화면: 첫 진입 표시, 두 번째는 안 보임
- [ ] Skip 후 dashboard로
- [ ] 프로필 → Go to Dashboard: 모든 경로에서 작동
- [ ] 404 + error 페이지: TitleBar 유지
- [ ] Apple Developer 신청 가이드 (별도 문서 = full-test-checklist-v3.md 참조)

---

## 📝 커밋 그래프

```bash
git commit -m "Addition 1: DM cloud sync toggle (Pro+ option)"
git commit -m "Addition 2: Admin OS distribution stats"
git commit -m "Addition 3: Device registration with plan limits"
git commit -m "Addition 4: Welcome screen (skippable)"
git commit -m "Addition 5: Profile menu Go to Dashboard verified"
git commit -m "Addition 6: Error pages preserve TitleBar"
git commit -m "Final polish complete - ready for beta launch"
```

---

**Stop here and notify Jay.**
