# BossBoard Launch Checklist (Manual Tasks)

These tasks require external accounts/services and must be done manually by Jay.
The pre-launch polish pass (commit `pre-launch polish complete`) wired the code
side; this checklist is the everything-else.

---

## 🔴 Manual work Jay must do for v4 to function

### 1. Run the Supabase migrations (in order)
Open the Supabase SQL editor and run these one at a time:

1. `supabase/migrations/20260427000000_v4_devices.sql` — devices table +
   register_device / revoke_device RPCs + plan-device-limit helper
2. `supabase/migrations/20260427100000_v4_first_hundred.sql` — discount_codes
   + first_hundred_counter + assign_first_hundred_discount RPC
3. `supabase/migrations/20260427200000_v4_community_translations.sql` —
   community_translations table + RLS
4. `supabase/migrations/20260427300000_v4_mac_waitlist.sql` — mac_waitlist
   table + public-insert policy
5. `supabase/migrations/20260427400000_v4_admin_stats.sql` — feedback +
   error_logs + admin_get_stats / admin_list_feedback RPCs

The frontend gracefully no-ops when these are missing (registers RPC =
"skipped" / waitlist API = 503 / admin dashboard = explicit error message),
so deploys are safe before the migrations run, but nothing actually persists
until they're applied.

### 2. Set Vercel env vars
- `TELEGRAM_BOT_TOKEN` — from BotFather. Required for /api/admin/telegram-summary.
- `TELEGRAM_ADMIN_CHAT_ID` — your personal Telegram numeric id. Required.
- `CRON_SECRET` — random ≥32-char string. Required for /api/cron/daily-summary.
- `PADDLE_WEBHOOK_SECRET` — from Paddle dashboard. Required when Paddle live.
- `PADDLE_STARTER_MONTHLY_PRICE_ID` etc. — already wired in src/config/plans.ts.

### 3. Vercel cron
Already added to `vercel.json` (path `/api/cron/daily-summary`, daily 00:00 UTC).
Vercel sets `Authorization: Bearer ${CRON_SECRET}` automatically. Verify it
fires by checking Vercel Cron logs the day after deploy.

### 4. Paddle live setup (deferred)
The first-100-discount SQL is in place. The webhook handler at
`src/app/api/paddle/webhook/route.ts` does NOT yet exist — when the live
Paddle account is wired, build it to call `assign_first_hundred_discount`
on `subscription.created`.

### 5. Admin allow-list
`src/lib/auth/admin-check.ts` AND the SQL `admin_get_stats` RPC body both
hard-code the allow-list:
```
jay@mybossboard.com
jiwon706878@gmail.com
```
Add team emails in BOTH places when needed.

---

## What the v4-additions pass shipped (2026-04-27)

Five commits (07a25ae → 7547536), all four v4 groups.

✅ **V4 Group 1 — Plan enforcement** (07a25ae)
   - Five SQL migrations written to `supabase/migrations/` — Jay runs
     manually.
   - Tauri `device.rs` (uuid + hostname deps added) +
     `get_device_info` command.
   - `lib/auth/register-device.ts` calls `register_device` RPC with
     graceful fallbacks (not-Tauri, no-session, RPC-not-deployed,
     limit_reached).
   - `lib/plan-gate.ts` + `lib/auth/use-plan.ts`.
   - `components/desktop/upgrade-modal.tsx` + rewritten
     `device-limit-modal.tsx` accepting Supabase shape.
   - Layout mounts registration + DeviceLimitModal at root.
   - Agent wizard gates 3+ / 10+ / 50+ counts.

✅ **V4 Group 2 — i18n infrastructure** (ae58687)
   - `next-intl@4.9` installed (English-only beta).
   - `i18n/config.ts` with SUPPORTED + 9 FUTURE locales + LOCALE_STATUS.
   - `messages/en.json` + `public/messages/en.json` (~50 baseline keys,
     not a full sweep).
   - Tauri `translations.rs` storage commands.
   - `/desktop/settings/translations` community contribution page.

✅ **V4 Group 3 — Public marketing pages** (a3e3d69)
   - `/api/waitlist/mac` POST/GET + `MacWaitlist` form, mounted on
     `/download#mac`.
   - `/pricing`, `/faq`, `/changelog`, `/docs` hub + 5 sub-pages
     (getting-started, byok, agents, library, mcp) with substantive
     content.

✅ **V4 Group 4 — Launch admin dashboard + Telegram** (7547536)
   - `lib/auth/admin-check.ts` allow-list.
   - `/admin/launch` real-time dashboard (auto-refresh 60s).
   - `/api/admin/telegram-summary` POST with dual auth (admin user OR
     CRON_SECRET).
   - `/api/cron/daily-summary` Vercel cron entrypoint.
   - `vercel.json` updated with new cron schedule.

**Validation (2026-04-27)**
- `npx tsc --noEmit` — clean
- `npx eslint` (v3.0 + v4 scope) — 0 errors, 10 warnings (all the
  documented `react-hooks/set-state-in-effect` localStorage hydrate
  pattern)
- `cargo check` — clean (only pre-existing AccessDenied dead_code)
- `cargo clippy` — 3 pre-existing warnings, no new ones (translations.rs
  doc-comment lint fixed inline)

---

## Strict deferrals from final-polish-prompt-v4-additions.md

### Group 1.7 — Paddle webhook for first-100 discount
SQL is live (`assign_first_hundred_discount` RPC exists). The webhook
handler at `src/app/api/paddle/webhook/route.ts` is not yet built —
needs Jay's live Paddle creds + webhook URL configured in the Paddle
dashboard. Single-commit follow-up once Paddle live.

### Group 2.2 — Extract every hardcoded UI string to messages/en.json
~50 component files of mechanical work. The current `messages/en.json`
covers ~50 baseline keys (Common / Navigation / Library / Agents /
Settings / Welcome / DeviceLimit / Errors). Full sweep deferred to v3.1
because:
- it's invasive (touches every desktop component),
- the route migration to `/[locale]/desktop/...` is itself the bigger
  v3.1 deliverable, and
- the community-translations surface already works for the 50 keys
  shipped today.

### Group 3 — Landing page rewrite
The existing v2 landing at `src/app/(marketing)/page.tsx` has fetched
promotion state, Korean i18n, and analytics already wired. Replacing it
is a higher-risk change than building new pages alongside (which we did
for /pricing /faq /changelog /docs). Defer until next-intl route
migration so the new landing can ship localised.

### Group 3 — `/features` page
Listed in the prompt but the existing v2 marketing page already has a
comprehensive features grid. Skipped to avoid duplicate content.

### Group 3 — sitemap.ts + robots.ts updates
Existing files reference v2 routes. Update for `/pricing`, `/faq`,
`/changelog`, `/docs/*` in the next pass.

### Group 4.4 — MCP admin tools
`src-tauri/src/mcp_server.rs` is a minimal `/health` + auth stub with
no tool registry. Building the MCP tool registration surface
(`tools/list`, `tools/call`, per-tool handler schema, admin-only
gating) is the v3.1 client work. The 6 admin tools described in the
prompt (`admin_get_stats`, `admin_list_feedback`,
`admin_send_telegram`, `admin_get_recent_signups`,
`admin_resolve_feedback`, `admin_export_users`) all map to existing
Supabase RPCs / API routes — wiring them as MCP tools is mechanical
once the registry exists.

### Group 4 — `/api/admin/export-feedback` CSV route
The dashboard has the button but the route isn't wired. Straightforward
follow-up using the `admin_list_feedback` RPC + a CSV serializer.

---

## What the v3-additions pass shipped (2026-04-26, late evening)

Eleven commits (745fc54 → 351c534), critical security + bumper strategy.

✅ **Group 1.1 Indirect prompt injection defense** (745fc54)
   - `lib/ai/sanitize-external-content.ts`: `detectInjectionAttempt`
     scans 11 known patterns. `wrapExternalContent` wraps any
     external text in `<external_content trust_level="untrusted">`
     with explicit "treat as DATA, refuse commands" language.
     Helper sits ready for v3.1 MCP web_fetch / PDF import.

✅ **Group 1.2 BYOK key-leak guard** (0152d6a)
   - `lib/ai/key-leak-guard.ts`: 5 patterns (Anthropic / OpenAI /
     Google / xAI / Bearer). `assertNoKeysInPrompt` aborts the
     model call before bytes leave the box. `sanitizeAgentResponse`
     redacts on stream chunks + final text + non-streaming path.
     Wired into `executeDMTurn`. We deliberately do NOT report the
     matched pattern to Sentry (that itself would be a leak).

✅ **Group 1.3 Path traversal hardening** (9b478f7 + f1316b5)
   - `src-tauri/commands/path_safety.rs`:
     `validate_path_within_workspace` does canonicalize() + prefix
     check + system-prefix denylist. Two unit tests. Gated
     `#[allow(dead_code)]` until v3.1 MCP wires agent-controlled
     paths — v3.0's fs commands are driven by trusted frontend.
   - Also untracked `.claude/scheduled_tasks.lock` (was in
     `.gitignore` already).

✅ **Group 2.1 Device limit revoke modal** (d4d168c)
   - `components/desktop/device-limit-modal.tsx` ships UI only.
     Revoke + upgrade flow + collapsible "Why does this happen?"
     copy. Backend (`devices` table + RPCs) tracked under
     v2-additions Addition 3.

✅ **Group 2.2 TipTap roundtrip protection** (f9cb69e)
   - `components/library/format-warning.tsx`: amber banner above
     editor when raw HTML / LaTeX / wiki-link / Obsidian admonition
     / block-ref is detected. Per-file dismiss via localStorage.
     Deliberately reuses the existing `source` mode toggle instead
     of adding a parallel "Raw" toggle.

✅ **Group 2.3 Search-result token cap** (5fcd4e5)
   - `lib/agents/tools/search-library.ts` SEARCH_LIMITS = top 5,
     2K per result, 10K total. `capSearchResults` returns
     `noticeForAgent` so the agent knows when results were
     truncated. Helper sits ready for v3.1 MCP search tool.

✅ **Group 2.4 Rate-limit error UI** (aa83b58)
   - `lib/agents/errors.ts` exports `RateLimitError` subclass with
     provider + retryAfterSeconds (read from upstream
     `Retry-After`). `components/desktop/rate-limit-error.tsx`
     explains the limit is from the provider, links to the per-
     provider tier page. DM panel branches catch on instanceof.

✅ **Group 3.3 FeatureStatusBadge** (b9c4b61)
   - One canonical pill component for stable / beta / experimental /
     coming-soon. Wired into the sidebar disabled-item chip and the
     API key modal provider dropdown (Local Ollama + Custom show
     "Experimental").

✅ **Group 3.4 + 3.5 Beta disclosure** (39baaa4)
   - Welcome-screen Step 0 now carries an amber "This is Beta v0.1"
     callout (built solo, daily backup, 24h SLA, 30 % first-100
     discount).
   - Settings → About rewritten to lead with a public-beta caveat
     section, two action buttons (GitHub issue + Email Jay).

✅ **Group 4.1 + 4.2 + 4.3 + 4.6 Recommended polish** (351c534)
   - SQLite: `busy_timeout=5000`, `foreign_keys=ON`, startup
     `wal_checkpoint(TRUNCATE)`.
   - i18n CSS: `.bb-nav-label` / `.bb-btn-text` / `.bb-card-title`
     / `.bb-settings-label` overflow utilities ready for next-intl.
   - `lib/library/asset-name.ts` lowercase + safe-char normalisation
     wired into the editor's drag-drop image handler.
   - Meeting prompt: 7 explicit anti-echo rules + "I have nothing
     new to add — passing." exit clause. Also fixed a pre-existing
     bug where `summarizeMeeting` read deleted legacy keychain
     slugs — now goes through `loadKeys()`.

**Validation (2026-04-26 late evening)**
- `npx tsc --noEmit` — clean
- `npx eslint` (v3.0 scope) — 0 errors, 10 warnings (the documented
  localStorage hydrate-on-mount pattern; +1 new from format-warning)
- `cargo check` — clean (only pre-existing AccessDenied dead_code)
- `cargo clippy` — 3 pre-existing warnings, no new ones

---

## Strict deferrals from final-polish-prompt-v3-additions.md

### Group 3.1 — i18n beta labels per language
Needs the next-intl locale routing which is itself deferred (Group B
in the previous final-polish pass). When that ships, the
LanguageSelector can use FeatureStatusBadge with `status="beta"` per
language; the badge component is ready.

### Group 3.2 — Mac waitlist + 50 % launch discount
Needs a Supabase `mac_waitlist` table + `/api/waitlist/mac` endpoint
+ a marketing-route `/(marketing)/download` rewrite. The download
page already exists at `src/app/(marketing)/download/page.tsx` but
the waitlist signup + counter would need backend wiring.

### Group 4.4 — Agent soft-delete with reference safety
Needs:
- A Tauri `soft_delete_agent` command that moves
  `<workspace>/agents/{name}` to `<workspace>/.bb/deleted-agents/`.
- A "ghost mention" component for DM / Board / Meetings that renders
  `@deleted-name` in muted style instead of a broken link.
- A "restore agent" UI in /settings/data.

The Modal + useConfirm primitives are in place; the move/restore
flow is its own commit.

### Group 4.5 — Trash size cap (1 GB) with OS-trash fallback
Needs the `trash` crate added to Cargo.toml + a cleanup function
that runs before `move_to_trash`. The existing `commands/trash.rs`
does simple file rename without a size budget. Low priority — users
won't notice until trash is huge.

---

## What the final-polish pass shipped (2026-04-26, evening)

Eight commits on `main` (2bdd417 → 538ff47).

✅ **Group A — Critical data safety** (2bdd417)
   - DB backup-before-migrate in `commands/metadata.rs` — every
     PRAGMA-gated migration first copies the live SQLite to
     `metadata.v{N}.backup.sqlite`. New `metadata_restore_backup`
     command rolls forward via file copy.
   - Frontmatter migration (already lossless via `parseMarkdown`
     fallback) and JSON-snapshot startup backup verified.
   - Roadmap.md seed updated to drop the deleted translation feature.

✅ **Group D — UI/UX primitives** (437ffd7)
   - `EmptyState`, `ErrorState`, `useConfirm` hook, focus-visible
     CSS scoped to `.bb-app-shell`. Library list now renders the
     real EmptyState + ErrorState with retry.

✅ **Group E — Tauri-aware routing** (f51b590)
   - `MarketingShell` redirects `__TAURI_INTERNALS__` visitors to
     `/desktop/dashboard`. Verified that `/desktop/{not-found,error}`
     already inherit the layout's Titlebar (window controls stay
     usable on errors).

✅ **Group F — Profile menu** (1a307f2)
   - "Go to Dashboard" + "Reload app" added at the top of the
     existing profile dropdown. Wrapped in AnimatePresence with the
     Group C modal motion.

✅ **Group G — Settings split** (7cfe4e7)
   - `/desktop/settings/{layout,page,ai-providers,integrations,data,about}`.
     Sidebar nav, AI keys vs external tools cleanly separated.
     `APIKeyManager` lifted into `components/desktop/api-key-manager.tsx`
     so the agent wizard can reuse it later.

✅ **Group H — BB-System-Reference auto-gen** (38e229c)
   - `lib/agents/system-reference.ts` writes
     `/Library/BB-System-Reference.md` and `/Library/Welcome.md` on
     desktop layout mount + after `createAgent`. Runtime reference
     covers folder layout, four critical agent rules, and the
     active-agent roster. `executeDMTurn` injects it as the first
     section of every agent's system prompt.

✅ **Group I — Agent wizard** (06738e5)
   - `lib/agents/templates.ts` holds the four richer manuals.
     `/desktop/agents/new` is a 4-step wizard (template → name+role
     → manual edit → review+provider). Old inline modal deleted.

✅ **Group J — Welcome screen** (39bbaca)
   - `/desktop/welcome` 3-step flow (hero → optional name → create
     first agent / skip). Dashboard redirects to it when
     `bb_onboarding_complete` is missing.

✅ **Group K — Calendar from scratch** (2886030)
   - Real `/desktop/calendar` with Month / Week / Day views and a
     full event modal (title, datetime range, notes, color). Events
     persist to `/Library/calendar/events.json`. Calendar nav item
     enabled in the sidebar.

✅ **Group L — Plans v3.0 limits** (2dec28e)
   - Additive `v3Limits` block on every plan: devices (Free 1,
     Starter 2, Pro/Business unlimited), per-channel cloudSync (DMs
     local on Free), aiMeeting tier, smartSearch, teamCollaboration.
     `BETA_DISCOUNT` constant exported (30 % lifetime, 100 slots).

✅ **Group M — Beta v0.1 label** (538ff47)
   - Pill badge in the Titlebar centre and at the top of the About
     modal. Subline reads `v3.0.0-beta.1` for bug-report clarity.

**Validation (2026-04-26 evening)**
- `npx tsc --noEmit` — clean
- `npx eslint` (v3.0 scope) — 0 errors, 9 warnings (all the
  documented `react-hooks/set-state-in-effect` localStorage hydrate
  pattern; +2 new from welcome and format-notice)
- `cargo check` — clean (only pre-existing AccessDenied dead_code)
- `cargo clippy` — 3 pre-existing warnings, no new ones

---

## Strict deferrals from final-polish-prompt.md

Tracked here so the next pass knows exactly what's missing.

### Group B — i18n with next-intl, 10 languages
**Why deferred:** the prompt assumes `src/app/[locale]/...` routing.
Today every desktop route lives at `src/app/desktop/...`. Moving every
route into a locale segment is a 20+ file refactor that touches the
entire navigation tree, every `<Link>` href, and every `usePathname()`
caller. Not safe to do as part of an autonomous polish pass — needs a
dedicated migration commit with a clean fallback strategy.

**What's still in place:** the existing `src/lib/i18n.ts` and the
admin `src/lib/admin-i18n.ts` for the marketing/auth surfaces are
untouched and still work. Agent-side locale awareness in
`executeDMTurn` reads `navigator.language` via `system-reference.ts`,
so agents already default to the user's browser locale.

### Group C — Obsidian-style library
**Why deferred:** folder tree + sort + drag-and-drop + multi-select +
Ctrl+P quick finder + tags + favorites is a multi-day rewrite of the
Library page, the Tauri fs commands (move, batch-rename), and a new
`favorites.json` + `tags index`. Worth doing right with a design
review, not as part of one autonomous run.

**What's still in place:** the current Library page is a simple flat
file list with the Group A EmptyState + ErrorState, frontmatter
parsing, and per-file context menu. Calendar files (`/Library/calendar/`)
do show in the list now since they're real markdown.

### Group N — Public website (landing + docs + FAQ + download + …)
**Why deferred:** that's 10+ separate marketing-route pages. The
existing `/(marketing)/page.tsx` already covers the hero / value
props / FAQ / pricing for v2.6 and works fine. Mac coming-soon copy,
ChatGPT comparison table, and `/download` page are content-only and
can ship via the marketing track.

### Group O — Admin dashboard with full visibility
**Why deferred:** requires Supabase admin RLS, an `/api/admin/stats`
route that aggregates users/MRR/feedback/errors/OS distribution from
multiple tables that don't yet exist (devices, events, feedback). The
existing `src/app/(admin)/...` admin shell is untouched.

---

## Strict deferrals from final-polish-prompt-v2-additions.md

The v2-additions add cross-cutting backend systems. Each one needs
Supabase migrations + Tauri commands + auth integration. Documented
here in order of business priority.

### Addition 1 — DM cloud sync toggle (Pro+ option)
**Required infrastructure:**
- Supabase table `dm_sync_settings (user_id, cloud_sync_enabled,
  last_synced_at)`
- Supabase table `dm_messages (user_id, agent_name, message_id,
  content, role, ts)` with RLS
- Tauri commands: `get_dm_sync_settings`, `set_dm_sync_enabled`,
  `sync_dms_to_cloud`, `pull_dms_from_cloud`
- Rust `AppState` struct (currently doesn't exist) holding
  `db: Mutex<Connection>` and `user_id: String`
- A Rust `dm.rs` module that owns the local DM file format
- Background tokio task on app start to pull deltas + on each send
  to push

**What's in place today:** DMs are local-only (per Sacred Rule #4:
"User's files stay on user's PC"). Free-plan users are already in
the right state. No UX surface promises cloud sync, so removing the
deferred toggle doesn't surprise anyone.

### Addition 2 — Admin OS distribution stats
**Required infrastructure:**
- Supabase `devices` table (per migration 0003 in the prompt)
- `lib/analytics/device-info.ts` ↔ `/api/track/device` endpoint
- Admin `/api/admin/stats` aggregator + admin dashboard cards
- Telegram daily summary bot endpoint

**What's in place today:** zero of the above. Admin shell exists at
`src/app/(admin)/...` but doesn't yet have any stats surface for v3.

### Addition 3 — Device registration system (1-device limit)
**Required infrastructure:**
- Supabase RPC `register_device(p_device_id, p_os, p_os_version,
  p_app_version)` returning JSON `{success, error?, current?, max?}`
- Tauri startup hook that resolves a stable device ID (Group L's
  v3Limits.devices is already the source of truth for the cap)
- DeviceLimitModal in the desktop UI that fires when the RPC
  returns `device_limit_reached`
- "Manage devices" pane in /settings/data so users can revoke
  device IDs

**What's in place today:** plan limits exist as the single source of
truth. Enforcement is wide open — a paying Free user can run BB on
multiple PCs and nothing stops them. Acceptable for closed beta;
must close before public billing goes live.

### Addition 4 — Welcome screen ✅
Shipped in **Group J** above (`/desktop/welcome`).

### Addition 5 — Profile menu Go to Dashboard ✅
Shipped in **Group F** above.

### Addition 6 — Error pages preserve TitleBar ✅
Verified in **Group E** above. The `/desktop` layout wraps both
`error.tsx` and `not-found.tsx`, so the Titlebar (with window
controls) remains visible on errors and 404s.

---

## What this final hotfix shipped (2026-04-26)

Five commits on `main` (3523a2d → 24a11a6).

✅ **Tauri launch panic fix** (3523a2d)
   - Dropped `tauri-plugin-log` (collision with `tracing-subscriber`'s
     log shim). 5 `log::` calls migrated to `tracing::`. Verified
     clean cold-launch, MCP server bound on 127.0.0.1:39001.

✅ **Group A — User-found bugs** (ca334a8)
   - Library page widened (max-w-7xl + lg:px-8).
   - Responsive font sizing via .library-content + clamp().
   - Translation feature deleted entirely (translate.ts,
     translation-cache.ts, translation-panel.tsx). Replacement copy
     points users at agent DM.
   - 404 page detects __TAURI_INTERNALS__ and routes to
     /desktop/dashboard inside the app, "/" on the web.
   - FormatNotice component (pptx/docx/pdf/xlsx) with localStorage
     "don't show again" — ready for wiring.
   - **Deferred A.5 (ICS export removal):** N/A in v3.0 desktop —
     no calendar surface exists yet. Will land with the calendar.

✅ **Group B — API key UX + xAI** (db9aee7)
   - New multi-key data model (src/lib/ai/keys.ts): one keychain
     entry holds the JSON list of {id, provider, name, key, notes,
     createdAt, lastUsedAt}.
   - Six providers: google, anthropic, openai, xai, local, custom.
   - Settings page rebuilt with KeyCard list + "Add API key" button
     + Add/Edit modal. Animated with Framer Motion.
   - migrateOldKeys() runs on desktop layout mount: packs the legacy
     api_key_google / _anthropic / _openai / _grok singletons into
     the new list, then deletes the legacy entries. Idempotent.
   - Agent execute.ts uses resolveKey(); supports new optional
     ai_key_id frontmatter so a manual can pin to a specific key.
   - xAI Grok wired via @ai-sdk/xai (default grok-4-fast, 128k ctx).
   - Old ApiKeys helper deleted from keychain.ts.

✅ **Group C — Framer Motion suite** (6803bad)
   - Motion tokens: src/lib/motion/tokens.ts (duration / ease /
     spring presets).
   - DM panel: AnimatePresence slide (x:100% spring) + per-message
     bubble entrance + smart typing indicator (3s dots / 15s
     "Thinking" / 15s+ explains delay, calls out Local AI).
   - Sidebar: motion.aside spring on collapse + layoutId pill that
     slides between active routes.
   - Modal: AnimatePresence scale+y+opacity, exit animation now
     plays. ConfirmDialog inherits.
   - Toast system (src/components/desktop/toast.tsx): zustand store
     + AnimatePresence cards, auto-dismiss 4s, mounted in layout.
   - Page transitions: keyed AnimatePresence around <main> children.
   - Skeletons: src/components/desktop/skeletons.tsx
     (LibrarySkeleton, AgentCardSkeleton).
   - List stagger: applied to /desktop/library list.
   - **Partial / deferred:**
     - C.7 button hover/tap — would touch every primary CTA;
       MotionButton helper not yet extracted.
     - C.8 stagger fanout — only Library so far; Agents / Board /
       DM message list pending.
     - C.14 alert() → toast — there were 0 alert() calls in the
       /desktop scope, so this is a no-op for v3.0; toast plumbing
       is in place for future code.

✅ **Group D — Code optimization** (24a11a6)
   - @next/bundle-analyzer wired behind ANALYZE=true.
   - TipTap MarkdownRenderer lazy-loaded via next/dynamic.
   - KeyCard memoized.
   - Memory-leak audit walked every useEffect with setInterval /
     addEventListener under /desktop. All cleanups present.
   - **Deferred:**
     - D.4 image lazy: needs custom Tiptap Image extension.
     - D.6 search debounce: no search input shipped yet in /desktop.
     - D.7 virtual scroll: @tanstack/react-virtual installed; no
       list crosses the threshold today, so wiring is premature.

**Validation (2026-04-26)**
- `npx tsc --noEmit` — clean
- `npx eslint` (v3.0 scope) — 0 errors, 7 warnings (all the
  documented localStorage hydrate-on-mount pattern; one new from
  format-notice.tsx, the rest pre-existing)
- `cargo check` — clean (only pre-existing AccessDenied dead_code)
- `cargo clippy` — 3 pre-existing warnings, no new ones (Rust
  unchanged this pass)
- Tauri cold-launch verified earlier in the session

Ready for beta launch after manual smoke test (see "Smoke test"
section below).

---

## 🔴 Required before beta launch

### 1. Sentry DSN setup
- Sign up at https://sentry.io (free tier, 5K events/month)
- Create new project (Next.js)
- Copy DSN
- Add to `.env.local`:
  ```
  NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
  ```
- Code already wired (`sentry.client.config.ts` reads the env var, `enabled` gates on its presence). Without this DSN, error tracking is a no-op.

### 2. Apple Developer Program (Mac signing)
- Sign up at https://developer.apple.com/programs/
- $99/year
- 1–3 day approval
- After approval: configure signing identity in Tauri build (`tauri.conf.json` `bundle.macOS.signingIdentity`)
- Notarization requires Apple ID app-specific password

### 3. Windows Code Signing (optional but strongly recommended)
- Without it, SmartScreen warns users on every install
- Options:
  - **Sectigo OV Certificate** — ~$200/year, EV ~$400/year (faster reputation)
  - **Azure Trusted Signing** — ~$10/month, recommended for indies
  - **SignPath** — free for open source projects

### 4. Production builds + clean-machine test
- Run `npm run tauri:build` (15–30 min first build)
- Test the `.msi` installer on a CLEAN Windows VM/PC (not your dev machine)
- Verify first-run wizard creates `~/Documents/BossBoard/`
- Verify offline mode banner appears when network is dropped
- Verify auto-update channel configured (see #15 below if shipping updates)

### 5. Cloudflare security
- DNS Full SSL (Strict)
- HSTS enabled
- Bot Fight Mode on
- Rate limiting on `/api/auth/*`
- DNSSEC enabled
- WAF Managed Rules

### 6. Supabase production
- Verify all tables have RLS enabled (the v2 dashboard tables remain in the
  database; v3.0 only relies on `profiles`, `board_posts`, `calendar_events`,
  and the auth schema)
- Test Paddle webhook with a real test payment
- Backup the production database before launch
- Set up daily automated backup (Pro tier $25/mo)

### 7. Paddle setup
- Verify product IDs match your config
- Test sandbox checkout flow end-to-end
- Configure tax settings (US, EU, KR)
- Set up payout method

### 8. Domain + email
- mybossboard.com pointing to Vercel
- jay@mybossboard.com email forwarding (Namecheap or similar)
- Test transactional emails (Resend) — signup confirmation, password reset

### 9. Marketing assets
- Landing page final review (currently ships as v2.6 content)
- Pricing page accurate for v3.0 BYOK model
- FAQ updated for v3.0
- Terms of Service + Privacy Policy reviewed (BYOK + local-first language)
- README.md / changelog

### 10. Asset protocol scope review
- `src-tauri/tauri.conf.json` currently has `assetProtocol.scope: ["**"]`
- This is necessary because users can pick custom workspace folders anywhere
- Consider tightening if a runtime scope-update API becomes available
- Document for security review: scope is permissive but only the WebView (single user) can fetch through `asset://`

---

## 🟡 Post-launch (v3.1 prep)

### 11. PostHog analytics
- Sign up at https://posthog.com (free 1M events/month)
- Add `NEXT_PUBLIC_POSTHOG_KEY` to env
- Implement event tracking (signup, agent created, DM sent, translation run, meeting completed)

### 12. GitHub Actions CI/CD
- Set up `.github/workflows/release.yml`
- Auto-build Tauri on git tag push (`v3.x.x`)
- Upload `.msi` and `.dmg` to GitHub Releases
- Sign artifacts inside the action (requires secrets for cert + Apple ID)

### 13. Tauri auto-updater
- Generate update signing keypair (`npx tauri signer generate`)
- Store private key as a GitHub secret; commit public key into `tauri.conf.json`
- Stand up an updater endpoint (Vercel route serving JSON manifest pointing at signed builds)

### 14. GitHub MCP / Google Drive integrations
- v3.0 stores GitHub PAT in OS keychain
- v3.1: implement OAuth flow + actual MCP tool-calling in agent loop
- Spawn `@modelcontextprotocol/server-github` as subprocess OR call REST directly from `executeDMTurn`

---

## 🟢 Long-term

### 15. Apple notarization automation
- Automate `xcrun notarytool` in CI
- Verify stapling works for offline installs

### 16. Windows SmartScreen reputation
- Even with code signing, new certs need ~30 days of installs to build reputation
- Plan rollout accordingly (don't sign + ship simultaneously to a large cohort)

### 17. External security audit
- Code review by external developer
- Focus areas: API key storage (keychain), MCP server (localhost:39001), file permission boundaries, CSP

### 18. GDPR compliance review
- Data export already implemented (Settings → Export all data)
- Data deletion: currently email-based; v3.1 self-service deletion
- Data processing addendum (DPA) for Pro/Enterprise customers

### 19. SOC2 (if targeting enterprise)
- Vanta or Drata for automation
- 6-month observation window minimum

---

## What the pre-launch polish pass already shipped

For reference, these are wired in code as of the polish commit and need no
manual setup beyond what's listed above:

- OS Keychain for AI keys + GitHub PAT (Windows Credential Manager / macOS Keychain)
- File watcher with proper Mutex-guarded lifecycle (no Box::leak)
- TipTap real-markdown round-trip via `tiptap-markdown`
- Local image rendering via Tauri asset protocol + `convertFileSrc`
- Frontmatter schema migration system (auto-upgrade old files on read)
- Vercel AI SDK + streaming responses (typing effect in DM)
- Zod runtime validation on frontmatter
- Sentry client config with replay + sensitive-data stripping (gated on DSN env)
- Per-route `error.tsx` for `/desktop` reporting to Sentry
- Data export to `.zip` (workspace + cloud profile/posts/events + README)
- Workspace metadata snapshot foundation (`.bb/backups/`)
- Turbopack enabled in `npm run dev`
- ESLint tightened on the v3.0 desktop scope only (no churn on v2 code)

---

## What the final hardening pass added (additional to polish)

Wired in the hardening commit; no manual setup required.

**Data integrity**
- SQLite `metadata.sqlite` moved out of `~/Documents/BossBoard/.bb/` into the
  Tauri `app_data_dir` so OneDrive / iCloud / Dropbox can't lock the file or
  cause WAL corruption. Old DBs in the workspace are auto-migrated on first
  read and the source removed.
- SQLite migration is `PRAGMA user_version`-gated and runs inside a single
  transaction. WAL + NORMAL synchronous + 64MB cache PRAGMAs are applied on
  every connection.
- Atomic writes: `write_file` and `write_binary_file` write to a sibling
  `.bb-tmp-<pid>-<nonce>` then `rename()` into place — concurrent readers
  (Obsidian, the file watcher, search) never see a partial file.

**Agent safeguards**
- Loop guard (`lib/agents/loop-guard.ts`): blocks the same `(agent, hash)`
  pair after 5 hits in a 5-minute window. `executeDMTurn` throws a clear
  "stopped for safety" error.
- Context window pre-check: estimated `system + user` tokens compared to
  per-model limits in `lib/agents/execute.ts`. Above 85% the call rejects
  with a "compress this conversation" message instead of failing upstream.
- Provider error wrapping (`lib/agents/errors.ts`): 401/429/400/402/5xx
  mapped to friendly text ("API key invalid", "rate limit", "context too
  long", "quota exceeded", "server error").
- `callWithTimeout`: 60s for cloud, 5min for local. Local AI no longer
  hangs the UI when Ollama isn't responding.
- Local-AI conflict warning helper (≥2 active local agents).

**File system robustness**
- Watcher ignores `node_modules`, `.git`, `target`, `dist`, `.next`,
  `__pycache__`, `.bb/cache|backups|trash`, `.DS_Store`, `Thumbs.db`,
  and skips symlinks (prevents traversal loops on workspaces with junctions).
- `check_workspace_health` Rust command + `<WorkspaceHealthBanner>` in the
  desktop layout: polls every 30s, surfaces a banner after 60s of failure
  (NAS disconnect, ejected drive).
- Trash system in Rust (`commands/trash.rs`): `move_to_trash`, `list_trash`,
  `restore_from_trash`, `empty_trash`. UI for the trash page is post-launch
  but the safety net is in place — agent-driven deletes can already route
  through it.

**Network / MCP**
- Dynamic MCP port: 39001..=39099 scan, port written into `McpState`.
- Bearer auth on `/`: random 24-byte token generated on startup, only
  `/health` is unauthenticated. `get_mcp_info` exposes the port + token to
  the frontend so future Settings UI can display them.

**Security**
- `lib/library/sanitize.ts` exports `sanitizeHTML` (DOMPurify with strict
  allowlist) for any future HTML render path. `tiptap-markdown` already
  runs with `html: false`, so this is defense in depth.
- Workspace path sandbox: `lib/tauri/path-safety.ts` rejects `C:\`,
  `C:\Windows`, `C:\Program Files`, `/`, `/System`, `/usr`, `/etc`,
  `/private`, `/Library`, `/Applications`, and prefixes thereof. Wired into
  the welcome flow.

**Observability**
- Tracing (`tracing` + `tracing-subscriber` + `tracing-appender`) writes
  daily-rotated logs to `<app_data_dir>/logs/bossboard.log`. Panic hook
  routes Rust panics into the same log. New `get_logs` command reads the
  current day's file for in-app diagnostics.

**Cost / UX**
- `lib/ai/cost.ts` provides token estimation (CJK-aware) + USD cost helper.
- Translation panel shows the estimate up-front and asks for explicit
  confirmation past 10K tokens or $0.10 (also adds an in-memory paragraph
  cache via `translateWithCache`).
- Meetings page checks the projected cost (`participants × rounds + 1`
  turns × ~500 tokens) and asks for confirmation past $0.50.
- Reduced-motion CSS rule honors `prefers-reduced-motion: reduce`.

**Build**
- Cargo release profile: `opt-level = 3`, `lto = true`, `codegen-units = 1`,
  `panic = "abort"`, `strip = true` (smaller, faster Tauri builds).
- Cargo dev profile: `opt-level = 1` for faster iteration without losing
  debugger info.

## Strict deferrals from the hardening pass

These were in the hardening spec but **not implemented** — see code/this
checklist for rationale:

| Spec § | Item | Status | Why |
|---|---|---|---|
| 1.3 | 100-user discount counter | Deferred | Paddle config + landing copy, no code change here |
| 2.3 + 6.3 | Sleep mode queue + overflow | Deferred | Agents are user-triggered today; queue would be unused infrastructure |
| 3.1 | macOS permission denial UI | Deferred | Requires actual macOS testing; primary launch is Windows |
| 3.2 | Windows MAX_PATH normalization | Deferred | Tricky to validate without long-path scenarios; Tauri 2 + Windows 10/11 default supports long paths |
| 3.3 | WiX `preserveUserDataOnUninstall` | Deferred | Workspace lives in `~/Documents` and isn't installed by the MSI; uninstall doesn't touch it |
| 3.4 | Wake-from-sleep detector | Deferred | Cosmetic; only matters once we have scheduled agent triggers |
| 4.3 | Encoding auto-detection (EUC-KR) | Deferred | `chardetng`/`encoding_rs` not added; users on Windows with KR locale should be fine for new files; legacy files can be opened in any editor |
| 7.1 | Paddle webhook reconciliation cron | Deferred | Needs `CRON_SECRET` + Vercel cron config + access to Paddle subscriptions schema |
| 7.2 | Free trial abuse detection | Deferred | Sign-up flow is mostly Supabase Auth; CC-required-for-trial is a Paddle/landing change |
| 7.3 | Cloud metadata ghost cleanup | Deferred | Depends on a `library_metadata` cloud table that v3.0 doesn't use (metadata is local-only) |
| 8.2 | API key setup videos / GIFs | Deferred | Content production, not code |
| 10.1 | Per-WebView CSS shims | Deferred | Needs cross-platform smoke test; punt to bug reports |
| 10.3 | VPN/DNS error wrapping | Deferred | Many fetch sites; would need a wrapper at every callsite for marginal UX gain |
| 10.4 | macOS keychain release notes template | Deferred | Content for changelog; relevant once we ship updates |
| 11.* | Framer Motion suite (slide-in, modal scale, sidebar spring, layoutId active indicator, button hover, list stagger, message bubble entrance, smart typing indicator, page transitions, skeletons, toast replacement) | Deferred | Motion polish is its own dedicated pass; current spring-free animations work and don't block beta. `prefers-reduced-motion` CSS guard is in place for when motion lands. |
| 12.1 | `@next/bundle-analyzer` | Deferred | Diagnostic tool, not a code change |
| 12.2 | Component memoization audit | Deferred | Lists are small for v3.0 launch; revisit if profiling shows hot spots |
| 12.3 | Lazy-loaded routes | Deferred | Bundle size is fine for desktop where there's no over-the-wire payload |
| 12.4 | `next/image` optimization | Deferred | Local images via `convertFileSrc` aren't routed through next/image; cloud images are limited to user avatar (deferred to Pro) |
| 12.5 | Memory leak audit pass | Spot-checked | New code uses cleanup; full audit deferred |
| 12.6 | SQLite PRAGMA tuning | **Done** as part of 9.1 (WAL/NORMAL/cache_size) |
| 12.7 | Search debounce | Deferred | No global search yet (Ctrl+K opens placeholder) |
| 12.9 | Virtual scrolling | Deferred | Library / DM lists are short for v3.0 launch |

If any of these become production-blocking after testing, file as a
post-launch hotfix.

---

Stop. Verify what you can locally, schedule the external pieces, then ship.
