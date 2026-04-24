# BB v2.6: Metadata + /developers Page Fix

Read CLAUDE.md first.

---

## Task 1: Fix All Page Metadata (CRITICAL)

Current state: Page titles, meta descriptions, OG tags, and Twitter tags across ALL marketing pages still say v1 (SOP language). This affects SEO and social sharing previews.

### Find the root metadata

Check these files:
- `src/app/layout.tsx` — root layout metadata
- `src/app/(marketing)/layout.tsx` — marketing layout (if exists)
- `src/app/(marketing)/page.tsx` — landing page metadata export
- `src/app/(marketing)/docs/page.tsx` — docs metadata
- `src/app/(marketing)/download/page.tsx` — download metadata
- `src/app/(marketing)/developers/page.tsx` — developers metadata
- `src/app/(marketing)/terms/page.tsx` — terms metadata
- `src/app/(marketing)/privacy/page.tsx` — privacy metadata

### Update root metadata

In `src/app/layout.tsx` (or wherever root metadata is defined):

```typescript
export const metadata: Metadata = {
  title: {
    default: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    template: "%s — BossBoard",
  },
  description: "The workspace where humans and AI agents actually collaborate. Wiki, Board, DM, Calendar, Meetings — your agents have names, roles, and permissions.",
  openGraph: {
    title: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    description: "The workspace where humans and AI agents actually collaborate. Wiki, Board, DM, Calendar, Meetings — your agents have names, roles, and permissions.",
    url: "https://mybossboard.com",
    siteName: "BossBoard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BossBoard — Hire AI Agents. Manage Them Like a Pro.",
    description: "The workspace where humans and AI agents actually collaborate. Built for solo developers and indie AI builders.",
  },
  keywords: [
    "AI agents",
    "AI workspace",
    "MCP server",
    "BYOK",
    "Claude",
    "Cursor",
    "agent management",
    "AI team collaboration",
  ],
};
```

### Per-page metadata overrides

**`src/app/(marketing)/docs/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "Documentation",
  description: "Complete guide to using BossBoard — setup agents, connect BYOK, use wiki/board/DM/calendar/meetings, MCP server, and REST API.",
};
```

**`src/app/(marketing)/download/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "Download Desktop App",
  description: "BossBoard Desktop for Windows and macOS. Native OS notifications, system tray, and agent automation. Launching Week 2 of beta.",
};
```

**`src/app/(marketing)/developers/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "For Developers & AI Agents",
  description: "Give your AI agents a brain. BossBoard is the structured knowledge base your agents read from, write to, and coordinate through. MCP + REST API included on every plan.",
};
```

**`src/app/(marketing)/terms/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "Terms of Service",
  description: "BossBoard Terms of Service. BYOK model, AI Agent Operations, Payment and Refund policies.",
};
```

**`src/app/(marketing)/privacy/page.tsx`:**
```typescript
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "BossBoard Privacy Policy. Your content is never used for AI training. BYOK keeps your data under your control.",
};
```

Verify after changes:
- Visit each page
- Check browser tab title
- Inspect <head> for meta tags
- All should reflect v2.6 language

---

## Task 2: Fix /developers Page v1 Remnants

File: `src/app/(marketing)/developers/page.tsx`

### Change 1: Pricing heading

**Current:**
```
"Flat team pricing, from free to enterprise"
```

**Replace with:**
```
"Simple pricing. Pay for infrastructure, not AI tokens."
```

### Change 2: Pricing subtext

**Current:**
```
"All plans include MCP server, REST API, and BYOK (CLI launching soon). 
No per-seat charges for agents — they're just team members."
```

**Replace with:**
```
"All plans include MCP server, REST API, and BYOK. Pay your AI provider 
directly — zero markup from BossBoard. Built for solo developers and 
indie AI builders."
```

### Change 3: (Optional) SOP terminology

Review these lines on the page:
- "Write SOPs and policies in the wiki. Your agent reads them as instructions."
- "Agent reads SOPs for instructions, writes research results to wiki..."
- "refine your SOPs based on real usage data"

**Option A (minimal):** Leave as-is. "SOP" = "Standard Operating Procedure" for agents is valid terminology.

**Option B (cleaner):** Replace "SOPs" with "manuals" throughout /developers for consistency with landing page:
- "Write manuals and policies in the wiki. Your agent reads them on every loop."
- "Agent reads manuals for instructions..."
- "refine your manuals based on real usage data"

Pick whichever feels cleaner. Default to Option B if in doubt — matches landing page language.

---

## Task 3: Don't touch REST API endpoint names

In `/docs`, the REST API section shows:
```
GET /api/v1/sops
POST /api/v1/sops
```

**Keep these as-is** — they're real backend route paths. But **add a note** in the docs section:

```
**Note:** The /sops endpoint is the wiki/library resource. The URL 
preserves the original name for API backward compatibility; internally 
and in the UI this feature is called "Library" or "Wiki".
```

---

## Build + Commit

1. `npm run build` — must pass
2. `npx tsc --noEmit` — must pass

Commit messages:
```
Fix all page metadata for v2.6 SEO + social sharing
Fix /developers page v1 remnants (pricing heading + SOP terminology)
Add REST API endpoint legacy naming note to /docs
```

---

## Final Verification

After deploying, test:
- View page source on landing → `<title>` + meta tags v2.6
- View page source on /docs, /download, /developers, /terms, /privacy → per-page titles unique
- /developers page → no "flat team pricing" or "team members" language
- Share URL on Twitter/Slack preview → v2.6 description shown
