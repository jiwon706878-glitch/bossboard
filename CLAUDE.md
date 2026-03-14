# BossBoard — AI Operations Control Tower

## Project Overview
BossBoard is an AI-powered operations wiki and control tower for business owners.
Core value: "Speak and your SOP is ready" — AI generates complete SOPs from text/voice input.
The dashboard gives business owners a daily reason to open the app.

**Tech Stack:**
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL + Auth + Storage)
- AI: Anthropic Claude API (Sonnet 4)
- Payments: Paddle (existing integration)
- Email: Resend
- Deployment: Vercel
- Styling: Tailwind CSS + shadcn/ui
- Editor: TipTap (rich text SOP editor)

**Domain:** mybossboard.com

## Architecture

```
/app
  /(marketing)        → Landing page, pricing, login
  /(auth)             → Login, signup, onboarding wizard
  /(dashboard)        → Main dashboard (daily control tower view)
  /(sops)             → SOP list, create, edit, view, wiki
  /(team)             → Team management, invites
  /(settings)         → Account, billing, workspace settings
  /(api)              → API routes
    /api/ai/generate  → Claude API for SOP generation
    /api/ai/suggest   → AI insights & recommendations
    /api/sops/        → SOP CRUD
    /api/team/        → Team management
    /api/webhooks/    → Paddle webhooks
```

## Database Schema (Supabase)

```sql
-- Workspaces (companies/teams)
workspaces (
  id uuid PK,
  name text,
  industry text,        -- cafe, restaurant, saas, agency, etc.
  plan text DEFAULT 'free',  -- free, starter, pro, business
  created_at timestamptz
)

-- Users
users (
  id uuid PK (references auth.users),
  workspace_id uuid FK,
  email text,
  full_name text,
  role text DEFAULT 'member',  -- owner, admin, member
  avatar_url text,
  created_at timestamptz
)

-- SOPs
sops (
  id uuid PK,
  workspace_id uuid FK,
  title text,
  content jsonb,          -- TipTap JSON content
  summary text,           -- AI-generated summary
  category text,          -- onboarding, operations, safety, etc.
  status text DEFAULT 'draft',  -- draft, published, archived
  review_cycle_days int DEFAULT 90,
  last_reviewed_at timestamptz,
  created_by uuid FK,
  version int DEFAULT 1,
  created_at timestamptz,
  updated_at timestamptz
)

-- SOP Read Tracking
sop_reads (
  id uuid PK,
  sop_id uuid FK,
  user_id uuid FK,
  read_at timestamptz,
  signed boolean DEFAULT false
)

-- SOP Versions
sop_versions (
  id uuid PK,
  sop_id uuid FK,
  version int,
  content jsonb,
  changed_by uuid FK,
  change_summary text,
  created_at timestamptz
)

-- Checklists (generated from SOPs)
checklists (
  id uuid PK,
  workspace_id uuid FK,
  sop_id uuid FK,          -- source SOP
  title text,
  items jsonb,             -- [{text, required}]
  recurrence text,         -- daily, weekly, monthly, once
  assigned_to uuid FK,
  created_at timestamptz
)

-- Checklist Completions
checklist_completions (
  id uuid PK,
  checklist_id uuid FK,
  completed_by uuid FK,
  items_completed jsonb,   -- [{item_index, completed_at}]
  completed_at timestamptz
)

-- Onboarding Paths
onboarding_paths (
  id uuid PK,
  workspace_id uuid FK,
  title text,              -- e.g., "New Barista Onboarding"
  sop_ids uuid[],          -- ordered list of SOPs
  created_at timestamptz
)

-- Team Invites
invites (
  id uuid PK,
  workspace_id uuid FK,
  email text,
  role text DEFAULT 'member',
  token text UNIQUE,
  accepted boolean DEFAULT false,
  created_at timestamptz
)
```

## AI SOP Generation Prompt Structure

When generating SOPs, use this system prompt pattern:
```
You are an expert operations consultant. Generate a detailed, actionable SOP.

Industry: {workspace.industry}
Topic: {user_input}
Language: {workspace.language || 'English'}

Output format:
1. Title
2. Purpose (1-2 sentences)
3. Scope (who this applies to)
4. Step-by-step procedure (numbered, clear, actionable)
5. Safety/compliance notes (if applicable)
6. Checklist summary (extractable items)

Keep language simple. Write for someone doing this task for the first time.
```

## Pricing Plans

| | Free | Starter $19/mo | Pro $49/mo | Business $129/mo |
|---|------|---------------|------------|-----------------|
| SOPs | 5 | 50 | Unlimited | Unlimited |
| Team | 3 | 10 | 30 | Unlimited |
| AI generations | 5/mo | 50/mo | Unlimited | Unlimited |
| Checklists | ✗ | ✓ | ✓ | ✓ |
| Read tracking | ✗ | ✓ | ✓ | ✓ |
| Onboarding paths | ✗ | ✗ | ✓ | ✓ |
| Custom branding | ✗ | ✗ | ✓ | ✓ |
| API | ✗ | ✗ | ✗ | ✓ |

## Design System — CRITICAL: NO AI-GENERATED AESTHETICS

### ❌ ABSOLUTELY FORBIDDEN (AI가 만든 티 나는 것들)
- NO purple/blue gradients anywhere
- NO Inter, Roboto, or system-ui as primary font
- NO gradient text on headings
- NO abstract blob/wave shapes as backgrounds
- NO emoji in section headings (🚀 ✨ 💡 etc.)
- NO identical-size cards in a perfect 3-column grid
- NO generic mockup images (phone/laptop frames)
- NO "Powered by AI" badges
- NO uniform section padding (vary the rhythm)
- NO shadcn/ui components used without heavy customization
- NO generic hero with centered text + two buttons + gradient bg
- NO cookie-cutter testimonial carousels

### ✅ DESIGN DIRECTION: "Calm Command Center"
Inspired by: Linear's darkness + Notion's warmth + Stripe's precision
Feeling: Like opening a well-organized cockpit at 6am with a coffee.

### Colors
```css
--bg-primary: #0C0F17;        /* Deep navy-black, NOT pure black */
--bg-secondary: #141824;      /* Slightly lighter for cards */
--bg-tertiary: #1C2033;       /* Hover states, active items */
--surface: #232840;           /* Elevated elements */
--border: #2A3050;            /* Subtle borders, not gray */
--text-primary: #E8ECF4;      /* Off-white, NOT pure white */
--text-secondary: #8B95B0;    /* Muted text */
--text-tertiary: #5A6480;     /* Placeholder, disabled */
--accent: #4F8BFF;            /* Blue accent — used SPARINGLY */
--accent-hover: #6BA0FF;
--success: #34D399;           /* Emerald for positive */
--warning: #FBBF24;           /* Amber for attention */
--danger: #F87171;            /* Red for critical */
```

LIGHT MODE (toggle available):
```css
--bg-primary: #FAFBFD;        /* NOT pure white */
--bg-secondary: #FFFFFF;
--surface: #F0F2F7;
--border: #E2E6EF;
--text-primary: #1A1D2B;
--text-secondary: #5E6478;
--accent: #3366FF;
```

### Typography
```css
/* Display/Headings: DM Sans — geometric but warm, NOT Inter */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

/* Body: Source Sans 3 — highly readable, slightly more character than Inter */
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600&display=swap');

/* Mono (code/data): JetBrains Mono — for SOP step numbers, stats */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

--font-display: 'DM Sans', sans-serif;
--font-body: 'Source Sans 3', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### Layout Principles
- Sidebar: 240px fixed, dark, with subtle border-right
- Content max-width: 1080px (NOT full-width stretched)
- Cards: NOT all the same size. Mix full-width, half-width, and compact
- Spacing VARIES: sections have different vertical padding (64px, 96px, 128px)
- Landing page: asymmetric layout. Hero text left-aligned, NOT centered
- Use real product screenshots, NOT mockups

### Component Style
- Border radius: 6px (rounded-md) — NOT overly rounded
- Borders: 1px solid var(--border) — subtle, present
- Shadows: NONE on most elements. Use border instead. Shadow only for modals/dropdowns
- Buttons: solid fill for primary, ghost/outline for secondary. NO gradient buttons
- Hover states: background color shift, NOT scale transform
- Cards: border + subtle bg change, NOT floating shadow cards

### Micro-interactions (subtle, not flashy)
- Page transitions: content fades in 200ms, staggered by 50ms per element
- Sidebar active item: left border accent, NOT bg highlight
- Buttons: 150ms ease color transition
- NO bouncing, NO spinning, NO particle effects
- Data loading: subtle skeleton shimmer, NOT spinning loader

### Landing Page Specific
- Hero: Left-aligned headline on dark bg. Real product screenshot on right (or below on mobile)
- Headline font: 48-56px DM Sans 700, letter-spacing: -0.02em (tight)
- Sub-headline: 18-20px Source Sans 3 400, text-secondary color
- CTA: Single primary button. NOT two buttons side by side
- Features: Alternate layout (text-left/image-right, then flip). NOT 3 identical cards
- Pricing: Clean table with subtle highlight on recommended plan
- Social proof: Small logos or one strong quote. NOT a carousel
- Footer: Minimal. Links + copyright. NOT a mega footer

### Dashboard Specific
- Greeting: "{name}님, 좋은 아침이에요" in text-primary, 24px
- Stat cards: Use mono font for numbers, different card sizes
- Activity feed: compact list with relative timestamps, NOT cards
- AI insights: subtle amber/blue left-border accent, NOT a flashy banner

## Key Conventions

- All components use TypeScript
- Use server components by default, client components only when needed
- API routes in /app/api/ using Route Handlers
- Supabase client: use createServerClient for server, createBrowserClient for client
- Error handling: try-catch with proper error responses
- All text content in English (i18n support later)
- Mobile-responsive from day 1
