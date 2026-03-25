# ClaimVex

AI-powered CPT coding validation engine for orthopedic practices. Catches bundling errors, modifier issues, MUE violations, and global period conflicts before claims are submitted.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions)
- **Package Manager:** Bun

## Getting Started

```bash
bun install
bun run dev        # Start dev server on port 8080
bun test src/      # Run tests
bunx tsc --noEmit  # Type check
```

## Validation Modules

1. **PTP Pair Check** — NCCI Procedure-to-Procedure bundling edits
2. **MUE Limit Check** — Medically Unlikely Edits unit limits
3. **Modifier 59/X** — Distinct procedural service modifier validation
4. **Global Period** — Surgical global period conflict detection
5. **Documentation Sufficiency** — Clinical documentation requirement checks
