# PROGRESS

> Completion log. **Newest entry first.** Every completed task adds one entry here and ticks its box / status in [Project.md](Project.md). Use `/log-progress`.
>
> Entry format:
>
> ```
> ## YYYY-MM-DD — <task title>
> **Done:** what changed, in 1–3 bullets
> **Files:** key paths
> **Verified:** how it was checked (command / browser / test)
> **Next:** the immediate follow-up
> ```

## 2026-10-05 — First-user fixes, round 2: Add Startup people finish (auto-fill, "What do you have?", Stripe guide, trust box)

**Why (first-user test):** listing a startup asked for six things at once, verification showed three groups of providers on one screen, the Stripe key page opened blank, and 2 of 3 real startups were never verified.

**Done:**

- **Step 1 "ลงผลงาน" (List it):** link first; for a website link the server reads the page ~600 ms after typing stops and fills name, one-liner (new field, ≤ 140) and logo. Only empty fields or ones still holding the last auto value are replaced; typed values never are. Then category. AI tools, looking-for and screenshots moved to the edit page (the profile's "+ เพิ่ม…" cards already lead there). The auto logo is uploaded as a PNG on submit; "อัปโหลดเอง" / "ลบโลโก้" next to a 48 px preview tile.
- **Auto-fill server** (`POST /api/startups/preview`, signed-in only, 20 calls / minute / user): website links only, same SSRF guard as link previews (public https, every redirect re-checked, max 3), 3 s for the page (512 KB) and 3 s for icons (1 MB each). Icon order: apple-touch-icon, then the largest PNG / SVG / WebP / JPEG icon, then `/apple-touch-icon.png`; `.ico` and icons under 48 px are skipped; SVGs only when self-contained (no DOCTYPE / entities / scripts / images / external references). sharp → 256 px PNG data URL. Nothing is stored.
- **Step 2 "ยืนยันตัวเลข": VerifyPanel chooser** while nothing is connected (wizard and edit page): one question, five tiles (มีเว็บไซต์ → snippet, shown only with a website · Stripe · RevenueCat · GitHub · analytics: Plausible / Umami / Cloudflare), "ไม่ต้องใช้คีย์" / "คีย์อ่านอย่างเดียว" chips. Only the chosen connector shows, with "← เปลี่ยนวิธี"; connected tiles get ✓ and "เพิ่มอีกแหล่ง". Tiles keep the `#verify-revenue / -traffic / -build` ids for the profile's deep links. With a connection, the grouped manage view is unchanged.
- **Stripe permission guide:** Stripe has no pre-filled key link, so a mock of its permission table shows exactly Charges: Read, Subscriptions: Read, everything else: None (what the connector reads).
- **Trust box** beside every key field: what we store and show (totals, daily chart figures, the verifying service) and what we never store or do (customer names / emails / cards; create, change or refund; show the key), "disconnect deletes the key and that source's numbers", link to `/security`. Wording checked against /security and the Stripe connector.
- **Owner "not verified yet" prompt:** on the startup page, an owner whose project has no verified revenue, visitors or build proof sees the owner bar in warning tone with "ยืนยันตัวเลข" (→ edit page `#verify`). The dashboard's unverified-row banner already existed.

**Files:** `src/components/wizard/{StartupWizard,VerifyPanel}.tsx`, `src/app/api/startups/preview/route.ts`, `src/lib/net/link-preview.ts`, `src/lib/og-parse{,.test}.ts`, `src/components/profile/Owner.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ · tests 289/289 (new: 6 site-identity cases: site name, title part matching the domain, "Name: one-liner", 140 clip, icon order without .ico / mask-icon / http, SVG) · build ✓. Live run of the server function (temporary test, deleted): jaopor.vercel.app, vercel.com, stripe.com, wongnai.com, github.com all gave name + one-liner + logo in 0.3–0.6 s; `https://localhost` and `https://127.0.0.1` refused. Unauthenticated `POST /api/startups/preview` → 401. Browser (temporary page, deleted): auto-fill fills name / one-liner / logo, a typed name survives a link change, chooser → Stripe guide + trust box; desktop and 375 px, no horizontal scroll.
**Not verified:** the owner prompt on a real startup page (needs a signed-in owner; sign-in on localhost goes to production) and a real auto-fill through the signed-in route (the client was checked with a stubbed response).
**Next:** owner review on production (add a project from a website link, verify with Stripe), then round 3 (verified first in lists, "Owner verified" badge; migration SQL shown before applying).

## 2026-10-05 — First-user fixes, round 1: province search + sign-in returns people to the product

**Why (first-user test):** people scrolled a 77-item province list and gave up, and every sign-in landed on an empty dashboard (the header's "เข้าสู่ระบบ" link had no return path, so `next` defaulted to `/dashboard`).

**Done:**

- **Province picker** (onboarding + profile editor, shared `ProvinceField`): the existing searchable `VocabCombobox` instead of a `<select>`; "ไม่ระบุ" first, then a pinned "จังหวัดยอดนิยม" group (Bangkok, Chiang Mai, Khon Kaen, Chon Buri, Phuket, Nonthaburi; new `pinned` prop, shown only before typing, never duplicated), then the regions. Search also matches aliases (`PROVINCE_ALIASES`: กทม / bkk, โคราช / korat, หาดใหญ่, pattaya…). Onboarding pre-fills an empty field from the live map's `/api/live/whoami` (nearest province, Thailand only) with the hint "เดาจากตำแหน่งโดยประมาณ เปลี่ยนได้".
- **Sign-in routing** (`lib/next-path`, pure + tested): every sign-in link carries the current page (`HeaderAuth` uses the full pathname). The callback sends users without a username to onboarding, which then continues to that page; others go back where they were, else `/dashboard` if they have a startup, else `/startups?welcome=1`. `next` is internal-only (no `//` or `\`, ≤ 500 chars) and never `/login` or `/onboarding`. Onboarding keeps its 4 steps (owner decision). The login page no longer defaults to the dashboard and passes the locale to the callback.
- **Welcome banner** on `/startups?welcome=1` (dismissible): explore first, "เพิ่มผลงานของฉัน →" when ready.

**Files:** `src/components/profile-edit/{ProvinceField,OnboardingFlow,ProfileEditor}.tsx`, `src/components/wizard/{VocabCombobox.tsx,vocab-options.ts,vocab-options.test.ts}`, `src/lib/config/provinces.ts`, `src/lib/next-path{,.test}.ts`, `src/app/api/auth/callback/route.ts`, `src/app/[locale]/{login,onboarding,startups}/page.tsx`, `src/components/{HeaderAuth,LoginButtons,WelcomeBanner}.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ (project) · tests 283/283 (new: 12 province-search cases in th / en incl. กทม / bkk / โคราช / หาดใหญ่ / pattaya, alias and popular slugs exist, 77 options; 7 sign-in routing cases incl. open-redirect and loop refusals) · build ✓. Browser (temporary page, deleted): "ไม่ระบุ" → popular → regions; typing "กทม" leaves only กรุงเทพมหานคร and Enter stores `bangkok`; fits 375 px. `/th/startups?welcome=1`: banner fits 375 px, no horizontal scroll; header sign-in link = `/th/login?next=%2Fth%2Fstartups`.
**Not verified:** a real OAuth sign-in through the new callback (needs a real Google / GitHub sign-in on production), and the location pre-fill (Vercel geo headers exist only in production).
**Privacy note for the owner:** the pre-fill reuses the approximate location already described for the live map (/privacy §5) for a new purpose (suggesting a province); nothing is stored unless the user continues. Consider one line in /privacy (owner-approved wording, so not changed here).

## 2026-10-04 — Landed the iPhone upload fix and the share-image ฿ fix; trust pages shipped (/security approved, /terms as a labelled draft)

**Done:**

- **iPhone / Safari uploads (`49ca189`, deployed):** the parallel session's uncommitted work (screenshots and post images fall back to JPEG; migration `upload_images_jpeg`, applied 2026-10-02) was committed, rebased onto master (one PROGRESS.md conflict; its RLS tests renumbered T108–T112 → T115–T119 to avoid the avatar tests), and deployed. Database and code were out of step until then (buckets accepted JPEG, the app still uploaded WebP only).
- **Transparent PNG on Safari (item from the avatar close-out):** fixed by the same change: the shared encoder paints transparent pixels white before JPEG, for avatars too.
- **Share-image "฿" box (`1c5b7f7`, deployed):** the baht session's uncommitted work (`lib/og-fonts`: each font subset its own family, used by all 7 next/og routes) applied as a patch on master and deployed. Production builder card now shows "฿2k" and bold Thai.
- **`/security` and `/terms`** (footer links that 404): built with a shared `DocPage` (the Privacy page's frame), content in `messages/*.json` (`Security`, `Terms`). The security page states only what the code does (verified against the connectors, `crypto/keys.ts`, `sync.ts`, the cron schedule and the live DB: key table has no client grants, cascade on project delete). Terms is a plain-language draft.
- **Owner approval (2026-10-05):** `/security` as written; `/terms` published as a clearly labelled draft: "(ฉบับร่าง)" in the title and a warning-tone note under the date ("ยังไม่ผ่านการตรวจทานทางกฎหมาย และอาจมีการปรับปรุง"), rendered by `DocPage` from an optional `note` key. Not described as legally reviewed.
- **Claims re-audited against code and DB before shipping, two corrected:** "disconnect deletes that source's numbers _and history_" now says revenue / traffic only (GitHub's daily commit history in `build_activity` is kept); "the _project_ shows the connection failed" now says the dashboard (the connection shows "!" there). Terms §5 limited to what exists (hide / remove content, delete accounts; no "remove verification / suspend"). Confirmed: last 4 characters shown (`keyHint`), only error names logged (connect / disconnect / sync), keys cascade with the project, no client grants on the key table, cron 20:00 UTC = 03:00 ICT, "รีเฟรช" / "รายงาน" match the real labels. TH / EN structure identical (Security 5 sections, Terms 8, same items and ids).

**Files:** `src/components/DocPage.tsx`, `src/app/[locale]/{security,terms}/page.tsx`, `messages/*.json`, `Design.md`, `Project.md`, `PROGRESS.md` (+ the two landed commits)
**Verified:**

- Upload fix: typecheck ✓ · lint ✓ · tests 261/261 · build ✓; live DB (rolled back): `.jpg` screenshot / post image accepted, `.png` refused, another startup's folder refused, hide queues both files, both buckets exactly WebP + JPEG at 3 MB. Production: pages 200, existing WebP screenshots still served.
- ฿ fix: tests 264/264 (incl. font coverage) · build ✓; production OG images 200 (builder th / en, startup, home, olympics), builder card shows "฿2k".
- Trust pages: typecheck ✓ · lint ✓ · tests 264/264 · build ✓ (both prerendered in th / en; H1, 5 / 8 sections, contact link checked in the built HTML). Not viewed in the browser pane (the preview server runs the main checkout, not this worktree); same frame as the verified Privacy page.

**Next:** formal legal review of `/terms`, then remove the draft note. Owner-only pre-launch items remain in Project.md §7 (publish the Google consent screen, decide on the email provider, delete demo projects at launch).

## 2026-10-04 — OG images: "฿" missing-glyph box fixed (shared OG fonts)

**Done:**

- **Builder OG image** showed the verified revenue as "□2k". The amount is drawn in `Mono` (Inconsolata, Latin only), and "฿" (U+0E3F) exists only in the Thai subset of IBM Plex Sans Thai.
- **Root cause, every next/og route:** the renderer (Satori) keeps one file per family name and weight. The Latin and Thai Plex subsets were both registered as `Plex`, so the Latin file always won. "฿" became a box (builder card, post bodies, axis labels), and Thai text never used Plex Thai: it fell back to a font the renderer downloads at render time, at regular weight even where the card asks for bold (names, titles, badges).
- **Fix:** new `lib/og-fonts` (`ogFonts()`, `OG_SANS` = "Plex, PlexThai", `OG_MONO` = "Mono, PlexThai"). Each subset has its own family. All 7 renderers use it: builder, startup, post, home, olympics and province OG, plus `/api/share-card`. Removed the per-route "Baht" family workarounds (share-card calendar, olympics amounts). `lib/share-card.ts` has no fonts and needed no change.
- Side effects: bold Thai now renders bold, and the olympics podium amount takes the row's bold weight. Layout, palette and sizes are unchanged (Design.md §9).

**Files:** `src/lib/og-fonts{,.test}.ts`, `src/app/[locale]/{u/[username],startup/[slug],post/[id],province/[slug],olympics,}/opengraph-image.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `Design.md`
**Verified:**

- Reproduced "□2k" by rendering the real builder route (temporary Vitest harness with mocked data, deleted). After the fix, rendered PNGs of builder th/en, startup, post (body with "฿10,000" and "$300"), share-card badge dark/light, chart and calendar were all inspected: "฿" renders, digits are still Inconsolata, Thai is Plex Thai at the right weights.
- Dev server PNGs of olympics, province and home inspected.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 264/264 ✓. New test: no duplicate family + weight, and both stacks cover ฿ / Thai / $ / digits.
- `npm run build` ✓. All 7 routes' `.nft.json` still trace the font files.

**Not verified:** the live builder route locally (it needs `SUPABASE_SECRET_KEY`, not available here); production after deploy.
**Next:** owner review → push → re-check https://jaopor.vercel.app/th/u/gxcb06/opengraph-image after deploy (it is cached for up to 300 s).

## 2026-10-04 — Profile photo (avatar) work closed: production-complete

**Done:**

- **Security migration** `profile_avatars_v2` applied 2026-10-02 after the owner's security review; full RLS smoke T1–T114 passed on the live database (client writes to `avatar_url` and to the `avatars` bucket refused, URL source constraint, own-folder cleanup, fail-closed bucket, 20 changes a day).
- **UX / reliability fixes deployed:** `7d74768` (initials fallback for every person photo, header updates without a reload, share images use uploaded photos, result-specific Thai / English wording) and `7d06f3d` (the owner's cached product, home and directory pages refresh after a photo change; founder-message photo fallback).
- **Production deployment completed:** `7d06f3d` live on jaopor.vercel.app (deployment `dpl_EqCQsHE4HF8fSWjoev2Y7tLs4H8d`, READY).
- **Manual production verification passed** (owner, 2026-10-04): upload, replace, sign-in photo, remove, invalid files, persistence, consistency across the product, share image, cached pages.
- **Real-device / iPhone verification passed** (owner, 2026-10-04).
- Server-side evidence from the same day: every replaced upload deleted (empty folder, empty cleanup queue, deleted URLs answer 400), no profile with a disallowed photo URL, product page / home / builders / feed / profile and the share image show the current photo.

**Status:** profile photo is **production-complete**.
**Known non-blocking items** (Project.md §7): transparent PNG from Safari gets a black background; very large phone photos decode at full size (monitor only). Separate, not avatar work: the share image's baht sign renders as a missing-glyph box (own session).
**Files:** `PROGRESS.md`, `Project.md` (docs only; no code or migration change)

## 2026-10-04 — Fix: product page kept the old founder photo after a photo change

**Root cause (owner report):** the product page (and home / directory) are ISR pages (60 s) that show the owner's photo, but the avatar actions only refreshed the dashboard and `/u/[username]`. ISR is stale-while-revalidate: after a change the product page kept serving the old photo until 60 s had passed _and_ a visit triggered a rebuild (production: `/th/startup/jaopor` served `STALE` at age 304–305 s with an old uploaded photo, then rebuilt on the next visit). The old file was already deleted, but the browser's image cache (1 year) kept showing it, so it looked unchanged rather than broken. Second, smaller cause: the founder-message photo (`ProfileBlocks`, 80 px) was missed by the `PersonPhoto` pass, so without a cached copy it would have been a broken image.

**Done:** after a successful photo change the actions refresh the owner's projects' pages in every locale (`/{locale}/startup/{slug}`, `/{locale}`, `/{locale}/startups`, the same set as `revalidateStartup`), read with the user's own client (RLS) and not exported as an action. Founder-message photo now uses `PersonPhoto` (initials fallback). No database change.

**Files:** `src/app/actions/profile.ts`, `src/components/ProfileBlocks.tsx`
**Verified:** typecheck ✓ · lint ✓ · tests 261/261 · build ✓. No other person-photo renderer outside `PersonPhoto` remains (sweep of `<img>` / `<Image>`).
**Not verified:** the immediate refresh on production (needs a signed-in photo change after deploy).

## 2026-10-04 — Profile photo review fixes (fallback, header refresh, share image, wording)

**Done (owner review, category "fix before public launch"):**

- **Photo fallback everywhere** (`PersonPhoto`): 11 hand-rolled avatar renderers (shared Avatar for posts / comments / chat / feed, builder cards, profile, dashboard, requests, connections, sidebar, header, quick search, leaderboard, startup founder) now show the frame's initials when a photo is missing, not https, deleted or fails to load, including images that fail before hydration. Fixes the blank circle on cached home / startup pages (60 s ISR) after a photo change deleted the old file, without giving up caching.
- **Header updates at once:** the editor announces the confirmed stored URL (`lib/avatar-events.ts`, a same-page event) and the header listens; no global store, no reload. The editor now shows the stored URL instead of a local blob preview (the actions return `{ ok, url }`).
- **Share images used to drop uploaded photos:** the OG renderer only fetched `lh3.googleusercontent.com` / GitHub; it now uses `shareablePhoto` (Google `lhN` / GitHub, or a uuid file in our own avatars bucket, nothing else).
- **Wording:** toasts name the result ("อัปเดตรูปโปรไฟล์แล้ว" / "เปลี่ยนเป็นรูปจาก {provider} แล้ว" / "ลบรูปโปรไฟล์แล้ว"); the button names the provider ("ใช้รูปจาก Google"); the hint keeps formats, centre-square crop and location removal, drops "512 px" and processing details.

**Files:** `src/components/PersonPhoto.tsx`, `src/lib/avatar-events.ts`, `src/lib/avatar{,.test}.ts`, `src/lib/avatar-flow{,.test}.ts`, `src/lib/og-images.ts`, `src/app/actions/profile.ts`, `src/components/profile-edit/{AvatarField,ProfileEditor}.tsx`, `src/components/{HeaderAuth,LeaderboardCard,posts/bits,builder/BuilderCard,dashboard/DashboardSidebar,search/QuickSearch}.tsx`, `src/app/[locale]/{u/[username],startup/[slug],dashboard,dashboard/{profile,requests,connections}}/page.tsx`, `messages/*.json`, `Design.md`
**Verified:** typecheck ✓ · lint ✓ (project; worktrees excluded) · tests 261/261 (new: stored URL returned by the flow, provider name, share-image allowlist) · build ✓ · browser (temporary page, deleted): live Google photo loads; deleted Storage file, non-https URL and no photo all show initials in both the shared Avatar and a bare frame. No database change: live check confirms avatar_url not client-writable, 3 restrictive storage policies, bucket 1 MB webp/jpeg, constraint + cleanup trigger present, rate function not callable by anon.
**Not verified:** header update and toasts while signed in (needs the owner's session), share image with the uploaded photo (after deploy), any iPhone / Safari behaviour.
**Next:** owner review → push → owner signed-in check + real iPhone test.

## 2026-10-02 — Screenshot and post image uploads on iPhone / Safari (JPEG fallback; migration applied, not deployed)

**Done:**

- **Bug:** Safari (macOS, and every browser on iOS, since they all run WebKit) can't encode WebP from a canvas. `toBlob("image/webp")` returns a PNG, so `toWebp` threw `no-webp`. Every screenshot upload (wizard / edit) and every post image (Composer) failed on iPhone. Confirmed on caniuse (`toBlob` WebP: not supported in any Safari or iOS version up to 27.2) and in WebKit bug 183257 (still open).
- `src/lib/webp.ts`: `toUploadImage()` replaces `toWebp()`. Encoding goes WebP → JPEG, shared with `toAvatarImage()`. For JPEG, transparent pixels are painted white (they used to turn black). It returns `{ blob, type, ext, width, height }`. ScreenshotsManager and Composer upload `{id}/{uuid}.webp|jpg` with the matching content type. `cleanupPostUpload` accepts `.jpg`. The "this browser can't convert to WebP" toast and its `noWebp` keys are removed.
- **Migration `20261001180710_upload_images_jpeg`** (applied 2026-10-02 after owner review; remote version `20261001181333`): the `screenshots` and `post-images` buckets accept `image/jpeg` too, and the `startup_screenshots.path` / `post_images.path` checks accept `.webp|.jpg`. Storage policies check only the folder, so they are unchanged (confirmed on the live DB: no policy or function mentions `.webp`). RLS smoke T108–T112 added (renumbered T115–T119 when merged after the avatar tests; T119 checks that both buckets accept exactly WebP and JPEG; the Storage API enforces the type, not SQL), and T86 now expects 2 queued files.
- **Avatar migration not applied (coordination check):** the owner chose to apply `20261001175557_profile_avatars` first. In the main checkout another session has replaced it with `20261001181036_profile_avatars_v2` (uncommitted and still being edited: identity-data provider photo, a URL source CHECK, cleanup tied to the profile's own folder, restrictive storage policies, rate limit) and staged the old file for deletion. Applying the old draft would have shipped the weaker version and broken v2 (duplicate trigger), so neither avatar migration was applied from here.

**Files:** `src/lib/webp.ts`, `src/components/wizard/ScreenshotsManager.tsx`, `src/components/posts/Composer.tsx`, `src/app/actions/posts.ts`, `supabase/migrations/20261001180710_upload_images_jpeg.sql`, `supabase/tests/rls_smoke.sql`, `messages/*.json`, `docs/SPEC.md`, `Design.md`
**Verified:**

- `npm test` 247/247 · typecheck ✓ · lint ✓.
- The `encode()` logic in the browser pane (Chromium), with `toBlob` patched to answer WebP requests with PNG like Safari does: the output is `image/jpeg`, the transparent half is white and the red half is unchanged. Unpatched, it stays `image/webp` with alpha kept.
- Live DB after applying: `screenshots` and `post-images` = `image/webp,image/jpeg`, 3 MB; both path checks = `\.(webp|jpg)$`. Advisors: nothing new (the only WARN, leaked-password protection, is an existing Auth setting). RLS smoke: every test good, including T108–T112 (now T115–T119), **except T105–T107** (avatar tests, expected to fail until an avatar migration is applied; T105 "client sets avatar_url: ALLOWED" is the existing production gap that v2 closes). Types: unchanged (bucket rows and CHECK constraints aren't in the generated types).
- `npm run build` ✓ (after `npm ci` in the worktree, which had no `node_modules` of its own).
- **Not done:** commit, push, deploy and the production checks (iPhone upload, existing WebP uploads, cleanup). This branch sits on the unpushed avatar commit `953954b`, so pushing it would ship the avatar UI without its migration while another session is reworking that code on `master`.

**Next:** the avatar session lands v2 (apply, smoke T105–T107 against its own tests); then merge this branch (expect conflicts in `rls_smoke.sql`, PROGRESS.md and Project.md), deploy, and test uploads from an iPhone.

## 2026-10-02 — Profile photo upload (migration applied after owner security review; not pushed yet)

**Done:**

- **Profile photo** in the editor (ข้อมูลพื้นฐาน, first row): "เปลี่ยนรูป" (centre-cropped to a 512 px square on the device, WebP or JPEG on Safari, metadata removed), "ใช้รูปจากบัญชีที่ใช้เข้าสู่ระบบ", "ลบรูป". Saved immediately, outside the form's save bar. The header avatar now uses the profile photo too.
- **Server action** `uploadAvatar` / `resetAvatar`: the file type is decided by its first bytes (WebP / JPEG), ≤ 1 MB, uploaded with the service role to `avatars/{user}/{uuid}.webp|jpg`; the previous photo is deleted right away.
- **Migration** (NOT applied; superseded by `_v2`, see the review below): `avatars` bucket (public read, no client policies), `profiles.avatar_url` no longer client-writable (closes a gap: any user could point it at any URL that every visitor's browser would load), replaced / removed / deleted-account photos queued in `storage_cleanup`. RLS smoke T105–T107 added.

**Files:** `supabase/migrations/20261001175557_profile_avatars.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/avatar{,.test}.ts`, `src/lib/webp.ts`, `src/app/actions/profile.ts`, `src/components/profile-edit/{AvatarField,ProfileEditor}.tsx`, `src/app/[locale]/dashboard/profile/page.tsx`, `src/components/HeaderAuth.tsx`, `messages/*.json`, `Design.md`
**Verified:** `npm test` 247/247 · typecheck ✓ · lint ✓ · build ✓ · AvatarField at 375px (both states) on a temporary preview page (deleted).
**Next:** owner reviews the migration → apply, advisors, RLS smoke, regenerate types → push → test an upload on production.

**Security review (owner checklist, same day), before approval:** the draft migration was replaced by `20261001181036_profile_avatars_v2.sql` (draft never applied or pushed). Found and fixed: (1) "use my sign-in photo" read user_metadata, which users can edit through the Auth API → arbitrary URL, or a look-alike of another user's file that a later change would have queued for deletion; now read from `auth.identities` + a Google / GitHub host allowlist; (2) sign-up copied metadata unchecked → filtered in `handle_new_user`; (3) avatar_url now has a CHECK constraint (Google / GitHub hosts, or this profile's own folder of our bucket) binding the service role too; (4) cleanup trigger limited to the profile's own folder; (5) restrictive storage policies (no client writes to avatars, ever); (6) fail closed on a misconfigured existing bucket; (7) 20 photo changes a day; (8) orphan handling (failed update deletes or queues the new file, interrupted uploads swept on the next change, the drain never deletes a photo in use); (9) a `{1,440}` regex that Postgres rejects (limit 255) was caught by the dry run. Dry run of migration + T104a–T114 on production inside one rolled-back statement: all 25 checks good; fail-closed bucket check good; production verified unchanged afterwards. Unit: 258/258.

**Applied 2026-10-02 (owner: "Approve … Apply"), verification gate on the live database:** full `rls_smoke.sql` T1–T114 all good (T104a–T114: sign-up filter, privileges, client avatar_url update denied, own name / headline still editable, no client insert / update / move / copy / delete in `avatars` incl. anon, constraint refuses other folders / look-alikes / fake hosts, refused update queues nothing, replaced / deleted-account photos queued, provider URLs never queued, 21st change limited, bucket `public / 1 MB / webp+jpeg`, 3 restrictive policies, definer functions with `search_path=""`). Service-role path (rolled back): writes an avatar object, sets an own-folder URL, resets to a provider photo, is refused an arbitrary URL. No test data left. Security advisors: no new findings (existing leaked-password WARN + INFO). Types regenerated: identical to the committed file. typecheck ✓ · tests 258/258 ✓ · build ✓ · lint: 0 problems in the project; `npm run lint` also scans the parallel iPhone-upload task's worktree under `.claude/worktrees/` (15,061 problems, all there). The migration file still says "NOT APPLIED" in its header: it was committed before applying and committed migrations are protected from edits.

## 2026-10-02 — Profile revenue dashboard (Figma 160-2); chat unblock

**Done:**

- **Profile "รายได้รวม" dashboard** (owner request: follow the Figma / HTML mockup, Design.md §6 "Profile revenue dashboard"): replaces the startup page's MetricChart on profiles. Toolbar with the tabs and 7 วัน / 30 วัน / 12 เดือน (year buttons on the activity tab, same style); range total in the visitor's currency, growth vs the previous period (complete days only), legend with the works included; brand area + line, the previous period dashed behind it, today (this month on 12 เดือน) as a dashed partial segment ending in a ring; hover / touch / arrow-key tooltip; a screen-reader table; footer "ยืนยันผ่าน {sources} · อัปเดตล่าสุด {time} · ไม่รวมผลงานที่ยังไม่ยืนยัน". Verified, non-demo works only (the owner's own profile has only demo works, so it shows the owner prompt instead). Pure windowing in `lib/profile-revenue.ts`.
- **Unblock** (owner question): the person who blocked sees "คุณบล็อกแชทนี้ไว้ · เลิกบล็อก" in the chat. Unblocking reopens the chat and undoes only what that block changed (the opening request is accepted again so LINE / email are shared as before; other requests it closed become declined; anything blocked earlier stays blocked; the accept trigger's notifications are removed). The block dialog no longer says "ถาวร".
- **Gap closed:** blocking a contact request from คำขอคุย now also closes an existing chat with that person.

**Files:** `src/lib/profile-revenue{,.test}.ts`, `src/lib/data/builder.ts` (`getBuilderRevenue`), `src/components/builder/{ProfileRevenueChart,ProfileChartTabs,toolbar}.tsx|ts`, `src/app/[locale]/u/[username]/page.tsx`, `src/app/actions/{chat,profile}.ts`, `src/lib/data/chat.ts`, `src/components/chat/ChatThread.tsx`, `src/app/[locale]/dashboard/messages/[id]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 244/244 (new: 30-day window with today partial, 7 days without today, growth on complete days only, nulls before the first data, 12-month buckets, nice axis max, works label) · typecheck ✓ · lint ✓ · build ✓ · all new keys in th and en.
- Temporary preview with sample data (deleted): 900px (tooltip, legend, partial ring, axis, footer), 12 เดือน, 375px (no horizontal scroll; x labels first / middle / "วันนี้" only after a label collision was found and fixed), owner empty state (en), chat "You blocked this chat · Unblock".
- Production: @gxcb06 (JaoPor, Stripe-verified, ฿0) shows the tabs, ranges, legend, partial month and footer. Fix found there: with all-zero revenue the y axis read "฿1 / ฿1 / ฿0"; it now shows only "฿0".
- **Not verified yet:** unblocking on production with the owner's accounts.

**Next:** owner unblocks the test chat (jaopor_dev → chawankorn_bouraphan) and checks the profile dashboard on a profile with verified, non-demo revenue.

## 2026-10-02 — Phase 11: in-app 1:1 chat

**Done:**

- **Migration `20261001160319_chat`** (applied after owner review): `conversations` (one per pair, opened by an accepted contact request + backfill of the 2 existing accepted pairs), `chat_messages` (text 1–2,000, no edits, 200 a day via `rate_events`), `conversation_reads`, report target `message` (participants only), Realtime publication. Participants only (RLS); clients never create or block conversations.
- **`/dashboard/messages`** (Design.md §5 Chat): conversation list with unread counts, and a conversation pane with day and sender grouping, live messages over Supabase Realtime (RLS applies) with 10s polling while the live channel is down, an Enter-to-send composer (counter after 1,800), block (closes the chat for good and blocks the contact request so LINE / email stop being shared), and report a message. On phones only the list or the conversation shows.
- **Entry points:** header message icon with unread badge (from `sm`), "ข้อความ" in the avatar menu, sidebar item with badge, "ส่งข้อความ" on a profile once a request is accepted, "เปิดแชท" on accepted rows in คำขอคุย (`?with=<user>` resolves to the conversation).
- **/privacy** (owner-approved wording): posts item in §2, new §7 "ข้อความ (แชท)" (not end-to-end encrypted, read only when reported, block, 200 a day), deletion section covers posts, comments and messages; renumbered; date updated.

**Files:** `supabase/migrations/20261001160319_chat.sql`, `supabase/tests/rls_smoke.sql` (T91–T104), `docs/SPEC.md` §13, `src/lib/{chat,chat.test}.ts`, `src/lib/data/chat.ts`, `src/app/actions/{chat,posts}.ts`, `src/components/chat/*`, `src/app/[locale]/dashboard/messages/**`, `src/components/{HeaderAuth,builder/ProfileActions,builder/ReportDialog,dashboard/DashboardSidebar}.tsx`, `src/app/[locale]/dashboard/{layout,requests/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- RLS smoke 104/104 good (T91–T104 chat: outsider can't read or write, no message without an accepted request, blocked conversation refuses messages, daily limit, message reports participants only). Advisors: no new WARN.
- `npm test` 237/237 · typecheck ✓ · lint ✓ · build ✓ · every Chat / nav / privacy key present in th and en.
- Layout with sample data (temporary preview page, deleted): 1280 two panes, 375 list-only and conversation-only, no horizontal scroll, long links wrap. Fix found while checking: the thread's auto-scroll used `scrollIntoView`, which also scrolled the page; it now scrolls only the message list.
- /privacy (en) shows sections 1–10, "Messages (chat)" as §7, date October 2, 2026.
- **Not verified yet:** signed-in chat between two real accounts (Realtime, unread badges, block) — needs the owner's sessions.

**Next:** owner tests chat with two accounts that have an accepted request.

## 2026-10-01 — Phase 10e: builder profile v2 + startup page "อัปเดตล่าสุด"; feed rail status fix

**Done:**

- **Profile v2** (Figma "Founder Prfile 2nd" 160-2, Design.md §6): breadcrumb; proof line under the handle ("{n} ผลงาน · {v} ยืนยันแล้ว · สร้างมา {m} เดือน"); followers with the 30-day gain ("+12"); superpower skills as large chips; 4 stat tiles (MRR รวม, รายได้ทั้งหมด, GitHub ★ + commits, อัปเดตผลงาน in 6 months; zero tiles hidden); one card with tabs "รายได้รวม | กิจกรรมการสร้าง" (the startup page's chart fed with the sum of the verified, non-demo works via `getBuilderChart` + pure `sumSeries`; the heatmap with its year switcher; no verified revenue → heatmap only); pinned works (4 + "ดูทั้งหมด n ›" in place); "อัปเดตผลงาน" (latest 4 PostCards, 2-column masonry, "ดูฟีดทั้งหมด →"); experience as a 3-column grid at the bottom. "กิจกรรมล่าสุด" removed (the updates replace it).
- **Edit in place (option C):** for the owner each section title has "✎ แก้ไข" opening the editor on exactly that section (`/dashboard/profile#basics|status|skills|pinned|experience`).
- **Startup page "อัปเดตล่าสุด":** the latest 3 posts as compact PostPreview cards from a cookie-free query, so the page stays ISR-cached.
- Demo projects no longer count toward GitHub stars, commits or "สร้างมา n เดือน" on a profile (sample data).
- **Feed rail (owner screenshot):** "คนสร้างที่น่าติดตาม" wrapped the status pill into a blob in the ~240px rail → a one-line "● หา Co-founder" label.

**Files:** `src/app/[locale]/u/[username]/page.tsx`, `src/components/builder/ProfileChartTabs.tsx`, `src/components/posts/PostPreview.tsx`, `src/lib/builder{,.test}.ts` (`sumSeries`), `src/lib/data/{builder,posts}.ts`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/[locale]/feed/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 235/235 · typecheck ✓ · lint ✓ · build ✓
- Local: the startup page shows "อัปเดตล่าสุด" with the owner's test post (RaanDee POS), no overflow.
- Production (viewed signed in as another account): breadcrumb, proof line, GitHub + updates tiles, "ดูทั้งหมด 5 ›", the updates section with the test post, experience grid; no horizontal scroll at 1193px. The revenue / activity card is correctly hidden for visitors (no verified non-demo revenue, no activity yet).
- Deviation from the spec (Design.md): the revenue chart ends yesterday like the startup chart, so there is no dashed "วันนี้ (ยังไม่ครบวัน)" point.

**Next:** owner review of Phase 10 as a whole; then Phase 11 (in-app chat).

## 2026-10-01 — Phase 10d: automatic milestone posts; profile editor "unsaved" fix

**Done:**

- **Bug (owner report):** after saving the profile editor it still said "มีการเปลี่ยนแปลงที่ยังไม่บันทึก". The form was compared with the page's `initial` data, which the server stores differently (public visibility omitted, links normalised, new experience rows get ids), so they never matched after the refresh. Both the editor and the Settings visibility form now compare with a snapshot of what was last saved.
- **Milestones** (`lib/milestones.ts`, pure): per startup, verified data only (demo / unpublished never qualify): first verification, MRR ฿1k / 10k / 100k, total revenue ฿100k / ฿1M (THB from the daily rate), GitHub ★100 / ★1k (only once the GitHub source has synced). In each family only the highest level reached is posted, and never a level at or below one already in the ledger (no backlog on the first run; a drop and recovery or a deleted post never brings one back). No Olympics podium milestone (owner decision).
- **Job** (`lib/milestones-job.ts` + `lib/milestones-store.ts`, in the daily cron after the syncs): claims the ledger key first (`on conflict do nothing`), posts only when this run claimed it, links the post; a failed post releases the claim for the next run. Auto posts are authored by the startup owner.
- **Cards** render the milestone headline from its key in the visitor's language (the stored Thai body is the fallback), with a ฿ / ★ / ✓ badge and "ยืนยันผ่าน {source}" (GitHub for stars).

**Files:** `src/lib/milestones{,-job,-store}.ts`, `src/lib/milestones.test.ts`, `src/app/api/cron/sync/route.ts`, `src/lib/data/posts.ts`, `src/components/posts/PostCard.tsx`, `src/components/profile-edit/ProfileEditor.tsx`, `src/components/dashboard/SettingsForm.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 234/234 — new: highest level only on the first run; no re-post after a drop and recovery; verified-only (unverified, demo, hidden, unsynced stars skipped); no money milestones without a rate; key round-trip; **job idempotent** (two runs in a row and two runs at once each post every milestone exactly once, against an in-memory store with the database's uniqueness rules); a failed post is retried on the next run.
- typecheck ✓ · lint ✓ · build ✓
- Dry run on production data (read-only): one published non-demo startup (JaoPor, verified, ฿0 MRR, ★0), so the next cron posts one milestone: first verification.
- **Not verified yet:** the editor fix on production (needs the owner's session) and the first real cron run.

**Next:** owner re-checks saving the profile; Phase 10e (profile v2 + startup page "อัปเดตล่าสุด").

## 2026-10-01 — Phase 10c: /feed, header nav, notification bell

**Done:**

- **`/feed`** (Figma 160-555): views ล่าสุด / กำลังติดตาม / ยอดนิยมสัปดาห์นี้, type chips, province and category, all in the URL; composer on top; PostCards with "โหลดเพิ่ม" appending pages in place (`/api/feed`, cursor = last post time; popular and "waiting" page by offset). Right rail: builders to follow (not me, not already followed; FollowButton), most active startups this week, and "รอ Feedback จากคุณ" (feedback posts from the last 14 days that aren't mine and I haven't commented on; signed out: those with no comments) linking to `?waiting=1`.
- "ยอดนิยมสัปดาห์นี้" = last 7 days ranked by (likes + 2 × comments) / (hours + 2)^1.5 (pure `lib/feed.ts`, tested).
- **Header** follows the Figma nav: สตาร์ทอัพ · คนสร้าง · ฟีด · หมวดหมู่ · โอลิมปิก (owner decision). The leaderboard link moved to the Olympics page ("ดูกระดานผู้นำสตาร์ทอัพ →"), the footer and the mobile menu; ฟีด added to the mobile menu and footer.
- **NotificationBell** next to the avatar: unread count (polled every minute while the tab is visible), the latest 15 (likes, comments, requests) linking to the post or the requests page; opening marks them read. The dashboard "คำขอคุย" badge now counts pending incoming requests (it used unread notifications, which the bell now clears).
- Fix found while checking: PostCard renders inside the client feed list, so the startup logo URL is now resolved on the server (`lib/supabase/public` is server-only).

**Files:** `src/app/[locale]/feed/page.tsx`, `src/app/api/feed/route.ts`, `src/lib/feed{,.test}.ts`, `src/lib/data/{feed,posts,me}.ts`, `src/components/posts/{FeedList,PostCard}.tsx`, `src/components/builder/FollowButton.tsx`, `src/components/{NotificationBell,HeaderAuth,SiteHeader,MobileNav,SiteFooter}.tsx`, `src/app/[locale]/{olympics/page,dashboard/layout}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 226/226 · typecheck ✓ · lint ✓ · build ✓
- Local against live data (the owner's two test posts): every view and filter (popular 2, following signed-out prompt, lesson / saas empty, feature 1, Bangkok 1, waiting empty), `/api/feed` 200, cursor paging (older than newest → the second post; popular offset 1 → the second post).
- Layout: 1440 three columns; 1024 first overflowed by 63px (rail squeezed to 0) → three columns only from `xl`, rail under the posts at `lg`, re-checked with no overflow; header fits at 1024; 375 no horizontal scroll, view tabs moved out of the folded filters so they stay visible on phones.
- **Not verified locally:** "who to follow" (needs the service-role key; it fails soft) and the bell (needs a session) — checked on production next.

**Next:** owner checks the bell and the feed on production; then Phase 10d (automatic milestone posts).

## 2026-10-01 — Phase 10b: posting (composer, PostCard, post page, comments, reports, link previews, image cleanup)

**Done:**

- **Server actions** (`actions/posts.ts`, all writes through the user's own RLS client): create / edit (15 min) / delete post, like / unlike, comment + reply, soft-delete comment, report a post / comment / user (`reportTarget`, which replaces `reportUser`). Database errors map to friendly messages (daily limit, not a team member / edit window closed, invalid).
- **Link previews** (`lib/net/link-preview.ts` + pure `lib/og-parse.ts`): server-side only, same SSRF guard as provider URLs re-checked on every redirect (max 3), 3 s timeout, 512 KB cap, https images only, kept on the post (service role writes `link_preview`, only if the link didn't change meanwhile) and memoised for a day.
- **Images**: the browser converts to WebP and drops EXIF (shared `lib/webp.ts`, screenshots use it too), uploads into `post-images/{post_id}/`, then records the row; a file whose row fails is removed (`cleanupPostUpload`). **Storage cleanup worker** (`lib/storage-cleanup.ts`): deletes queued files right after deleting a post and in the daily cron for the rest.
- **UI** (Design.md §5 PostCard / Composer / Post page): PostCard (type chips incl. the new `--info` teal token, gold milestone card, link card, image grid, ♥ with optimistic count, comments link, LINE / X share, ⋯ edit / delete / report; feedback posts show their first comment and "ให้ Feedback"), Composer on the dashboard overview (startup + type pickers, ≤ 4 images, link, counter, rules line), `/post/[id]` with the comment thread (one level of replies, tombstones, delete own, report others) and an OG image.
- The "คำขอคุย" badge and "mark read" now only count request notifications (likes / comments get the bell in 10c).

**Files:** `src/app/actions/posts.ts`, `src/lib/{posts,og-parse,storage-cleanup,webp}.ts` (+ tests), `src/lib/net/link-preview.ts`, `src/lib/data/posts.ts`, `src/components/posts/*`, `src/components/builder/ReportDialog.tsx`, `src/app/[locale]/post/[id]/{page,opengraph-image}.tsx`, `src/app/[locale]/dashboard/page.tsx`, `src/app/api/cron/sync/route.ts`, `src/lib/data/me.ts`, `src/app/actions/profile.ts`, `src/app/globals.css`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 221/221 (new: post helpers, Open Graph parser) · typecheck ✓ · lint ✓ · build ✓
- Embeds checked against the live REST API (posts → author / startup / images, comments → author, members → startup: all 200). `/th/post/999999` and `/th/post/abc` → 404.
- Browser (local, sample data on a temporary dev-only page, deleted afterwards): composer, milestone / feature / feedback / lesson cards, link card, liked state, comment thread with reply and tombstone; 375px: no horizontal scroll, every card footer on one line after moving "ให้ Feedback" to its own row and shortening "แชร์ไป LINE" to "LINE" on phones.
- **Not verified yet (needs the owner's session on production):** posting with an image and a link, likes, comments, delete, report.

**Next:** owner tests posting on production; then Phase 10c (`/feed`, header "ฟีด", notification bell).

## 2026-10-01 — Phase 10a: feed_posts migration applied (after two review rounds)

**Done:**

- **Applied (owner: "apply") `20261001092434_feed_posts`**, which replaced the unapplied draft `20261001084406` after the owner's review: posts (confirmed members only, 5/day, text edits for 15 minutes, province / category copied from the startup), `milestones` ledger (a milestone is never posted twice, even after its post is deleted), post_images + public `post-images` bucket, `storage_cleanup` queue (every removed / cascaded / hidden-post image queues its file for server deletion), likes and comments (one level of replies, soft delete; deleting an account turns that person's comments into tombstones so other people's replies stay), counters, `reports` for users / posts / comments (copies `user_reports`), post_like / post_comment notifications, and posts in the activity heatmap (published, non-demo startups only).
- **Review fixes before applying:** daily limits kept in `private.rate_events` with a per-user advisory lock (deleting or hiding no longer resets them, concurrent requests can't slip past); likes and comments only on publicly visible posts (explicit hidden / published check); replies to deleted comments blocked; case-insensitive link check; notification kind ↔ post / comment reference check; redundant 4-image trigger and the feedback index dropped.
- `reportUser` now writes to `reports` (target_type user). Types regenerated.

**Files:** `supabase/migrations/20261001092434_feed_posts.sql` (old draft removed), `supabase/tests/rls_smoke.sql` (T64–T90), `src/lib/supabase/database.types.ts`, `src/app/actions/profile.ts`, `src/components/builder/ReportDialog.tsx`
**Verified:**

- Live checks before applying: no preview branches, migration not applied anywhere, the activity view had no dependents or grants, `user_reports` empty with the same reasons and no status column, clients can't insert notifications.
- RLS smoke **90/90** (new: member posts and the province is copied; non-member, milestone and link_preview writes refused; 6th post refused and still refused after deleting 4; author edits; image upload while editable; milestones / storage_cleanup / rate_events unreadable; others can't edit or delete a post or delete a comment; like → unlike → like notifies once; comment notifies the author; reply to a reply refused; likers private; forged notification refused; report filed but unreadable; deleted account tombstones the comment, keeps the reply and fixes the count; heatmap counts posts; hiding drops images and queues the file; hidden post invisible, can't be liked or commented on, still visible to its author). The first run showed a test bug (the 4 posts were inside the exception block that rolled them back); fixed and re-run.
- Advisors: no new WARN (INFO only: the server-only tables have no client policies by design; new indexes unused yet).
- typecheck ✓ · lint ✓ · `npm test` 212/212 · build ✓

**Next:** Phase 10b (posting: server actions, link previews, image upload, PostCard, composer, `/post/[id]`, reports for posts and comments, storage cleanup worker). Later migration: copy any new `user_reports` rows into `reports`, then drop `user_reports`.

## 2026-10-01 — Profile editor fix (one section at a time + per-field visibility), footer tagline, decisions

**Done:**

- **Owner decisions recorded** (Project.md §6): editor A+B now, edit-in-place with Phase 10; Phase 10 in order 10a → 10e; chat after Phase 10; follower counts GitHub + YouTube first, no LINE OA (its token can send messages); no Olympics podium milestone; pricing card = image; the five Phase 10 rules approved. The `feed_posts` migration stays unapplied until 10a.
- **Profile editor** (`/dashboard/profile`): six sections behind a tab row (✓ / "1/3" per tab), "โปรไฟล์ครบ {pct}%" bar with "ถัดไป: {section}", ← / → between sections, one sticky save bar. Links and private contacts share one section; social links show the filled ones plus "+ GitHub", "+ LinkedIn"… chips; experience starts as a single "+ เพิ่มประสบการณ์" button. Deep links (`#province`, `#skills`, `#experience`) still open the right section.
- **VisibilityMenu**: who can see bio, province, looking-for, skills, experience and social links is set next to each one (สาธารณะ / สมาชิก / ซ่อน, with a one-line explanation); non-public shows in amber. Saved with the profile; Settings shows the same values (activity graph stays there).
- **Footer tagline** (user): "ดินแดนมาเฟียของเหล่า Startup และผลงานที่สร้างด้วย AI ในไทยและเอเชีย ผลงานจริง รายได้จริง ตัวเลขจริง" (EN equivalent).
- **BizModel.md**: removed the old summary (former lines 1–68); only the current version remains.

**Files:** `src/components/profile-edit/{ProfileEditor,VisibilityMenu}.tsx`, `src/components/wizard/fields.tsx` (Field `action` slot), `src/app/[locale]/dashboard/profile/page.tsx`, `messages/*.json`, `Design.md`, `Project.md`, `BizModel.md`
**Verified:**

- typecheck ✓ · lint ✓ · `npm test` 212/212 · build ✓
- Browser (local, editor rendered with sample data on a temporary dev-only page, deleted afterwards; the real page needs a signed-in session): tabs switch sections, the visibility menu changes the value and marks the form unsaved, link chips reveal inputs, `#province` opens Basics and focuses the field; 375px has no horizontal scroll and the tab row scrolls sideways. Footer text checked on /th/categories.
- **Not verified:** saving from the real page (needs the owner's session on production after a push).

**Next:** owner review; then Phase 10a (review + apply `feed_posts`, RLS smoke tests). Nothing pushed yet (owner: keep `2bbfb1a` local until the editor fix and 10a are settled).

## 2026-10-01 — Phase 9c: /builders directory + people in QuickSearch; startup owner-bar copy

**Done:**

- **Copy (user):** the startup page's owner bar now reads "นี่คือโปรไฟล์ Startup ของคุณ — …" and its button "แก้ไข Startup" (EN "This is your startup's profile", "Edit startup"), so it isn't confused with the builder profile.
- **`/builders`** (spec 9c): hero with a people search, filter sidebar (skill · area = region or province · status · สร้างด้วย · verified only; same no-JS GET form and mobile toggle as /startups), BuilderCard grid (avatar, name, @handle, headline, status, top 3 skills with superpowers first, "n ผลงาน", verified ฿/month, province), ordered by verified revenue → verified works → works → newest, 24 per page.
- **Privacy:** rows come from the anonymous view only. Only `show_in_directory` profiles are listed, and a province or skills set to members / hidden are dropped before filtering, so filters can't reveal them. Works = confirmed memberships of published startups; revenue = verified, non-demo.
- **QuickSearch "คน" group** (up to 4, handle prefix first; a failure there can't break startup search); placeholder mentions people.
- **Navigation:** header "คนสร้าง" (the home-anchor leaderboard link now shows from 1280px only, so 1024px still fits), mobile menu, footer; the dashboard sidebar's คนสร้าง / หา Co-founder links are live (no more "เร็ว ๆ นี้").
- Shared **StatusPill** (tone by status); the profile page's pill was always green, now busy is neutral and networking is brand.

**Files:** `src/app/[locale]/builders/page.tsx`, `src/components/builder/{BuilderCard,StatusPill}.tsx`, `src/lib/builders{,.test}.ts`, `src/lib/data/builder.ts` (`listBuilders`, OG card counts published works only), `src/app/api/search/route.ts`, `src/components/search/QuickSearch.tsx`, `src/components/{SiteHeader,MobileNav,SiteFooter}.tsx`, `src/components/dashboard/DashboardSidebar.tsx`, `src/app/[locale]/u/[username]/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 212/212 (filters per facet + combined, hidden province never matches, ordering, skill order, people search ranking) · typecheck ✓ · lint ✓ · build ✓
- Production: /th/builders lists 3 builders; filters checked by URL (northeast + fullstack 3, north 0, verified 1, open_to_work 0, q=jaopor 1, claude-code 2); QuickSearch "chaw" shows the คน group with highlight and ↓ + Enter opens the profile; /en/builders at 375px has no horizontal scroll and the filter toggle opens the form; the header fits at 1024px.

**Next:** owner review of Phase 9. Follow-up when the directory grows past a few hundred profiles: move filtering/search into SQL (an RPC over the anonymous view) instead of loading every directory profile per request.

## 2026-10-01 — Phase 9b: public builder profile, founder link, contact email

**Done:**

- **Founder card → profile (user request):** the startup page's Founder tile (`FounderCard`) and the founder-message name link to `/u/{handle}`. The subtext under the name is the project's `founder_role` (e.g. "Founder, CEO"), else the profile headline (e.g. "cu109"), else the 𝕏 handle.
- **Contact email changed to jaopordev@gmail.com** (/privacy TH + EN, settings delete-account mail).
- **`/u/[username]` + `/@username`** (proxy rewrite, `lib/at-path.ts`): sidebar (avatar + status dot, headline, bio, follow / contact / edit, followers, province + Olympics rank, current role, links, contacts once a request is accepted, else "ขอ LINE / อีเมล"), computed badges (pioneer, verified, MRR milestone, 7-day streak), skills + superpowers, built-with tools, report; main column: looking-for card, proof strip (verified numbers only), pinned works, a GitHub-style activity heatmap with year switcher, experience, recent activity. Owners see "+ เพิ่ม…" prompts where visitors would see nothing.
- **Social actions** (`actions/social.ts`): follow / unfollow, contact request (topic + 500-char message; DB limits surface as "pending" / "5 a day" / "blocked"); report dialog. **Profile views** (`/api/profile-view`): one row per browser per day, stored as an HMAC under a daily key; no IP; the owner isn't counted.
- **Activity data:** the sync now stores GitHub weekly commit activity per day in `build_activity`; the cron refreshes `refresh_activity` and prunes `live_pings`.
- **Builder OG image** (anonymous view only; avatar fetched from Google/GitHub avatar hosts only).

**Files:** `src/app/[locale]/u/[username]/{page,opengraph-image}.tsx`, `src/components/builder/*`, `src/app/actions/social.ts`, `src/app/api/profile-view/route.ts`, `src/lib/{builder,at-path}{,.test}.ts`, `src/lib/data/builder.ts`, `src/lib/og-images.ts`, `src/proxy.ts`, `src/components/ProfileBlocks.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/data/startups.ts`, `src/lib/build/github.ts`, `src/lib/sources/sync.ts`, `src/app/api/cron/sync/route.ts`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 207/207 (badges, streak, heatmap grid / month labels, /@ path parsing, commit-activity parsing) · typecheck ✓ · lint ✓ · build ✓ · every `Builder.*` key used by the page and dialogs exists in TH + EN (script check).
- Local render isn't possible (no service-role key in the local env), so it was checked on production: `/@chawankorn_bouraphan` rewrites to `/th/u/…` (200, owner view: edit button, pioneer #1 badge, skills, built-with, proof strip 5 works / 54 stars / 11 months, pinned works, empty heatmap with the owner hint, recent launches). The demo project's Founder tile links to the profile and shows the headline as subtext. Fixed after that check: thousands separators in work stats, a "ตัวอย่าง" tag on demo works, and the ✓ provider only next to a verified revenue number. The heatmap fills after the next daily sync writes `build_activity`.
- 375px (production): the work grid first overflowed by 22px (implicit `auto` grid track); fixed with explicit `grid-cols-1`, re-checked: no horizontal scroll, cards wrap correctly.

**Next:** Phase 9c (`/builders` directory + QuickSearch "คน" group, enable the sidebar community links)

## 2026-10-01 — Phase 9d: dashboard, profile editor, requests, onboarding

**Done:**

- **DashboardShell** (docs/design/dashboard.png): sidebar (ภาพรวม, ผลงานของฉัน + count, โปรไฟล์ของฉัน, คำขอคุย + unread badge, ที่บันทึกไว้, การเชื่อมต่อ, ตั้งค่า; คอมมูนิตี้: คนสร้าง / หา Co-founder marked "เร็ว ๆ นี้" until 9c), user card with theme / language / sign-out; a scroll row below `lg`. A user without a username is sent to /onboarding.
- **Overview:** greeting + weekly visits, "ดูโปรไฟล์สาธารณะ ↗", "+ เพิ่มผลงาน"; setup checklist (6 items computed from data, next item highlighted, hidden when done); "ผลงานของฉัน" table (visitors 7 days, MRR rank, MRR, edit / copy link / view) with the amber "เชื่อมต่อเพื่อขึ้นกระดาน…" banner on unverified rows; add / claim tiles (claim = "เร็ว ๆ นี้"); requests preview (accept / skip) + profile 7-day stats (views, requests; no search-impressions stat).
- **Profile editor** (/dashboard/profile): basics with live username check, status + looking-for, SkillPicker (≤ 20, ≤ 3 superpowers), experience, pinned works (≤ 6), social links (https only), private contacts; ↑/↓ reordering instead of drag; one sticky save bar.
- **Requests inbox** (accept / skip / block, withdraw sent, contacts revealed after accept, marks notifications read), **Connections** (followers / following), **Settings** (per-field visibility, directory opt-out, delete-account by email), **Saved** (honest placeholder: no bookmarks table yet), **Onboarding** (username → headline + province → status → skills, skippable).
- Server actions validate input against the same vocabularies as the DB trigger (`lib/profile.ts`, `lib/config/skills.ts`) and write through the user's own RLS client; the owner's full profile row is read with the service role filtered by the session's user id. The old startup cards moved to /dashboard/startups.

**Files:** `src/app/[locale]/dashboard/{layout,page}.tsx`, `src/app/[locale]/dashboard/{startups,profile,requests,saved,connections,settings}/page.tsx`, `src/app/[locale]/onboarding/page.tsx`, `src/components/dashboard/*`, `src/components/profile-edit/*`, `src/app/actions/profile.ts`, `src/lib/data/me.ts`, `src/lib/profile{,.test}.ts`, `src/lib/config/{skills.ts,config.test.ts}`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 200/200 (skills / reserved handles / looking-for vocabularies match the migration; handle rules, social link normalising, looking-for cleaning, checklist) · typecheck ✓ · lint ✓ · build ✓
- Production (owner's session, read-only): /th/dashboard redirects to /th/onboarding; the username step suggests "chawankorn_bouraphan" and the live check says it's available. Signed out, /th/dashboard → /th/login?next=…
- **Not verified:** the dashboard pages after onboarding, the editor's saves, the requests flow in the UI (local sign-in isn't possible here; the owner completes onboarding first). The DB side of every write is covered by RLS smoke 63/63.

**Next:** owner completes onboarding and tries the dashboard; then Phase 9b (public profile /u/[username] + /@username rewrite, profile views, follow, contact modal, report)

## 2026-10-01 — /privacy published, live visitors on in production, notifications + heartbeat applied

**Done:**

- **/privacy (owner approved the wording, contact chawankornbouraphan@gmail.com, dated October 1, 2026):** TH + EN from `docs/privacy-draft.md`, content in `messages/*.json` (Privacy.sections), §5 carries the live-map opt-out switch; the home map's "ไม่ระบุตัวตน" note links to `/privacy#live`. Footer "นโยบายความเป็นส่วนตัว" no longer 404s.
- **Phase 8 switched on in production:** `LIVE_ENABLED` now defaults to on; `NEXT_PUBLIC_LIVE_VISITORS=0` in Vercel turns it off without a deploy.
- **Applied (user: "apply"):** `notifications_live_pings`: in-app notifications written by contact-request triggers (received → recipient; accepted → both), owner-only RLS (mark read / delete); `live_pings` heartbeat table, server-only, pruned after 10 minutes. Types regenerated.
- **BizModel.md** (owner's business model) committed; its pre-launch checklist added to Project.md §7.

**Files:** `src/app/[locale]/privacy/page.tsx`, `src/components/live/{LiveOptOutControl,LiveVisitorsSection}.tsx`, `src/lib/live/identity.ts`, `messages/*.json`, `supabase/migrations/20261001024252_notifications_live_pings.sql`, `supabase/tests/rls_smoke.sql` (T58–T63), `src/lib/supabase/database.types.ts`, `Design.md`, `Project.md`, `BizModel.md`
**Verified:**

- RLS smoke **63/63** (new: recipient notified on request, both sides on accept, B can't read A's notifications, B marks own read, B can't change a notification's kind, clients can't read live_pings). Advisors: nothing new.
- Browser: /th/privacy (9 sections, mailto link) at desktop; /en/privacy#live at 375 (no horizontal scroll), opt-out switch toggles both ways.
- typecheck ✓ · lint ✓ · tests ✓ · build ✓ (see the deploy check below for production).

**Next:** Phase 9d (dashboard, profile editor, onboarding)

## 2026-10-01 — Phase 9a applied; production outage fixed; Olympics v3 (Claude Design); Phase 8 live visitors (off in prod)

**Done:**

- **Phase 9a applied (user: "apply"):** `builder_profiles`. The first attempt failed safely (PL/pgSQL ends an IF condition at the first THEN inside a CASE; fixed by assigning the CASE to a variable; nothing had been applied). Advisors then flagged the masked-read functions as browser-callable SECURITY DEFINER (WARN 0028/0029) → `profile_rpc_hardening`: get_profile / profile_activity are server-only (service role + explicit viewer id), get_my_profile dropped, handle_available is SECURITY INVOKER, 3 FK indexes. Types regenerated with the Supabase CLI.
- **Production outage (caused by the migration, fixed):** `startup_members` added a second startups↔profiles path, so the `owner:profiles(...)` embed became ambiguous (PGRST201) and `/startups` returned 500 (ISR pages kept serving cached copies). Fix: name the FK (`profiles!startups_owner_id_fkey`); deployed; all key pages 200. Lesson: a migration that adds a join table between two embedded tables must re-check every PostgREST embed.
- **Olympics v3 (user: review Claude Design frame 149:7635 as PM/marketer/designer):** adopted its structure: season metric รายได้ 30 วัน, ▲/▼ rank movement and growth vs the previous 30 days, "จังหวัดของคุณ" bar with the gap to the next rank, podium cards with the top project, dense expandable table with province search, "มาแรงเดือนนี้", share card (download image + copy link), "นับคะแนนยังไง". Kept open-spot podium places and the region map (now in the region card). Ranking is computed in TypeScript (the v1 SQL function has no 30-day metric).
- **Phase 8 live visitors (user decisions applied):** one Supabase Realtime presence channel, connected only while the tab is visible; identities from fixed word lists (EN/TH) + DiceBear notionists avatars (CC0) generated locally; Vercel edge geo → country, nearest province (77 capital-city centre points added to config), coordinates rounded + jittered; every received payload validated; home section (Thailand pins, world map via MapLibre + OpenFreeMap on demand, count + countries/devices/pages, 4-event feed, ×, opt-out "ไม่แสดงตัวฉัน"); "n คนกำลังดูผลงานนี้" pill; heartbeat `/api/live/ping` + cached `/api/live/count` fallback. **Off in production** (`LIVE_ENABLED`) until /privacy is approved.
- **Drafted, not applied:** `notifications_live_pings` (notifications written by contact-request triggers, email-ready via `email_sent_at`; live_pings server-only with 10-minute pruning). **Privacy wording** drafted in `docs/privacy-draft.md` (TH + EN) for the user's review.

**Files:** `supabase/migrations/{20260930155147_builder_profiles,20261001021524_profile_rpc_hardening,20261001024252_notifications_live_pings}.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/lib/olympics{,.test}.ts`, `src/lib/my-province.ts`, `src/components/olympics/{OlympicsBoard,Podium,ShareRankCard}.tsx`, `src/app/[locale]/olympics/page.tsx`, `src/lib/live/*`, `src/components/live/*`, `src/app/api/live/*`, `src/lib/config/provinces.ts`, `src/app/[locale]/{layout,page,startup/[slug]/page}.tsx`, `messages/*.json`, `Design.md`, `docs/privacy-draft.md`
**Verified:**

- RLS smoke **57/57** (new: owner auto-founder, 4th superpower refused, bad social link refused, B can't select A's bio column / edit A's profile / read A's contacts until accepted, 1 pending per pair, sender can't accept, member can't self-confirm, owner can, owner's founder row stays, 6th request/day refused, anon can't call get_profile, server get_profile masks the hidden bio unless the viewer is the owner). Advisors: only the old leaked-password dashboard WARN.
- `npm test` 193/193 (olympics movement/gap/climbers; live identity, payload validation, geo rounding + nearest province) · typecheck ✓ · lint ✓ · build ✓
- Browser (local): Olympics v3 at 1280 dark and 375 (pick province → "#1 ใหม่ กำลังนำ", search, expand row, no horizontal scroll). Live: status live; a Node test client joined as a second visitor → count 2, pin in Chiang Mai, feed "แพนด้าสีม่วง เปิดหน้าผลงาน · เมื่อสักครู่", pill "2 คนกำลังดูผลงานนี้"; world map loads OpenFreeMap tiles; opt-out removes me (count 0) and restores. Production after the fix: /th, /th/startups, /th/olympics, /th/startup/jaopor, /th/category/ai, /th/province/mukdahan all 200.
- **Not verified:** live visitors on production (off until privacy approval); Vercel geo (no headers locally); the fallback count (needs the live_pings migration).

**Next:** user approves the privacy wording + `notifications_live_pings` SQL; then Phase 9d (dashboard, profile editor, onboarding)

## 2026-09-30 — Phase 8 + 9 briefs recorded; Phase 9a migration drafted (not applied)

**Done:**

- Appended the user's Phase 8 (live visitors) and Phase 9 (builder profiles & dashboard) briefs to `docs/SPEC.md` §10–11, as the Phase 9 brief asks.
- **Drafted, NOT applied:** `supabase/migrations/20260930155147_builder_profiles.sql`:
  - profiles: headline, bio, province, status, looking_for, social_links, show_in_directory, field_visibility (jsonb shapes checked by a trigger); `handle` = username (+ reserved words). Clients can no longer select the visibility-controlled columns: `get_profile(handle)` masks them, `get_my_profile()` returns the owner's row, `handle_available()` for the username check.
  - New tables private_contacts, profile_skills (50-skill vocabulary, ≤ 20, ≤ 3 superpowers), positions, startup_members (two-sided, owners back-filled as confirmed founders + trigger for new startups), follows, contact_requests (5/day, 1 pending per pair, block), profile_views, user_reports, build_activity; activity rollup as a private materialized view (`refresh_activity()` for the cron, `profile_activity()` to read).
  - Review fix: the two guard triggers are SECURITY INVOKER (a definer function sees `current_user` = owner, which would have skipped every client check).
- Checked Phase 8 dependencies: DiceBear notionists art is CC0 1.0 (code MIT, needs `@dicebear/core` 9), unique-names-generator MIT, maplibre-gl BSD-3, @vercel/functions Apache-2.0; OpenFreeMap `dark` style answers without a key.
- Gemini key pasted in chat again: not stored or set anywhere (user adds it in Vercel).

**Files:** `docs/SPEC.md`, `supabase/migrations/20260930155147_builder_profiles.sql` (draft)
**Verified:** SQL reviewed by hand only (not run: the user approves first). After "apply": advisors, RLS smoke with new cases (B can't read A's contacts or edit A's profile; accepted request reveals contacts; request limits; two-sided membership; hidden fields masked for anon).

**Next:** user approves the Phase 8 plan choices and the Phase 9a SQL

## 2026-09-30 — Compact categories + category pages; Olympics redesign

**Done:**

- **Categories (user: "cards too big to scan", follow TrustMRR):** one-line cards (40px icon · name + "{n} ผลงาน" · one-line description), 4/2/1 columns, centred header.
- **`/category/[slug]` (user: "mark the category topic"):** the category is the page title ("ผลงานหมวด {name}" + icon tile + "พบ {n} ผลงาน"), search + Add, 3-column cards, other categories. Every category link (categories page, footer, QuickSearch, home teaser) now opens it.
- **Olympics redesign (user: "one of our selling points"):**
  - Event hero: eyebrow "JaoPor Olympics · ฤดูกาล 2026", live stats (provinces n/77, projects, metric total), "ส่งผลงานแทนจังหวัดคุณ", "แชร์อันดับ" (share sheet or copy), big clickable map (regions lit in their colour; click filters).
  - Podium for the top 3; empty places are "ที่ว่าง" invitations.
  - Standings table from #4 (rows link to the province); open provinces grouped by region.
  - Side panel "ภาคไหนนำ" (all 6 regions, bars, n/of coverage; filters) + "จังหวัดของคุณอยู่อันดับไหน?" finder.
  - OG image for shared links: podium + map. ProvinceCard removed.
- SegmentedControl segments no longer wrap.

**Files:** `src/app/[locale]/{categories/page,category/[slug]/page,olympics/page,olympics/opengraph-image}.tsx`, `src/components/olympics/{OlympicsMap,Podium,StandingsTable,RegionStandings,ProvinceFinder,ShareBoardButton,OlympicValue}.tsx`, `src/lib/olympics{,.test}.ts`, `src/components/{SiteFooter,core/SegmentedControl,home/HomeTeasers}.tsx`, `src/components/search/*`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 182/182 (region standings + board summary) · typecheck ✓ · lint ✓ · build ✓
- Browser pane: categories 1280 dark; `/category/ecommerce` 1280, `/category/ai` 375; Olympics 1280 + 375 (no horizontal scroll, podium 2-1-3 with open places, map, region panel); OG image renders. Fixed a hydration mismatch in the map's `<title>` found during the check.
- **Not verified:** the standings table with ≥ 4 ranked provinces (only มุกดาหาร has numbers today).

**Next:** Phase 8 plan + Phase 9 plan/SQL for approval

## 2026-09-30 — Migrations applied + deployed; JaoPor counts its own visitors; spec Phase 7 home polish

**Done:**

- **Applied (user: "apply"):** `category_counts`, `stack_vocab_v2`, `province_leaderboard`. Fix before applying: the IN parameter `region` and the OUT column `region` can't share a name, so the output column is `region_slug` (types regenerated and identical to the hand edits).
- **Deployed** Phase 6 + tech stack v2 (commit 0a5972e). Production `/th/olympics` and `/th/province/mukdahan` answer 200.
- **JaoPor snippet on jaopor.vercel.app (user: "Yes"):** `<script defer src="/v.js" data-project="jaopor">` in the locale layout, production builds only (confirmed in the production HTML). Counting starts when the owner presses "เริ่มนับ" in the dashboard's traffic section (no `jaopor` connection exists yet; /api/collect ignores hits until then).
- **Phase 7 (spec 6.2):**
  - "ดูผลงานทั้งหมด {n} ชิ้น" shows the number only from 20 projects.
  - "+ เพิ่ม Startup" only in the nav and the hero. Hero sub-links are now หมวดหมู่ · โอลิมปิก · กระดานผู้นำ; the empty "recent" state and the bottom QuickSearch lost their Add buttons.
  - New HomeTeasers: "สำรวจหมวดหมู่" (8 busiest categories with counts) and "โอลิมปิกจังหวัด" (top 3 provinces, hidden while none is ranked).
  - Leaderboard empty state gets "ยืนยันตัวเลขของคุณ →".

**Files:** `supabase/migrations/20260930144541_province_leaderboard.sql`, `supabase/tests/rls_smoke.sql` (T36–T38), `src/lib/olympics{,.test}.ts`, `src/lib/supabase/database.types.ts`, `src/app/[locale]/{layout,page}.tsx`, `src/components/home/HomeTeasers.tsx`, `src/components/search/QuickSearchSection.tsx`, `src/components/LeaderboardCard.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- As anon: `province_leaderboard('revenue')` → mukdahan 0, `('commits')` → mukdahan 46, `('commits','north')` and an invalid metric → no rows; `category_counts()` → ai 1.
- Stack trigger: language/services/nocode accepted, `javascriptx` rejected (rolled back). RLS smoke **38/38** (new T36 new stack groups, T37/T38 anon calls the RPCs). Advisors: nothing new (the old leaked-password WARN is a dashboard setting).
- `npm test` 180/180 · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local) home at 1280 and 375: no horizontal scroll; visible Add links = header + hero (+ footer text link); teasers render (categories chips; มุกดาหาร #1 ฿0).
- **Not verified:** home with 200 projects (layout caps: 6 cards per row, leaderboard 10 → 50, 8 chips, 3 provinces; the count appears from 20).

**Next:** user presses "เริ่มนับ" for JaoPor's own traffic; Phase 8/9 plans (parked) when the user says go

## 2026-09-30 — Spec Phase 6: Province Olympics; tech stack v2 + "ดึงจาก GitHub"

**Done:**

- **`/[locale]/olympics`** (spec 6.7):
  - Metric SegmentedControl (รายได้รวม · MRR · ผู้เข้าชม 30 วัน · Commits) + region chips. Both live in the URL (`?metric=&region=`).
  - Ranked ProvinceCards: medal/rank, 56×40 badge (hand-simplified Thailand map with the region lit; no seals), names, region chip, count, total, top 5 with share % + bar.
  - Provinces with no number collapse into "ยังไม่มีผลงานจาก {n} จังหวัด — เป็นคนแรกของจังหวัดคุณ" with chips + CTA.
- **`/[locale]/province/[slug]`:** badge + title/subtitle, Olympics rank link, 3-column cards (รายได้ 30 วัน · MRR · รวมทั้งหมด), back link, nearby provinces, 404 for unknown slugs, OG image "{จังหวัด} อันดับ #X ในโอลิมปิกจังหวัด".
- **Links:** profile stat card "📍 จังหวัด · อันดับ #X ในโอลิมปิก" (MapPin) → province page; header/footer/MobileNav "โอลิมปิก"; QuickSearch chip "โอลิมปิกจังหวัด →"; QuickSearch province results now open the province page.
- **Header:** the 5th link overflowed at 1024–1045px. Links are nowrap, แดชบอร์ด shows from `xl` (it is also in the avatar menu), tighter lg gaps.
- **Tech stack (user: "can't find JavaScript"):** +104 items (languages, more frameworks, services, no-code), grouped headers in the picker, max 20 per group. **"ดึงจาก GitHub"** button reads a **public** repo (languages, root files like vercel.json/Dockerfile/fly.toml, manifests package.json/requirements.txt/pyproject/composer/Gemfile/pubspec/go.mod) and offers the matches.
- **SQL drafted, NOT applied:** `province_leaderboard(metric, region)` and `stack_vocab_v2` (trigger allow-list for the new slugs). Until applied, the olympics use the identical TS ranking; the stack expansion must not be deployed before its migration (the trigger would reject new slugs).

**Files:** `supabase/migrations/{20260930144541_province_leaderboard,20260930143523_stack_vocab_v2}.sql` (drafts), `src/lib/olympics.ts` (+ test), `src/lib/data/startups.ts`, `src/lib/supabase/database.types.ts`, `src/app/[locale]/olympics/page.tsx`, `src/app/[locale]/province/[slug]/{page,opengraph-image}.tsx`, `src/components/olympics/*`, `src/components/{SiteHeader,SiteFooter,MobileNav,StartupCard}.tsx`, `src/components/search/*`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/lib/build/github.ts`, `src/app/api/startups/[id]/detect-stack/route.ts`, `src/lib/config/{stack,glyphs}.ts`, `src/components/wizard/{StartupEditForm,vocab-options}.ts*`, `src/lib/share-palette.ts`, `messages/*.json`, `Design.md`
**Verified:**

- SQL dry run (read-only select of the function body) matches the TS ranking: revenue → มุกดาหาร #1 (JaoPor ฿0); commits incl. demo → Bangkok 2900, Chiang Mai 2140…
- Live GitHub detection: GXCB06/jaopor → Next.js, React, Tailwind CSS, Supabase, Vercel, TypeScript, JavaScript; django/djangoproject.com → Django, PostgreSQL, Redis, Stripe, Sentry, Docker, Heroku, Python…; missing repo → not public.
- `npm test` 180/180 · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local): olympics at 1280 (dark + light) and 375 (no horizontal scroll); region chip → `?metric=commits&region=north` (9 provinces collapsed); metric switch keeps the region; `/province/bangkok` at 375; `/province/atlantis` → 404; profile rank link wraps at 375; OG image renders. Header row fits 1024 + 1280 in th/en.
- **Not verified:** the "ดึงจาก GitHub" button in the edit form (needs sign-in; the route and detection are tested).

**Next:** user approves `province_leaderboard`, `stack_vocab_v2` and `category_counts` SQL → apply, then deploy; Phase 7 (home polish)

## 2026-09-30 — Spec Phase 5: categories page; header fits every width; fresh pages after delete

**Done:**

- **Deleted projects still showing on home (user report):** home, leaderboard and directory are ISR pages, so after an idle period the first visitor gets the old copy (production had a 495 s-old STALE page that refreshed on the next request). Deleting now calls `revalidateDeleted(slug)`, which purges profile + home + directory in both locales. It only acts when the slug no longer exists publicly.
- **`/[locale]/categories`** (spec 6.6):
  - Breadcrumb, "สำรวจหมวดหมู่", "สำรวจผลงานใน 37 หมวดหมู่".
  - 4/2/1-column grid of all 37 categories: 48px icon box + count pill, then name + 2-line description. Cards link to `/startups?category=`.
  - Sorted by count, then config order. Zero-count cards come last and are dimmed without losing text contrast.
  - Bottom QuickSearch section.
- **Counts:** `getCategoryCounts()` uses the `category_counts()` RPC (listed, non-demo projects). Migration **drafted, not applied**; until it exists the page counts the category column (same result).
- **Nav:** "หมวดหมู่" in the header and footer + "ดูทุกหมวดหมู่ →" under the footer category list.
- **Header rework** (the new link made it overflow at 768px; EN at 360px was 8px over):
  - Nav links from `lg`.
  - New **MobileNav** menu below `lg` (สตาร์ทอัพ · หมวดหมู่ · กระดานผู้นำ · แดชบอร์ด, plus language + theme below `sm`).
  - Sign-in is an icon below `sm`; THB/USD and the language's full name only from `lg`.
- **a11y:** ProviderStrip logo tiles get `role="img"` (aria-label on a plain span was flagged).

**Files:** `supabase/migrations/20260930133313_category_counts.sql` (draft), `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/categories/page.tsx`, `src/app/actions/revalidate.ts`, `src/components/{SiteHeader,SiteFooter,MobileNav,HeaderAuth,LocaleSwitch,CurrencyToggle,ProviderStrip,DashboardActions}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Counts equal the SQL grouped count (ai = 1, 36 × 0).
- **Lighthouse accessibility 100** on `/th/categories` and `/th`.
- Widths 360/375/640/768/1024/1280: `scrollWidth == clientWidth` everywhere (menu below lg, nav from lg). The phone menu lists 6 items.
- `npm test` 170/170 · typecheck ✓ · lint ✓ · build ✓ (categories prerendered th/en).
- Production home refreshed to the 6 remaining projects.

**Next:** user approves `category_counts` SQL; Phase 6 (province Olympics)

## 2026-09-30 — Spec Phase 4: QuickSearch + search_startups; delete/disconnect confirm fix

**Done:**

- **Delete project did nothing (user report):** `window.confirm` is blocked in the Claude app's browser and silently returned "cancel", so no request was ever sent (logs showed no DELETE). Replaced it with an in-page `useConfirm` dialog for **delete project** and **disconnect source**. Screenshot-file cleanup can no longer block the delete.
- **Migration `search_startups` applied (user-approved):** ILIKE on name/slug/tagline/description + trigram similarity on the name, wildcards escaped, security invoker (published only). Ranking: exact → prefix → verified → MRR → similarity.
- **`GET /api/search?q=&locale=`:** startups (RPC) + categories and provinces matched from `lib/config` (Thai tone marks ignored, slugs match: "mukda" → มุกดาหาร). Empty q → "ยอดนิยม". Edge-cached 30 s.
- **`QuickSearch`** (spec 6.8), in the hero (home, directory) and a new **bottom section "หาผลงานอื่นต่อ"** on home, directory and startup detail:
  - 200 ms debounce with aborted stale requests.
  - Grouped results (startups with logo, highlighted match, verified source; categories; provinces with region), plus "ดูผลลัพธ์ทั้งหมด".
  - Skeletons and a no-results line linking to /new.
  - ↑/↓/Enter/Esc/click-outside, ARIA combobox/listbox.
  - Opens upward when less than 440px is below.
  - Phones: the same element becomes a full-screen sheet (no remount, so the keyboard stays open) with scroll lock.
- **Directory:** province filter (grouped by region) + `?province=`. Text search now also matches slug and description, the same as QuickSearch.
- `SearchBar` removed; VocabCombobox shares `normalizeSearch`.
- **Gemini key:** the user pasted it in chat. I did not store it anywhere (I can't set Vercel env and don't enter keys). The user adds `GEMINI_API_KEY` in Vercel.

**Files:** `supabase/migrations/20260930102108_search_startups.sql`, `src/lib/supabase/database.types.ts`, `src/lib/data/startups.ts`, `src/lib/search-text.ts` (+ test), `src/app/api/search/route.ts`, `src/components/search/{QuickSearch,QuickSearchSection}.tsx`, `src/components/core/useConfirm.tsx`, `src/components/{DashboardActions}.tsx`, `src/components/wizard/{VerifyPanel,VocabCombobox}.tsx`, `src/app/[locale]/{page,startups/page,startup/[slug]/page}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- SQL as anon: "raan"→RaanDee POS, "saa"→MRRMafia, "%"/blank → none, max_rows respected. Advisors: nothing new.
- `npm test` 170/170 (new: normalizer, category/province matching, highlight split) · typecheck ✓ · lint ✓ · build ✓
- Browser pane (local):
  - Hero "ร้าน" → RaanDee POS / RaakaDee + category "อาหารและร้านอาหาร" with the match highlighted; ↓ + Enter opened RaanDee.
  - 375px bottom section → full-screen sheet; typing "mukda" → มุกดาหาร; tapping it → `/startups?province=mukdahan` (2 projects, filter preselected); scroll lock released; no horizontal scroll.
- **Not verified:** "พ่อ" → "เจ้าพ่อ" (no project text contains it yet; substring matching is proven by "ร้าน"); the delete dialog end-to-end (the user tries it; only the dialog/cancel path is checked).

**Next:** user adds `GEMINI_API_KEY` in Vercel and redeploys; Phase 5 (categories page)

## 2026-09-30 — Edit page redesign (user feedback), free "fill from website" helper, avatar menu; Phase 4 SQL drafted

**Done:**

- **Edit page** (user: "overwhelming, too many sections at once"):
  - Seven sections shown one at a time: ข้อมูลหลัก · ลิงก์และที่ตั้ง · เล่าเรื่องผลงาน · เทคโนโลยีและการตลาด · ภาพและวิดีโอ · ผู้ก่อตั้ง · ยืนยันตัวเลข.
  - Section nav: sticky column on desktop, scrolling chips on mobile, with completion ticks / counts.
  - "ข้อมูลครบ {pct}%" bar + next-missing link, prev/next buttons.
  - Sticky save bar showing unsaved vs saved; it saves from any section.
  - Validation errors jump to their section. Deep links (`#pricing`, `#verify-revenue`, `#screenshots`…) open the right section on load and on hash change.
- **"✨ ช่วยเติมจากเว็บไซต์"** (user wants a free API):
  - `POST /api/startups/[id]/autofill`, owner-only: reads the project's website with the SSRF guard (redirects re-checked, 1.5MB cap) + the public GitHub README.
  - Fills only **empty** fields, with a "เติมให้ n ช่อง · เลิกทำ" notice; nothing is saved until the owner saves.
  - Works with **no AI** from the page's own metadata / JSON-LD price.
  - With a **free Gemini key** (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, default `gemini-2.5-flash`) it drafts tagline, description, value, problem, audience, category, stack and pricing. The prompt fences website text as untrusted data; the output is validated against the enums and DB limits.
- **Signed-in header:** one avatar button → menu (email, แดชบอร์ด, ออกจากระบบ). It used to wrap into 4 lines at 375px.
- **Phase 4 SQL drafted, NOT applied:** `supabase/migrations/20260930102108_search_startups.sql` (`search_startups(q, max_rows)`, ILIKE + pg_trgm, security invoker). Read-only dry run: "saa"→MRRMafia, "raan"/"pos"→RaanDee POS, "ร้าน"→2 hits, "%" → none (wildcards escaped).

**Files:** `src/components/wizard/{StartupEditForm,ScreenshotsManager}.tsx`, `src/components/HeaderAuth.tsx`, `src/lib/{autofill,autofill.test}.ts`, `src/lib/ai/gemini.ts`, `src/lib/env.ts`, `src/app/api/startups/[id]/autofill/route.ts`, `src/app/[locale]/dashboard/[id]/edit/page.tsx`, `.env.example`, `messages/*.json`, `Design.md`, `supabase/migrations/20260930102108_search_startups.sql` (draft)
**Verified:**

- `npm test` 166/166 (new autofill: page extraction, JSON-LD price, no-AI draft, strict model-output parsing, clamping, prompt fencing) · typecheck ✓ · lint ✓ · build ✓
- Production (browser pane, the user's session, nothing saved):
  - Sectioned edit page renders.
  - "ช่วยเติมจากเว็บไซต์" filled 2 fields from jaopor.vercel.app (no-AI mode); undo restored everything.
  - `#pricing` opens "เล่าเรื่องผลงาน"; `#founder_message` works on hash change.
  - 375px: scrollWidth = 375 (was 1126 before `min-w-0`).
  - Avatar menu shows email / dashboard / sign out.
- **Not verified:** the Gemini path (no key yet); saving from the new layout (DB path unchanged, covered by RLS smoke).

**Next:** user approves the `search_startups` SQL → Phase 4 QuickSearch UI; user optionally adds a free `GEMINI_API_KEY`

## 2026-09-30 — Spec Phase 3: share modal (6.5) + SVG badge endpoint

**Done:**

- **ShareStudio:**
  - Title "แชร์ตัวเลขที่ยืนยันแล้ว". The link copy button turns into "คัดลอกแล้ว ✓" for 2 s.
  - `SegmentedControl` tabs Badge / กราฟรายได้ / ปฏิทิน / โพสต์.
  - Colour label per tab ("สีเส้น" / "สี ฿"); calendar periods shown 12 / 6 / 3.
  - Downloads are named `{slug}-{tab}.png`.
  - The Badge tab has the embeddable SVG badge + **คัดลอกโค้ด README** (Markdown) + HTML.
- **Swatches:** the spec's 12 colours in order (blue, purple, indigo, sky, cyan, teal, emerald, lime, amber, orange, rose, pink). Old ids fall back to indigo.
- **Chart periods:** 7 / 30 days / 12 months (monthly points).
- **Card renderer:**
  - Real startup logos: `lib/og-images.ts` converts any logo, WebP included, and the cover to PNG/JPEG data URIs. This also fixes WebP logos on the OG card.
  - Badge headline: **TOTAL REVENUE** first, else the strongest verified metric.
  - The calendar is a heatmap of **"฿"/"$" glyphs** with month labels, จ./พ./ศ./อา. rows and a glyph legend. THB projects (priced in THB, or Thai without a price) show ฿ glyphs and ฿ amounts at the site's rate.
  - Chart and share series end yesterday. The chart fits the card.
- **`/api/badge/{slug}.svg`** alias (plain `/api/badge/{slug}` still works).
- **Dev-only `?demo=1`** on the share-card route to design-check with sample data (ignored in production).
- Server rendering kept instead of `html-to-image` (agreed in the Phase 0 conflict list): the download is byte-identical to the preview.

**Files:** `src/components/share/ShareStudio.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `src/app/api/badge/[slug]/route.ts`, `src/lib/{share,share-card,share-palette,og-images}.ts`, `src/lib/{share,share-card}.test.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- `npm test` 159/159 (new: README Markdown, badge headline order, currency glyph rule, swatch fallback, periods) · typecheck ✓ · lint ✓ · build ✓
- Rendered cards checked visually: badge (dark + light, ฿717.2k), chart 7/30 days (rose/purple), calendar 3/6/12 months (฿ glyphs, labels aligned).
- `/api/badge/jaopor.svg` → 200 SVG; `bad.svg.svg` and `.png` → 404.
- Browser pane: the modal shows title, 4 tabs, 12 swatches in spec order; "สี ฿" on the calendar tab; download names `demo-raandee-pos-badge.png` / `-calendar.png`; copied ✓ state for 2 s.
- **Not verified:** a README on GitHub (camo) showing the SVG badge; the clipboard in a focused real tab (the test tab was in the background).

**Next:** user checks the modal on a real project; Phase 4 (QuickSearch + `search_all` RPC, SQL shown first)

## 2026-09-30 — Phase 2 fixes from user testing: screenshot upload, drafts across language switch, custom + GitHub stack

**Done:**

- **Screenshot upload failed (user report):**
  - Cause: the storage policies' unqualified `name` inside `exists (select … from startups s …)` resolved to `startups.name`, so every upload got Storage 400.
  - Fixed by migration `fix_screenshot_storage_policies` (`objects.name`).
  - RLS smoke gained T34/T35 (owner uploads into own folder ✓, another startup's folder ✗).
- **Unsaved form lost on language switch (user report):**
  - `useSessionDraft` keeps the edit form and the wizard in sessionStorage. The key includes `updated_at` and only real changes are stored, so a draft never shows as "restored" when nothing changed.
  - A "restored · discard" notice appears.
  - The wizard also keeps step 2 + the created project, so a switch can't create a duplicate.
- **Custom tech-stack entries:** migration `stack_custom_entries` applied (user-approved); `other` group of `custom:` values. RLS smoke T32/T33.
- **Tech stack from GitHub (user idea):** the edit form offers "ตรวจพบจาก GitHub: … · เพิ่มทั้งหมด" from `build_stack` (known tools → slugs, others → custom). Without a repo there's a hint to connect GitHub.
- **Fresh pages after edits:** `revalidateStartup` server action (owner-checked) revalidates the profile in both locales + home + directory after saves and screenshot changes.

**Files:** `supabase/migrations/20260930082846_stack_custom_entries.sql`, `supabase/migrations/20260930085756_fix_screenshot_storage_policies.sql`, `supabase/tests/rls_smoke.sql`, `src/app/actions/revalidate.ts`, `src/lib/use-session-draft.ts`, `src/lib/config/{stack,display}.ts`, `src/components/wizard/{StartupEditForm,StartupWizard,ScreenshotsManager,vocab-options}.tsx`, `messages/*.json`
**Verified:**

- **RLS smoke 35/35.**
- `npm test` 155/155 · typecheck ✓ · lint ✓ · build ✓
- Production (browser pane, the user's session, test data removed afterwards):
  - A pasted 1600×1000 PNG was stored as a 12KB WebP in `45/`, kind desktop.
  - The profile shows it full width in the browser frame; the lightbox opens.
  - The OG image shows the darkened cover.
  - The TH → EN switch keeps the typed tagline with the notice; discard works.
  - Deleting the screenshot removed both the row and the file.

**Next:** Phase 3 (share modal 6.5)

## 2026-09-30 — Spec Phase 2: detail page (chart, screenshots, founder message, logo-chip insights) + form 6.9

**Done:**

- **Chart card (spec 6.4 step 3, `MetricChart` + pure `lib/chart-window.ts`):**
  - Metric (revenue / MRR / visitors, only those with data) × period (7 days / 30 days / 12 months, weekly points).
  - Period total or latest MRR, growth vs the previous period, compare (dashed) and Trend switches.
  - Per-metric source stamp ("ยืนยันผ่าน {Source} · อัปเดตล่าสุด").
  - The series ends yesterday (today is partial), days before the first snapshot are empty (not 0), and today's MRR snapshot is folded in.
  - Nothing verified → hidden for visitors, owner prompt "+ เชื่อมต่อ Stripe เพื่อแสดงกราฟ".
  - No profit-margin pill: there is no cost data.
- **Screenshots (spec 6.4 step 4, `ScreenshotGallery`):**
  - Scroll-snap carousel; desktop shots in a browser frame (16:10, 720px / 88vw), mobile/LINE in a 9:19.5 phone frame; a single desktop shot is full width.
  - Counter, ← → buttons, arrow keys, fade edges.
  - Demo video as the first slide (click → YouTube-nocookie / Loom / TikTok embed).
  - Lightbox (`<dialog>`: Esc/×/backdrop, ← → keys, swipe, caption, counter).
  - Lazy loading after 2 images. A skeleton instead of blur (no blur data stored).
- **Founder message card** (80px avatar, 18px/1.8 quote, name + role).
- **Insights bento:**
  - Value proposition full width, then 2 columns (market facts / product facts).
  - **Logo chips** from a generated glyph map (`scripts/gen-glyphs.mts` → `lib/config/glyphs.ts`, 51 Simple Icons): brand colour when it reads at 3:1, a neutral otherwise (X, Vercel, Next.js, TikTok).
  - Audience shows "~N ผู้ใช้".
- **More startups:** same category, then same province, then newest.
- **OG image:** the cover screenshot (WebP → JPEG via `sharp`, now a direct dependency) darkened behind the card.
- **Form (spec 6.9):**
  - `VocabCombobox` (searchable, keyboard, logo chips with ×): tech stack (grouped), channels (custom entries allowed), province (single, grouped by region, required when the country is Thailand).
  - Founder message counter (≤600) + role.
  - Demo video link (validated like the DB).
  - `ScreenshotsManager` in the edit page and the wizard's step 2: drag & drop / paste / click, PNG/JPG/WebP ≤ 5MB, max 8; browser resize ≤ 2400px + WebP re-encode (drops EXIF/GPS); kind auto from aspect ratio (switchable to LINE); caption; reorder by drag or ← → buttons; the first is the cover.
  - Deleting a project removes its screenshot files first.
- **a11y:** the language switch's accessible name now includes its visible text (+ `lang`). The header fits at 360px.
- **Drafted, NOT applied:** migration `stack_custom_entries` (custom tech-stack entries in an `other` group). Waiting for SQL approval.

**Files:** `src/components/{MetricChart,ProfileBlocks,LocaleSwitch,SiteHeader,DashboardActions}.tsx`, `src/components/core/LogoChip.tsx`, `src/components/profile/ScreenshotGallery.tsx`, `src/components/wizard/{VocabCombobox,ScreenshotsManager,vocab-options,StartupEditForm,StartupWizard,fields}.tsx`, `src/lib/{chart-window,media,og-cover}.ts`, `src/lib/config/{glyphs,display}.ts`, `src/lib/data/startups.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/app/[locale]/dashboard/[id]/edit/page.tsx`, `scripts/gen-glyphs.mts`, `supabase/migrations/20260930082846_stack_custom_entries.sql` (draft), `messages/*.json`, `Design.md`, `tsconfig.json`; removed `RevenueChart.tsx`
**Verified:**

- `npm test` 153/153 (new: chart window math, video embeds, kind detection, resize, drift check over every vocab-trigger migration) · typecheck ✓ · lint ✓ · build ✓
- **Lighthouse accessibility 100** on `/th/startup/demo-raandee-pos`, `/th/startup/jaopor` and `/en/startup/mrrmafia`.
- Browser pane:
  - RaanDee chart: revenue 30 days, switches to visitors / 12 months ("ผู้เข้าชม · 12 เดือน").
  - RaakaDee bento with brand-coloured logo chips (light theme).
  - 360/375px: no horizontal scroll on profiles, home and directory.
- **Not verified:**
  - Owner flows need a signed-in session: uploading/reordering screenshots, the comboboxes, saving the edit form, the gallery/lightbox with real images and the OG cover.
  - Safari may not encode WebP from canvas; the form then shows a "use Chrome/Edge/Firefox" message.

**Next:** user approves `stack_custom_entries` SQL; user signs in (browser pane or own browser) to test uploads + form

## 2026-09-30 — Spec Phase 1 (part 2): migration applied, app moved to the shared configs

**Done:**

- **Migration `spec_phase1_vocab` applied (user-approved SQL).** The back-fill matched the dry run:
  - Provinces: 6/6 → slugs.
  - Stack: to jsonb (`Prisma` and `LINE Messaging API` dropped, demo rows).
  - Channels: to slugs (`custom:App Store optimization`).
  - Pricing: MRRMafia → ฿990/month.
- **Types:** `database.types.ts` updated with `provinces`, `fx_rates`, `startup_screenshots`, structured pricing, `demo_video_url`, `founder_role` and jsonb `tech_stack`.
- **One source of truth:**
  - `lib/catalog.ts` re-exports categories and AI tools from `lib/config`.
  - Category and tool names come from config, so `messages Catalog.category|tool` were removed.
  - Updated: directory filters (37 categories), footer, cards, profile, `/new` wizard and `AiToolChips`.
- **Edit form:**
  - Province select grouped by region (Thailand only).
  - Structured pricing (period → amount + currency) plus a note.
  - Tech stack as grouped toggle chips.
  - Channel chips plus custom channels.
  - Founder message up to 600.
- **Profile:** province name (not the slug), "฿990 / เดือน" + note, grouped stack chips, channel labels. The dashboard completeness count uses the new fields.
- **Other:**
  - `lib/config/display.ts` (read-side helpers) and `lib/pricing.ts`.
  - `supabase/demo_projects.sql` uses the new column shapes.

**Files:** `supabase/migrations/20260930052136_spec_phase1_vocab.sql` (applied), `supabase/tests/rls_smoke.sql`, `supabase/demo_projects.sql`, `src/lib/supabase/database.types.ts`, `src/lib/{catalog,pricing}.ts`, `src/lib/config/display.ts`, `src/components/wizard/{StartupEditForm,StartupWizard,fields}.tsx`, `src/components/{ProfileBlocks,StartupCard,SiteFooter,AiToolChips}.tsx`, `src/app/[locale]/{startups,dashboard,startup/[slug]}/page.tsx`, `messages/*.json`, `Design.md`
**Verified:**

- Advisors: nothing new (known leaked-password WARN; INFO: new indexes unused yet).
- **RLS smoke 31/31**, new checks:
  - T19 an owner saves stack/province/channels/pricing through the private-schema trigger.
  - T20 unknown stack slug, T21 unknown channel and T22 unknown province are rejected.
  - T23–T25: 8 screenshots OK, a 9th and a foreign-folder path are rejected.
  - T26/T27: `fx_rates` and `provinces` are read-only.
  - T28/T29: another user can't add to or edit someone's screenshots.
  - T30/T31: anon reads screenshots and 77 provinces.
- `npm test` 143/143 · `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓
- Browser pane (local):
  - Demo profile: "กรุงเทพมหานคร, ไทย", stack grouped (Frontend / แอป: Swift, SwiftUI · รับชำระเงิน: RevenueCat), channel labels.
  - `/en/startup/mrrmafia`: "฿990 / month", "Mukdahan, Thailand".
  - `/th/startups`: 37 categories, `?category=mobile` finds 1, footer categories from config.
- **Not verified:** the edit form in a browser (needs a signed-in owner) and saving from it; the DB side is covered by T19–T22.

**Next:** user signs in and edits a project (province, pricing, stack, channels); then Phase 2 (detail page: chart card, screenshots, founder message, logo chips; form 6.9)

## 2026-09-30 — Spec Phase 1 (part 1): shared configs + migration drafted, waiting for SQL approval

**Done:**

- **`src/lib/config/`:**
  - `categories.ts`: 37 categories with Thai/English names, descriptions and lucide icons. The existing `mobile` slug is kept; the spec says `mobile-apps`.
  - `provinces.ts`: 77 provinces and 6 regions with region colour tokens, plus `matchProvince()`.
  - `stack.ts`: 6 stored groups plus built_with (= `AI_TOOLS`), `isValidTechStack()` and `matchStackLabel()`.
  - `channels.ts`: 26 channels plus `custom:` entries.
  - `localized.ts`.
  - Brand logos use Simple Icons slugs, from the new `simple-icons` dependency (CC0). Missing brands (AWS, OpenAI, Lovable, LinkedIn, Omise, 2C2P, PromptPay, Pantip, Blockdit, Codex, Bolt) fall back to lucide icons.
- **Migration file `20260930052136_spec_phase1_vocab.sql` (NOT applied):**
  - Changes: categories to 37; `provinces` table with the `startups.province` slug FK; `tech_stack` to jsonb; channel slugs; structured pricing; `demo_video_url`/`founder_role`/`founder_message ≤ 600`; `startup_screenshots` + `screenshots` bucket; `fx_rates`; `pg_trgm` indexes.
  - The value lists are generated from the config files. `config.test.ts` fails if they drift.
- **Region colours:** `--region-*` tokens are in `globals.css` and Design.md, validated for every pair of bordering regions.
- **Back-fill dry run** (read-only SQL on live data):
  - Provinces: 6/6 matched.
  - Stack labels: all mapped except `Prisma` and `LINE Messaging API` (demo rows).
  - Channels: all mapped except `App Store optimization` → `custom:`.
  - Pricing: `mrrmafia` "990" → ฿990/month.
  - Postgres strips Thai tone marks when normalizing, so the TypeScript now does too.

**Files:** `src/lib/config/*`, `supabase/migrations/20260930052136_spec_phase1_vocab.sql`, `src/app/globals.css`, `Design.md`, `package.json`
**Verified:** `npm test` 143/143 (new: 77 provinces, region counts 9/20/22/7/5/14, unique slugs, Simple Icons slugs exist, matchers, migration ↔ config drift checks) · `npm run typecheck` ✓ · `npm run lint` ✓
**Next:** user approves the SQL → apply via MCP, advisors, RLS smoke (+ screenshots/fx/provinces checks), regenerate types, then move the app to the new columns (form, profile, filters, footer from config)

## 2026-09-30 — Phase 0 follow-ups: Facebook preview, blue-tile logo everywhere, Supabase URLs

**Done:**

- **Facebook showed no preview:**
  - The home page (and every page except profiles) had no Open Graph tags at all.
  - Added a site-wide OG card (`[locale]/opengraph-image.tsx`: tile, JaoPor, headline, host) and layout `openGraph` + `twitter:card`.
  - Profiles now send `og:description` (tagline, or the start of the description), `og:url`, `og:site_name`, `og:locale` and a canonical URL.
  - Removed an inherited `og:url` that would have made every page share as the home page.
  - Demo projects no longer put sample MRR in the page title.
- **Logo (user decision):**
  - The blue app tile is the mark everywhere again: tab icon (`icon.png`/`favicon.ico`/`apple-icon.png` restored), header, footer, login, OG card, share cards and SVG badge.
  - `<Logo>` renders the tile. The renderers inline it as a data URI (`lib/logo.ts`); the badge CSP allows `img-src data:`.
  - Removed the spec SVG mark and its files.
- **Supabase Auth URL configuration** (browser pane, with the user signed in):
  - The Site URL was set to the callback path; it's now `https://jaopor.vercel.app`.
  - Added `https://jaopor.vercel.app/api/auth/callback` to the redirect allow-list.
  - The GitHub OAuth app was updated by the user.

**Files:** `src/app/[locale]/{layout,opengraph-image}.tsx`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/app/api/{badge,share-card}/[slug]/*`, `src/components/{Logo,BrandLogo}.tsx`, `src/lib/{logo,share-palette}.ts`, `src/app/{icon.png,apple-icon.png,favicon.ico}`, `public/icon-{192,512}.png`, `src/assets/jaopor-tile-64.png`, `Design.md`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 129/129 ✓ · `npm run build` ✓
- Local, with the Facebook user agent: `/th`, `/en/startups` and profiles all return og:title/description/image/site_name/type.
- The home OG card, profile OG card, share card and badge render with the tile.
- Browser pane: the header shows the tile; the icon links point to `icon.png`/`favicon.ico`/`apple-icon.png`.
- Supabase dashboard shows the new Site URL and 3 redirect URLs.
- **Not verified:** sign-in end-to-end on production; Facebook's own scrape (it caches the first scrape, so the user re-scrapes via the Sharing Debugger).

**Next:** the user re-scrapes in the Facebook Sharing Debugger and tries sign-in; Phase 1 (configs + migration SQL for approval)

## 2026-09-30 — Spec Phase 0: fixes & foundation (theme bug, domain, tokens, core components, empty states, Rising Fedora logo)

**Done:**

- **Spec:** `docs/SPEC.md` is the source of truth. `docs/design/{profile,dashboard}.png` are rendered from the user's HTML mockups (for Phase 9).
- **Theme reset on language switch (user bug):**
  - The theme is now `<html data-theme>`, set by the head script. Dark is the CSS default, via `:root:not([data-theme="light"])` and the `dark:` variant.
  - `PrefsSync` re-applies theme and currency in a layout effect when the `[locale]` layout remounts.
- **Domain (spec 6.1):**
  - `publicEnv.siteUrl` now prefers Vercel's `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` over the hand-set, stale `NEXT_PUBLIC_SITE_URL`.
  - This fixes `metadataBase`, OG/share URLs and the JaoPor snippet code shown in VerifyPanel, which pointed at the dead `mrr-mafia.vercel.app`.
- **Tokens (spec 2.1):**
  - Dark values adopted: bg `#0a0a0b`, text `#ededed`, muted `#a1a1a6`, subtle `#8a8a8f`, accent `#6e6cf3`, positive/negative/warning `#22c55e`/`#ef4444`/`#f59e0b`, popover `#1e1e20`, input `#3a3a40`.
  - New tokens: `surface-2`, `border-strong`, and `brand-text` (`#8280f6`, because `#6e6cf3` text is 4.47:1 on cards, under AA).
  - The chart pair was re-validated.
  - The image renderers' palette was synced.
- **Core components (spec 2.2, `src/components/core/`):** Card, SegmentedControl (ShareStudio uses it), InsightCard (40px icon box), VerifiedBadge (next to the profile name) and Medal (replaces the 🥇🥈🥉 emoji). StatTile → StatCard on Card.
- **Format utils (spec 2.3):** `formatMoney` / `formatCompact` (`$1.2k`, `3.6M`) / `formatPct` (`↑ 19%`) / `formatMultiple` (`1.9x`). The existing `money*` helpers now build on them, and GrowthValue uses `formatPct`.
- **Empty-state rule (spec 2.4) on the detail page:**
  - Visitors see only data. There are no "–" or "ยังไม่ได้เพิ่ม" walls.
  - Unverified revenue/MRR collapse into one muted `UnverifiedLine`.
  - "Founded" without a date is labelled as the location.
  - The owner sees dashed `EmptyOwnerCard` prompts that deep-link to the editor. Fully empty sections are owner-only.
- **Rising Fedora logo (spec §3):**
  - `<Logo size variant="full|mark|mono">` with paths in `lib/logo.ts`, used by the header, footer, login, OG, share cards and badge.
  - Generated `public/logo.svg`, `logo-mono.svg`, `icon-192/512.png`, `logo-mono-512.png`, `src/app/icon.svg`, `favicon.ico` (16/32/48) and `apple-icon.png`. The mascot stays in the hero pill.
- **Duplicate filter panel (spec 6.3):** `/startups` renders one form. A CSS-only checkbox opens it below `lg`, with no JS.
- **375px:** the header gaps are tighter on mobile, and the provider-strip tooltips are `hidden` until hover. Together these removed 25px/15px of horizontal overflow on every page.

**Files:** `docs/SPEC.md`, `docs/design/*.png`, `src/app/globals.css`, `src/lib/{theme,theme-script,public-env,format,logo,share-palette}.ts`, `src/lib/{public-env,format}.test.ts`, `src/components/{PrefsSync,Logo,BrandLogo,SiteHeader,ProviderStrip,ProfileBlocks,StartupBits,LeaderboardCard}.tsx`, `src/components/core/*`, `src/components/profile/{Owner,ProjectBlocks}.tsx`, `src/components/share/ShareStudio.tsx`, `src/app/[locale]/{layout,startup/[slug]/page,startup/[slug]/opengraph-image,startups/page,dashboard/page}.tsx`, `src/app/api/{badge,share-card}/[slug]/*`, `src/app/{icon.svg,favicon.ico,apple-icon.png}`, `public/{logo,logo-mono}.svg`, `public/icon-*.png`, `messages/*.json`, `Design.md`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` ✓ (new: `resolveSiteUrl` prefers the production domain; `formatCompact`/`formatMoney`/`formatPct`/`formatMultiple`) · `npm run build` ✓ (the first run hit a transient Supabase 500 while prerendering `/th`; the rerun passed)
- Browser pane:
  - With the light theme stored, TH → EN → TH keeps `data-theme=light` and a white background; the currency is kept too.
  - `/startups` has 1 filter form and 1 Apply button; the mobile toggle opens it.
  - `/th/startup/jaopor` as a visitor shows no "–"; the unverified line and "ที่ตั้ง ไทย" are correct.
  - The demo profile shows all data and InsightCards with icon boxes.
  - Leaderboard medals show in light mode.
- 375px: `scrollWidth` = 375 on `/th`, `/th/startups`, `/en/startups`, `/th/login`, `/th/dashboard` and both profiles.
- The icons are served (`icon.svg`, `favicon.ico` 16/32/48, `apple-icon.png`). The OG image and badge render the new mark.
- **Not verified:** owner-side `EmptyOwnerCard`s while signed in (login is still blocked on the Supabase URL config).
- **Production after deploy:** `og:image` on `jaopor.vercel.app` now points at `https://jaopor.vercel.app/...` (was `mrr-mafia.vercel.app`); `/icon.svg` is served.

**Next:** the user checks Phase 0, then Phase 1 (shared configs + migrations, SQL shown first)

## 2026-09-30 — Visitors without Plausible: JaoPor snippet + Cloudflare; GitHub stack detection

**Done:**

- **JaoPor snippet** (visitors for any host: Vercel, Netlify, GitHub Pages…):
  - `public/v.js` sends one `sendBeacon` per page load to `POST /api/collect`.
  - A visit counts only if it comes from the project's own website (Origin/Referer must match the website domain) and isn't a bot.
  - Visitors are stored as two day-scoped HMACs in `pixel_visitors`: no cookie, no IP. There's a cap of 20 visitors per network per project per day.
  - The first accepted visit turns the connection from `pending` into `active` and records the "since" date.
  - The daily cron (or Refresh) rolls the hashes up into `traffic_snapshots`, then deletes finished days.
- **Cloudflare Web Analytics connector** (`src/lib/traffic/cloudflare.ts`):
  - Needs a token with only _Account Analytics: Read_. It must be active, and its probes for zones, Workers and account settings must not succeed; unexpected answers fail closed.
  - The GraphQL query is filtered to the project's host, which proves the numbers belong to the project.
  - Numbers are labelled "visits".
- **GitHub tech-stack detection:** `detectStack` reads languages + `package.json` and fills a new server-only `build_stack`. The profile's Tech stack card shows it as "Detected from GitHub" only when the owner's own list is empty.
- **UI:**
  - VerifyPanel Visitors group: JaoPor snippet (default; copy box + waiting/counting status) | Plausible | Umami | Cloudflare.
  - Profile captions "Counted by JaoPor" / "Verified via Cloudflare · counted as visits".
  - Cloudflare logo added to the provider strip.
  - The header "+ Add Startup" no longer wraps.
- **Migration `traffic_snippet_cloudflare_stack`:** new provider ids, `pending` status, one-traffic index, `build_stack`, `pixel_visitors` (RLS on, no client grants).

**Files:** `supabase/migrations/20260930025711_traffic_snippet_cloudflare_stack.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/traffic/{pixel,cloudflare,traffic-sources.test}.ts`, `src/lib/build/github.ts`, `src/lib/sources/{catalog,sync}.ts`, `src/app/api/collect/route.ts`, `public/v.js`, `src/components/wizard/VerifyPanel.tsx`, `src/components/{ProfileBlocks,ProviderStrip,SiteHeader}.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/lib/{brand-icons,data/connections}.ts`, `messages/*.json`, `Design.md`
**Verified:**

- RLS smoke **18/18**: T17 founders can't write `pixel_visitors`; T18 can't write `build_stack`.
- Advisors show INFO only (plus the known leaked-password WARN). Types updated.
- `npm test` 124/124. New tests: bot filter, origin match, network prefix, day-scoped hashes, Cloudflare (accept analytics-only, reject zones/Workers access, fail closed, inactive token, host-filtered query, no data, permission error), `stackFrom`, rollup math.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run build` ✓
- Browser pane (local): the QA profile shows detected stack chips with "Detected from GitHub".
- `/v.js` is served. `/api/collect` always answers 204.
- **Production (jaopor.vercel.app), temporary QA project deleted afterwards:** beacons from the project origin recorded 20 visitors (all from one network, so capped at 20). Duplicates, a wrong origin and a bot user agent were ignored. The connection went pending → active with `since` set and `traffic_provider` = jaopor. Only 32-byte hashes are stored.
- **Not verified yet:** the daily rollup into `visitors_30d` (needs the cron secret; runs with the next Vercel cron; the math is unit-tested), a real Cloudflare token, and the VerifyPanel while signed in.

**Next:** the user adds the snippet to a real site from the edit page and checks the Visitors tile after the next daily sync

## 2026-09-30 — THB/USD switch, grid card rows, demo logos, login 404 diagnosis

**Done:**

- **Currency switch ฿ THB / $ USD:**
  - Header toggle, remembered in `localStorage`. Thai pages default to THB, English pages to USD.
  - The server renders both values (`<Money>`) and a `<head>` script + CSS shows one, so there's no flash and pages stay ISR.
  - The rate is the ECB rate via Frankfurter, cached 6 h. If the rate is unavailable, only USD is shown.
  - Covers cards, leaderboard, profile tiles, chart (headline, axis, tooltip) and dashboard. Share images, OG and the badge stay USD.
- **Home "Recently added" / "Top traction"** are a plain grid now (2 → 3 → 5 columns), no horizontal sliding.
- **Each demo project has its own logo:** Lucide icons (ISC) on coloured tiles, bundled in `public/demo-logos/`. `logoUrl()` accepts only `demo-logos/<name>.png` besides Storage paths; the OG card gets the absolute URL.
- **Login 404 diagnosed:** the site now runs at `https://jaopor.vercel.app`, but Supabase's Site URL/redirect allow-list and Vercel's `NEXT_PUBLIC_SITE_URL` still point at the deleted `mrr-mafia.vercel.app`, so OAuth falls back to the dead domain. The fix is in the dashboards (steps given to the user); OG/share URLs are wrong for the same reason.

**Files:** `src/lib/{currency,currency-script,format}.ts`, `src/lib/data/fx.ts`, `src/components/{CurrencyToggle,StartupBits,StartupCard,LeaderboardCard,RevenueChart,SiteHeader}.tsx`, `src/app/[locale]/{layout,page}.tsx`, `src/app/[locale]/{startup/[slug],startups,dashboard}/page.tsx`, `src/lib/supabase/public.ts`, `public/demo-logos/*`, `supabase/demo_projects.sql`, `Design.md`, `messages/*.json`
**Verified:**

- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 108/108 ✓ (new `format.test.ts`: USD compact/full, THB conversion, no-rate fallback)
- Headless Chrome, 1280px dark: `/th` shows ฿ everywhere (e.g. ฿62,003 MRR, ฿114,621) with the grid rows and demo logos; `/en` demo profile shows $ with the chart and the sample-data line.
- Production checks: `jaopor.vercel.app` serves the app and `/api/health` is ok; og:image still points at `mrr-mafia.vercel.app`.
- **Not verified:** the switch clicked in a real browser (the pane was closed) and a true 375px pass.

**Next:** user updates the Supabase URL configuration + Vercel `NEXT_PUBLIC_SITE_URL` to `https://jaopor.vercel.app` and redeploys, then retries sign-in

## 2026-09-30 — Real provider logos, new header/hero logos, 5 demo projects

**Done:**

- **"Numbers verified by" strip:** real logo tiles in each brand's colour, with the name on hover/focus. Stripe, RevenueCat, Plausible, Umami and GitHub are live. Lemon Squeezy, Paddle and App Store are dimmed as "coming soon", and Polar is a letter tile because it has no Simple Icons entry. Paths come from Simple Icons (CC0) in `src/lib/brand-icons.ts`.
- **Logos:**
  - Header and footer use the blue app tile + "JaoPor".
  - The hero now has a small mascot + "JaoPor" pill that links home (home and directory).
- **5 demo projects** (fictional, modelled on the project types in the Claude Thailand thread): a shop POS, a LINE calorie bot, a guesthouse system, a construction takeoff tool and a price-history app.
  - Numbers and snapshots are sample data.
  - Links go to example.com.
  - Owner is the user.
- **Demo flag (migration `demo_projects`):**
  - Adds a server-only `startups.is_demo`. Demo rows take no founding number and don't count toward the 5-per-founder limit.
  - The UI labels them "Demo" on cards and the leaderboard. Profiles show a sample-data notice and "Sample data" in place of "verified via…".
  - Share images, the badge and the OG metrics show no numbers for demo rows.
  - Seed file: `supabase/demo_projects.sql`. Removal: `delete from startups where is_demo`.

**Files:** `supabase/migrations/20260929171152_demo_projects.sql`, `supabase/demo_projects.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/brand-icons.ts`, `src/components/{ProviderStrip,BrandLogo,StartupCard,StartupBits,LeaderboardCard,ProfileBlocks}.tsx`, `src/components/profile/ProjectBlocks.tsx`, `src/lib/share.ts`, `src/app/api/share-card/[slug]/route.tsx`, `public/brand/*`, `messages/*.json`, `Design.md`
**Verified:**

- Migration applied via MCP. RLS smoke **16/16**; new T16 checks that a founder can't set `is_demo`. Advisors show only the 2 known items. Types updated.
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm test` 104/104 ✓ (new: a demo project shows no share numbers)
- Seed inserted 5 projects, 240 revenue days and 480 traffic days.
- Headless Chrome, 1280px dark, TH + EN: home (logos, demo tags, leaderboard) and a demo profile (notice, chart, sample captions).
- `/api/badge/demo-raandee-pos` shows "On JaoPor: listed".
- **Not verified:** a true 375px check. The browser pane was closed and headless Chrome's minimum width is ~500px.

**Next:** user reviews; delete the demo rows before or soon after launch (`delete from public.startups where is_demo;`); production domain still to be re-added in Vercel

## 2026-09-30 — New JaoPor mascot logo (hero) + blue app tile (tab icon)

**Done:**

- The user's mascot (a winking fedora with a rising chart line, a star and a thumbs-up; the image has no name text) replaces the small brand pill above the home headline. It's trimmed and saved at 512px: `public/brand/jaopor-mascot.webp`.
- The blue app tile is now the browser tab and home-screen icon (`src/app/icon.png` 512, `apple-icon.png` 180, `favicon.ico` 16–64). The source had a painted-in checkerboard, so it was cropped to the tile and its corners made transparent.

**Files:** `src/app/[locale]/page.tsx`, `src/app/{icon.png,apple-icon.png,favicon.ico}`, `public/brand/*`, `Design.md`
**Verified:**

- `npm run typecheck` ✓, eslint ✓
- The page `<head>` links the icon, favicon and apple-touch-icon.
- Hero screenshots: 1280px dark (headless Chrome) and 375px light (pane).
- In light theme the white hat is low-contrast on the white page.

**Next:** decide whether the header/footer/OG should switch from the fedora `BrandMark` to the new tile; maybe an outlined mascot for the light theme; re-add a production domain in Vercel (the user removed `mrr-mafia.vercel.app`)

## 2026-09-29 — UI v2: Figma redesign + ledgerly functional patterns

**Done:**

- **Design system v2 from the user's Figma file** (Homescreen, Marketplace, Startup profile, Share button). Changes:
  - zinc palette measured from Figma (`#09090b` page, `#141416` cards, `#26262a` borders) plus a new `--faint` token
  - **JetBrains Mono** and the Figma type steps (`text-3xs/2xs/caption/body`)
  - indigo accent (was crimson)
  - chart colours re-validated with the dataviz validator: all checks pass on dark (`#141416`) and on light (`#ffffff`)
  - Design.md rewritten first
- **Functional patterns from ledgerly-4156.ai.studio:**
  - sticky header: Startups · Leaderboard · Dashboard, a search trigger with a global `/` shortcut, primary "+ Add"
  - leaderboard card with a metric switch (MRR · Revenue 30d · Visitors · Commits): 10 rows, then "Show all"
  - directory filter sidebar (category, AI tool, project type, looking for, verified) and sort (Top MRR, Most visitors, Most commits, Newest)
- **Pages rebuilt:**
  - Home: brand-pill hero, provider tiles, search, "Recently added" and "Top traction" rows (5 across), leaderboard.
  - Profile: breadcrumb; header with 72px logo, Share and Visit; 4 stat tiles incl. founder and founded; revenue chart card (7/30/60-day range, compare and trend switches); centred verified line; insights bento with icons; "More startups" grid.
  - `/startups`
- **ShareStudio** (the Figma share dialog) replaces the old share dialog and dropdown:
  - link + Copy; tabs Badge / Chart / Calendar / Post; theme, period, 12 colour swatches; server-rendered preview + Download
  - new image route `/api/share-card/[slug]` (next/og): verified numbers only; every query parameter is checked against a fixed list, and colours are swatch ids, never caller-supplied values
  - OG card and SVG badge moved to the shared indigo/zinc palette (`src/lib/share-palette.ts`)
- Footer credit is now "สร้างด้วย JaoPor.dev ในประเทศไทย" / "Built with JaoPor.dev in Thailand".
- Fixed `cn()`: the custom font-size steps were being dropped when merged with colour classes.

**Files:** `Design.md`, `src/app/globals.css`, `src/app/[locale]/{layout,page}.tsx`, `src/app/[locale]/startup/[slug]/page.tsx`, `src/app/[locale]/startups/page.tsx`, `src/app/api/share-card/[slug]/route.tsx`, `src/components/{SiteHeader,SearchShortcut,SearchBar,ProviderStrip,StartupCard,StartupBits,LeaderboardCard,ProfileBlocks,RevenueChart,SiteFooter}.tsx`, `src/components/share/ShareStudio.tsx`, `src/lib/{share-card,share-palette,utils}.ts`, `src/lib/data/startups.ts`, `messages/*.json`
**Verified:**

- Automated checks, all passing:
  - `npm run typecheck`, `npm run lint`
  - `npm test` 103/103; the new `share-card.test.ts` covers query validation (incl. rejected raw colours), monthly buckets, chart paths, heat levels and week columns
  - `npm run build`; the fonts are traced into the share-card route
  - TH/EN keys identical
- Desktop 1280px, dark (headless Chrome screenshots): home, profile and directory, compared against the Figma frames.
- Pane at 375px, light theme: home, profile and directory, with no horizontal scroll.
- ShareStudio: opens, switches tabs, the chart preview loads (1200px PNG), the Download link is set. All three card kinds render (badge light; chart dark/teal/90d; calendar light/12 months).
- Checked with a temporary QA project inserted into the remote DB (verified Stripe revenue, Plausible and GitHub numbers, 365 days of snapshots) and **deleted afterwards**.
- **Not verified:** owner-only views (edit page, VerifyPanel, dashboard) in the new style while signed in. The wizard and editor were only restyled through tokens.

**Next:**

- User reviews the redesign.
- The Figma MCP hit its Starter-plan call limit, so the Marketplace frame's details came from its screenshot.
- Decide whether to vendor JetBrains Mono for the OG and share images (they still use Inconsolata).
- Then block F (trust pages) + `/security-review`.

## 2026-09-29 — JaoPor: repositioning, light/dark, any project type, verified traction, share kit

**Done:**

- **Research:** re-studied the Claude Thailand "อวดโปรเจค 1 คน + claude" thread logged in (102 threads, names never recorded). Findings: traction told in users/visitors/commits more than MRR; many LINE OA bots and mobile apps; many "ขอ feedback / อยากได้ผู้ใช้" asks. The community already hand-builds indexes of the thread; saasthai.com has no verified numbers. → `docs/research/fb-showoff-thread-and-metrics.md` §2b; direction adopted (Project.md §1, §6).
- **Rename to JaoPor (เจ้าพ่อ)** + headline "1 คน + AI พีคได้แค่ไหน / ดูผลงานจริง ตัวเลขจริง", showcase-first copy, founding badge "เจ้าพ่อรุ่นบุกเบิก #n". Infra keeps the `mrrmafia` names.
- **Light/dark theme:** dark default, header ThemeToggle, no-flash head script + localStorage (no next-themes); semantic `positive/negative/warning` tokens replace raw emerald/red/amber; chart colours validated on light (dataviz validator: all pass).
- **Any project type** (migration `projects_links_traction`): website OR App Store / Play / LINE OA (`@id` works) / GitHub, auto-detected from one pasted link; `looking_for` asks; `build_story`; "Claude (chat)" tool.
- **Verified traction sources** (`src/lib/sources`): RevenueCat (charts-only v2 key; customers/apps probes must be 403), Plausible (Stats key; Sites API refused; domain must match the website), Umami (view-only share link via an SSRF-guarded fetch), GitHub build proof (public repo owned by the signed-in GitHub login; commits, first commit, % co-authored by Claude, stars). One source per kind; new generic API `/api/startups/:id/sources/:source`; cron syncs every source. VerifyPanel replaces the Stripe-only form.
- **Profile/cards:** ProjectLinks, LookingForBanner, "ตัวเลขที่ยืนยันแล้ว" tiles (lead the page when revenue is unverified), build story; cards show visitors/commits and the first ask.
- **Share kit (block E):** per-project OG image (Thai font vendored, verified numbers only), SVG badge `/api/badge/:slug` (dark/light), ShareMenu, post-listing/verify ShareDialog with a ready-to-paste post for the thread.
- Docs: Design.md (theme, tokens, ProjectLinks, LookingForBanner, VerifyPanel, TractionTiles, §9 share kit), CLAUDE.md, launch plan (new post + consent-only seeding), `/add-payment-provider` skill rewritten for the sources engine, `.env.example` (optional `GITHUB_TOKEN`).

**Files:** `supabase/migrations/20260929125125_projects_links_traction.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/{links,share,theme,theme-script}.ts`, `src/lib/{sources,traffic,build,net}/*`, `src/lib/revenue/providers/revenuecat.ts`, `src/app/api/startups/[id]/sources/[source]/route.ts`, `src/app/api/badge/[slug]/route.ts`, `src/app/[locale]/startup/[slug]/{page,opengraph-image}.tsx`, `src/components/{wizard/VerifyPanel,profile/ProjectBlocks,share/*,ThemeToggle}.tsx`, `src/assets/fonts/*`, `messages/*.json`, docs
**Verified:**

- `npm test` 95/95 (connectors with mocked fetch, links, SSRF guard, share); typecheck ✓; lint ✓; `npm run build` ✓ and the OG route's trace includes the fonts; TH/EN keys identical (315+)
- RLS smoke **15/15** (new: LINE-only project, no-link denied, visitors_30d write denied, traffic snapshot insert denied); advisors: only the known INFO/WARN
- Browser (local, temporary QA LINE-bot project, deleted afterwards): dark + light theme persist; profile at 375px and 1280px; card on home; OG image renders Thai; badge dark/light; share dialog opens with `?new=1` and strips it on close; share menu; no console errors
- **Not verified:** live connects with real RevenueCat / Plausible / Umami credentials and GitHub (needs a signed-in user); owner views of VerifyPanel/edit page; Facebook/LINE preview of the deployed OG card

**Next:** user signs in on the deployed site, tries "เพิ่ม Startup" with one link + GitHub build proof and a Plausible/Umami/RevenueCat source; rename the GitHub OAuth app and Google consent screen to JaoPor; pick a domain; then block F (trust pages) + `/security-review`

## 2026-09-29 — User feedback round 1: Stripe key bug + UX rework

**Done:**

- **Bug: genuine read-only Stripe keys were rejected** ("คีย์นี้เขียนข้อมูลใน Stripe ได้"):
  - Cause: the write probes POSTed an unknown parameter and expected 403, but Stripe validates parameters _before_ permissions, so read-only keys got 400.
  - Fix: empty-body updates of object ids that cannot exist. 403 = no write, 404 = can write; anything else is an upstream error, never a pass.
  - Rejections now name the resources (`ProviderError.detail` → API `detail` → UI "สิทธิ์เขียนที่ …").
  - Regression test emulates Stripe's param-first validation.
- **Add flow cut to 2 short steps** (name · website · category · built with + optional logo → Stripe or skip). No slug field (auto, retries on clash); website without `https://` is accepted.
  - `StripeConnect` component: shorter 3-line instructions + "Open Stripe key page" (live/test). Stripe removed permission-prefill links (Marc Lou, Dec 2025).
- **Edit page** `/dashboard/[id]/edit`: every field on one page with `id` anchors; `#field` deep links scroll, focus and highlight
- **Profile = TrustMRR pattern**: every section always shown as a card. Empty → owner sees `+ เพิ่ม` (deep link) / "เชื่อม Stripe"; visitors see "ยังไม่ได้เพิ่ม" / "ยังไม่ยืนยัน". Owner bar at the top. Owner detection is client-side (`profile/Owner.tsx`), so the page stays ISR.
- **Dashboard redesign**: per-startup card with status chip, MRR / 30-day / last-sync tiles, a profile-completeness bar ("เพิ่มอีก N ข้อมูล"), one primary action (Connect Stripe → View profile), everything else in a `⋯` menu
- **Home**: two-line H1 (รายได้จริงของสตาร์ทอัพ / ที่สร้างด้วย AI); TrustMRR-style `ProviderStrip` ("ยืนยันรายได้ผ่าน: Stripe ✓ · Polar · Lemon Squeezy · Paddle · RevenueCat · เร็ว ๆ นี้")
- Copy: "ลงสตาร์ทอัพ" → **"เพิ่ม Startup"** everywhere (plus related phrases)
- **Readability**: `html { font-size: 112.5% }` (18px root); `color-scheme: dark` + dark `<option>` fixes white-on-white select menus
- **Founding numbers without gaps**: migration `founding_number_no_gaps` = max+1 under an advisory lock (the sequence burned #2–#4 on failed inserts); sequence dropped; RLS smoke test gained T11
- Design.md: §4 scale/controls, §5 Hero headline, ProviderStrip, InfoCard, Dashboard startup card; §6 wizard/dashboard rows

**Files:** `src/lib/revenue/{types.ts,providers/stripe.ts,providers/stripe.test.ts,sync.ts}`, `src/app/api/startups/[id]/stripe/route.ts`, `src/components/wizard/{StartupWizard,StartupEditForm,StripeConnect,fields}.tsx`, `src/components/profile/Owner.tsx`, `src/components/{ProfileBlocks,ProviderStrip,DashboardActions}.tsx`, `src/app/[locale]/{page,dashboard/page,dashboard/[id]/edit/page,startup/[slug]/page}.tsx`, `src/app/globals.css`, `messages/*.json`, `supabase/migrations/20260929114738_founding_number_no_gaps.sql`, `supabase/tests/rls_smoke.sql`, `Design.md`, `CLAUDE.md`
**Verified:**

- `npm test` 29/29 ✓; typecheck ✓; lint ✓; TH/EN message keys identical
- RLS smoke 11/11 ✓; security advisor: only the known INFO plus a WARN for leaked-password protection (email auth only → covered by the "disable Email provider" open item)
- Browser (local, TH): home hero + provider strip + "เพิ่ม Startup" + larger text ✓; sparse profile as visitor (all cards, "ยังไม่ได้เพิ่ม", tiles "— / ยังไม่ยืนยัน") ✓; 375px no horizontal scroll, root 18px, color-scheme dark ✓. Temporary QA startup inserted and deleted.
- **Not verified (needs a signed-in user):** owner `+ เพิ่ม` links, the new dashboard, the wizard/edit form, the live Stripe connect with the fixed probe

**Next:** user retests the Stripe key on the live site + reviews the dashboard/wizard; block E share kit

## 2026-09-29 — Auth providers + env configured; encryption-key parser hardened

**Done:**

- Vercel (via MCP):
  - `NEXT_PUBLIC_SITE_URL` = `https://mrr-mafia.vercel.app`
  - Created a correctly named `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sensitive vars can't be renamed, so the typo `…_KE` stays and is harmless.
- GitHub OAuth app: checked, homepage + Supabase callback already correct
- Supabase (dashboard, browser pane): Site URL `https://mrr-mafia.vercel.app`; redirect URLs `https://mrr-mafia.vercel.app/api/auth/callback` + `http://localhost:3000/api/auth/callback`; GitHub provider enabled with Client ID
- User entered all secrets themselves (GitHub client secret, Google client ID/secret, `KEY_ENCRYPTION_SECRET`, `CRON_SECRET`) and redeployed. Claude never typed a secret.
- `/api/health` showed `encryptionKeyValid: false`, meaning the key isn't 32-byte base64. Added `parseKeySecret()` in `src/lib/crypto/keys.ts`:
  - accepts base64, base64url or 64 hex chars
  - ignores surrounding quotes/whitespace
  - requires exactly 32 bytes
  - used by both the encryption code and the health check

**Files:** `src/lib/crypto/keys.ts`, `src/lib/crypto/keys.test.ts`, `src/app/api/health/route.ts`
**Verified:**

- Live: Supabase `/auth/v1/settings` → github ✓ google ✓; `/api/health` → all 3 secrets set, region `sin1`, site URL set; `/api/cron/sync` without bearer → 401 ✓
- `npm test` 27/27 ✓ (4 new parser tests); typecheck ✓ lint ✓
- After redeploy (`b6bff69`): `/api/health` → **`ok: true`**, `encryptionKeyValid: true`
- Live `/th/login` → "Continue with GitHub" → GitHub shows "Sign in to GitHub to continue to **MRRMafia**" with the app logo (Supabase provider, client ID and callback all wired). Stopped there: signing in and authorizing the app is the user's step.
- **Pending:** the user's first real sign-in, then the wizard and a Stripe test-key connect

**Next:** user signs in on https://mrr-mafia.vercel.app/th/login and adds a startup; publish the Google consent screen; block E (share kit)

## 2026-09-29 — First Vercel deploy: build fix + Singapore region

**Done:**

- Found the Vercel project `mrr-mafia` (it had 0 deployments) and triggered the first production build via Vercel MCP. The repo is Git-linked, so pushes to `master` now auto-deploy.
- **Fixed the build failure the user reported:**
  - `TypeError: Invalid URL` at `new URL(publicEnv.siteUrl)` in `[locale]/layout.tsx` metadata. `NEXT_PUBLIC_SITE_URL` on Vercel is empty or malformed, and `??` only covered _undefined_.
  - `src/lib/public-env.ts` → `toOrigin()`: trims, adds `https://`, returns undefined when unparseable. `siteUrl` then falls back to `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`, then localhost. Unit tests added.
- `vercel.json` `regions: ["sin1"]`: functions were building in `iad1` (US) while Supabase is in Singapore
- Found the env var typo `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KE` (missing Y); harmless thanks to the default, user asked to rename

**Files:** `src/lib/public-env.ts`, `src/lib/public-env.test.ts`, `vercel.json`
**Verified:** `npm test` 23/23 ✓; `NEXT_PUBLIC_SITE_URL="" npm run build` ✓ (reproduces the Vercel failure and shows it's fixed); lint ✓; pushed `a231b45`, Vercel build started
**Live:** production is **https://mrr-mafia.vercel.app**. Public (the team `…-gxcb06s-projects.vercel.app` URLs are behind Vercel SSO, expected). `/th`, `/en`, `/th/startups`, `/th/login` return 200 in 0.26–1.05 s from `sin1`.
**Follow-up (commit f2b6165):**

- The cron route fails closed with 503 `not_configured` instead of a 500 when `CRON_SECRET` is unset
- New `/api/health` reports only whether each secret is set
- Health result: `SUPABASE_SECRET_KEY` ✓, `KEY_ENCRYPTION_SECRET` ✗, `CRON_SECRET` ✗, `NEXT_PUBLIC_SITE_URL` ✗ (empty on Vercel)

**Next:** user fills the 3 empty env values in Vercel and redeploys, then re-checks `/api/health` (expect `ok: true`); OAuth setup

## 2026-09-29 — GitHub repo (private) for Vercel deploy

**Done:**

- Installed GitHub CLI 2.101 (winget); user signed in as `GXCB06` (device flow, scopes `repo`, `workflow`)
- Created private repo **https://github.com/GXCB06/mrrmafia** and pushed `master` (tracking `origin/master`)
- Before pushing: scanned tracked files for secrets (only `.env.example` with public values); test fixtures now build fake Stripe keys at runtime so no key-shaped literals live in the code

**Files:** `src/lib/crypto/keys.test.ts`, `src/lib/revenue/providers/stripe.test.ts`
**Verified:** `gh repo view` → PRIVATE, default branch `master`; `git status` → in sync with `origin/master`; `npm test` 20/20
**Next:** user imports the repo in Vercel + adds env vars; GitHub OAuth app → Supabase provider; Supabase Auth URL config

## 2026-09-29 — Block D: UI (built + visually checked; sign-in end-to-end pending OAuth)

**Done:**

- Auth:
  - Google/GitHub buttons (`/login`), `/api/auth/callback` with open-redirect guard, `/api/auth/signout`
  - `src/proxy.ts` now does next-intl + Supabase session refresh
  - `requireUserId()` for protected pages
- Layout: `SiteHeader` (client auth widget + TH/EN switch), `SiteFooter`, `BrandLogo` (crimson fedora mark), toasts
- Pages:
  - **Home**: hero, stats line, search, "Built with" AI-tool chips, recently added row, top-50 leaderboard, empty states
  - **`/startups`**: search, category / AI-tool / verified filters, grid, pagination
  - **`/startup/[slug]`**: header, Founding Mafia badge, 4 stat tiles, 30-day chart with previous-period compare, verified stamp, insights, founder message, unverified state
  - **`/new`**: 3-step wizard (basics + logo upload → Stripe key → insights)
  - **`/dashboard`**: list, edit, connect, refresh, delete; `/dashboard/[id]/edit`
- Components: `StartupCard`, `LeaderboardTable`, `SearchBar`, `AiToolChips`, `CopyLinkButton`, `StartupBits`, `ProfileBlocks`, `RevenueChart`, `wizard/*`; shadcn primitives added
- Data layer `src/lib/data/startups.ts` (cookie-free anon reads, ISR 60 s); `src/lib/format.ts`; `src/lib/catalog.ts`; full TH/EN messages
- Chart palette validated with the dataviz validator; `--chart-1/2` updated (Design.md too)
- Sync stores 60 days of daily rows (for the compare line)
- `localeDetection: false`
- Harness: the quality hook runs `next typegen` for route files

**Files:** `src/app/[locale]/**`, `src/app/api/auth/**`, `src/components/**`, `src/lib/{data,auth,catalog,format,public-env}.ts`, `src/proxy.ts`, `messages/*.json`, `src/app/globals.css`, `Design.md`, `.claude/hooks/quality.mjs`
**Verified:**

- `npm run typecheck` ✓, `npm run lint` ✓, `npm test` 20/20 ✓
- Browser pane, TH + EN: home (empty and with data), directory, login, `/new` → login redirect, profile with **temporary QA data** (inserted, checked, then deleted; founding counter reset to 1; DB back to 0 users/startups)
- Widths: 375 (no horizontal scroll: scrollWidth = 375), 500, 1280
- No server errors. Console 404s are the not-yet-built `/security`, `/privacy`, `/terms` footer links (block F).
- **Not verified:** real OAuth sign-in → wizard insert → Stripe connect → dashboard (needs the user's Google/GitHub OAuth apps and a Stripe test key)

**Next:** block E (share kit + OG image), block F (trust pages); user sets up OAuth + `.env.local` for the end-to-end test

## 2026-09-29 — Block C: Stripe verification (code + unit tests; live key test pending)

**Done:**

- `src/lib/revenue/`:
  - `types.ts`: `RevenueProvider`, normalized charge/subscription types, `ProviderError`
  - `providers/stripe.ts`: REST over `fetch`. Accepts `rk_` keys only (rejects `sk_`), checks Charges/Subscriptions read, proves the key can't write (invalid-param POST must get 403), paginates with retry.
  - `metrics.ts`: MRR normalized by interval, excludes trials; 30-day / previous 30-day / all-time revenue net of refunds; subscriptions; customers; zero-filled 30-day series
  - `fx.ts`: USD via ECB/Frankfurter; zero-decimal currencies handled; missing rates flagged, never guessed
  - `sync.ts`: sync + connect, writes to the DB with the admin client
- `src/lib/crypto/keys.ts`: AES-256-GCM envelope plus key hint. `src/lib/supabase/{admin,server}.ts`, `src/lib/env.ts`, `src/lib/http.ts` (CSRF guard, constant-time compare).
- Routes: `POST/PATCH /api/startups/[id]/stripe` (connect / refresh, 10-minute cooldown), `GET /api/cron/sync` (bearer `CRON_SECRET`); `vercel.json` cron runs daily at 20:00 UTC (03:00 ICT)
- Vitest set up (`vitest.config.mts`, `npm test`); `@types/node` bumped 20 → 24 (Vitest 5 peer requirement); `server-only` added
- Docs: CLAUDE.md test commands + revenue architecture; add-payment-provider skill paths fixed (`src/lib/revenue/…`)

**Files:** `src/lib/revenue/**`, `src/lib/crypto/keys.ts`, `src/lib/supabase/{admin,server}.ts`, `src/lib/env.ts`, `src/lib/http.ts`, `src/app/api/**`, `vercel.json`, `vitest.config.mts`, `package.json`, `CLAUDE.md`, `.claude/skills/add-payment-provider/SKILL.md`
**Verified:** `npm test` 20/20 ✓ (metrics 7, crypto 5, stripe 8); `npm run typecheck` ✓; `npm run lint` ✓; `npm run build` ✓ (both API routes are dynamic). **Not verified:** a live run with a Stripe test-mode restricted key; the write-probe behaviour still needs confirming against the real API.
**Next:** block D (UI + connect form), then the live key test

## 2026-09-29 — Block B: schema v1 + RLS (live on `mrrmafia`)

**Done:**

- Migration `schema_v1`:
  - `profiles` (auto-created on sign-up), `startups` (listing, insights, `ai_tools[]`, Founding Mafia number for the first 100, 5-per-founder cap, cached verified metrics), `provider_connections` (encrypted key; no client access), `revenue_snapshots` (daily)
  - private schema for triggers/helpers; `logos` storage bucket (PNG/JPEG/WebP ≤ 1 MB, own-folder only)
- Explicit grants, since new projects don't expose tables to the API. Founders can't write metric columns (column-level privileges).
- Migration `merge_select_policies`: one read policy per role (fixes the performance advisor warning)
- Reusable `supabase/tests/rls_smoke.sql`; generated `src/lib/supabase/database.types.ts`
- CLAUDE.md: remote database workflow. Project.md: live data model table, 4 decisions, block B ticked.

**Files:** `supabase/migrations/20260929050526_schema_v1.sql`, `supabase/migrations/20260929055857_merge_select_policies.sql`, `supabase/tests/rls_smoke.sql`, `src/lib/supabase/database.types.ts`, `CLAUDE.md`, `Project.md`
**Verified:**

- RLS smoke test 10/10, including: founder can't write `mrr_cents` (denied), can't insert as another user (42501), `provider_connections` unreadable, other users edit/delete 0 rows, anon can read but not insert
- Test rolled back (0 leftover users/startups); founding sequence reset to 1
- Security advisors: only INFO for `provider_connections` having no policies (intended). Performance advisors: only INFO for unused indexes (empty DB).

**Next:** block C — `RevenueProvider` + Stripe connector + metrics engine + encryption (needs `KEY_ENCRYPTION_SECRET` in `.env.local` to run locally)

## 2026-09-29 — Block A (part 1): Supabase project + env template

**Done:**

- Paused `ar-vocab-kids` (user's choice) to free a free-tier slot; created Supabase project **`mrrmafia`** (`letfxefyqxxrfujpwtri`, ap-southeast-1, $0/mo)
- `.env.example` with public URL + publishable key and placeholders for server secrets; `.gitignore` now allows `.env.example`
- Narrowed `.claude/settings.json` `.env` deny rules to real secret files (`.env`, `.env.local`, `.env.*.local`, `.env.production`, `.env.development`) — the old `.env.*` rule also blocked `.env.example`
- Launch plan: hard 18:00 cut-off replaced by a quality launch gate (user: timing flexible, make it effective)

**Files:** `.env.example`, `.gitignore`, `.claude/settings.json`, `docs/launch-plan.md`, `Project.md`
**Verified:** `create_project` → ACTIVE_HEALTHY; `get_project_url` / `get_publishable_keys` OK
**Next:** user: `.env.local` secrets + Google/GitHub OAuth apps + Vercel project; Claude: block B schema + RLS

## 2026-09-29 — v1 launch plan (Claude Thailand FB, today)

**Done:**

- `docs/launch-plan.md`: v1 scope (11 must-haves around the add → verify → profile → share → leaderboard loop), blocks A–H schedule with 18:00 ICT cut-off, user-only tasks, Thai launch post draft, launch-day playbook, follow-ups, metrics, risks
- Project.md roadmap: Phase 1 split into **1a v1 launch (today)** and **1b hardening (weeks 1–4)**; Founder Town stays Phase 4
- Design.md §9: share menu, post-verify share dialog, card copy-link, Founding Mafia badge
- Checked infra: Supabase org has 2 active free projects (new project $0/mo but may need one paused); Vercel account ready

**Files:** `docs/launch-plan.md`, `Project.md`, `Design.md`
**Verified:** Supabase `get_cost` → $0/month; `list_projects` shows 2 ACTIVE_HEALTHY projects; Vercel `list_projects` OK
**Next:** user approves scope and Supabase project creation → start block A

## 2026-09-29 — TrustMRR UX/UI study (incl. Founder Town chat)

**Done:**

- Studied trustmrr.com live: homepage, `/acquire` (13 sort options, full filter sidebar, card anatomy), profile, `/feed`, `/chat` (Founder Town), `/game`, `/championship`, `/compete`, `/compare`, `/cofounders`, `/search`
- Wrote `docs/research/trustmrr-ux-study.md`: the 3 patterns behind every feature, Founder Town mechanics (MRR-tier houses, open town square, MRR badge on every message, in-world ads), feed/streak mechanics, engagement features, MRRMafia proposals
- Project.md parity matrix: added tier-locked chat (list mode, Phase 2), Founder Town (Phase 4), mini-game + compare pages, card social-proof items

**Files:** `docs/research/trustmrr-ux-study.md`, `Project.md`
**Verified:** observations from browser-pane screenshots, DOM reads and page text. Founder Town crashed at ~800×600 and loaded at 1440×900. Top-tier house not confirmed.
**Next:** user decides on chat tiers for pre-revenue founders and list-mode-first; then fold the chosen patterns into Design.md

## 2026-09-27 — VS Code workspace settings

**Done:**

- `.vscode/settings.json`: Prettier format-on-save, ESLint fix-on-save, workspace TypeScript, Tailwind IntelliSense for `cn()`, i18n-ally pointed at `messages/` (th source, en display), logs/.next excluded from search
- `.vscode/extensions.json`: recommends Prettier, ESLint, Tailwind CSS, i18n Ally, Supabase, Claude Code
- Opened the project in VS Code

**Files:** `.vscode/settings.json`, `.vscode/extensions.json`
**Verified:** `npx prettier --check .vscode` ✓; `code C:\Users\ACER\MRRMafia` launched
**Next:** restart the Claude session in this folder so hooks go live (still no hook logs this session), then review Project.md + Design.md

## 2026-09-27 — Phase 0: docs + Claude Code harness (5 layers)

**Done:**

- Docs: `Project.md` (vision, TrustMRR parity matrix, roadmap, architecture, decisions, open items), `Design.md` (tokens measured live from trustmrr.com, typography incl. Thai, layout, component specs, page templates), `CLAUDE.md` (rules, commands, architecture, harness map), this log, short `README.md`
- **Memory:** CLAUDE.md with `@AGENTS.md @Project.md @Design.md` imports; SessionStart hook injects current phase open tasks + latest PROGRESS entries
- **Tools (MCP):** Supabase + Vercel MCP read tools pre-allowed, write tools set to ask; built-in browser preview config `.claude/launch.json` ("web")
- **Permissions:** `.claude/settings.json` allow / ask / deny (secrets, force-push, hard reset, remote DB reset denied)
- **Hooks:** `protect-files` (.env, lockfile, logs, committed migrations), `guard-shell` (destructive git/rm/SQL, secret printing), `quality` (prettier + eslint --fix + tsc, feeds problems back), `log-tool`, `progress-gate` (Stop, one-shot nudge), `session-context`
- **Observability:** redacted JSONL per session in `.claude/logs/<date>/`, `npm run harness:report`
- Project skills: `/log-progress`, `/ui-component`, `/add-payment-provider`; installed Supabase agent skills (`supabase`, `supabase-postgres-best-practices`, markdown only, reviewed)

**Files:** `CLAUDE.md`, `Project.md`, `Design.md`, `.claude/settings.json`, `.claude/hooks/*.mjs`, `.claude/skills/*`, `scripts/log-summary.mjs`, `.gitignore`, `.prettierignore`
**Verified:**

- Pipe-tested every hook: 19 guard/protect cases correct (e.g. `rm -rf src` denied, `rm -rf .next` allowed)
- `quality` formatted a bad file and reported a type error
- `progress-gate` blocks once, then stays silent when `stop_hook_active` is set
- `session-context` output checked; secret redaction fixed and retested
- `harness:report` prints the summary
- `npm run format:check` ✓ `typecheck` ✓ `lint` ✓ `build` ✓; pre-rendered `/th` has `lang="th"`, Thai H1/title, and both font families
- ⚠ Hooks are **not live in this session**: the settings file was created mid-session. They activate on the next session start, or after opening `/hooks`. Browser-pane visual check is pending for the same reason (the preview tool still resolves the old scratch folder).

**Next:** user reviews Project.md + Design.md (brand accent, open items), then Phase 1 — decide local Docker vs remote Supabase dev project

## 2026-09-27 — Phase 0: scaffold

**Done:**

- Next.js 16.3 + React 19.2 + TypeScript + Tailwind v4 + ESLint scaffold (npm)
- shadcn/ui init (`radix-vega`, neutral, CSS variables); dark tokens aligned with Design.md; brand accent `--brand`; charts `--chart-1/2`
- next-intl 4: `th` (default) / `en`, `src/proxy.ts`, `messages/{th,en}.json`; Inconsolata + IBM Plex Sans Thai
- Supabase CLI 2.118 as a dev dependency; `supabase init`
- Prettier + tailwind plugin; scripts `typecheck`, `format`, `format:check`, `harness:report`

**Files:** `src/app/[locale]/{layout,page}.tsx`, `src/i18n/*`, `src/proxy.ts`, `src/app/globals.css`, `messages/*`, `next.config.ts`, `supabase/config.toml`, `package.json`
**Verified:** `npm run typecheck` ✓, `npm run lint` ✓, `npm run build` ✓ (static `/th`, `/en` + proxy)
**Next:** docs + harness setup
