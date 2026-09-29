-- Demo projects (Design.md §5 "Demo projects"): 5 FICTIONAL sample projects so the site isn't empty
-- before launch. They're modelled on the kinds of projects Thai builders post in the Claude
-- Thailand "อวดโปรเจค" thread (docs/research §2): a shop POS, a LINE calorie bot, a guesthouse
-- system, a construction takeoff tool and a price-history app. Names, numbers and people are made
-- up; every row has is_demo = true, so the UI labels it "Demo" and share images/badges show no
-- numbers. Links point to example.com (reserved), never to a real product. Logos are bundled
-- static files in public/demo-logos/ (Lucide icons on coloured tiles; see logoUrl()).
--
-- Run with Supabase MCP execute_sql (service role). Owner = the owner of the `mrrmafia` project.
-- Remove with: delete from public.startups where is_demo;  (snapshots cascade)

with owner as (
  select owner_id from public.startups where slug = 'mrrmafia'
),
demo (slug, name, website_url, tagline, description, category, ai_tools, looking_for,
      audience, team_size, funding, pricing, value_proposition, problem_solved,
      tech_stack, marketing_channels, province, founded_on, days_ago,
      provider, mrr, rev30, rev_prev, rev_all, subs, active_users,
      traffic, visitors, visitors_prev, commits, ai_commits, stars, first_commit_days, build_story) as (
  values
  ('demo-raandee-pos', 'RaanDee POS', 'https://example.com/raandee-pos',
   'ระบบขายหน้าร้านสำหรับร้านค้าไทย พิมพ์ใบเสร็จ ตัดสต็อก ดูยอดขายในมือถือ',
   'POS บนเว็บสำหรับร้านโชห่วย ร้านกาแฟ และร้านเสื้อผ้า ใช้ได้บนแท็บเล็ตและมือถือ รองรับพร้อมเพย์ QR สแกนบาร์โค้ด และรายงานยอดขายรายวันส่งเข้า LINE',
   'ecommerce', array['claude-code'], array['feedback'],
   'b2b', 'solo', 'bootstrapped', 'ฟรี 1 เครื่อง · 299 บาท/เดือน ไม่จำกัดเครื่อง',
   'เปิดร้านขายได้ใน 10 นาที ไม่ต้องซื้อเครื่อง POS ราคาแพง',
   'ร้านเล็กยังจดยอดขายในสมุด ตัดสต็อกด้วยมือ และไม่รู้ว่าสินค้าตัวไหนทำกำไร',
   array['Next.js', 'Supabase', 'Tailwind CSS'], array['Facebook groups', 'LINE OA'],
   'กรุงเทพมหานคร', date '2026-03-01', 2,
   'stripe', 185000, 196000, 171000, 2140000, 64, null::int,
   'plausible', 9420, 8100, 1380, 1010, 0, 190,
   '6 เดือน ทำคนเดียวหลังเลิกงาน Claude Code เขียนเกือบทั้งหมด ผมรีวิวและคุยกับร้านจริงทุกสัปดาห์'),

  ('demo-kindee-bot', 'KinDee Bot', 'https://example.com/kindee-bot',
   'LINE bot นับแคลอรี่จากรูปอาหาร ถ่ายส่งมา บอกแคลฯ และโปรตีนทันที',
   'เพิ่มเพื่อนใน LINE แล้วส่งรูปอาหาร บอทจะประเมินแคลอรี่ โปรตีน คาร์บ และสรุปรายวัน/รายสัปดาห์ ไม่ต้องโหลดแอปเพิ่ม รองรับเมนูไทยกว่า 1,500 เมนู',
   'health', array['claude-code', 'claude'], array['users', 'testers'],
   'b2c', 'solo', 'bootstrapped', 'ฟรี 5 รูป/วัน · 59 บาท/เดือน ไม่จำกัด',
   'นับแคลอรี่ใน LINE ที่ใช้อยู่แล้วทุกวัน',
   'แอปนับแคลอรี่ส่วนใหญ่ไม่รู้จักอาหารไทย และต้องพิมพ์เมนูเองทุกมื้อ',
   array['Python', 'LINE Messaging API', 'Claude API'], array['TikTok', 'Facebook groups'],
   'ขอนแก่น', date '2026-06-15', 4,
   null, null, null, null, null, null, null,
   'umami', 14200, 9800, 640, 590, 12, 100,
   'เริ่มจากทำให้แม่ใช้เอง 2 สัปดาห์แรกเสร็จ MVP แล้วเพื่อน ๆ ขอใช้ต่อ'),

  ('demo-baanpak-check', 'BaanPak Check', 'https://example.com/baanpak-check',
   'ระบบบริหารบ้านพักและโฮสเทล: ปฏิทิน OTA, ตม.30 อัตโนมัติ, เงินเดือนพนักงาน',
   'รวมปฏิทินจอง Agoda/Booking/Airbnb ไว้ที่เดียว กันจองซ้ำ ออกแบบฟอร์ม ตม.30 ให้อัตโนมัติจากพาสปอร์ต และคำนวณเงินเดือน/ค่าคอมพนักงาน',
   'saas', array['claude-code', 'cursor'], array['buyer'],
   'b2b', '2-5', 'bootstrapped', '990 บาท/เดือน ต่อที่พัก (ไม่เกิน 30 ห้อง)',
   'เจ้าของที่พักประหยัดงานเอกสารวันละ 1–2 ชั่วโมง',
   'ที่พักเล็กจัดการหลาย OTA ด้วย Excel จองซ้ำบ่อย และทำ ตม.30 ด้วยมือ',
   array['Next.js', 'PostgreSQL', 'Prisma'], array['SEO', 'Facebook groups'],
   'เชียงใหม่', date '2025-11-10', 6,
   'stripe', 342000, 356000, 318000, 3860000, 38, null,
   'plausible', 5600, 5100, 2140, 1700, 0, 320,
   'สองคนพี่น้อง พี่ทำที่พักจริง น้องเขียนโค้ดกับ Claude ตอนนี้ลูกค้า 38 ที่พักทั่วภาคเหนือ'),

  ('demo-thodbaep-ai', 'ThodBaep AI', 'https://example.com/thodbaep-ai',
   'ถอดแบบก่อสร้างด้วย AI อัปโหลด PDF แบบ ได้ BOQ ปริมาณงานในไม่กี่นาที',
   'อ่านแบบสถาปัตย์และโครงสร้างจาก PDF แยกพื้นที่ผนัง พื้น ฝ้า นับประตูหน้าต่าง แล้วออก BOQ เป็น Excel ให้ผู้รับเหมาแก้ต่อได้',
   'ai', array['claude-code'], array['testers', 'cofounder'],
   'b2b', 'solo', 'bootstrapped', 'ช่วงทดสอบ: ฟรี',
   'ถอดแบบบ้านเดี่ยว 1 หลังจาก 2 วันเหลือ 20 นาที',
   'ผู้รับเหมารายย่อยต้องถอดแบบด้วยมือหรือจ้างคนถอด ช้าและผิดบ่อย',
   array['Python', 'FastAPI', 'React'], array['LinkedIn', 'Facebook groups'],
   'นนทบุรี', date '2026-05-20', 9,
   null, null, null, null, null, null, null,
   'plausible', 3100, 1900, 980, 860, 42, 130,
   'ผมเป็นวิศวกรโยธา เขียนโค้ดไม่เป็นจนเจอ Claude Code 4 เดือน 980 commits'),

  ('demo-raakadee', 'RaakaDee', 'https://example.com/raakadee',
   'แอปดูประวัติราคาสินค้าออนไลน์ แจ้งเตือนเมื่อราคาลดจริง ไม่ใช่ลดหลอก',
   'วางลิงก์สินค้าจากร้านออนไลน์ แอปจะเก็บกราฟราคา 90 วัน และเตือนเมื่อราคาต่ำสุดในรอบเดือน ช่วงเซลล์ 9.9 / 11.11 ใช้งานพุ่งหลายเท่า',
   'mobile', array['claude-code', 'codex'], array['users'],
   'b2c', 'solo', 'bootstrapped', 'ฟรี 10 รายการ · 39 บาท/เดือน ไม่จำกัด',
   'รู้ทันทีว่า "ลดราคา" ลดจริงไหม',
   'ร้านขึ้นราคาก่อนเซลล์แล้วลดกลับ คนซื้อไม่มีทางรู้ราคาจริงย้อนหลัง',
   array['Swift', 'SwiftUI', 'RevenueCat'], array['TikTok', 'App Store optimization'],
   'กรุงเทพมหานคร', date '2026-02-14', 12,
   'revenuecat', 64000, 68000, 52000, 412000, 212, 7850,
   null, null, null, 1520, 1100, 0, 220,
   'ทำคนเดียวตอนกลางคืน ใช้ Claude Code เขียน Swift ทั้งที่ไม่เคยเขียนมาก่อน')
),
ins as (
  insert into public.startups (
    owner_id, is_demo, slug, logo_path, name, website_url, tagline, description, category, ai_tools,
    looking_for, audience, team_size, funding, pricing, value_proposition, problem_solved,
    tech_stack, marketing_channels, province, founded_on, created_at,
    verification_status, verified_provider, mrr_cents, revenue_30d_cents,
    revenue_prev_30d_cents, revenue_all_time_cents, active_subscriptions, active_users,
    last_synced_at, traffic_provider, visitors_30d, visitors_prev_30d, traffic_synced_at,
    build_commits, build_ai_commits, build_stars, build_first_commit_at, build_synced_at,
    github_repo, build_story)
  select o.owner_id, true, d.slug, 'demo-logos/' || substring(d.slug from 6) || '.png', d.name, d.website_url, d.tagline, d.description, d.category,
    d.ai_tools, d.looking_for, d.audience, d.team_size, d.funding, d.pricing,
    d.value_proposition, d.problem_solved, d.tech_stack, d.marketing_channels, d.province,
    d.founded_on, now() - make_interval(days => d.days_ago),
    case when d.provider is null then 'unverified' else 'verified' end, d.provider, d.mrr,
    d.rev30, d.rev_prev, d.rev_all, d.subs, d.active_users,
    case when d.provider is null then null else now() end,
    d.traffic, d.visitors, d.visitors_prev, case when d.traffic is null then null else now() end,
    d.commits, d.ai_commits, d.stars, now() - make_interval(days => d.first_commit_days), now(),
    'example/' || d.slug, d.build_story
  from demo d cross join owner o
  returning id, slug, verified_provider, revenue_30d_cents, traffic_provider, visitors_30d
),
rev as (
  -- 120 days of daily revenue that sums close to revenue_30d, with weekly wobble and growth.
  insert into public.revenue_snapshots (startup_id, day, revenue_cents)
  select i.id, (current_date - g)::date,
    greatest(0, round(i.revenue_30d_cents / 30.0 * (1 - g * 0.0025)
      * (1 + 0.18 * sin(g / 3.5)) * (0.85 + random() * 0.3)))::int
  from ins i, generate_series(0, 119) g
  where i.verified_provider = 'stripe'
  returning 1
),
traffic as (
  insert into public.traffic_snapshots (startup_id, day, visitors)
  select i.id, (current_date - g)::date,
    greatest(0, round(i.visitors_30d / 30.0 * (1 - g * 0.003)
      * (1 + 0.25 * sin(g / 3.5)) * (0.8 + random() * 0.4)))::int
  from ins i, generate_series(0, 119) g
  where i.traffic_provider is not null
  returning 1
)
select (select count(*) from ins) as projects,
       (select count(*) from rev) as revenue_days,
       (select count(*) from traffic) as traffic_days;
