---
name: log-progress
description: Record completed work in JaoPor's project log — adds a dated entry to PROGRESS.md and ticks the matching roadmap checkbox / parity-matrix status in Project.md (plus decisions and open items). Use this whenever a task, feature, fix, migration, or harness change is finished, when the progress-gate Stop hook asks for a log entry, or when the user says "log this", "update progress", "mark it done", or "what did we finish".
---

# log-progress

JaoPor's rule: every completed piece of work is written down in two places, so the next session (and the user) can see exactly where the project stands. PROGRESS.md is the chronological "what happened" log; Project.md is the "what's the state" map. The SessionStart hook reads both, so keeping them accurate is what gives future sessions memory.

## Steps

1. **Work out what was completed.** Run `git status --porcelain` and `git diff --stat` (plus `git log -5 --oneline` if things were committed), and recall the conversation. Group the changes into one task, or a few if they are genuinely separate. Don't log half-finished work as done. If something is partial, say so under **Next**.

2. **Add the PROGRESS.md entry at the top**, directly under the header block and above the previous newest `## ` entry:

   ```markdown
   ## YYYY-MM-DD — <short task title>

   **Done:**

   - <what changed, user-visible outcome first — 1–4 bullets>

   **Files:** `path/one`, `path/two` (key files only, not every file)
   **Verified:** <exact commands/tests/browser checks and their result, e.g. `npm run typecheck` ✓, checked /th at 375px>
   **Next:** <the immediate follow-up>
   ```

   Use today's date. **Verified** has to be honest: if nothing was run, write "not verified — <why>". A made-up check here is worse than none.

3. **Update Project.md:**
   - §4 Roadmap: change `- [ ]` → `- [x]` for completed items. If the item isn't listed, add it under the right phase.
   - §3 Parity matrix: change status to ☑ (done) or ◐ (in progress) for affected rows.
   - §6 Decisions log: add a row for any non-obvious choice (library, schema shape, trade-off), with the _why_.
   - §7 Open items: add new unknowns or blockers; tick resolved ones.

4. **Check it**: re-read both diffs. The newest PROGRESS entry is first, the checkboxes match reality, and the markdown tables are still aligned (the quality hook runs prettier on .md files).

## Example

After shipping the Stripe connector:

```markdown
## 2026-10-03 — Stripe restricted-key connector

**Done:**

- `StripeProvider` implements `RevenueProvider`; rejects non-restricted keys
- Keys encrypted with AES-GCM before insert into `provider_connections`

**Files:** `src/lib/providers/stripe.ts`, `src/lib/crypto.ts`, `supabase/migrations/20261003_provider_connections.sql`
**Verified:** `npx vitest run providers` ✓ (6 tests, Stripe test-mode key); `npm run typecheck` ✓
**Next:** metrics engine (MRR from subscriptions)
```

Then in Project.md: tick "`RevenueProvider` + Stripe connector + encrypted key storage" and set the "Stripe restricted-key connector" matrix row to ☑.
