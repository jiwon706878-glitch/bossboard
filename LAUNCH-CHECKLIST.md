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

Stop. Verify what you can locally, schedule the external pieces, then ship.
