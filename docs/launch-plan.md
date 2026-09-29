# MRRMafia v1: launch plan (Claude Thailand, Facebook)

> Goal: a **working, trustworthy v1** live on Vercel and posted in the Claude Thailand Facebook group **today (2026-09-29), target 19:30–21:00 ICT** (peak Facebook hours). If a must-have slips, we **soft-launch tomorrow evening** rather than post something broken: a first impression in a small community only happens once.
>
> Principle: v1 = **TrustMRR's core loop** (add startup → verify → public profile → share → leaderboard), with TrustMRR's look and feel. Everything else waits (Founder Town, marketplace, feed and stats are later phases in Project.md).

## 1. v1 scope

### Must-have (the launch loop)

| #   | Feature                           | Details (TrustMRR pattern → our version)                                                                                                                                                                                                                                        |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sign in                           | Google and GitHub through Supabase Auth. **No email magic link**: Supabase's default email sender only allows a few emails per hour, which would break on launch day.                                                                                                           |
| 2   | Add-startup wizard (3 steps)      | **Basics** (name, URL, logo, tagline, description, category, country/province, founded, **AI build tools**, stack) → **Revenue** (Stripe restricted key, or "skip — list as unverified") → **Insights** (optional: audience, pricing, team, funding, channels, founder message) |
| 3   | Stripe verification               | Accept only restricted read-only keys and reject anything that can write. Compute MRR, 30-day revenue, all-time revenue, active subscriptions and customers. Keys encrypted (AES-GCM, server-only). Daily re-sync (Vercel Cron) plus a manual "Refresh" button.                 |
| 4   | Homepage                          | Hero with search, "+ Add startup", **Recently added** row, **Leaderboard** (verified MRR only, 🥇🥈🥉, month-over-month %), filter chips **Built with Claude Code / OpenCode / Cursor…**                                                                                        |
| 5   | Startup profile `/startup/[slug]` | Stat tiles (30-day revenue, MRR + subscriptions, founder, founded + country), 30-day revenue chart with previous period, "Verified with Stripe · updated …", insights grid, AI build tools, founder message, **Share**                                                          |
| 6   | Directory `/startups`             | Card grid with filters: category, AI tool, verified only                                                                                                                                                                                                                        |
| 7   | Dashboard                         | My startups: edit, reconnect or refresh Stripe, hide/delete                                                                                                                                                                                                                     |
| 8   | **Share kit**                     | Share menu (Copy link · Facebook · LINE · X), a per-startup **OG image** (1200×630, Thai font, big numbers), an **embeddable badge** ("Verified on MRRMafia · $X MRR"), and "Share your profile" shown right after verifying                                                    |
| 9   | Founding member badge             | The first 100 startups get a "Founding Mafia #n" badge. It rewards joining on launch day.                                                                                                                                                                                       |
| 10  | Trust pages                       | Privacy (PDPA), Terms, and **"How we handle your key"** (restricted read-only, encrypted, aggregate data only, revoke any time in Stripe). This page drives conversion.                                                                                                         |
| 11  | Launch hygiene                    | TH/EN switch, mobile (375px) checked, 404/error pages, basic abuse controls (admin can hide a listing, rate limit on add-startup)                                                                                                                                               |

### Should-have (only if the must-haves are done by the time cut-off)

- Sponsor rails with house ads: "Advertise on MRRMafia"
- `llms.txt` and a Markdown page per profile
- An "Open to offers" toggle on the profile (email contact only, no marketplace)

### Not in v1 (already in Project.md phases)

Marketplace/`/acquire`, deal flow, chat and Founder Town, feed, stats, other payment providers, traffic/users proof, mini-games, API/MCP.

## 2. Build schedule (today)

Blocks run in order. Times are estimates for Claude Code working with the user.

| Block | Duration | Work                                                                                                                                                             | Done when                                                                       |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A     | 30 min   | **Infra:** Supabase project, Vercel project, OAuth apps, env vars (the user sets secrets; see §3)                                                                | Site boots on Vercel preview, sign-in works                                     |
| B     | 60 min   | **Schema v1 + row-level security:** `profiles`, `startups`, `startup_tools`, `provider_connections` (encrypted key), `revenue_snapshots`; storage bucket `logos` | Migrations applied; RLS test: user A can't read B's connection                  |
| C     | 90 min   | **Stripe verification:** validate the key is restricted/read-only, fetch subscriptions and charges, metrics engine, encrypt, daily cron, refresh                 | Stripe **test-mode** key gives MRR/30-day revenue matching the Stripe dashboard |
| D     | 150 min  | **UI (Design.md):** header/footer, homepage, profile, directory, add wizard, dashboard; strings in `th.json`/`en.json`                                           | Visual check at desktop and 375px in both locales                               |
| E     | 45 min   | **Share kit:** OG image route, share menu, badge SVG, founding badge                                                                                             | Facebook Sharing Debugger + LINE preview render the card                        |
| F     | 30 min   | **Trust pages + hardening:** privacy/terms/key page, `/security-review`, rate limits                                                                             | No high-severity findings                                                       |
| G     | 30 min   | **Deploy + seed:** production deploy (user approves), user and friends add 5–10 real startups                                                                    | Leaderboard shows real verified numbers                                         |
| H     | —        | **Post** (§4) and watch the site: logs, errors, sign-ups                                                                                                         | Post live, first replies answered                                               |

**Cut-off rule:** if block C or D isn't done by 18:00 ICT, move the post to tomorrow 19:30. Spend the evening seeding.

## 3. User tasks (only you can do these)

1. **Supabase:** OK to create project `mrrmafia` (free, region `ap-southeast-1` Singapore). The organization already has 2 active free projects (`ar-vocab-kids`, `Thanabaht`). If creation fails, pause one of them.
2. **OAuth apps:** Google Cloud OAuth client and a GitHub OAuth app. Callback URL: `https://<project>.supabase.co/auth/v1/callback`. Paste the client ID/secret into Supabase → Authentication → Providers. I'll give step-by-step instructions.
3. **Secrets** go into Vercel env and `.env.local`, entered by you (Claude never reads `.env`):
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `KEY_ENCRYPTION_SECRET`, generated with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `CRON_SECRET`
4. **A Stripe test-mode restricted key** (read-only) for testing verification.
5. **Seed founders:** message 5–10 builder friends today and ask them to add their startup before the post goes up.
6. **Group rules:** check that the Claude Thailand group allows posting your own product, or ask an admin first.
7. **Domain (optional today):** launch on `mrrmafia.vercel.app` and add a custom domain later.

## 4. Go-to-market: Facebook launch

### The post (Thai; attach 3–4 screenshots or a 20-second screen recording)

> 🕶️ **เปิดตัว MRRMafia — ฐานข้อมูลรายได้ของสตาร์ทอัพที่สร้างด้วย AI (ยืนยันจริง ไม่ใช่ screenshot)**
>
> ช่วงนี้ในกลุ่มเห็นหลายคนสร้างโปรดักต์ด้วย Claude Code / OpenCode กันเยอะมาก 🔥 แต่รายได้ที่โชว์กันมักเป็นแค่ภาพหน้าจอ
>
> เลยสร้าง **MRRMafia** ขึ้นมา (สร้างด้วย Claude Code ทั้งเว็บ):
> ✅ เชื่อม Stripe ด้วย **Restricted key แบบอ่านอย่างเดียว** → ระบบคำนวณ MRR / รายได้ 30 วันให้อัตโนมัติ
> 🏆 ติดอันดับ Leaderboard สตาร์ทอัพไทย + ติดป้าย "Built with Claude Code"
> 🔗 ได้หน้าโปรไฟล์ + การ์ดแชร์สวย ๆ ไว้โพสต์ FB / LINE
> 🆓 ฟรี · ยังไม่มีรายได้ก็ลงได้ (แสดงเป็น "ยังไม่ยืนยัน")
>
> 🔒 เรื่องความปลอดภัย: ใช้คีย์แบบอ่านอย่างเดียว เข้ารหัสทุกคีย์ ไม่เก็บข้อมูลลูกค้า และยกเลิกสิทธิ์ใน Stripe ได้ทุกเมื่อ
>
> 🎖️ **100 สตาร์ทอัพแรกได้ป้าย "Founding Mafia"** ถาวร
>
> 👉 ลงสตาร์ทอัพของคุณ: [link]
> คอมเมนต์ลิงก์โปรไฟล์ของคุณไว้ด้านล่างได้เลย เดี๋ยวเข้าไปดูทุกอัน 🙏

(Final wording is up to you. Keep the safety paragraph: key safety is the #1 objection.)

### Launch-day playbook

- Post between **19:30 and 21:00 ICT**. Pin a first comment with a 3-step "how to create a Stripe restricted key" guide and a link to the "How we handle your key" page.
- Reply to **every comment within an hour**. Visit and share the profiles people post; it gets them sharing too.
- Seeded founders share their own profile cards on their own walls or stories the same evening.

### Follow-ups

- **Day +1:** "Leaderboard after 24h" post, a screenshot of the top 10 plus sign-up count
- **Day +3:** a founder spotlight (with permission)
- **Day +7:** "Top Thai AI startups — verified" weekly post. It becomes the recurring content engine.
- Later: cross-post to other Thai groups (AI builders, indie hackers, startup communities)

## 5. Launch metrics (track from day 0)

| Metric                                | Day-1 target | Week-1 target     |
| ------------------------------------- | ------------ | ----------------- |
| Startups added                        | 30           | 100               |
| … with Stripe verified                | 10           | 30                |
| Profile shares (share-menu clicks)    | 20           | 80                |
| Sign-ups coming from a shared profile | tracked      | ≥ 20% of sign-ups |

## 6. Risks and mitigations

| Risk                                                                     | Mitigation                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Many Thai builders don't use Stripe (Omise/PromptPay) or have no revenue | Allow unverified listings (clearly labeled) + AI-tools badge; traction proof is next (Project.md §7) |
| Founders afraid to paste an API key                                      | Restricted-key-only check, "How we handle your key" page, revoke instructions, open about encryption |
| Spam or fake listings                                                    | Sign-in required, rate limit, admin hide, leaderboard counts only verified revenue                   |
| Supabase free-project limit                                              | Pause an inactive project, or upgrade later                                                          |
| Build slips                                                              | 18:00 cut-off → post tomorrow; never post a broken flow                                              |
