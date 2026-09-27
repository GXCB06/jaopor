---
name: ui-component
description: Build or restyle an MRRMafia UI component or page section strictly from Design.md (TrustMRR-style dark, monospace, data-dense design system), wire its strings through next-intl, and visually verify it in the browser pane at desktop and 375px. Use this for any UI work in MRRMafia — StartupCard, LeaderboardTable, StatTile, RevenueChart, SponsorCard, ForSaleBanner, hero, filters, dashboards, new pages — even when the user just says "make the homepage", "add a card", "fix the layout", or "make it look like TrustMRR".
---

# ui-component

MRRMafia matches TrustMRR's look: dark neutral background, Inconsolata monospace, small uppercase labels over big `tabular-nums` numbers, thin borders, no shadows. It uses its own brand (crimson `--brand`) and never TrustMRR's logo or copy. Consistency comes from building everything out of the same tokens and component specs, so Design.md is the contract. If the design needs to change, change Design.md first, then the code.

## Steps

1. **Read the spec.** Open `Design.md` and find the component (§5) or page template (§6). Note the exact classes, metric-label style, states (§7) and responsive rules (§8). If the component isn't specified:
   - Draft its spec in Design.md §5 using existing tokens and patterns.
   - Tell the user you added it.
   - Then build it.

2. **Reuse before creating.**
   - Check `src/components/` and `src/components/ui/` (shadcn) for existing pieces.
   - Add missing shadcn primitives with `npx shadcn@latest add <name>` rather than hand-writing them.
   - Use `cn()` from `@/lib/utils`.

3. **Build it.**
   - Put it in `src/components/<Name>.tsx`. It's a Server Component unless it needs interactivity; then use a small `"use client"` leaf.
   - Tokens only: `bg-background`, `text-muted-foreground`, `border`, `bg-brand`, … No raw hex, no arbitrary colors except those Design.md lists (amber FOR SALE, emerald/red growth).
   - Every number gets `tabular-nums`. Money is compact on cards (`$4.3k`) and full on profile pages. Keep a shared formatter in `src/lib/format.ts` (create it the first time it's needed).
   - **All user-facing text goes through next-intl.** Add keys to both `messages/th.json` and `messages/en.json` under a namespace named after the component. Write real Thai, not a copy of the English. Use `Link` from `@/i18n/navigation`.
   - Empty, loading and error states per Design.md §7.

4. **Check it visually** with the browser pane:
   - Start the dev server with `preview_start` using the name `"web"` (from `.claude/launch.json`), then open `/th` and `/en`.
   - Screenshot at desktop width. Use `resize_window` with preset `"mobile"` (375px) and screenshot again. Reset with preset `"desktop"` afterwards.
   - Check the §10 do/don'ts: no horizontal scroll at 375px, Thai text doesn't clip, numbers align, only one accent colour in view.
   - Fix what's off and re-check.

5. **Done means:** `npm run typecheck && npm run lint` pass, and both locales render. Then run `/log-progress`, and in the PROGRESS entry say how it was checked (which pages and widths).
