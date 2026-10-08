# JaoPor UX/UI Product Audit

Date: 2026-10-08 · Scope: the whole product, with the deepest review on **Add Startup → details → verification → publishing → public profile → ongoing management**.
Status: **audit only.** One clearly broken, low-risk item was fixed during the audit (§17, M-0). Everything else waits for the owner's review and prioritisation.

---

## How this audit was done (and what it can't tell us)

| Source                                                  | What it covered                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code** (the repository at `99341c8`)                  | Every step of `/new` (`StartupWizard.tsx`), `VerifyPanel.tsx`, the edit page (`StartupEditForm.tsx`), the API routes, `messages/th.json` / `en.json`, `Design.md`, the RLS rules in `supabase/migrations`                                                                         |
| **Production, in the browser pane** (jaopor.vercel.app) | At **1280 px and 375 px**: home, `/startups`, `/new`, `/dashboard`, `/dashboard/105/edit` (all 7 sections), `/startup/jaopor-pdt0`, `/feed`, `/en/u/gxcb06`. The pane was signed in as the owner, so signed-in screens were **viewed only**: nothing was typed into or submitted. |
| **Production HTML, signed out**                         | Checked that the owner's email is **not** in the public profile HTML (only the LinkedIn URL contains the name). Measured the page weight.                                                                                                                                         |
| **Production database** (read-only counts)              | 1 real project, 5 demos, 6 profiles, 1 project owner, 1 provider connection (Stripe), 3 posts, 0 owner-verified sites.                                                                                                                                                            |
| Earlier rounds this week                                | The UX review of 2026-10-07 (rounds A–C), the first-user test of 2026-10-05, and the 74 signed-out e2e checks                                                                                                                                                                     |

**Limits:**

- **No behavioural data.** With one real founder, the abandonment map (§5) is a heuristic evaluation, not funnel analytics. The first thing to measure once real founders arrive is the step-by-step drop-off (see §23, Phase 2).
- Signed-in flows were observed as the owner of one existing project. A brand-new user's sign-in and onboarding were reviewed from the code and Design.md, not clicked through.
- This round checked 1280 and 375 px. 1440 / 1024 / 768 / 430 / 390 were checked in earlier rounds (header, home grid, directory). They should be re-checked after the Phase 1 changes.
- No screen-reader session. Accessibility findings come from the markup, sizes and contrast.
- Earlier rounds checked the light theme. This round looked at the dark theme only.

**UX-writing audit:** there is no existing UX-writing document in the repository (the `claude/ux-writing-audit` branch holds older feature commits, not an audit). The terminology decisions already made (Design.md §3 "Verified vs counted", dates and currency) are treated as fixed. This audit builds on them and doesn't contradict them.

**Scoring used for every recommendation:**

- Each recommendation is rated 1–5 on four things: user **I**mpact, **F**requency, **B**usiness/product importance and **C**omplexity.
- **Priority score = (I + F + B) × (6 − C)**, so the maximum is 75.
- High-impact, frequent, important and cheap items rise to the top.

---

## 1. Executive Summary

JaoPor already has a clear promise ("1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง") and a real technical moat: read-only connections, an SSRF-guarded owner check, and verified numbers kept separate from counted ones. The design system is calm and consistent, and the Add Startup flow is already short (one link fills the name, one-liner and logo).

The interface still **undercuts its own promise in a handful of high-traffic places**:

1. **Demo projects with ฿60k–฿120k MRR sit next to the one real ฿2.3k project.** This happens on the home page, in "สตาร์ทอัพอื่น ๆ" on every project page, and in search. A first-time visitor's strongest impression is numbers that aren't real.
2. **On a phone, a project page shows no numbers in the first screen.** The first 812 px are the owner bar, logo, name, description, buttons and the "looking for" banner.
3. **Numbers that look wrong aren't explained.** JaoPor's own page shows MRR ฿2,310 above all-time revenue ฿1,980, next to "ราคา: ฟรี".
4. **Add Startup publishes immediately without saying so.** "สร้างและไปต่อ" creates a public listing (the database default is `published`). The founder isn't told, can't preview it, and can't hide it later (only delete).
5. **The proof language still overclaims in a few places:**
   - a "LIVE" badge on numbers that sync daily;
   - "ยืนยันแล้ว!" after connecting an analytics tool, which only counts visitors;
   - before this audit, "Verified! The numbers are on your profile" after pressing "เริ่มนับ" even when the code wasn't found (fixed, §17 M-0).
6. **One object, four names:**
   - Thai: ผลงาน (133 uses), สตาร์ทอัพ (22), Startup (12), โปรเจกต์ (6). The Add Startup page alone says "เพิ่ม Startup", "ชื่อสตาร์ทอัพ", "ลิงก์ผลงาน" and "ลงผลงาน".
   - English: project (62), work (58), startup (47) and product (10).

None of these needs a redesign. Most are copy, ordering and small component changes. The top five (§23) can ship in about a week and would move the product from "promising prototype" to "trustworthy, real".

**Overall product UX: 6.5 / 10. Add Startup journey: 6 / 10.** Reasoning in §2 and §3.

### The lists you asked for

**The 10 most important UX/UI issues** (details and evidence in §17)

1. Demo numbers dominate real numbers on public surfaces (M-1).
2. Add Startup publishes without saying so, with no preview and no way to hide (M-2).
3. Numbers that look wrong aren't explained: MRR above all-time revenue, "Free" with ฿2.3k MRR (M-3).
4. Proof language overclaims: the "LIVE" badge, "verified" for counted visitors, the false success for the snippet (now fixed) (M-4, M-5, M-0).
5. A project page on a phone shows no numbers in its first screen (M-6).
6. One object has four names in Thai and English (M-7).
7. New founders go through 4 onboarding steps before they can add a project (M-8).
8. Category is preselected as "AI", so projects are silently miscategorised (M-9).
9. Province isn't asked in Add Startup but blocks the first save on the edit page (and keeps the project off the Olympics) (M-10).
10. GitHub build proof is a dead end for anyone who signed in with Google (M-11).

**The 10 highest-value improvements:** M-1 · M-2 · M-3 · M-4/M-5 · M-6 · M-9 · M-7 · M-8 · S-1 (a "next steps" panel instead of the auto-opening share dialog) · S-3 (save without leaving the edit page)

**The 5 biggest design strengths to preserve:** §2

**The 5 biggest mobile issues:**

1. No numbers in a project page's first screen.
2. The edit page stacks three navigation rows plus a save bar, leaving about half the screen for the form.
3. Six controls in a 375 px header.
4. No sticky primary button in the Add Startup step.
5. Every page carries every message in both languages (273 KB HTML for one profile).

**The 5 biggest trust/proof issues:**

1. Demo numbers next to real ones.
2. Unexplained MRR vs revenue.
3. The "LIVE" badge on daily data.
4. "Verified" wording left on counted visitors (analytics toast, trust box, share title).
5. No visible ladder of evidence strength: the proof levels exist in the database but not in the UI.

**The 5 biggest Thai/English issues:**

1. One concept, many words (startup / project / work / product).
2. English-only labels on Thai pages ("COMMITS", "Trend", "LIVE", "Milestone", the browser's "Choose File / No file chosen").
3. Mixed currency on one page: `/en/u/gxcb06` shows $69 MRR next to a "฿1,000 MRR" milestone and badge.
4. Tiny uppercase labels in Thai (the 10 px step labels in Add Startup). Thai has no case, and wide letter spacing hurts it.
5. Verified/counted wording parity in both languages (the trust box says "ระบบที่ยืนยัน" / "which service verified it" for visitors).

**The 5 biggest design-system issues:**

1. No single badge/chip system:
   - verified shows in green on the overview but brand colour on "ผลงานของฉัน";
   - there are about seven pill styles.
2. Two logo upload UIs: a tile with preview in Add Startup, the bare browser file input on the edit page.
3. Three save models with no visible convention:
   - text fields wait for the save bar;
   - screenshots, sources and the profile photo save instantly;
   - saving the edit page leaves the page.
4. Raw sizes outside the type scale (`text-[10px]` in the wizard, field labels and the dashboard status chip), and a 9–10 px floor that is too small for Thai.
5. No shared "evidence level" visual language, so cards, profile, leaderboard and dashboard each express proof differently.

**The 5 easiest quick wins:** §21

**The 5 improvements with the highest product impact:**

1. Demos off public surfaces.
2. Explicit publishing and a value statement in Add Startup.
3. Numbers-first project pages with definitions.
4. Shorter onboarding when the user came to add a project.
5. A post-listing "next steps" panel that turns a bare listing into a complete, verified profile.

**Recommended order:** Phase 1 → 6 in §23. In short, fix what makes the numbers look fake or unexplained, then make Add Startup honest and short, then make the profile the reward.

### What I would change first

If I were personally responsible for making JaoPor feel polished and trustworthy, I'd do these five things, in this order:

1. **Take the demos off every public surface this week** (or delete them, as already planned). A site whose promise is "real numbers" can't lead with invented ones.
2. **Put the numbers first on a project page, and define them** (MRR, revenue, visitors, commits), with a one-tap "how is this verified?". That page is what people share, and it's the reward for adding a project.
3. **Make Add Startup honest about publishing.**
   - Tell founders the page goes public now, and that they can edit or delete it any time.
   - Show what they get before asking for anything.
   - Don't preselect a category.
4. **Remove the remaining overclaims:**
   - "LIVE" becomes "อัปเดตทุกวัน";
   - analytics connections say "counted", not "verified";
   - the snippet success message (already fixed).
5. **Pick one word per concept and apply it everywhere.** My recommendation: "ผลงาน" / "project" for the object, "Startup" only inside the brand CTA if you want to keep it.

---

## 2. Overall Product UX Assessment

### Strengths to preserve (JaoPor's design identity)

1. **"Numbers are the hero" as a principle, and a ledger feel to match:**
   - monospace numbers in `tabular-nums`;
   - quiet zinc surfaces;
   - colour used only for meaning;
   - the faint chart fill as the one decorative exception.

   It reads as honest. Keep it.

2. **Source attribution right next to the number:**
   - "ยืนยันผ่าน Stripe · อัปเดตล่าสุด …" under the chart;
   - "✓ Stripe" on cards;
   - "นับโดย …" for visitors.

   This is the product's core differentiator, already executed well.

3. **Link-first Add Startup with auto-fill:**
   - paste one link and get the name, one-liner and logo, never overwriting what the founder typed;
   - two steps;
   - a duplicate-listing guard.

   It's already shorter than most directories.

4. **The trust box at the key moment.** "What we store and show / what we never store or do", the Stripe permission mock, and a "how we handle your key" link sit next to the key field, which is exactly where the question arises. Pressing "Verify" refuses keys that can write.
5. **Owner-only empty states.** Visitors never see "–" or empty sections; owners see dashed "+ เพิ่ม…" cards that deep-link to the exact field. This keeps public pages clean and still nudges completion.

Also good:

- the Thai calendar and ฿ handling;
- the province picker with popular provinces and aliases;
- the profile revenue chart's screen-reader table;
- the confirm dialogs instead of `window.confirm`;
- skeletons instead of spinners;
- the sign-in routing that returns you to the exact page.

### Weaknesses, by theme

| Theme                                       | Evidence                                                                                                                                                                | Consequence                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trust undercut by demos**                 | Home "เพิ่มล่าสุด": 1 real card + 4 demos (฿62.3k, ฿115.2k MRR). `/startup/jaopor-pdt0` "สตาร์ทอัพอื่น ๆ": 5 of 5 cards are demos.                                      | A visitor's first numbers are invented ones; the real ฿2.3k looks tiny and the promise "ตัวเลขจริง" reads as marketing.                                                                             |
| **Numbers without definitions**             | Project page tiles: รายได้ทั้งหมด ฿1,980 · MRR ฿2,310 · Insights "ราคา: ฟรี".                                                                                           | A careful visitor (the person evaluating proof) concludes the numbers are wrong. Nothing on the page explains that MRR = active subscriptions' monthly value, and revenue = money already received. |
| **Hierarchy on phones**                     | 375 px project page: the first screen has no number.                                                                                                                    | The core value is below the fold for the majority of Thai traffic (mobile).                                                                                                                         |
| **Publishing is implicit**                  | `startups.status` defaults to `published`; the RLS shows published rows to everyone; the CTA reads "สร้างและไปต่อ".                                                     | Founders may not realise a half-finished listing is public; they can't hide it, only delete.                                                                                                        |
| **Terminology drift**                       | Counts in §16.                                                                                                                                                          | Users wonder whether a "Startup", a "ผลงาน" and a "project" are different things (e.g. dashboard "+ เพิ่มผลงาน" next to the header "+ เพิ่ม Startup").                                              |
| **Overclaiming freshness and verification** | Leaderboard "LIVE"; analytics success toast "ยืนยันแล้ว!"; trust box "ชื่อระบบที่ยืนยัน" for visitors.                                                                  | Erodes the precise "verified vs counted" line the owner drew on 2026-10-07.                                                                                                                         |
| **Founder's home (dashboard) priorities**   | `/dashboard`: the post composer comes first; "ผลงานของฉัน" starts below the first screen at 1280 px.                                                                    | The founder's main jobs (complete, verify, check numbers) sit under a social composer.                                                                                                              |
| **Contradictory counters**                  | Dashboard header "มีคนเข้าชม 0 ครั้งในสัปดาห์นี้", the side card "โปรไฟล์ 7 วัน: 25 ผู้เข้าชม · 2 คำขอคุย", and the requests card "ยังไม่มีคำขอคุย", all on one screen. | Two counts look broken; they are different things (project visits vs profile views; pending vs all requests) with labels too similar to tell apart.                                                 |

---

## 3. Add Startup Executive Assessment

**Verdict:** the _mechanics_ are good: it's short, auto-filled, guarded against duplicates and keeps the work when you go back. The _framing_ is weak:

- it doesn't say what you get;
- it doesn't say the page goes live;
- it preselects the category;
- it skips the province, which a core feature (the Olympics) needs;
- the verification step offers five options without saying which one matters for this kind of project.

After the wizard, the founder lands on a mostly empty profile, and a share dialog asks them to post it to the group right away.

### Scores

| Area                        | Score | Why (evidence)                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clarity**                 | 6     | The step bar and the "paste your link" intro are clear. Missing: what JaoPor gives you, that the page is public at once, and what "ยืนยันตัวเลข" means for an app or LINE bot with no revenue yet.                                                                                                                                                                         |
| **Ease of completion**      | 8     | One required link, the name auto-filled, two steps, a working Back that saves to the same project. The main drag is outside the form: the 4-step onboarding for new accounts.                                                                                                                                                                                              |
| **Information quality**     | 4     | The category defaults to "AI", and edit-page auto-fill only replaces a category that is still "อื่น ๆ", so it never corrects. No province, so new projects are invisible in the Olympics until edited. The description isn't asked (the one real project has none). The slug is auto-generated with a random suffix on a clash and can't be edited (`jaopor-pdt0`).        |
| **Trust**                   | 6     | The trust box, read-only checks and the /security link are excellent at the key field. Weakened by publishing that isn't stated, and (until this audit) a "Verified!" toast and share dialog after a snippet that wasn't found.                                                                                                                                            |
| **Verification experience** | 5     | The chooser is a good idea, and Stripe has a permission mock. But: GitHub is a dead end for Google sign-ins (a message, no action). The snippet assumes direct access to the page's `<head>`, with no help for Lovable / Bolt / v0 / Framer / Webflow / WordPress, the tools JaoPor's audience uses. The tiles don't say what the visitor will see (badge? number? rank?). |
| **Error recovery**          | 6     | Inline errors, a duplicate-site warning with a link, Back keeps the data, a session draft survives a language switch or refresh. But the 5-project limit only appears after pressing create; a failed logo upload rolls the whole step into "เกิดข้อผิดพลาด"; snippet failures don't say why (a redirect to another domain, a tag added by JavaScript, a cache).           |
| **Progress feedback**       | 5     | A 2-segment bar at 10 px uppercase is hard to read in Thai. There's no sense of "your profile is 30 % complete, here is the next most valuable step" until the edit page, whose percentage weights "funding" the same as "verified".                                                                                                                                       |
| **Mobile UX**               | 7     | It fits at 375 px with one column and readable inputs. The primary button scrolls away under the keyboard; the step labels are tiny.                                                                                                                                                                                                                                       |
| **Thai UX**                 | 6     | Natural sentences, but four words for the object on one screen, uppercase 10 px labels, and English placeholders mixed in ("yourapp.com · @yourbot" is fine; "Choose File" on the edit page is not).                                                                                                                                                                       |
| **English UX**              | 7     | Fluent; "List it / Verify numbers" are clear. Terms drift (startup / project / work).                                                                                                                                                                                                                                                                                      |
| **Public-profile payoff**   | 6     | With data it's a strong page: verified badge, chart, stamps, screenshots, founder message. Right after the wizard it's thin (logo, name, one-liner, owner prompts), and the share dialog opens on top of it. On phones the numbers are below the fold. Demo projects fill "More startups".                                                                                 |
| **Overall**                 | **6** | Fast to complete, honest at the key moment, but under-explained at the start and under-rewarding at the end.                                                                                                                                                                                                                                                               |

---

## 4. Add Startup Current Journey (from the code)

```
Entry points (all → /new)
  header "+ เพิ่ม Startup" (every page, icon-only below sm) · hero button · bottom search "+ เพิ่ม Startup"
  dashboard "+ เพิ่มผลงาน" · dashboard dashed tile "เพิ่มผลงานใหม่" · setup checklist "เพิ่มผลงานแรก"
  categories "เพิ่ม Startup →" · category/province empty states · Olympics empty podium "+ ที่ว่าง"
  welcome banner "เพิ่มผลงานของฉัน →" · search no-results "เพิ่มผลงานของคุณเป็นคนแรก"

/new  (page.tsx: requireUser; loading.tsx skeleton streams first)
  └─ signed out → /login?next=/new
       └─ Google or GitHub OAuth → /api/auth/callback
            ├─ no username → /onboarding (4 steps: username → headline + province → status → skills [skippable])
            │                 → back to /new
            └─ has username → /new

STEP 1 "ลงผลงาน" (StartupWizard)
  fields: ลิงก์ผลงาน (required, autofocus) · ชื่อสตาร์ทอัพ (required) · หมวดหมู่ (preselected "AI")
          · คำโปรย (optional, ≤140) · โลโก้ (optional, ≤1 MB)
  live: link type detected ("ตรวจพบ: เว็บไซต์"); website → 600 ms → /api/startups/preview (3 s, 512 KB)
        → fills name / one-liner / logo if empty or still auto ("✨ เติมจากเว็บของคุณแล้ว")
  guard: same website as one of my projects → amber note + "ไปที่ผลงานเดิม →", submit disabled
  submit "สร้างและไปต่อ":
        logo upload → INSERT startups (status defaults to 'published' → PUBLIC NOW)
        slug = slugify(name); clash → name-xxxx; 6th project → "เพิ่มได้สูงสุด 5"
        errors: invalid link · logo too big · generic "เกิดข้อผิดพลาด"

STEP 2 "ยืนยันตัวเลข" (VerifyPanel chooser)
  "คุณมีอะไรบ้าง? เลือกหนึ่งอย่างก่อน" — tiles: มีเว็บไซต์ (only with a website) · Stripe · RevenueCat
          · GitHub · analytics (Plausible | Umami | Cloudflare)
  tile → "← เปลี่ยนวิธี" + numbered how-to + fields + trust box (key sources) + "ยืนยัน" / "เริ่มนับ"
     Stripe/RevenueCat/analytics: key checked read-only → success toast → ✓ on tile
     GitHub: needs a GitHub sign-in, otherwise text only (dead end)
     Snippet: copy code → "เริ่มนับ" → server opens the home page → found = Owner verified, else amber
              "ยังไม่พบโค้ด…" + "ตรวจอีกครั้ง" (20 s throttle)
  footer: "← ย้อนกลับ" (to step 1, saves to the same project) · "ยืนยันทีหลังได้…" · "ข้ามไปก่อน"
          (primary "ไปที่หน้าผลงาน" once something is connected)

PROFILE /startup/{slug}?new=1 | ?verified=1
  ShareStudio opens automatically on the "โพสต์" tab: "เพิ่มผลงานแล้ว! โพสต์ลงกลุ่มกันเลย" / "ยืนยันแล้ว! …"
  OwnerBar: "นี่คือโปรไฟล์ Startup ของคุณ — กรอกข้อมูลให้ครบ…" (or the amber "ยังไม่มีตัวเลขที่ยืนยัน")
  owner-only dashed cards: + เพิ่มรายละเอียด · + เชื่อมต่อผู้เข้าชม · + เพิ่มคุณค่าที่มอบให้ …

LATER: /dashboard/{id}/edit
  7 sections (basics · links & location · story · stack & marketing · media · founder · verify)
  progress "ข้อมูลครบ n%" + next missing · sticky save bar · "✨ ช่วยเติมจากเว็บไซต์" · "ดึงจาก GitHub"
  Save → validates (name, links, province if TH, price, video) → UPDATE → redirect to the public page
  Screenshots, sources and the logo upload act immediately (outside the save bar), except the logo,
  which waits for Save
  Delete: dashboard ⋯ → confirm dialog. No hide / unpublish.
```

---

## 5. Add Startup Friction Map (abandonment risk)

Risk is estimated (no analytics yet). ★ = highest risk.

| Step                           | Friction                                                                                  | Likely user reaction                                                      | Consequence                                        | Improvement                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Click "+ เพิ่ม Startup"        | Nothing says what you get before sign-in                                                  | "Why should I sign up?"                                                   | Bounce from people who were curious, not committed | One line under the login title already exists; mirror it on /new and on the signed-out skeleton (M-2)                                                  |
| ★ Sign-in → onboarding         | **4 steps** (username, headline + province, status, skills) before the form they came for | "I just wanted to add my app"                                             | The highest-risk step for new founders             | When `next=/new`, ask only the username (+ province, reused for the project) and defer the rest to a profile checklist (M-8)                           |
| Step 1: link                   | Unsure what counts as a "project link" for a LINE bot or an app in review                 | Pastes a Facebook page or a Notion link → "ลิงก์นี้ใช้ไม่ได้"             | Stuck at the first field                           | The hint already lists the kinds; add "ยังไม่มีลิงก์? ใช้ลิงก์ GitHub ได้" and accept LINE `lin.ee` links if not already                               |
| Step 1: category               | Preselected "AI"                                                                          | Never touches it                                                          | The wrong category, silently; poor discovery       | No preselection; suggest from auto-fill (M-9)                                                                                                          |
| ★ Step 1: create               | Doesn't know the page goes public now; no preview                                         | Either hesitates ("is it live already?") or publishes something half-done | A half-done public page, or abandonment            | "หน้าผลงานจะเปิดให้ทุกคนเห็นทันที แก้หรือลบได้ตลอด" + a live card preview (M-2, S-2)                                                                   |
| Step 1: 6th project            | The limit only appears after submit                                                       | Frustration after filling everything                                      | Wasted effort                                      | Check the count on load and show it up front                                                                                                           |
| Step 2: chooser                | Five options, unclear which matters; no sense of the payoff                               | "Do I need all of these?" "Which one gets me on the leaderboard?"         | Skips verification (first-user test: most skipped) | A badge on each tile saying what it unlocks ("ขึ้นกระดานผู้นำ", "ป้ายยืนยันเจ้าของเว็บ", "นับผู้เข้าชม") and a recommended tile per project type (S-5) |
| ★ Step 2: snippet              | "วางไว้ก่อน </head> ของทุกหน้า" assumes code access                                       | Lovable / Bolt / Framer users don't know where `<head>` is                | Gives up; or presses "เริ่มนับ" without installing | Per-platform tabs (Next.js, Lovable/Bolt, Framer, Webflow, WordPress, plain HTML) and a specific failure reason (V-3)                                  |
| Step 2: Stripe                 | The key flow happens in another tab; key anxiety                                          | Hesitates at "paste your key"                                             | Drop at the most valuable step                     | Already strong (trust box, permission mock). Add "ใช้เวลา ~2 นาที" and keep the tab open state (already kept)                                          |
| ★ Step 2: GitHub (Google user) | "ต้องเข้าสู่ระบบด้วย GitHub ก่อน" with no button                                          | Dead end                                                                  | The build proof never connected                    | "เชื่อมบัญชี GitHub" via account linking (M-11)                                                                                                        |
| Step 2 → profile               | The share dialog auto-opens over a thin profile                                           | "Share what? There's nothing here yet"                                    | Shares a weak page, or dismisses and leaves        | Replace with a "3 ขั้นต่อไป" panel; offer sharing when the profile is worth it (S-1)                                                                   |
| Edit page, first save          | Province required but never asked before                                                  | "Why can't I save my screenshot?"                                         | Confusion, an error jumps sections                 | Ask the province in step 1 (prefilled from the profile) (M-10)                                                                                         |
| Edit page, save                | Save leaves the editor for the public page                                                | Has to navigate back to continue                                          | Fewer fields completed per session                 | Save in place, with "ดูหน้าผลงาน ↗" (S-3)                                                                                                              |

---

## 6. Add Startup Field-by-Field Audit

Legend: **ASK NOW** = must ask now · **ASK LATER** = should ask later · **OPT** = optional · **AUTO** = could auto-fill · **VERIFY** = could be verified later · **DON'T** = should not be asked.

| Field (where)                                     | Class                     | Why JaoPor needs it                                                     | Does the user know why?           | Notes / recommendation                                                                                                       |
| ------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Project link (wizard)                             | ASK NOW                   | Identity, the duplicate guard, auto-fill, the snippet's domain, "Visit" | Partly (the hint lists the kinds) | Keep first. Add a line for "no public link yet → GitHub"                                                                     |
| Name (wizard)                                     | ASK NOW + AUTO            | Title, slug, search                                                     | Yes                               | Already auto-filled. Show the resulting URL (`jaopor.vercel.app/startup/…`) under it so the slug is chosen consciously (S-9) |
| Category (wizard)                                 | ASK NOW, **no default**   | Discovery, categories, "more like this"                                 | No                                | Remove the "AI" default; suggest from the site (the auto-fill already reads the page) (M-9)                                  |
| One-liner (wizard)                                | ASK NOW (optional) + AUTO | Card text, OG, search                                                   | Yes (the counter)                 | Good                                                                                                                         |
| Logo (wizard)                                     | OPT + AUTO                | Card recognition                                                        | Yes                               | Good; reuse this exact field on the edit page (S-4)                                                                          |
| Province (edit only)                              | **ASK NOW** + AUTO        | Olympics rank, province pages                                           | Only on the edit page             | Move to step 1, prefilled from the profile's province (M-10)                                                                 |
| Country (edit)                                    | AUTO                      | Olympics eligibility                                                    | —                                 | Default TH is fine; keep it on the edit page                                                                                 |
| Description (edit)                                | ASK LATER + AUTO          | Understanding, SEO                                                      | Yes                               | The first item of the post-listing panel; "✨ ช่วยเติมจากเว็บไซต์" already exists                                            |
| Website / App Store / Play / LINE / GitHub (edit) | OPT                       | Visit buttons; GitHub enables build proof and stack detection           | Partly                            | Explain that GitHub unlocks "หลักฐานการสร้าง" and "ดึงจาก GitHub"                                                            |
| Founded (edit)                                    | OPT + AUTO                | "Founded" tile                                                          | —                                 | Suggest from the GitHub first commit when build proof is connected                                                           |
| Value proposition, problem solved (edit)          | ASK LATER + AUTO          | Insights                                                                | Partly                            | Fine as optional; auto-fill covers them                                                                                      |
| Audience, team size, funding (edit)               | OPT                       | Insights                                                                | —                                 | Fine. Don't count them as heavily as verification in "complete %" (S-6)                                                      |
| Pricing (edit)                                    | OPT                       | The "ราคา" insight                                                      | —                                 | Warn when "ฟรี" is chosen but verified revenue exists (C-3)                                                                  |
| AI tools (edit)                                   | OPT + AUTO                | "สร้างด้วย", builder filters, the product's theme                       | Yes                               | Suggest "Claude Code" when build proof finds Claude co-authored commits (reliable, already measured)                         |
| Tech stack (edit)                                 | OPT + AUTO                | Insights                                                                | Yes                               | "ดึงจาก GitHub" already exists                                                                                               |
| Marketing channels (edit)                         | OPT                       | Insights                                                                | —                                 | Fine                                                                                                                         |
| Looking for (edit, under "เทคโนโลยีและการตลาด")   | OPT                       | The banner at the top of the profile                                    | No: wrong section                 | Move to "ข้อมูลหลัก" or a "สิ่งที่กำลังหา" group (S-8)                                                                       |
| Screenshots, demo video (edit)                    | ASK LATER                 | The strongest persuasion on the profile                                 | Yes ("ขายผลงานได้ดีที่สุด")       | The second item of the post-listing panel                                                                                    |
| Founder message, role, build story (edit)         | OPT + AUTO                | Human story                                                             | Yes                               | Prefill the role from the profile headline                                                                                   |
| Verification sources (wizard step 2 + edit)       | VERIFY                    | The core differentiator                                                 | Partly                            | Show what each source unlocks (S-5)                                                                                          |
| Slug (nowhere)                                    | AUTO, **editable**        | A permanent, shareable URL                                              | —                                 | Today it can't be changed (`jaopor-pdt0`). Make it editable with a redirect from the old slug (S-9)                          |
| —                                                 | DON'T                     | —                                                                       | —                                 | Nothing currently asked should be removed outright. Self-typed revenue / user counts are correctly never asked.              |

---

## 7. Add Startup Verification Audit

**What each option proves today (what the UI should say, plainly):**

| Option                              | What is proven                                                                         | Strength                                          | What the visitor sees                            | Gap in today's UI                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stripe / RevenueCat                 | Money received + active subscriptions, read from the provider                          | **Strongest** (cannot be faked by sending events) | "✓ ยืนยันแล้ว · Stripe", chart, leaderboard rank | MRR vs revenue aren't defined; MRR > revenue looks wrong (M-3)                                                                             |
| GitHub                              | Commits, the first commit, the Claude co-authored share of a public repo the user owns | Strong for "built it", says nothing about usage   | "หลักฐานการสร้าง" tile                           | **Dead end for Google sign-ins** (M-11)                                                                                                    |
| JaoPor snippet → **Owner verified** | The lister can edit that website's HTML                                                | Medium (ownership, not traction)                  | "ยืนยันเจ้าของเว็บแล้ว" chip                     | Fixed in this audit: no "Verified!" before the code is found. Still: no per-platform help, no failure reason (V-3)                         |
| Snippet → visitor count             | Page views reported by browsers                                                        | **Counted** (can be inflated by sending events)   | "นับโดย JaoPor"                                  | Correct labelling on the profile                                                                                                           |
| Plausible / Umami / Cloudflare      | Visitors reported by the founder's analytics                                           | **Counted**                                       | "นับโดย …"                                       | The connect toast says "ยืนยันแล้ว!", the trust box says "ชื่อระบบที่ยืนยัน", and the share dialog says "ยืนยันแล้ว! โชว์ตัวเลขจริง" (M-5) |

**Questions the experience must answer, and where it does or doesn't:**

| Question                                      | Answered?                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| What can be verified?                         | ✓ (the chooser tiles)                                                                                                               |
| What can't?                                   | ✗ (nothing says "active users / app downloads aren't verifiable yet")                                                               |
| Why does it matter?                           | Partly ("ใช้เวลาประมาณ 1 นาที", the OwnerBar "เพื่อให้คนเชื่อตัวเลขและติดอันดับ"). It should be on each tile: what it unlocks.      |
| What do I do?                                 | ✓ (numbered how-tos)                                                                                                                |
| What happens after connecting?                | Partly (a toast). Missing: "ตัวเลขจะขึ้นบนหน้าผลงานและกระดานผู้นำภายใน … / อัปเดตทุกวัน"                                            |
| How long does it take?                        | ✓ for the chooser ("~1 นาที"); the Stripe flow realistically takes 2–3 minutes                                                      |
| What does success look like?                  | ✓ (✓ on the tile, the badge), now honest for the snippet                                                                            |
| What does failure mean, and how do I recover? | Partly. Key errors are specific (write access names the resources). Snippet failure says only "ยังไม่พบ", without the likely cause. |

**Top 5 verification improvements:** V-1 the honest wording sweep (M-5 + done M-0) · V-2 GitHub account linking (M-11) · V-3 snippet platform guides + failure reasons · V-4 an evidence ladder on the profile ("หลักฐานระดับไหน?" popover: revenue > build > owner > counted) · V-5 after-connect expectations ("อัปเดตทุกวัน · ซิงก์ล่าสุด …" shown on the tile, with "Refresh").

---

## 8. Add Startup Mobile Audit (375 px observed; 390/430 by layout)

- **What works:**
  - one column;
  - inputs are full width with a readable size (18 px root);
  - the auto-fill status sits under the link;
  - the logo button is a large target;
  - no horizontal scroll.
- **The primary button isn't sticky.** "สร้างและไปต่อ" sits below the logo field; with the keyboard open after typing the one-liner, it's off-screen. Use a sticky bottom action bar on phones (the edit page already has one).
- **The step labels are `text-[10px]` uppercase** (`StartupWizard.tsx:311`). At 375 px, "1. ลงผลงาน" is about 11 px rendered. Use `text-caption` with no uppercase for Thai.
- **The verify step** has tiles in one column (good). The snippet code box wraps with `break-all` (fine). "เปลี่ยนวิธี" and "ย้อนกลับ" are two back actions on one screen (S-7).
- **The edit page on phones** shows three stacked horizontal bars before the form: the dashboard tab row, the section chips and the progress header. Together with the sticky save bar, only about 50 % of the 812 px screen is form (screenshot of `/dashboard/105/edit` at 375 px). Hide the dashboard tab row on edit pages below `lg` (keep "← ผลงานของฉัน").
- **The header at 375 px:** logo + ฿ + search + "+" + bell + avatar + menu, seven tappable things in 343 px, icon buttons about 36 px rendered (`size-8` × 1.125). Move the currency switch into the menu on phones.

---

## 9. Add Startup Thai/English Audit

**On the Add Startup screens:**

| Concept           | Thai today                                                                       | English today                                                 | Recommendation                                                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The thing you add | "เพิ่ม **Startup** ของคุณ", "ชื่อ**สตาร์ทอัพ**", "ลิงก์**ผลงาน**", "ลง**ผลงาน**" | "Add your Startup", "Startup name", "Project link", "List it" | **ผลงาน / project** everywhere in running text. If "Startup" stays in the CTA for brand reasons, use it only there ("+ เพิ่ม Startup"), never in field labels. The page title becomes "เพิ่มผลงานของคุณ" / "Add your project", the field "ชื่อผลงาน" / "Project name". |
| Publishing        | (not said)                                                                       | (not said)                                                    | "เผยแพร่ทันที" / "goes live now" in the CTA area (M-2)                                                                                                                                                                                                                 |
| Verification      | "ยืนยันตัวเลข" for everything                                                    | "Verify numbers"                                              | Keep for the step; tiles say what each proves ("ยืนยันรายได้", "ยืนยันเจ้าของเว็บ + นับผู้เข้าชม", "หลักฐานการสร้าง")                                                                                                                                                  |
| Counted           | "ยืนยันแล้ว!" toast for analytics                                                | "Verified!"                                                   | "เชื่อมแล้ว · กำลังนับผู้เข้าชม" / "Connected · counting visitors" (M-5)                                                                                                                                                                                               |
| Proof             | หลักฐานการสร้าง / Build proof                                                    | —                                                             | Good                                                                                                                                                                                                                                                                   |

- **Length:** Thai labels are 20–30 % longer, but none break today (checked at 375 px). The step bar labels are the tightest (2 × 50 %).
- **Cultural tone:** natural and friendly ("วางลิงก์ผลงานก่อน เราจะเติม…"). Keep the second person and the short sentences.
- **Thai typography:** uppercase and wide tracking (`tracking-wider uppercase`) have no meaning in Thai and only shrink it. Use case only for Latin labels (`MRR`, `COMMITS`); for Thai use weight or colour instead.

---

## 10. Add Startup Trust Audit

| Sensitive moment                | What the user asks                              | Answered at the right moment?                                                                                  |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Signing in with Google/GitHub   | "What will you do with my account?"             | Partly: the login legal line links to terms/privacy; one reassurance line ("เราไม่โพสต์อะไรแทนคุณ") would help |
| Pasting the website (auto-fill) | "Are you scraping my site?"                     | No. A tiny "อ่านแค่ชื่อ คำอธิบาย และโลโก้จากหน้าแรก" next to the status line would answer it                   |
| Creating (publishing)           | "Who sees this?"                                | **No** (M-2)                                                                                                   |
| A revenue key                   | "Can you charge my customers / see their data?" | **Yes, excellent** (the trust box, the permission mock, the write-access refusal, the /security link)          |
| The snippet                     | "Will it slow my site / track my users?"        | Partly ("ไม่มีคุกกี้ และไม่เก็บ IP" is in the how-to). Add "ขนาดไม่ถึง 1 KB, โหลดแบบ defer".                   |
| The GitHub repo                 | "Do you get access to my code?"                 | Yes ("เราไม่ขอสิทธิ์ใด ๆ")                                                                                     |
| Disconnecting                   | "Is it really deleted?"                         | Yes (the confirm dialog: "ตัวเลขที่ยืนยันแล้วจะถูกลบ")                                                         |
| Deleting a project              | "Can I hide instead?"                           | **No hide option** (S-10, needs an owner-controlled status)                                                    |

---

## 11. Add Startup Publishing Audit

| Question                                        | Today                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Does the user know exactly what becomes public? | No. Everything on step 1 is public on "สร้างและไปต่อ", including the auto-filled one-liner they may not have read.                |
| What stays private?                             | Not stated anywhere in the flow. (Keys, the owner's email and contact details are private; this should be said once, at publish.) |
| Which information is verified?                  | Shown later on the profile (badges, stamps). Not previewed.                                                                       |
| Is there a preview or a review?                 | No. A live card preview in step 1 is cheap: the `StartupCard` component exists (S-2).                                             |
| Does publishing feel significant?               | No. It reads like "create" in a settings form.                                                                                    |
| Is completion celebrated?                       | Yes, but too early: the share dialog ("เพิ่มผลงานแล้ว! โพสต์ลงกลุ่มกันเลย") opens on a thin page.                                 |
| Does it say what to do next?                    | Only through the owner bar ("กรอกข้อมูลให้ครบ") and the dashed cards. No ordered list.                                            |

**Draft vs publish.** The architecture has `status` (published / hidden) but no owner-controlled draft. Recommendation:

- **Now (no migration):** say "เผยแพร่ทันที" and show the preview.
- **Next (S-10, a migration with owner approval):** an owner-controlled "ซ่อนไว้ก่อน / Hide" toggle (reuse `hidden`, with the owner allowed to set it).
- **NOT NOW:** a full multi-state draft workflow, because the two-step wizard is short enough that "publish then improve" is the right model, provided it's stated.

---

## 12. Public Profile Payoff Audit

"If I create a startup on JaoPor, does the resulting page make my product look good?"

- **With data (`/startup/jaopor-pdt0`, desktop):** yes:
  - a strong header with the founding badge "#3" and "ยืนยันแล้ว · Stripe";
  - a "looking for" banner with "ลองใช้เลย";
  - four stat tiles, a chart with a verified stamp, screenshots, the founder message, insights with logo chips, milestone posts.

  This page is a good reason to say "I want my startup here".

- **Problems that reduce the payoff:**
  1. **Phones: no number in the first screen** (M-6).
  2. **MRR ฿2,310 above all-time revenue ฿1,980, and "ราคา: ฟรี"** (M-3, C-3).
  3. **"สตาร์ทอัพอื่น ๆ" shows 5 demo cards** with 30–50× larger numbers (M-1).
  4. **Right after the wizard:** the page is the logo + name + one-liner + many owner prompts, and the share dialog covers it (S-1).
  5. **The URL can't be chosen** (`jaopor-pdt0`) (S-9).
  6. **English labels on the Thai page:** "COMMITS", "Trend", "Milestone" (S-12).
- **What motivates improving it after launch:**
  - the dashboard checklist ("ตั้งค่าให้ครบ 5/6");
  - the edit page percentage;
  - the owner-only dashed cards;
  - milestone posts.

  The ingredients are right; they compete with each other (three different completeness systems: a 6-item checklist, a 22-item percentage and per-section ticks). Unify around **one ordered "next best step" list** that weights verification, screenshots and description highest (S-6).

---

## 13. Entire Product Page-by-Page Audit

Evidence key: **[B]** observed in the browser this round · **[C]** read in the code · **[S]** reviewed from Design.md / earlier rounds.

### Home `/` [B 1280 + earlier 375]

- **Purpose:** explain JaoPor and lead to projects or Add. **Primary users:** first-time visitors (A, E).
- **Works:**
  - the two-line headline answers "what is this" in 3 seconds;
  - the provider logos ("ตัวเลขจาก") answer "why trust it";
  - search sits in the hero;
  - Add appears in three places.
- **Problems:**
  - 4 of the 5 "เพิ่มล่าสุด" cards are demos, with bigger numbers than the real one (M-1);
  - the leaderboard has a "LIVE" dot on daily data (M-4);
  - with one real project, the leaderboard is one row (fine, honest).
- **UI:** the card ✓ is icon-only on compact cards (labelled for screen readers; good).
- **Mobile:** one-column cards below 420 px (fixed in round A).
- **Thai:** "COMMITS" uppercase English on cards.
- **Recommendations:** M-1, M-4, S-12.

### Directory `/startups` [B 375, S desktop]

- **Works:** proof-level ordering, filters in a disclosure on phones, sort chips.
- **Problems:**
  - the currency button showed "$" for a moment on a ฿ page while hydrating (C-5);
  - the sort chips mix Thai and English ("Commits มากสุด").
- **Recommendation:** C-5.

### Project page `/startup/[slug]` [B 1280 + 375]

- See §12. **UX:**
  - numbers aren't first on phones;
  - no definitions;
  - demos in "more".
- **UI:** the owner bar takes the first slot for the owner (fine), but on phones it pushes everything down. Collapse it to one line below `sm`.
- **A11y:** the chart has a screen-reader table on the builder profile but **not** here (`MetricChart.tsx` has no data table; confirmed in code).
- **Recommendations:** M-1, M-3, M-6, S-12, C-3.

### Builder profile `/u/[handle]` [B 375 en]

- **Works:** proof line ("1 work · 1 verified"), revenue card with a screen-reader table, edit-in-place links for the owner.
- **Problems:**
  - **currency mixed on one page**: "TOTAL MRR $69" and "$59" next to the badge "MRR ฿1,000" and the milestone "JaoPor hit ฿1,000 MRR" (milestone thresholds are stored in THB and rendered literally) (S-13);
  - the "Looking for a co-founder" block is long on phones.
- **Recommendation:** S-13.

### Dashboard `/dashboard` [B 1280]

- **Purpose:** the founder's home.
- **Problems:**
  - the composer comes first and pushes "ผลงานของฉัน" below the fold (S-11);
  - contradictory counters ("0 ครั้ง" vs "25 ผู้เข้าชม"; "2 คำขอคุย" vs "ยังไม่มีคำขอคุย") (S-14);
  - "อ้างสิทธิ์ผลงาน · เร็ว ๆ นี้", a disabled tile in the main column (C-6);
  - two names for one action in one view ("+ เพิ่ม Startup" / "+ เพิ่มผลงาน") (M-7);
  - the row status truncates "ยืนยันแล้ว · S…" at 1280.
- **Recommendations:** S-11, S-14, C-6, M-7.

### My projects `/dashboard/startups` [C]

- **Problem:** the verified chip is in **brand** colour here and in **positive** colour on the overview: two meanings of one state (DS-1).
- The `hidden` label appears for moderated projects, but the owner can't set it.

### Edit `/dashboard/[id]/edit` [B 1280 + 375, C]

- **Works:** one section at a time, deep links, auto-fill, stack detection, the sticky save bar, a session draft that survives a refresh or language switch.
- **Problems:**
  - Save leaves the editor (S-3);
  - the logo field is the browser's native "Choose File / No file chosen" with no current-logo preview or remove (S-4);
  - the province is required but wasn't asked before (M-10);
  - "Looking for" is under "เทคโนโลยีและการตลาด" (S-8);
  - the slug isn't editable (S-9);
  - the progress header said "ต่อไป: ข้อมูลหลัก →" while already on ข้อมูลหลัก (C-7);
  - the completeness weighting (S-6);
  - mobile chrome stacking (§8).
- **Recommendations:** as listed.

### Add Startup `/new`

§3–§11.

### Feed `/feed` [B 375]

- **Works:** tabs, a filter disclosure, gold milestone cards with "✓ ยืนยันผ่าน Stripe".
- **Problem:** the composer fills the first screen on phones, so posts start below it. Collapse the composer to a one-line "อัปเดตอะไรวันนี้?" button on phones (C-8).
- **Thai:** the "Milestone" chip is in English (S-12).

### Leaderboard (home card) [B]

- **"LIVE" badge** (M-4).
- **Footer:** "รายได้ยืนยันผ่าน Stripe / RevenueCat · commits ผ่าน GitHub · ผู้เข้าชมนับโดย…" is excellent; keep it.

### Olympics, province, categories, category [S + earlier rounds]

- Seasons in the Thai year (fixed); empty categories fold into chips (fixed); empty podium places invite adding.
- **Problem:** a project without a province never appears in the Olympics, and the wizard doesn't ask the province (M-10).

### Builders `/builders` [S]

- Fine for the current size. The filters exceed the data (6 profiles): consider hiding filters with a single option.

### Login `/login` [S, e2e]

- **Works:** the subtitle sells the value ("เพิ่มผลงานของคุณ ยืนยันตัวเลข และรับป้ายเจ้าพ่อรุ่นบุกเบิก"), and `next` is kept.
- **Problem:** when `next=/new` the title could say "เข้าสู่ระบบเพื่อเพิ่มผลงาน" (C-9).

### Onboarding `/onboarding` [C, S]

- 4 steps before the user's goal (M-8).

### Messages, requests, connections, settings, saved [S]

- **Messages:** good empty states and a separate mobile screen.
- **Requests:** clear "LINE / อีเมลจะแสดงหลังกดยอมรับเท่านั้น" (strong trust copy).
- **Saved:** an "honest placeholder" (no bookmarks): a dead-end page in the sidebar. Hide it until it works (C-6).
- **Settings:** account deletion is by email request (acceptable pre-launch; S-15 later).

### Privacy / Security / Terms [S]

- Owner-approved wording; clear structure; Terms marked as a draft. No change recommended beyond keeping the "counted" wording in sync.

### Share / OG [C, S]

- The OG and share images stay in USD (a deliberate "one canonical number").
- The auto share dialog after listing: S-1.
- The ShareStudio title "แชร์ตัวเลขที่ยืนยันแล้ว" shows even when nothing is verified. Use a neutral "แชร์ผลงาน" in that case (C-10).

---

## 14. Design System Audit

| #    | Finding                                                                                                                                                                              | Evidence                                                                                                                     | Recommendation                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| DS-1 | **No single badge/chip component.** About seven pill styles: VerifiedBadge, card corner tag, dashboard status chip, StatusPill, post type chips, LogoChip, region chips, ToggleChips | Verified = `positive` on `/dashboard`, `brand` on `/dashboard/startups` (`page.tsx:145`)                                     | One `Badge` with variants: `verified-revenue`, `build`, `owner`, `counted`, `demo`, `status`, `type`; one meaning per colour                    |
| DS-2 | **Two logo upload UIs**                                                                                                                                                              | Wizard: tile preview + "อัปโหลดเอง" + "ลบโลโก้"; edit: the native `<input type=file>` (`StartupEditForm.tsx:721`)            | Extract `LogoField` from the wizard and use it in both                                                                                          |
| DS-3 | **Save models aren't signalled**                                                                                                                                                     | Text waits for the save bar; screenshots, sources and the profile photo save instantly; edit Save navigates away             | Convention: instant-save controls show "บันทึกทันที" or a check flash; the save bar covers the rest; Save stays on the page                     |
| DS-4 | **Type floor too small for Thai; raw sizes**                                                                                                                                         | `text-[10px]` in `StartupWizard.tsx:311`, `wizard/fields.tsx`, `dashboard/startups/page.tsx:145,158`; `text-3xs` 9 px labels | No Thai text under `text-caption` (11 px → 12.4 px rendered); replace the raw sizes with tokens                                                 |
| DS-5 | **No shared evidence-strength language**                                                                                                                                             | Cards (✓ / shield / none), profile (badge + stamps), leaderboard (footer), dashboard (chips) each differ                     | One "ProofMark" component: icon + label per level (revenue ✓, build `GitBranch`, owner `ShieldCheck`, counted `ChartColumn`), reused everywhere |
| DS-6 | **Three completeness systems**                                                                                                                                                       | The dashboard 6-item checklist, the edit page 22-item %, per-section ticks                                                   | One model, one ordered list, weighted (S-6)                                                                                                     |
| DS-7 | **Section navigation variants**                                                                                                                                                      | Edit: sidebar / chips; profile editor: tab row; onboarding: segments; wizard: a 2-bar step header                            | Fine to differ by context, but share one `StepHeader` (readable label size, current/total)                                                      |

What's already systemised and should stay: the colour tokens (semantic positive / negative / warning / info), the radius scale, `Card`, `SegmentedControl`, `StatCard`, `EmptyOwnerCard`, `ConfirmDialog`, `PersonPhoto`, the prose font rule.

---

## 15. Accessibility Audit

| Issue                                     | Where                                                                                                              | Real barrier                                                           | Fix                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Very small text                           | 9–10 px labels (`text-3xs`, `text-[10px]`), Thai uppercase                                                         | Low-vision users, older Thai readers; Thai diacritics at 10 px collide | Floor of 11 px (12.4 px rendered) for Thai; drop uppercase on Thai                                                     |
| Touch targets                             | Header icon buttons `size-8` (36 px rendered); "ลบโลโก้" is text-only                                              | Missed taps at 375 px                                                  | 44 px hit areas on phones (padding, not visual size)                                                                   |
| Unlabelled native file input in a Thai UI | Edit page logo                                                                                                     | Screen readers announce "Choose File" in English                       | `LogoField` with a Thai label (DS-2)                                                                                   |
| Status by toast only                      | Source connect / refresh results go to `sonner` toasts                                                             | Toasts vanish; screen-reader timing                                    | Keep the toast, and also render the result inline next to the control (most do: the ✓ on the tile, the OwnerCheck box) |
| Chart data for screen readers             | Builder profile ✓ (hidden table); project page `MetricChart` ✗ (no table, confirmed in code)                       | Blind users can't read the chart                                       | Same visually-hidden table pattern on MetricChart                                                                      |
| Contrast                                  | `--faint` #8a8a8f on `--card` #141416 ≈ 5.3:1 ✓; region colours under 3:1 on white are always paired with a name ✓ | —                                                                      | Keep                                                                                                                   |
| Focus                                     | shadcn rings throughout; the wizard's custom label-as-button for the logo uses `focus-within:ring` ✓               | —                                                                      | Keep                                                                                                                   |
| Headings                                  | Section H2s exist; the wizard's verify tiles use `h3` without an `h2` parent on `/new`                             | Minor outline skip                                                     | Make the step title an `h2`                                                                                            |

---

## 16. UX Writing Findings

**Terminology counts** (string values in `messages/*.json`):

- Thai: ผลงาน 133 · สตาร์ทอัพ 22 · Startup 12 · โปรเจกต์ 6.
- English: project 62 · work 58 · startup 47 · product 10.

**Proposed glossary** (the owner decides; once approved, it goes in Design.md §3):

| Concept                           | Thai                                                                | English                       | Never                                                                |
| --------------------------------- | ------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| A listed thing                    | ผลงาน                                                               | project                       | สตาร์ทอัพ/โปรเจกต์ in running text; "work" as a noun for one project |
| The Add CTA                       | + เพิ่มผลงาน (or keep "+ เพิ่ม Startup" as the one brand exception) | + Add project                 | Two different labels on one screen                                   |
| The person who builds             | คนสร้าง (directory) / ผู้ก่อตั้ง (on a project)                     | builder / founder             | —                                                                    |
| Proven by the source              | ยืนยัน                                                              | verified                      | for visitor counts                                                   |
| Reported by a script or analytics | นับโดย                                                              | counted by                    | "verified"                                                           |
| Site ownership                    | ยืนยันเจ้าของเว็บ                                                   | owner verified                | "verified" alone                                                     |
| Going public                      | เผยแพร่                                                             | publish / goes live           | "create"                                                             |
| Freshness                         | อัปเดตทุกวัน · ซิงก์ล่าสุด …                                        | updated daily · last synced … | LIVE (except the live-visitors map, which really is live)            |

**Specific strings to fix:**

- `Sources.success` for analytics: "ยืนยันแล้ว! ตัวเลขขึ้นบนโปรไฟล์ของคุณแล้ว" → for traffic sources "เชื่อมแล้ว เริ่มนับผู้เข้าชม ตัวเลขจะขึ้นภายในวันนี้" (M-5).
- `Sources.trust.keep.traffic.2`: "ชื่อระบบที่ยืนยัน" / "Which service verified it" → "ชื่อระบบที่นับ" / "Which service counted it" (M-5; matches /security's approved "นับโดยสคริปต์ของเราหรือ analytics").
- `Share.titleVerified` after an analytics-only connection → use `titleNew` (M-5).
- The leaderboard "Live" → "อัปเดตทุกวัน" / "Updated daily" (M-4).
- `Wizard.title` "เพิ่ม Startup ของคุณ" → "เพิ่มผลงานของคุณ"; `Wizard.name` "ชื่อสตาร์ทอัพ" → "ชื่อผลงาน" (M-7).
- `Wizard.createAndContinue` "สร้างและไปต่อ" → "เผยแพร่และไปต่อ" / "Publish & continue" (M-2).
- On Thai pages, translate "Trend" (แนวโน้ม), "Milestone" (ความสำเร็จ / หมุดหมาย) and "COMMITS" (คอมมิต); keep brand names (Stripe, GitHub) and "MRR".
- Unused keys in the Wizard namespace from the old 3-step wizard (`stepInsights`, `revenueTitle`, `finish`, `noStripe`, …) should be removed so translators don't maintain dead copy (TD-4).

---

## 17. MUST Improvements (ordered by priority score)

Format per item:

- **ID · Area · Screen** in the heading.
- **Current**, **Problem**, **Why it matters**, **Solution**.
- **Impact · Complexity · Dependencies**, plus **Score** (I/F/B/C → score).

### M-0 · Verification · Add Startup step 2 + edit page — **FIXED during this audit (not pushed)**

- **Current:** pressing "เริ่มนับ" without the code on the site showed "ยืนยันแล้ว! ตัวเลขขึ้นบนโปรไฟล์ของคุณแล้ว". The wizard then switched to the primary "ไปที่หน้าผลงาน" and opened the profile with "ยืนยันแล้ว! โชว์ตัวเลขจริงให้กลุ่มเห็น", while the inline box said "ยังไม่พบโค้ด…".
- **Problem:** a false success on the trust product's own core step.
- **Fix (`VerifyPanel.tsx`):**
  - the snippet shows "พบโค้ดบนเว็บของคุณแล้ว" only when found, otherwise the existing "ยังไม่พบโค้ดบน {host}…" info;
  - the wizard only counts it as verified when found (also after "ตรวจอีกครั้ง").
- **No new strings, no business-logic change.** Score 4/4/5/1 → 65.

### M-1 · Trust · Home, project page "สตาร์ทอัพอื่น ๆ", search

- **Current:** 5 demo projects (฿62k–฿120k MRR) show beside 1 real project (฿2.3k); "More startups" on the real project's page is 5/5 demos.
- **Problem:** invented numbers dominate the first impression.
- **Why it matters:** the brand promise is "ตัวเลขจริง"; the person evaluating proof (F) sees this immediately.
- **Solution, either:**
  - (a) delete the demos now (already planned for launch: `delete from startups where is_demo`, owner action); or
  - (b) exclude demos from "More startups", home rows and search whenever at least one real project exists, keeping them only on a clearly labelled "ตัวอย่าง" page.
- **Impact:** very high. **Complexity:** 1. **Dependencies:** owner decision. **Score** 5/5/5/1 → **75**.

### M-2 · Add Startup · `/new` step 1

- **Current:** no value statement; "สร้างและไปต่อ" publishes immediately; no preview.
- **Problem:** founders don't know what they get or that it's live.
- **Why it matters:** completion, honesty, information quality.
- **Solution:**
  - (1) 3 short benefit lines above the form, all already true: "หน้าผลงานถาวรที่ค้นเจอได้และแชร์ได้", "ป้ายยืนยันแล้ว + อันดับบนกระดานผู้นำ/โอลิมปิกเมื่อเชื่อมตัวเลข", "ป้ายเจ้าพ่อรุ่นบุกเบิก #n สำหรับ 100 ผลงานแรก";
  - (2) a CTA "เผยแพร่และไปต่อ" plus a line "หน้าผลงานจะเปิดให้ทุกคนเห็นทันที แก้หรือลบได้ตลอด คีย์และอีเมลของคุณไม่ถูกแสดง".
- **Impact:** high. **Complexity:** 1 (copy + layout; Design.md first). **Score** 4/5/5/1 → **70**.

### M-3 · Trust · Project page stat tiles

- **Current:** MRR ฿2,310 > all-time revenue ฿1,980, with no definition; pricing "ฟรี".
- **Problem:** looks like an error to an evaluator.
- **Solution:**
  - a `?` popover or caption on each money tile: "MRR = ยอดรายเดือนของสมาชิกที่ยังจ่ายอยู่ตอนนี้" / "รายได้ทั้งหมด = เงินที่ได้รับจริงตั้งแต่เชื่อม Stripe";
  - when MRR > all-time, add "MRR นับจากสมาชิกที่ยังใช้งาน แม้ยังเก็บเงินไม่ครบรอบ".
- **Complexity:** 1–2. **Score** 4/4/5/1 → **65**.

### M-4 · Trust · Home leaderboard

- **Current:** a "LIVE" dot and label on numbers synced daily.
- **Solution:** "อัปเดตทุกวัน" / "Updated daily" + the last sync time.
- **Score** 3/5/4/1 → **60**.

### M-5 · Trust/Writing · VerifyPanel, ShareStudio

- **Current:** analytics connections say "ยืนยันแล้ว!", the trust box says "ระบบที่ยืนยัน", and the share dialog opens "ยืนยันแล้ว!" after an analytics-only connection.
- **Solution:** the counted wording in all three (§16); `?verified=1` only for revenue / build / owner.
- **Score** 4/3/5/1 → **60**.

### M-6 · Mobile · Project page

- **Current:** no number in the first 812 px at 375 px.
- **Solution:** below `sm`, a compact metric strip (MRR · revenue 30d · the verified source) directly under the name; the owner bar collapses to one line; the description is clamped to 3 lines with "อ่านต่อ".
- **Complexity:** 2. **Score** 5/4/5/2 → **56**.

### M-7 · Writing · Product-wide

- **Current:** four names for the project, and two Add labels on one screen.
- **Solution:** approve the glossary (§16), then sweep both message files. Run the `messages.test.ts` parity check after.
- **Complexity:** 2. **Dependencies:** owner decision. **Score** 4/5/4/2 → **52**.

### M-8 · Add Startup · Onboarding

- **Current:** 4 steps before `/new` for new accounts.
- **Solution:** when `next` is `/new`, ask only the username + province (the province is reused for the project, M-10), then go straight to the wizard. The rest becomes items on the dashboard checklist.
- **Complexity:** 2. **Score** 4/4/5/2 → **52**.

### M-9 · Data quality · `/new` category

- **Current:** preselected "AI".
- **Solution:**
  - no default ("เลือกหมวดหมู่", required);
  - when auto-fill runs, preselect a suggested category from the page (the edit page's auto-fill already derives one) with "แนะนำจากเว็บของคุณ".
- **Score** 3/5/4/1 → **60**. (Ordered after M-6 only because M-6 has the higher impact; both are Phase 1–2.)

### M-10 · Data quality · `/new` province

- **Current:** not asked; required on the first edit save; the project is absent from the Olympics until then.
- **Solution:** the province combobox in step 1 (the existing popular-provinces picker), prefilled from the founder's profile province; required when the country is TH, as on the edit page.
- **Score** 3/4/4/2 → **44**.

### M-11 · Verification · GitHub tile

- **Current:** a Google sign-in sees "ต้องเข้าสู่ระบบด้วย GitHub ก่อน", with no action.
- **Solution:** a "เชื่อมบัญชี GitHub" button (Supabase `linkIdentity`, which requires manual linking to be enabled in Auth settings by the owner); fallback copy explaining exactly what to do.
- **Complexity:** 3. **Dependencies:** Supabase setting. **Score** 4/3/4/3 → **33**.

**Top 10 MUST across JaoPor:** M-1, M-2, M-3, M-4, M-5, M-9, M-6, M-7, M-8, M-10. M-11 is next; M-0 is already fixed.

---

## 18. SHOULD Improvements

| ID   | Area · Screen              | Current → Solution                                                                                                                                                                                                                | I/F/B/C | Score |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----- |
| S-1  | After the wizard · profile | The share dialog auto-opens on a thin page → a "3 ขั้นต่อไป" owner panel (add the description, 3 screenshots, verify) with a progress ring; sharing is offered when the panel is complete or a number is verified                 | 4/4/5/2 | 52    |
| S-2  | `/new` step 1              | No preview → a live compact `StartupCard` preview beside / under the form ("หน้าตาบนหน้าแรก")                                                                                                                                     | 3/5/4/2 | 48    |
| S-3  | Edit page                  | Save leaves the editor → save in place with a toast + "ดูหน้าผลงาน ↗"; keep the sticky bar                                                                                                                                        | 4/4/4/1 | 60    |
| S-4  | Edit page logo             | Native file input, no preview → the shared `LogoField` (DS-2)                                                                                                                                                                     | 3/3/3/1 | 45    |
| S-5  | Verify chooser             | Tiles don't say what they unlock → a one-line outcome per tile + a "แนะนำ" tag by project type (website → snippet; app → RevenueCat; LINE bot / repo → GitHub)                                                                    | 4/4/5/2 | 52    |
| S-6  | Completeness               | Three systems, verification weighted like "funding" → one ordered next-best-step list; weights: verify 30, screenshots 20, description 15, province 10, rest 25                                                                   | 3/4/4/3 | 33    |
| S-7  | Verify step                | Two back controls ("เปลี่ยนวิธี", "ย้อนกลับ") → rename the inner one "ดูตัวเลือกอื่น" and style the wizard Back as a text link in the footer only                                                                                 | 2/3/2/1 | 35    |
| S-8  | Edit page IA               | "กำลังหาอะไรอยู่?" under Tech & marketing → move it to ข้อมูลหลัก (it's the banner at the top of the profile)                                                                                                                     | 2/3/3/1 | 40    |
| S-9  | Slug                       | Auto with a random suffix, not editable → show the URL under the name in the wizard; an editable slug on the edit page with a redirect from old slugs (needs a slug-history table, a migration)                                   | 3/2/4/3 | 27    |
| S-10 | Publishing                 | Delete only → an owner "ซ่อนไว้ก่อน" toggle (reuse `status = 'hidden'`, a migration for the owner grant + RLS)                                                                                                                    | 3/2/4/3 | 27    |
| S-11 | Dashboard                  | The composer comes first → order: checklist (when incomplete) → ผลงานของฉัน → composer → side cards                                                                                                                               | 3/5/4/1 | 60    |
| S-12 | Thai UI                    | English labels "COMMITS", "Trend", "Milestone", "LIVE" on Thai pages → Thai labels (keep MRR and brand names)                                                                                                                     | 2/5/3/1 | 50    |
| S-13 | Currency                   | Milestones / badges hard-coded ฿ on `/en` with $ tiles → render milestone amounts through `<Money>` with both spans, or label "฿1,000 (≈ $30)"                                                                                    | 3/3/4/2 | 40    |
| S-14 | Dashboard counters         | "0 ครั้ง" vs "25 ผู้เข้าชม"; "2 คำขอคุย" vs "ยังไม่มี" → explicit labels: "ผู้เข้าชมผลงาน 7 วัน", "คนดูโปรไฟล์คุณ 7 วัน", "คำขอใหม่ (รอตอบ)"                                                                                      | 3/4/3/1 | 50    |
| S-15 | Settings                   | Deleting the account is by email → self-service delete with a confirm dialog (after launch)                                                                                                                                       | 3/1/3/3 | 21    |
| S-16 | Performance                | Every page serialises all messages (th.json 133 KB; the `/en/u/gxcb06` HTML is 273 KB) → pass only the client namespaces to `NextIntlClientProvider`                                                                              | 3/5/3/3 | 33    |
| S-17 | Mobile edit chrome         | Three nav rows + the save bar → hide the dashboard tab row on edit pages below `lg`; one sticky chip row                                                                                                                          | 3/3/3/2 | 36    |
| S-18 | Snippet help (V-3)         | One generic instruction → platform tabs (Next.js / Lovable·Bolt / Framer / Webflow / WordPress / HTML) + failure reasons (redirected to another domain, the tag added by JavaScript or GTM isn't in the HTML, an old cached page) | 4/3/4/3 | 33    |

**Top 10 for Add Startup:** M-2 · M-8 · M-9 · M-10 · S-2 · S-5 · S-18 · M-11 · S-1 · S-7 (+ the step label size, DS-4)

**Top 10 for Startup Details (profile + edit):** M-6 · M-3 · M-1 · S-3 · S-4 · S-6 · S-8 · S-9 · C-3 · S-12

**Top 5 mobile:** M-6 · S-17 · header density (C-11) · a sticky wizard CTA (C-12) · S-16

**Top 5 Thai/English:** M-7 · S-12 · S-13 · DS-4 (no Thai uppercase or 10 px) · M-5

**Top 5 design system:** DS-1 · DS-2/S-4 · DS-3 · DS-4 · DS-5

---

## 19. COULD Improvements

| ID   | Idea                                                                                                       | Why                                                       | Score        |
| ---- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------ |
| C-1  | Suggest "Claude Code" in AI tools when build proof finds Claude co-authored commits                        | Reliable auto-fill from data JaoPor already measures      | 3/2/3/1 → 40 |
| C-2  | Suggest "founded" from the GitHub first commit                                                             | Same                                                      | 2/2/2/1 → 30 |
| C-3  | Owner nudge when self-reported fields contradict verified ones (pricing "ฟรี" + verified revenue)          | Protects the founder's credibility                        | 3/2/3/2 → 32 |
| C-4  | An evidence-ladder popover "หลักฐานระดับไหน?" on badges (V-4)                                              | Teaches the difference between verified / owner / counted | 3/3/4/2 → 40 |
| C-5  | The currency button label renders from the same `data-currency` CSS as `<Money>` (no "$" flash on ฿ pages) | Polish                                                    | 1/4/2/1 → 35 |
| C-6  | Hide "อ้างสิทธิ์ผลงาน (เร็ว ๆ นี้)" and "ที่บันทึกไว้" until they work                                     | Removes dead ends                                         | 2/3/2/1 → 35 |
| C-7  | The edit progress "ต่อไป:" skips the section you're on                                                     | Polish                                                    | 1/3/1/1 → 25 |
| C-8  | On phones, collapse the feed composer to one tappable line                                                 | Posts visible sooner                                      | 2/3/2/1 → 35 |
| C-9  | The login title adapts to `next` ("เข้าสู่ระบบเพื่อเพิ่มผลงาน")                                            | Continuity of intent                                      | 2/3/3/1 → 40 |
| C-10 | The ShareStudio title is neutral when nothing is verified                                                  | Honesty                                                   | 2/2/3/1 → 35 |
| C-11 | The currency switch moves into the mobile menu                                                             | Header density at 375 px                                  | 2/4/2/1 → 40 |
| C-12 | A sticky primary action in the wizard on phones                                                            | The keyboard hides the CTA                                | 2/3/3/1 → 40 |
| C-13 | Check the 5-project limit when `/new` loads                                                                | No wasted form                                            | 1/1/2/1 → 20 |
| C-14 | A one-line auto-fill reassurance ("อ่านแค่ชื่อ คำอธิบาย และโลโก้จากหน้าแรก")                               | Trust at the moment of pasting                            | 2/4/2/1 → 40 |

---

## 20. NOT NOW (deliberately deferred)

- **A full draft → review → publish workflow.** Two steps + "publish then improve" + an owner hide toggle (S-10) is enough; drafts add states everywhere.
- **AI-written descriptions in the wizard.** The website auto-fill already exists on the edit page; adding generation to step 1 slows it and risks low-quality copy.
- **Proof level as a visible score or number** ("Level 2"). Gamifies the wrong thing; use the qualitative ladder (C-4).
- **A marketplace / "for sale" UI.** Phase 2 product scope; it would distract from verification.
- **More verification providers in the chooser before the existing ones convert.** Measure the step-2 completion first.
- **A design-token rename or rebrand.** The tokens are sound; the issues are usage, not the palette.
- **Signed-in e2e automation of the wizard.** Needs a test-account strategy; do it after the Phase 1–2 changes settle.

---

## 21. Quick Wins (high impact, low complexity)

1. **Demos off public surfaces / delete them** (M-1): an owner action or a 3-query change.
2. **"LIVE" → "อัปเดตทุกวัน"** (M-4): copy.
3. **The counted wording sweep** (M-5): 3 strings + one condition.
4. **Category without a default** (M-9): one prop.
5. **Publish-now line + CTA rename + benefits** on `/new` (M-2): copy + layout.

Also cheap:

- S-3 (save in place);
- S-11 (dashboard order);
- S-12 (Thai labels);
- S-14 (counter labels);
- C-6 (hide dead ends).

---

## 22. Major Design Opportunities

1. **"Proof ladder" as the product's visual language.** One `ProofMark` (DS-5), plus a one-tap explanation, used on cards, the profile, the leaderboard, share images and the dashboard. It turns JaoPor's technical honesty (verified vs owner vs counted) into something visitors learn once and trust everywhere.
2. **The post-listing "living profile" loop** (S-1 + S-6):
   - an ordered next-best-step panel on the founder's own profile;
   - milestones when a step completes ("ยืนยันรายได้แล้ว", "ครบ 3 ภาพ");
   - sharing offered at the moment the page is worth sharing.

   This is the strongest lever for "willingness to return and improve".

3. **The numbers-first mobile project page** (M-6): the page people share in LINE groups. Designing it phone-first (metric strip, a sticky "เข้าเว็บไซต์", collapsible story) would make every shared link a better ad for JaoPor.
4. **Platform-aware verification** (S-5 + S-18): recognise the project type from the link (website / LINE OA / App Store / GitHub) and lead with the one verification that fits, with instructions for the builder's actual tool (Lovable, Bolt, Framer…).

---

## 23. Recommended Product UX Roadmap

### PHASE 1: Critical UX fixes (now, 0–1 week)

- M-1: demos off public surfaces (or deleted)
- M-4, M-5: honest proof language (+ M-0 already fixed; push after review)
- M-3: MRR / revenue definitions
- M-6: numbers-first project page on phones
- M-7: glossary approved and swept (the decision first, then one pass over both message files)

### PHASE 2: Add Startup optimisation (1–3 weeks)

- M-2: benefits, publish-now line, "เผยแพร่และไปต่อ"
- M-8: one-step onboarding when coming to add a project
- M-9, M-10: category without a default; province in step 1
- S-2: live card preview
- S-5: tiles say what they unlock, with a recommended option
- S-1: the "3 ขั้นต่อไป" panel replaces the auto share dialog
- **Instrument the funnel** (privacy-friendly counts per step: /new opened → step 1 submitted → source chosen → connected → profile completed). This replaces this audit's estimates with data.

### PHASE 3: Startup profile/detail optimisation (2–5 weeks)

- S-3: save in place
- S-4: one `LogoField`
- S-6: one completeness model
- S-8: move "looking for"
- S-9: editable slug with a redirect (migration, owner approval)
- S-12, S-13: Thai labels, consistent currency
- C-3: nudges for contradictory fields

### PHASE 4: Verification/trust optimisation (3–6 weeks)

- M-11: GitHub account linking (an Auth setting)
- S-18: snippet platform guides + failure reasons
- C-4: evidence-ladder popover
- S-10: owner hide toggle (migration, owner approval)
- Freshness shown on every verified number ("ซิงก์ล่าสุด …", amber when stale)

### PHASE 5: System-wide consistency (4–8 weeks, alongside)

- DS-1 Badge, DS-5 ProofMark, DS-3 save convention, DS-4 type floor
- S-11, S-14: dashboard order and labels
- S-16: messages payload
- S-17: mobile edit chrome
- Re-check at 1440 / 1024 / 768 / 430 / 390 / 375, both themes

### PHASE 6: Polish and experimentation (6+ weeks)

- C-1, C-2: auto-suggestions from GitHub
- C-5 … C-14 polish
- Experiment: the share prompt timing (after verification vs after completion), measured with the Phase 2 funnel counts

### If we could only improve 5 things before public launch

1. **M-1: demos off public surfaces.** Highest trust impact, near-zero cost.
2. **M-2 (+ M-9/M-10): honest, motivating Add Startup.** Says what you get and that it goes live; better data with no extra effort.
3. **M-6 + M-3: numbers-first, defined numbers on the project page.** The page everyone shares.
4. **M-4 + M-5 (+ M-0): proof language that never overclaims.** Protects the core promise.
5. **M-7: one name per concept.** Every screen gets clearer at once.

### If I were the Head of Product at JaoPor, these are the first things I would fix

1. Delete the demos (or hide them everywhere public) and ship M-0 today.
2. Ship the copy-only trust fixes (M-4, M-5, M-3 captions) in the same release.
3. Decide the glossary in one conversation, then sweep the strings (M-7).
4. Rebuild the top of the project page for phones (M-6).
5. Rework Add Startup's first screen (benefits, publish-now, no default category, province) and shorten onboarding for founders (M-2, M-8, M-9, M-10).
6. Replace the auto share dialog with the "3 ขั้นต่อไป" panel and start counting the funnel (S-1).
7. Only then move to the verification depth (GitHub linking, platform guides) and the design-system consolidation, guided by where the funnel actually drops.

---

### Appendix A: Product UX scores

| Dimension        | Score        | Reasoning                                                                                                                                                                                    |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clarity          | 7 / 10       | The headline and provider logos explain JaoPor in seconds. Lost points: the terminology drift and undefined metrics.                                                                         |
| Navigation       | 6.5 / 10     | A clean header, search everywhere, a good dashboard sidebar. Lost points: dead-end items ("อ้างสิทธิ์", "ที่บันทึกไว้"), two Add labels, the edit page leaving after save.                   |
| Usability        | 6.5 / 10     | Short forms, auto-fill, deep links, drafts. Lost points: onboarding before Add, the GitHub dead end, province surprises, the save model.                                                     |
| Visual hierarchy | 6 / 10       | Strong on desktop profiles and cards. Lost points: phones (numbers below the fold), the dashboard composer first, demo numbers louder than real ones.                                        |
| Trust            | 6.5 / 10     | Best-in-class at the key field (trust box, read-only checks, attribution). Lost points: demos, "LIVE", the remaining "verified" for counted data, unexplained MRR.                           |
| Consistency      | 6 / 10       | Tokens are consistent; components and wording aren't (badges, save models, terms, currency on one page).                                                                                     |
| Mobile           | 6 / 10       | Nothing overflows, and the forms fit. Lost points: the first-screen content on project pages, edit chrome, header density, no sticky CTA.                                                    |
| Accessibility    | 6 / 10       | Focus rings, contrast and confirm dialogs are good; the screen-reader chart table exists on profiles. Lost points: 9–10 px text, 36 px targets, English native controls, toast-only results. |
| Thai UX          | 6.5 / 10     | Natural Thai, the Thai year and ฿ by default. Lost points: four nouns, English labels, uppercase/tiny Thai.                                                                                  |
| English UX       | 7 / 10       | Fluent copy. Lost points: project/work/startup drift and mixed ฿/$ on one page.                                                                                                              |
| **Overall**      | **6.5 / 10** | A trustworthy core wrapped in a few high-visibility contradictions. The fixes are mostly copy, ordering and small components, not redesign.                                                  |

### Appendix B: Fixed during this audit

| What                                                                                                                                                                               | File                                    | Verified                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The snippet's "เริ่มนับ" no longer shows "Verified!" or opens the "Verified!" share dialog unless the code was found; "ตรวจอีกครั้ง" success now also marks the wizard as verified | `src/components/wizard/VerifyPanel.tsx` | typecheck, lint, unit tests (see PROGRESS.md). The click path needs a signed-in account and a real website, so it was checked by code review, not clicked through. **Not pushed.** |

### Appendix C: Correction to earlier guidance

On 2026-10-07 the owner was asked to "rename the listing's link back to `jaopor` on its edit page". **The edit page has no slug field**, so that isn't possible in the product today. The options are:

- (a) a one-off rename in the database (`update startups set slug = 'jaopor' where id = 105`), applied only with the owner's approval;
- (b) S-9, an editable slug with a redirect.

Until then `/startup/jaopor` returns 404.
