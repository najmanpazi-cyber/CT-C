# ClaimVex — Agent Handoff Document

**Last Updated:** 2026-04-10
**Purpose:** Complete context for a new Claude Code agent picking up this project on a new machine.

---

## 1. CURRENT STATUS

### Product: Fully Built & Live
ClaimVex is **live at https://claimvex.com**, deployed via Vercel from `main` branch. All 5 build phases are complete:
1. Authentication (Supabase Auth, email+password, protected routes)
2. Validation Form (7-field structured input)
3. Wire Validators + Results (5 CMS rule modules, pass/fail/warning cards)
4. History + Metrics (Supabase storage, ROI dashboard, $35/denial estimate)
5. Trial Management (30-day trial, banner from day 21, soft gate after day 30)

### Tests & Build Health
- **Tests:** 112 pass, 0 fail, 497 assertions across 9 files
- **TypeScript:** 0 errors
- **Lint:** 0 errors (9 pre-existing shadcn/ui warnings)
- **Build:** Clean, ~486KB core bundle with code splitting

### Operations Tooling: Built & Deployed
The `/ops` folder contains 5 Python scripts for prospect management, outreach drafting, site monitoring, competitor tracking, and weekly reporting. Lu (OpenClaw agent) runs these on a separate machine.

### What's NOT Done Yet
- **Stripe billing** ($99/mo) — Pazi will set up, not urgent until first conversion
- **Per-validation PDF export** — P1-1 from UX research, next dev priority
- **Branded email** (pazi@claimvex.com) — separate from this repo

---

## 2. THIS SESSION'S WORK (Apr 1–10, 2026)

### Landing Page Redesign
| Commit | Change |
|--------|--------|
| `954894a` | Full landing page rewrite from Stitch design — hero, trust bar, problem section, 3-step how-it-works, 5 modules, ROI mockup, pricing card, comparison table, FAQ accordions, footer |
| `847275d` | Added prerenderer for SEO (Puppeteer at build time) |
| `b6cd3d0` | Removed prerenderer — incompatible with Vercel build servers |

### SEO & Brand Assets
| Commit | Change |
|--------|--------|
| `4e95918` | Added sitemap.xml and updated robots.txt with sitemap reference |
| `5776dc5` | Fixed vercel.json rewrite to exclude static files (sitemap, robots, favicons) |
| `d4719a1` | Integrated brand assets — logo PNG, favicon SVG/ICO/192px, OG meta tags |
| `a859605` | White logo for dark navbar background, added favicon-512.png |

### Security Hardening (from full audit)
| Commit | Change |
|--------|--------|
| `da81981` | 5 security fixes: CORS restricted to claimvex.com, security headers (CSP/HSTS/X-Frame-Options), log sanitization (no response bodies in console.error), save error handling with toast, ROI export XSS fix (escapeHtml) |

### Operations Tooling
| Commit | Change |
|--------|--------|
| `14f0e62` | Built entire /ops folder — 5 scripts, 3 configs, 1 template, README |
| `e96223d` | CI lint fix (const vs let in Landing.tsx) |
| `570bf3f` | Removed --config file flag from site_monitor, --config-dir only for consistency |

---

## 3. THE /OPS FOLDER

Operations tooling built by Claude Code, delivered to Lu by Pazi. Lu runs them locally at `~/.openclaw/claimvex/`.

```
ops/
├── scripts/
│   ├── prospect_manager.py   — CRUD for prospect database (init, list, show, update, score, log-send)
│   ├── draft_generator.py    — personalized outreach emails from template + prospect data
│   ├── site_monitor.py       — HTTP health check (200 + content verify), silent on success
│   ├── competitor_check.py   — SHA-256 hash comparison for competitor page changes
│   └── weekly_report.py      — compiled report from all local data sources
├── templates/
│   └── outreach_email_v1.md  — email template with {contact_name} fallback handling
├── config/
│   ├── prospects_seed.json   — 10 FL ortho prospects (5 billing cos, 5 practices)
│   ├── competitors.json      — Optum360, AAPC, EncoderPro URLs
│   └── monitor_config.json   — claimvex.com health check config
└── README.md
```

**All scripts:** Python 3 stdlib only (no pip dependencies). `--data-dir`, `--config-dir`, `--template-dir` flags for path overrides. Default base: `~/.openclaw/claimvex/`.

**Do NOT:** Add /ops to the JS test suite, add Python dependencies to package.json, or modify /ops scripts without testing with Python 3.

---

## 4. THREE-LAYER OPERATING MODEL

No ClaimVex_Operating_Model.md file exists — here's the working model:

| Role | Agent | Does | Does NOT |
|------|-------|------|----------|
| **Strategy & Product** | Claude (via Pazi) | Product decisions, prioritization, messaging, positioning | Write code, run scripts |
| **Engineering** | Claude Code (you) | Build features, write/test code, security, CI/CD, build ops tooling | Make product decisions, run ops scripts in production |
| **Execution & Ops** | Lu (OpenClaw) | Run ops scripts, research prospects, draft outreach, monitor site | Write or debug code — routes bugs to Pazi → Claude Code |
| **Decisions** | Pazi | Approves outreach, reviews drafts, makes business calls | Write code, run scripts directly |

**Key constraint:** Lu runs on per-token billing. Claude Code runs on a Max account. So Claude Code builds ALL tooling; Lu only executes it.

**Workflow:** Claude Code builds scripts → Pazi downloads and delivers to Lu → Lu runs them → If bugs found, Lu reports to Pazi → Pazi routes to Claude Code for fix.

---

## 5. OUTSTANDING TASKS

### Next Priority
1. **Per-validation PDF export** (P1-1 from UX research) — highest-conversion feature. Generate a clean PDF of validation results that billing managers can attach to claims or share with providers.

### When Needed
2. **Stripe integration** ($99/month checkout + webhooks + server-side trial gate) — implement when first trial user approaches conversion. Pazi said he'd handle initial Stripe account setup.

### Minor Fixes (non-blocking)
3. **weekly_report.py logic** — reports "10 prospects still need research" when 1 is already scored/sent. The `researching` status count doesn't account for scored prospects that haven't been moved to `draft_ready`. Fix: count only prospects with status=`researching` (already correct) but verify the seed data statuses are being updated properly by Lu.
4. **competitor_check.py SSL** — Optum360's site (`www.optum360coding.com`) returns SSL cert mismatch. Their cert issue, not ours. Script handles it gracefully (logs warning, continues). No action needed unless it persists.

### Deferred (post-beta)
- Email drip sequence (needs Resend or Postmark)
- CSV/batch upload
- Trial email notifications
- Error monitoring (Sentry — decided premature for beta)
- P1-3: Keyboard shortcuts for power users
- P1-5: Saved validation templates
- P1-6: Weekly validation summary email

---

## 6. LU'S CURRENT STATE

- **Setup:** Complete. Scripts installed at `~/.openclaw/claimvex/scripts/`
- **Phase:** Phase 1 execution active
- **Current work:** Researching Tier 1 prospects (billing companies first, then practices)
- **Data:** prospects.json initialized from seed, outreach_log.json tracking sends
- **Config:** Using default paths at `~/.openclaw/claimvex/`

---

## 7. KEY FILE LOCATIONS

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project instructions for Claude Code agents — coding standards, architecture, commands |
| `HANDOFF.md` | This file — full context for session resume |
| `CLAIMVEX_BUILD_PLAN.md` | Original 5-phase build plan (all phases complete) |
| `ClaimVex_UX_Research_Audit.md` | UX audit with prioritized recommendations |
| `ops/` | Operations tooling folder (scripts, configs, templates) |
| `ops/README.md` | Ops tooling documentation |
| `src/services/validationService.ts` | Core validation orchestration |
| `src/pages/Landing.tsx` | Landing page (new Stitch design) |
| `src/pages/Dashboard.tsx` | Main validation form + results |
| `supabase/functions/generate-codes/index.ts` | Claude API edge function (CORS-restricted) |
| `vercel.json` | Vercel config — SPA rewrites + security headers |

---

## 8. WHAT TO DO AT SESSION START

```bash
# 1. Pull latest
git pull

# 2. Read context files
# Read HANDOFF.md (this file) and CLAUDE.md before doing anything

# 3. Verify health
bun test src/        # Should be 112 pass, 0 fail
bunx tsc --noEmit    # Should be 0 errors
bun run lint         # Should be 0 errors (warnings OK)
bun run build        # Should succeed

# 4. Check for any issues
git log --oneline -5  # See recent commits
git status            # Check for uncommitted work
```

**Important:** Do NOT make changes until you've read both HANDOFF.md and CLAUDE.md. The project has specific conventions (ACC spec structure, HIPAA guards, functional style) that must be followed.

---

## 9. ENVIRONMENT SETUP (if on a new machine)

```bash
# Clone and install
git clone https://github.com/najmanpazi-cyber/Claimvex.git
cd Claimvex
bun install

# Create .env (values from Vercel Dashboard → claimvex1 → Settings → Environment Variables)
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="<from Vercel dashboard>"
VITE_SUPABASE_PUBLISHABLE_KEY="<from Vercel dashboard>"
VITE_SUPABASE_URL="<from Vercel dashboard>"
EOF

# Verify
bun test src/
bunx tsc --noEmit
bun run dev
```

---

## 10. GIT CONVENTIONS

- **Conventional commits:** `feat(ACC-09): description`, `fix(PTP): description`, `ux: description`
- **Atomic commits:** Each commit is a single logical change
- **Never auto-commit** — only commit when Pazi explicitly asks
- **Never force push to main**

---

## 11. WHO IS PAZI

- Non-technical co-founder/CTO — does not write code
- Uses Claude Code as primary development tool
- Prefers autonomous execution: just do it, don't ask for confirmation on technical decisions
- Only ask when there's genuine ambiguity about product decisions
- Concise, direct communication — no filler
