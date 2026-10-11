# JaoPor major revamp plan (direction adopted 2026-10-11)

> Written 2026-10-11, three days before the planned Facebook launch (Wed 2026-10-14). **Adopted by the owner the same day** (decisions in §8; build order: R0 → M1 → R2). It builds on [UX_UI_MASTER_AUDIT.md](UX_UI_MASTER_AUDIT.md) (phases A1–C3, decisions of 2026-10-10 in Project.md §6) and does not replace it: §7 shows how the two merge.

## 1. What triggered this

Two pieces of owner feedback, plus an observation:

| #   | Feedback                                                                                                                                                                                              | Source                                                                 | Confidence                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Nobody wants to give MRR or user counts. People arrive and just paste a product link.                                                                                                                 | Owner's observation + a friend ("ทำไมกูต้องเปิดเผยเงินและฐานลูกค้ากู") | **Medium.** Matches what we measured earlier: of 12 Thai products checked, none showed a payment provider and most were free or pre-revenue; builders speak in users, not MRR (`docs/research/fb-showoff-thread-and-metrics.md`). Still a handful of people. |
| F2  | Sites like this are visited mostly by developers. Ordinary people and investors need an easy way in. Some founders won't post because it hurts their brand, e.g. customers react "it's made with AI?" | Friend (business background)                                           | **Low-medium.** One account, second-hand. It is a hypothesis to test, not a finding.                                                                                                                                                                         |
| F3  | Add animation to the product (reference: Aetox landing)                                                                                                                                               | Another friend, a founder                                              | Opinion on UX.                                                                                                                                                                                                                                               |

**Honest reading:** F1 does not say "verification is useless". It says _forced public disclosure_ is the wrong price. The proof ladder (Project.md §1) needs a way to **prove without exposing**, and a reason to verify beyond "show your numbers".

**Gap in our evidence:** we cannot yet see what real visitors do. The first-party add-funnel (`20261011120000_add_funnel_events.sql`) is written but **not applied** (PROGRESS 2026-10-11). Applying it is the cheapest way to turn F1 from an anecdote into data.

## 2. Diagnosis in one paragraph

JaoPor today asks builders for the thing they least want to give (public money/customer numbers) and shows visitors a developer-flavoured catalogue (MRR, verified, Stripe). Result: builders list but don't verify, and non-developers (customers, investors, business owners) have little reason to visit or return. Fix the **price of entry** (privacy-first proof), the **audience** (a visitor-first way in), the **reason to come back** (updates that matter to me), and only then the **polish** (motion).

## 3. Pillars

### P1. Privacy-first proof ("prove it without showing it")

Let the owner choose, **per metric**, how much the public sees. All levels keep the verified stamp and the source.

| Level       | What visitors see                               | Example                  |
| ----------- | ----------------------------------------------- | ------------------------ |
| Exact       | the number                                      | MRR ฿12,400              |
| Band        | a range                                         | MRR ฿10k–25k             |
| Growth only | change, not the amount                          | +18% vs previous 30 days |
| Badge only  | that it is verified, no figure                  | "รายได้ยืนยันแล้ว"       |
| Private     | nothing public (owner still sees the dashboard) | none                     |

Why: it answers F1 directly, keeps verification (trust) while removing the disclosure objection, and gives a _new, safer board_: **fastest growing** (percentage), which people share more readily than absolute revenue.

Design constraints:

- **Leaderboards** rank only values the owner chose to show at a comparable level (exact boards use exact; growth board uses growth). Never infer hidden figures from rank.
- **Security:** public read of metric columns on published startups is today's model. Hiding values needs server-side filtering (a view or function), reviewed with RLS smoke tests. **Needs a migration: not applied without your approval.**
- Default: keep today's behaviour for existing projects; new choice appears at the verify step ("who sees this number?"), tying into A2's metric-first chooser.
- Also revisit the existing "stealth listing" idea (Project.md parity matrix, later).

### P2. A visitor-first way in (customers, investors, business owners)

Today everything is framed for builders. Add a layer for people who just want to find something useful or promising.

- **Problem-led discovery:** browse by what it solves ("จัดตารางเวร", "ทำบัญชีร้าน", "เรียนภาษา"), not only by category/MRR. Plain Thai labels (รายได้ต่อเดือน rather than MRR on visitor surfaces).
- **"Try it now"** is the primary action on every project (outbound click is a metric).
- **Collections** curated by us (e.g. "ใช้ฟรี", "สำหรับร้านค้า", "สำหรับครู"), which also give builders a reason to be listed.
- **Investor/buyer view:** follow a project, "movers" (growth), contact request (the flow exists). Careful: facilitating investment can touch securities rules. **Legal check before building anything beyond contact** (not researched by us).
- **Brand-safety for businesses (F2):** a per-project switch to hide the "built with AI" label on **visitor-facing surfaces** of that project (page header, share card), while the AI-tools field stays for builder audiences. Plus the existing domain-ownership check shown as "เจ้าของยืนยันแล้ว". Needs an owner decision (see D2) because it touches the hybrid positioning you chose on 2026-10-10 (AI builders first).
- Positioning stays **hybrid** (decided 2026-10-10). Homepage copy remains a separately reviewed task (see the proposal given 2026-10-11).

### P3. A reason to come back

Order matters: data worth reporting first, channel second.

1. In-app bell (exists) → make sure the events are good.
2. Opt-in **weekly email digest** (the `notifications.email_sent_at` column exists; we found no sender in `src`).
3. **LINE OA opt-in** only after measuring email: quota-limited (Thai free tier reported as 300 messages/month, per-recipient; verify on LINE's page), needs LINE Login linking, PDPA consent, /privacy update, a migration.
4. Highest-value events: someone contacted you; a sync failed (reconnect); your weekly visitors vs last week; rank change; a followed project hit a milestone the owner made public.

### P4. Motion and polish (the Aetox suggestion)

What we could confirm about the reference (Aetox, 2026-10-11): it is a Next.js (Turbopack) page, almost entirely CSS: one keyframe (`rise`, 0.9 s on the hero visual), ~75 elements with transitions, ~12 scroll-reveal elements, two canvas elements, no GSAP/Lenis/Lottie found. Text copy also describes a light running around a task card's border. We could not see its scroll behaviour. So **this level of motion does not need a heavy library.**

**More references (2026-10-11, read-only):**

- **Finsepa** (finsepa.com, Framer): one 0.4 s fade for every "appear" (ease `[0.44,0,0.56,1]`), hero items fade up 32 px, header slides down 32 px; an infinite ticker marquee (36 s linear translateX, duplicated list); a muted looping autoplay product video; scroll-spy side pagination; a dot carousel. Motion shows the product's data, not decoration. Anti-pattern for us: content starts at `opacity:0` until JS runs (LCP, SEO, no-JS). The pane was hidden from the OS, so scroll behaviour was read from Framer's appear config, not watched live.
- **Bencho** (bencho.dev, React + plain CSS): ~85 keyframes, ~514 elements with transitions, an IntersectionObserver that sets `data-in` for scroll reveals, 53 `prefers-reduced-motion` blocks, no animation library. Useful patterns: staggered card rise (0.7 s `cubic-bezier(0.22,1,0.36,1)`), rolling-digit counters, a live pulse ring, stroke-dash dial fill, like heart + bloom, rank flip/hop, skeleton sweep. Blocks are MIT (keep the notice with substantial copies); the site, name and photos are not. We write our own implementations.
- **Skip:** autoplay video (egress on free tiers, Thai mobile data), hidden-until-JS content, tilt / magnetic / particles, scroll hijacking, Framer / GSAP.

**M1 (approved for before the post):** Design.md motion rules and tokens, a global reduced-motion rule, an in-view primitive, rolling digits on verified tiles, a chart line draw, and a capped live pulse on the verified badge. Everything else below waits until after R2.

Proposed motion set, in value order:

1. **Number count-up** on verified tiles, once on entering the viewport.
2. **Chart line draw** on first view.
3. **Verified "stamp"** when a metric is first verified (a small celebration; helps the share loop).
4. **Rank-change transitions** on leaderboards/movers.
5. **Card hover/press feedback**, skeleton loading, smooth section reveals.
6. Optional route transitions (View Transitions) after the above.

Guardrails (Design.md first, per project rule 2): `prefers-reduced-motion` honoured; transform/opacity only; no autoplay video; no layout shift; a JS budget (target: no new animation library unless one is justified); e2e keeps the 12 px readability test and the no-horizontal-scroll check at 375 px. **Animation will not fix retention by itself**; it ranks after P1–P3.

### P5. Learn from real users before building more

A 10-interview round (see the question list given 2026-10-11): 5 builders (paid and free), 3 customers/business owners, 2 investors/buyers. Hypotheses to test:

- H1 builders want customers more than verification;
- H2 privacy (not effort) is the verification blocker;
- H3 non-developers cannot navigate the current site;
- H4 an "AI-made" label hurts some product brands.

Treat each as unproven until at least a few interviewees say it unprompted.

## 4. Phases

Principle from the audit stays: **each phase = Design.md first, th + en, typecheck / lint / unit / build, e2e desktop + 375 px, browser check, PROGRESS / Project.md, then a stop for your review.** No migration or deploy without your explicit approval.

| Phase                            | When             | Content                                                                                                                                                                                                        | Migration                     |
| -------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **R0: launch-safe only**         | now → Wed 14 Oct | No large changes. Apply the funnel migration (your approval) + RLS smoke T137–T145 + regenerate types; enable Vercel Web Analytics; seed 10–15 real listings; homepage copy only as a separately reviewed task | funnel (written, pending)     |
| **R1: measure and listen**       | launch week      | Read the funnel (open → created → verify chosen → finished → failed); run the interviews; decide D1–D5                                                                                                         | none                          |
| **R2: privacy-first proof (P1)** | weeks 2–3        | Disclosure levels, growth board, verified badge variants, security review                                                                                                                                      | **yes** (reviewed separately) |
| **R3: visitor-first (P2)**       | weeks 3–5        | Problem-led discovery, "try it", collections, movers, AI-label switch                                                                                                                                          | likely small                  |
| **R4: return loop (P3)**         | weeks 4–6        | Event quality, email digest; LINE opt-in only if email proves it                                                                                                                                               | yes for LINE                  |
| **R5: motion (P4)**              | weeks 5–6        | Motion tokens in Design.md → count-up, chart draw, stamp, rank transitions                                                                                                                                     | none                          |
| **R6: audit backlog**            | interleaved      | A3-2 card v2 (blocked on screenshots, Q8), B2 charts/settings/chat, C1 filters + `/leaderboard`, C2 onboarding, C3 badge + copy                                                                                | per audit                     |

## 5. Metrics and gates

- **North star:** number of builders with ≥ 1 verified or opted-in metric (the privacy levels count).
- **Visitor side:** returning visitors within 7 days; project page → "try it" clicks.
- **Builder side:** add funnel conversion; share-card posts back into the community; verify attempts.
- **Targets:** none invented here. Set them after the first week of real data (we have no trustworthy benchmark for a Thai builder directory).
- **Gate to R3/R4:** do not start the next phase until R1's interviews and funnel agree on the problem.

## 6. Risks

1. **Scope near launch.** Keep R0 tiny; revamp starts after the post.
2. **Privacy levels leak by inference** (band + growth + rank). Review the combinations before shipping.
3. **PDPA:** GA loads before consent (known, open, owner decision); the funnel, notifications and LINE each add disclosures to /privacy.
4. **Investment features** may be regulated. Legal advice first.
5. **Over-trusting two friends.** Both are useful but second-hand; the interviews decide.
6. **Dilution:** serving customers and investors can blur the builder community that is the launch wedge. Keep hybrid positioning.

## 7. How this merges with the audit plan (A1–C3)

Done: A1, A2, A3-1, B1. Pending: A3-2 (blocked), B2, C1, C2, C3. Proposal: **R2 and R3 take priority over B2 and C2**, because they change what the filters, onboarding and leaderboard rules should be (e.g. the leaderboard must respect disclosure levels; onboarding should start from visitor intent). C1 and C3 follow R2/R3.

## 8. Decisions needed from you

| ID  | Decision                                                               | Recommendation                                                       |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| D1  | Which disclosure levels ship in v1                                     | **Decided: all five** (owner, 2026-10-11)                            |
| D2  | Allow hiding the "built with AI" label per project on visitor surfaces | **Decided: yes, shown by default** (owner, 2026-10-11)               |
| D3  | Visitor-first homepage section order                                   | Keep builder wedge on top, add a visitor row below                   |
| D4  | Notification channel order                                             | In-app → email → LINE (after measurement)                            |
| D5  | Motion go-ahead and "no new library" rule                              | **Partly decided:** M1 (foundation + numbers) now; the rest after R2 |
| D6  | Apply the funnel migration now                                         | **Decided: yes. Applied 2026-10-11** (R0)                            |
| D7  | Who runs the 10 interviews and by when                                 | You, 3–5 before launch, rest in launch week                          |
| D8  | PDPA consent banner                                                    | Still open (Project.md §7)                                           |
