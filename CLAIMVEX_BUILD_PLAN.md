# ClaimVex — Build Plan for Claude Code

**Last updated:** March 19, 2026
**Owner:** Pazi
**Repo:** `najmanpazi-cyber/CT-C` (GitHub)
**Live site:** claimvex.com (Vercel)
**Stack:** TypeScript (98.9%), React + Vite + Tailwind CSS + shadcn/ui, Supabase, Bun/npm

---

## Context for Claude Code

You are helping build ClaimVex — an AI-powered CPT medical coding validation engine that catches coding errors before claims are submitted. The validation engine (7 modules, 109 test cases) is already built and committed. What's missing is the **user-facing web application** that lets coders interact with the validators through a browser.

### What exists today

- **Validation engine:** 7 approved validator modules (ACC-01 through ACC-07) covering PTP pairs, MUE limits, Modifier 59/X, and Global Period conflicts. All TypeScript, all tested.
- **Hardening:** ACC-09 red team analysis completed. ACC-14/15 hardening pass committed. 42 total commits.
- **CI/CD:** GitHub Actions pipeline with HIPAA guard hook.
- **Frontend scaffold:** React + Vite + Tailwind + shadcn/ui exists in the repo.
- **Supabase:** Configured (folder exists in repo). Not yet wired to auth or data storage.
- **Vercel:** Project deployed, claimvex.com is live. DNS configured.
- **Landing page:** Being redesigned separately. Will be deployed independently.

### What needs to be built

A logged-in web app where a coder can:
1. Sign up and log in
2. Enter CPT codes, modifiers, date of service, and optional diagnosis/age info into a form
3. Click "Validate" and get pass/fail results from all 7 validators with explanations
4. See a history of past validations with summary metrics

### Who uses this

Orthopedic practice billing staff and medical coders. Non-technical users. The interface must be clean, simple, and self-explanatory.

### Business context

This is a beta product launching to 3–5 orthopedic practices via a free 30-day trial. The primary goal of beta is to collect ROI proof (how many errors caught, estimated denial cost avoided) to build case studies. After 30 days, users convert to $99/month. Usage metrics tracking is critical because those numbers are what we use to convince users to pay.

---

## Build Phases

Complete these in order. Each phase should be a working, deployable state — don't leave things half-built between sessions.

---

### Phase 1: Authentication

**Goal:** Users can sign up, log in, log out, and access a protected dashboard route.

**Implementation:**
- Use **Supabase Auth** (already configured in the repo)
- Email + password authentication only (no SSO, no OAuth for beta)
- Create these routes/pages:
  - `/login` — email + password form, link to sign up
  - `/signup` — email + password + confirm password, link to log in
  - `/dashboard` — protected route, redirects to `/login` if not authenticated
- Use Supabase client library for auth operations
- Store the Supabase URL and anon key in environment variables (`.env.local` for dev, Vercel env vars for prod)
- Add a simple top nav bar to the dashboard with: ClaimVex logo/wordmark (left), user email (right), logout button (right)
- Style everything with Tailwind + shadcn/ui components consistent with the existing design system
- Color palette: dark navy (#004A7C) and teal (#00796B) — healthcare appropriate

**Verification:**
- [ ] Can sign up with email + password
- [ ] Can log in with those credentials
- [ ] Dashboard is only accessible when logged in
- [ ] Unauthenticated users are redirected to /login
- [ ] Logout works and redirects to /login
- [ ] Deploy to Vercel and confirm it works in production

---

### Phase 2: Validation Input Form

**Goal:** Logged-in users can enter claim data and submit it for validation.

**Implementation:**
- Add a validation form to the dashboard (this is the primary feature — make it prominent)
- Form fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| CPT Code(s) | Text input | Yes | Accept one or multiple codes, comma-separated. Validate format: 5-digit numeric. |
| Modifier(s) | Text input | No | Accept standard 2-character modifiers (e.g., 59, XE, XS, XP, XU, 25, 26, TC, LT, RT). Comma-separated if multiple. |
| Date of Service | Date picker | Yes | Used for global period conflict checking. |
| ICD-10 Diagnosis Code | Text input | No | Optional. Format: letter + digits + optional decimal (e.g., M17.11). |
| Patient Age | Number input | No | Optional. Integer, 0–120. |

- "Validate" button submits the form
- Client-side validation before submission:
  - CPT codes must be 5-digit numbers
  - Modifiers must be valid 2-character codes
  - Date of service must not be in the future
  - Show inline error messages for invalid inputs
- On submit, pass the structured data to the validation engine (see Phase 3 for wiring)
- Include a "Clear" button to reset the form
- Design: clean card-based layout. The form should feel simple — not intimidating. A billing coder should look at it and immediately know what to do.

**Verification:**
- [ ] Form renders on dashboard with all fields
- [ ] Client-side validation catches bad inputs with clear error messages
- [ ] Multiple CPT codes can be entered comma-separated
- [ ] Form submits successfully (even if validation engine isn't wired yet — just log the payload to console in this phase)

---

### Phase 3: Wire Form to Validation Engine + Results Display

**Goal:** When the user clicks "Validate," the input is run through all 7 validator modules and results are displayed clearly.

**Implementation:**

**Wiring the validators:**
- The validation engine modules are in the repo (check `specs/` and the validator source files)
- Create a service layer / API route that:
  1. Accepts structured input from the form (CPT codes, modifiers, DOS, optional dx code, optional age)
  2. Transforms the input into the format each validator expects (reference the ACC-04.1 input adapter patch for format guidance)
  3. Runs the input through each of the 7 validators:
     - ACC-01: Core accuracy specification
     - ACC-03: Schema and semantic validators
     - ACC-04: PTP (Procedure-to-Procedure) pair validator
     - ACC-05: MUE (Medically Unlikely Edit) validator
     - ACC-06: Modifier 59/X validator
     - ACC-07: Global period validator
  4. Collects results from each validator into a unified response object
  5. Returns structured JSON with per-validator results

**Results display:**
- After validation completes, show a results panel/page below or replacing the form
- For each validator module, show:
  - Module name (e.g., "PTP Pair Check," "MUE Limit Check")
  - Status: PASS (green), FAIL (red), WARNING (amber), NOT APPLICABLE (gray)
  - If FAIL or WARNING: explanation text describing what was found and what to do about it
- Show an overall summary at the top:
  - Total checks run
  - Passes / Fails / Warnings count
  - Overall status (all pass = "Clean" with green indicator, any fail = "Issues Found" with red indicator)
- Include a "Validate Another" button that returns to the form (cleared)
- Include a "View Details" expand/collapse for each validator result for users who want more information

**Design guidance:**
- Use color-coded cards or badges for status (shadcn Badge component works well)
- Green (#00796B) for pass, Red (#C62828) for fail, Amber (#E65100) for warning, Gray for N/A
- Results should feel like a report card — scannable at a glance, detailed on demand
- Make it print-friendly if possible (coders may want to print results for documentation)

**Verification:**
- [ ] Enter known good claim data → all validators return PASS
- [ ] Enter known bad data (bundled codes, wrong modifier, MUE violation, global period conflict) → validators correctly flag each issue
- [ ] Results display is clear and readable
- [ ] Each validator result shows explanation text on failure
- [ ] "Validate Another" returns to a clean form
- [ ] Test with the following error-laden ortho scenario:
  - CPT 29881 + 29880 (bundled arthroscopy codes) with no modifier → should flag PTP
  - CPT 20610 × 5 units → should flag MUE
  - Modifier 59 where XS would be more specific → should flag modifier
  - CPT 27447 (knee replacement) + CPT 99213 within 10 days → should flag global period

---

### Phase 4: Validation History + Usage Metrics

**Goal:** Users can see their past validations and aggregate metrics. This data is critical for proving ROI during the beta trial.

**Implementation:**

**Storing validations:**
- After each validation is run, store the results in Supabase:
  - Table: `validations`
  - Columns: `id` (uuid), `user_id` (references auth.users), `input_data` (jsonb — the CPT codes, modifiers, etc.), `results` (jsonb — per-validator results), `overall_status` (text — "clean" or "issues_found"), `errors_found` (integer — count of FAIL results), `warnings_found` (integer — count of WARNING results), `created_at` (timestamp)
- Enable Row Level Security (RLS) on the table so users can only see their own validations

**History page:**
- Add a "History" tab/page in the dashboard navigation
- Show a table of past validations, most recent first:
  - Date/time
  - CPT codes validated
  - Overall status (color-coded badge)
  - Errors found (count)
  - Warnings found (count)
- Click on a row to expand and see full results (same format as the results display)
- Add pagination or infinite scroll if needed (not critical for beta with 3–5 users)

**Metrics dashboard (top of history page or separate section):**
- Show aggregate stats for the logged-in user:
  - Total validations run
  - Total errors caught
  - Total warnings caught
  - Error catch rate (errors / total validations as percentage)
  - Estimated denials prevented (errors caught × 1, since each error could cause a denial)
  - Estimated savings (errors caught × $35 — this is the average rework cost per denial)
- Display these as stat cards at the top of the page
- These numbers are what we show the user during the conversion call to justify $99/month

**Verification:**
- [ ] Validation results are stored in Supabase after each run
- [ ] History page shows past validations for the logged-in user only (RLS working)
- [ ] Clicking a row shows full results
- [ ] Metrics cards show correct aggregate numbers
- [ ] Estimated savings calculation works (errors × $35)
- [ ] A new user with no validations sees an empty state with a CTA to run their first validation

---

### Phase 5: Trial Management (Build before day 25 of first trial)

**Goal:** Track trial status and create urgency for conversion.

**Implementation:**

**Trial tracking:**
- Add a `trial_start` timestamp column to the user record (or a separate `subscriptions` table in Supabase)
- On signup, set `trial_start` to current timestamp
- Calculate trial days remaining: 30 - (now - trial_start) in days

**Trial UI elements:**
- When trial days remaining ≤ 9 (from day 21 onward), show a banner at the top of the dashboard:
  - "Your free trial ends in X days. [Learn about continuing →]"
  - Style: subtle but visible. Amber background, not aggressive red.
- When trial expires (day 31+), show a soft gate:
  - User can still log in and see their history/metrics
  - Validation form is disabled with a message: "Your trial has ended. Contact us to continue using ClaimVex at our founding partner rate."
  - Include a contact link (email or Stripe payment link — Pazi will provide)
- Do NOT hard-lock users out — they need to see their metrics (that's what convinces them to pay)

**Verification:**
- [ ] Trial start date is recorded on signup
- [ ] Banner appears from day 21
- [ ] After day 30, validation form is disabled but history/metrics remain accessible
- [ ] Expired state shows clear CTA to continue

---

## Important Technical Notes

### Environment Variables
Ensure these are set in both `.env.local` and Vercel:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

### Supabase Setup
If tables don't exist yet, create them via Supabase SQL editor or migrations:

```sql
-- Validations table
create table validations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  input_data jsonb not null,
  results jsonb not null,
  overall_status text not null check (overall_status in ('clean', 'issues_found')),
  errors_found integer not null default 0,
  warnings_found integer not null default 0,
  created_at timestamptz default now() not null
);

-- Row Level Security
alter table validations enable row level security;

create policy "Users can view own validations"
  on validations for select
  using (auth.uid() = user_id);

create policy "Users can insert own validations"
  on validations for insert
  with check (auth.uid() = user_id);

-- Trial tracking (add to profiles or create separate table)
create table user_profiles (
  id uuid references auth.users(id) primary key,
  trial_start timestamptz default now() not null,
  plan text default 'trial' check (plan in ('trial', 'founding_partner', 'starter', 'professional', 'business', 'enterprise')),
  created_at timestamptz default now() not null
);

alter table user_profiles enable row level security;

create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);
```

### Deployment
- Push to GitHub `main` branch → Vercel auto-deploys
- Always test locally with `bun dev` or `npm run dev` before pushing
- Verify Vercel deployment after each phase

### Design System
- Primary navy: #004A7C
- Primary teal: #00796B
- Error red: #C62828
- Warning amber: #E65100
- Success green: #2E7D32
- Use shadcn/ui components throughout
- Tailwind for layout and spacing
- Keep it clean, professional, healthcare-appropriate — no playful colors or casual design

### What NOT to touch
- Do not modify the validator modules themselves (ACC-01 through ACC-07) unless you find a bug during integration
- Do not rename the GitHub repo (it's still CT-C, cosmetic rename happens later)
- Do not change the CI/CD pipeline or HIPAA guard hook
- The landing page is being handled separately — focus on the app routes (/login, /signup, /dashboard, /history)

---

## Session Workflow for Pazi

When you start a Claude Code session, paste the relevant Phase section and say:

> "We're working on ClaimVex. Here's what needs to be built in this session: [Phase X]. The repo is najmanpazi-cyber/CT-C. Let's start."

At the end of each session:
1. Commit all changes with a descriptive message (e.g., "feat: add Supabase auth with login/signup/dashboard routes")
2. Push to GitHub
3. Verify the Vercel deployment works
4. Update the CLAUDE.md file in the repo root with what was completed and any notes for the next session

### Recommended session plan

| Session | What to build | Estimated time |
|---------|--------------|----------------|
| Session 1 | Phase 1: Auth system (signup, login, logout, protected routes) | 2–3 hours |
| Session 2 | Phase 2: Validation input form with client-side validation | 2–3 hours |
| Session 3 | Phase 3: Wire validators to form + build results display | 3–4 hours |
| Session 4 | Phase 4: Validation history + metrics dashboard + Supabase storage | 3–4 hours |
| Session 5 | Phase 5: Trial management + final polish + full flow smoke test | 2–3 hours |

Total: 5 sessions, approximately 12–17 hours of focused work.

---

## Test Scenarios for Smoke Testing

Once everything is built, run through these scenarios to verify the full flow:

### Scenario 1: Clean claim (all pass)
- CPT: 99213
- Modifier: 25
- DOS: today's date
- Expected: All validators return PASS

### Scenario 2: PTP bundling violation
- CPT: 29881, 29880
- Modifier: none
- DOS: today's date
- Expected: PTP validator flags bundling conflict

### Scenario 3: MUE violation
- CPT: 20610
- Units/entries: 5 of the same code
- DOS: today's date
- Expected: MUE validator flags exceeding limit

### Scenario 4: Modifier issue
- CPT: 29881, 29880
- Modifier: 59 (should be XS)
- DOS: today's date
- Expected: Modifier validator warns about 59 vs XS specificity

### Scenario 5: Global period conflict
- CPT: 27447 (major surgery, 90-day global)
- Second CPT: 99213 (office visit)
- DOS of 99213: 10 days after 27447
- Expected: Global period validator flags the conflict

### Scenario 6: Multiple simultaneous errors
- Combine scenarios 2 + 3 + 5 in one submission
- Expected: Multiple validators flag different issues in a single results display

---

## After Beta Launch — What Comes Next

These are NOT part of the current build. Do not work on these until beta users are onboarded:

- ACC-08 documentation sufficiency validator (revision needed, 8 gaps identified)
- ACC-10 patch implementation (addresses edge cases from red team)
- ACC-12 orchestrator design (clean_claim_ready semantics — deferred)
- CSV/batch upload for power users
- API access for programmatic validation
- Additional specialty rule sets beyond orthopedics
- Stripe billing integration into the app (using hosted payment link for now)
