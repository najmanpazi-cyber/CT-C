# ClaimVex — Agent Handoff Document

**Created:** 2026-04-01
**Purpose:** Complete context for a new Claude Code agent picking up this project on a new machine.

---

## What Is ClaimVex

ClaimVex is an AI-powered CPT coding validation engine for orthopedic practices. Medical coders enter CPT codes, modifiers, and date of service into a structured form and get instant pass/fail results from 5 validator modules. The tool catches coding errors before claims are submitted — reducing denials and revenue leakage.

**Business model:** 30-day free trial → $99/month. Beta targeting 3-5 orthopedic practices.
**Live URL:** https://claimvex.com
**Repo:** https://github.com/najmanpazi-cyber/Claimvex

---

## Who Is the User (Pazi)

- Non-technical co-founder/CTO — does not write code directly
- Uses Claude Code as primary development tool
- Prefers autonomous execution: "just do it" without asking for confirmation on technical decisions
- Only ask when there's genuine ambiguity about product decisions
- Concise, direct communication — no filler, no preamble
- Manages multiple SaaS projects with AI assistance

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions, RLS) |
| Package Manager | **Bun** (NOT npm) |
| Deployment | Vercel (auto-deploys from `main` branch) |
| Test Runner | `bun test src/` (NOT `bun run test` — Vitest broken on Bun + Windows) |
| Dev Server | `bun run dev` (port 8080) |
| Type Check | `bunx tsc --noEmit` |
| DB CLI | `bunx supabase` (installed as dev dependency) |

---

## Current Health (as of 2026-04-01)

- **Tests:** 112 pass, 0 fail, 497 assertions across 9 files
- **TypeScript:** 0 errors
- **Build:** Clean, 486KB core bundle
- **All commits pushed to GitHub**

---

## Desktop Setup Instructions

```bash
# 1. Clone the repo
git clone https://github.com/najmanpazi-cyber/Claimvex.git
cd Claimvex

# 2. Install dependencies
bun install

# 3. Create .env file (not in git — was removed for security)
# Get the values from Vercel Dashboard → claimvex1 → Settings → Environment Variables
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="<from Vercel dashboard>"
VITE_SUPABASE_PUBLISHABLE_KEY="<from Vercel dashboard — the VITE_SUPABASE_PUBLISHABLE_KEY value>"
VITE_SUPABASE_URL="<from Vercel dashboard — the VITE_SUPABASE_URL value>"
EOF

# 4. Link Supabase CLI (requires login first)
bunx supabase login --token YOUR_TOKEN_HERE
bunx supabase link --project-ref urepnoafzsvrzaemzqgs

# 5. Verify everything works
bun test src/
bunx tsc --noEmit
bun run dev
```

**Important:** Generate a new Supabase access token at https://supabase.com/dashboard/account/tokens for the desktop machine. The old token from the laptop should be rotated.

---

## Architecture Overview

### 5 Validator Modules (all client-side, deterministic)

| Module | ACC Spec | Rules | Action Types |
|--------|----------|-------|-------------|
| PTP Pair Check | ACC-04 | R-3.1.1 to R-3.1.4 | block |
| MUE Limit Check | ACC-05 | R-3.2.1, R-3.2.2 | block, warn |
| Modifier 59/X | ACC-06 | R-3.3.1 to R-3.3.3 | force-review, block, warn |
| Global Period | ACC-07 | R-3.4.1 to R-3.4.4 | block, force-review |
| Documentation | ACC-08 | R-3.5.1 to R-3.5.5 | block, warn |

### Data Flow

```
ValidationForm → validationService.ts → [5 validators] → ValidationResults
                                    ↓
                              historyService.ts → Supabase (validations table)
```

### File Layout (load-bearing — do not restructure)

```
src/data/{domain}/         → Rule data (JSON)
src/validators/            → Validator logic
src/utils/apply*           → Validation executor
src/test/validators/       → Test suites
docs/ACC-{NN}-*.md         → Implementation documentation
```

### Routes

| Route | Page | Auth Required |
|-------|------|--------------|
| `/` | Landing | No |
| `/login` | Login | No |
| `/signup` | Signup | No |
| `/dashboard` | Validation form + results | Yes |
| `/history` | Validation history + metrics | Yes |
| `/why` | Competitive comparison | No |
| `*` | 404 | No |

### Supabase Tables (project: urepnoafzsvrzaemzqgs)

| Table | RLS | Purpose |
|-------|-----|---------|
| `validations` | Per-user | Stores validation input + results |
| `user_profiles` | Per-user | Trial tracking (trial_start, plan) |
| `coding_feedback` | Insert-only | Legacy feedback collection |

---

## What Was Built (Complete)

### 5-Phase Build Plan — ALL COMPLETE

1. **Authentication** — Supabase Auth, email+password, protected routes
2. **Validation Form** — 7-field form with client-side validation
3. **Wire Validators + Results** — Service layer + per-module pass/fail cards
4. **History + Metrics** — Supabase storage, ROI dashboard ($35/denial)
5. **Trial Management** — 30-day trial, banner from day 21, soft gate after day 30

### Optimization Features Shipped

- Copy-to-clipboard on validation results
- 3-step guided onboarding walkthrough
- Usage-based retention nudges (inactivity + milestones)
- Subspecialty selection on signup
- Coding accuracy score on /history
- "Why ClaimVex" competitive comparison page at /why
- ROI export report (print-friendly HTML)
- Code splitting (React.lazy) — 667KB → 486KB bundle

### Recent UX Improvements (this session, March 2026)

| Commit | Change |
|--------|--------|
| `33c6109` | Auto-expand FAIL/WARNING modules in results |
| `263dfa3` | Display CMS rule source references (policy_anchor) |
| `5a936ec` | Support space/newline-separated CPT code paste |
| `4f61372` | Sample data panel accessible to all users (not just first-time) |
| `71526ec` | Remember last-used payer type and laterality via localStorage |
| `d61b9e8` | Fix CPT codes column wrapping in history table |
| `09391dd` | Rename "Error Rate" to "Claims with Issues" + add context subtitle |
| `0401ce1` | Fix claims-with-issues percentage calculation |

### Infrastructure Fixes (this session)

| Commit | Change |
|--------|--------|
| `547f96e` | ACC-10 fix: R-3.4.2 boolean gate + sync DB types with Supabase CLI |
| `60ef3c0` | Pre-launch cleanup: deleted 20+ legacy files, removed Lovable branding, added per-page titles |
| `ae306e5` | Added vercel.json for SPA routing |
| `36ff485` | Switched .env to correct Supabase project (urepnoafzsvrzaemzqgs) |
| `1bbf6de` | Removed .env from git tracking |

---

## What Is Still Open

### Must Do

1. **Stripe billing integration** — No way to charge $99/mo yet. Pazi said he'd set this up himself.
2. **Verify Vercel deployment is stable** — There were intermittent 404s caused by Lovable pushing conflicting commits. Lovable needs to be disconnected from this repo.
3. **Run subspecialty migration on DB** — The columns may not exist on the live DB yet. Run in Supabase SQL Editor:
   ```sql
   ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subspecialty text DEFAULT 'general_ortho';
   ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS total_validations integer DEFAULT 0;
   ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS clean_validations integer DEFAULT 0;
   ```

### Trial Testing (partially complete)

- Test 1 (fresh signup badge) — PASSED
- Test 2 (banner at day 21) — PASSED
- Test 3 (expired gate at day 31) — instructions given, user didn't confirm
- Test 4 (paid plan bypass) — not tested yet
- Test 5 (reset to normal) — not done yet

To resume: set `trial_start` and `plan` in Supabase `user_profiles` table as described in the trial testing section of the conversation.

### Deferred (explicitly postponed by Pazi)

- Email drip sequence (needs email provider: Resend or Postmark)
- CSV/batch upload — post-beta
- Trial email notifications — post-beta
- Error monitoring (Sentry was added then reverted — Pazi decided it's premature for beta)

### UX Research Audit

A comprehensive UX audit document exists at `ClaimVex_UX_Research_Audit.md` in the project root. Key P0 items have been addressed. Remaining recommendations:

- **P1-1:** Per-validation PDF export
- **P1-2:** ROI report redesign as "screenshot for the manager"
- **P1-3:** Keyboard shortcuts for power users
- **P1-5:** Saved validation templates
- **P1-6:** Weekly validation summary email

---

## Known Issues

- `bun run test` (Vitest direct) fails on Bun + Windows. Use `bun test src/` instead.
- Lovable (the original scaffolding tool) was pushing commits to the same repo, causing conflicts. Some Lovable commits reverted our changes (re-added deleted files, modified types.ts). **Lovable should be disconnected from this repo.**
- The GitHub repo was renamed from `CT-C` to `Claimvex`. The local remote URL has been updated.

---

## Tooling Installed

| Tool | How to Run | Purpose |
|------|-----------|---------|
| Supabase CLI | `bunx supabase` | Migrations, type gen, DB management |
| GSD (Get Shit Done) | `/gsd:help` (slash command) | Meta-prompting system for structured development |
| CI/CD | `.github/workflows/ci.yml` | Typecheck + lint + test + build on push/PR |

---

## Key Files to Read First

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude Code agents |
| `CLAIMVEX_BUILD_PLAN.md` | Full 5-phase build plan |
| `ClaimVex_UX_Research_Audit.md` | UX audit with prioritized recommendations |
| `src/services/validationService.ts` | Core orchestration — how form data flows through validators |
| `src/services/trialService.ts` | Trial management logic |
| `src/components/ValidationForm.tsx` | The main input form |
| `src/components/ValidationResults.tsx` | Results display with expandable cards |

---

## Vercel Environment Variables

These must be set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Copy from Vercel Dashboard → Settings → Environment Variables |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Copy from Vercel Dashboard → Settings → Environment Variables |

---

## Git Conventions

- **Conventional commits:** `feat(ACC-09): description`, `fix(PTP): description`, `ux: description`
- **Atomic commits:** Each commit is a single logical change
- **Never auto-commit** — only commit when Pazi explicitly asks
- **Never force push to main**
