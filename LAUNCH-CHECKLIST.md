# BossBoard Launch Checklist (Manual Tasks)

These tasks require external accounts/services and must be done manually by Jay.
The pre-launch polish pass (commit `pre-launch polish complete`) wired the code
side; this checklist is the everything-else.

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
