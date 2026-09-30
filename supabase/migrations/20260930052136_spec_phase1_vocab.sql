-- Spec Phase 1 (docs/SPEC.md §4-§5): shared vocabularies + new profile fields.
-- Lists below are generated from src/lib/config/*.ts; src/lib/config/config.test.ts fails if they drift.
--
--  1. categories 14 → 37 (existing slugs kept, incl. `mobile`)
--  2. provinces lookup (77, 6 regions) + startups.province becomes a slug (back-filled from names)
--  3. tech_stack text[] → jsonb {frontend, backend, database, hosting, ai, payments} (slugs)
--  4. marketing_channels: slugs or `custom:<text>` (back-filled)
--  5. structured pricing (amount, currency, period) + pricing_note (was `pricing`)
--  6. demo_video_url, founder_role, founder_message ≤ 600
--  7. startup_screenshots table (max 8 per startup) + `screenshots` storage bucket
--  8. fx_rates (daily USD→THB)
--  9. pg_trgm + trigram indexes for Thai substring search
-- RPCs category_counts / province_leaderboard / search_all ship with the phases that use them (5, 6, 4).

-- ---------------------------------------------------------------------------
-- 1. Categories
-- ---------------------------------------------------------------------------
alter table public.startups drop constraint startups_category_check;
alter table public.startups add constraint startups_category_check check (
  category in ('ai', 'saas', 'developer-tools', 'fintech', 'marketing', 'ecommerce', 'productivity', 'design', 'no-code', 'analytics', 'education', 'health', 'community', 'content', 'crypto', 'support', 'entertainment', 'games', 'green-tech', 'iot', 'legal', 'marketplace', 'mobile', 'news', 'real-estate', 'hr', 'sales', 'security', 'social', 'travel', 'utilities', 'line-oa', 'food', 'agritech', 'local-sme', 'logistics', 'other')
);

-- ---------------------------------------------------------------------------
-- 2. Provinces
-- ---------------------------------------------------------------------------
create table public.provinces (
  slug text primary key,
  name_th text not null unique,
  name_en text not null unique,
  region text not null check (region in ('north', 'northeast', 'central', 'east', 'west', 'south'))
);

insert into public.provinces (slug, name_th, name_en, region) values
  ('chiang-mai', 'เชียงใหม่', 'Chiang Mai', 'north'),
  ('chiang-rai', 'เชียงราย', 'Chiang Rai', 'north'),
  ('lampang', 'ลำปาง', 'Lampang', 'north'),
  ('lamphun', 'ลำพูน', 'Lamphun', 'north'),
  ('mae-hong-son', 'แม่ฮ่องสอน', 'Mae Hong Son', 'north'),
  ('nan', 'น่าน', 'Nan', 'north'),
  ('phayao', 'พะเยา', 'Phayao', 'north'),
  ('phrae', 'แพร่', 'Phrae', 'north'),
  ('uttaradit', 'อุตรดิตถ์', 'Uttaradit', 'north'),
  ('amnat-charoen', 'อำนาจเจริญ', 'Amnat Charoen', 'northeast'),
  ('bueng-kan', 'บึงกาฬ', 'Bueng Kan', 'northeast'),
  ('buriram', 'บุรีรัมย์', 'Buriram', 'northeast'),
  ('chaiyaphum', 'ชัยภูมิ', 'Chaiyaphum', 'northeast'),
  ('kalasin', 'กาฬสินธุ์', 'Kalasin', 'northeast'),
  ('khon-kaen', 'ขอนแก่น', 'Khon Kaen', 'northeast'),
  ('loei', 'เลย', 'Loei', 'northeast'),
  ('maha-sarakham', 'มหาสารคาม', 'Maha Sarakham', 'northeast'),
  ('mukdahan', 'มุกดาหาร', 'Mukdahan', 'northeast'),
  ('nakhon-phanom', 'นครพนม', 'Nakhon Phanom', 'northeast'),
  ('nakhon-ratchasima', 'นครราชสีมา', 'Nakhon Ratchasima', 'northeast'),
  ('nong-bua-lamphu', 'หนองบัวลำภู', 'Nong Bua Lamphu', 'northeast'),
  ('nong-khai', 'หนองคาย', 'Nong Khai', 'northeast'),
  ('roi-et', 'ร้อยเอ็ด', 'Roi Et', 'northeast'),
  ('sakon-nakhon', 'สกลนคร', 'Sakon Nakhon', 'northeast'),
  ('sisaket', 'ศรีสะเกษ', 'Sisaket', 'northeast'),
  ('surin', 'สุรินทร์', 'Surin', 'northeast'),
  ('ubon-ratchathani', 'อุบลราชธานี', 'Ubon Ratchathani', 'northeast'),
  ('udon-thani', 'อุดรธานี', 'Udon Thani', 'northeast'),
  ('yasothon', 'ยโสธร', 'Yasothon', 'northeast'),
  ('bangkok', 'กรุงเทพมหานคร', 'Bangkok', 'central'),
  ('ang-thong', 'อ่างทอง', 'Ang Thong', 'central'),
  ('phra-nakhon-si-ayutthaya', 'พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya', 'central'),
  ('chai-nat', 'ชัยนาท', 'Chai Nat', 'central'),
  ('kamphaeng-phet', 'กำแพงเพชร', 'Kamphaeng Phet', 'central'),
  ('lopburi', 'ลพบุรี', 'Lopburi', 'central'),
  ('nakhon-nayok', 'นครนายก', 'Nakhon Nayok', 'central'),
  ('nakhon-pathom', 'นครปฐม', 'Nakhon Pathom', 'central'),
  ('nakhon-sawan', 'นครสวรรค์', 'Nakhon Sawan', 'central'),
  ('nonthaburi', 'นนทบุรี', 'Nonthaburi', 'central'),
  ('pathum-thani', 'ปทุมธานี', 'Pathum Thani', 'central'),
  ('phetchabun', 'เพชรบูรณ์', 'Phetchabun', 'central'),
  ('phichit', 'พิจิตร', 'Phichit', 'central'),
  ('phitsanulok', 'พิษณุโลก', 'Phitsanulok', 'central'),
  ('samut-prakan', 'สมุทรปราการ', 'Samut Prakan', 'central'),
  ('samut-sakhon', 'สมุทรสาคร', 'Samut Sakhon', 'central'),
  ('samut-songkhram', 'สมุทรสงคราม', 'Samut Songkhram', 'central'),
  ('saraburi', 'สระบุรี', 'Saraburi', 'central'),
  ('sing-buri', 'สิงห์บุรี', 'Sing Buri', 'central'),
  ('sukhothai', 'สุโขทัย', 'Sukhothai', 'central'),
  ('suphan-buri', 'สุพรรณบุรี', 'Suphan Buri', 'central'),
  ('uthai-thani', 'อุทัยธานี', 'Uthai Thani', 'central'),
  ('chachoengsao', 'ฉะเชิงเทรา', 'Chachoengsao', 'east'),
  ('chanthaburi', 'จันทบุรี', 'Chanthaburi', 'east'),
  ('chonburi', 'ชลบุรี', 'Chonburi', 'east'),
  ('prachinburi', 'ปราจีนบุรี', 'Prachinburi', 'east'),
  ('rayong', 'ระยอง', 'Rayong', 'east'),
  ('sa-kaeo', 'สระแก้ว', 'Sa Kaeo', 'east'),
  ('trat', 'ตราด', 'Trat', 'east'),
  ('kanchanaburi', 'กาญจนบุรี', 'Kanchanaburi', 'west'),
  ('phetchaburi', 'เพชรบุรี', 'Phetchaburi', 'west'),
  ('prachuap-khiri-khan', 'ประจวบคีรีขันธ์', 'Prachuap Khiri Khan', 'west'),
  ('ratchaburi', 'ราชบุรี', 'Ratchaburi', 'west'),
  ('tak', 'ตาก', 'Tak', 'west'),
  ('chumphon', 'ชุมพร', 'Chumphon', 'south'),
  ('krabi', 'กระบี่', 'Krabi', 'south'),
  ('nakhon-si-thammarat', 'นครศรีธรรมราช', 'Nakhon Si Thammarat', 'south'),
  ('narathiwat', 'นราธิวาส', 'Narathiwat', 'south'),
  ('pattani', 'ปัตตานี', 'Pattani', 'south'),
  ('phang-nga', 'พังงา', 'Phang Nga', 'south'),
  ('phatthalung', 'พัทลุง', 'Phatthalung', 'south'),
  ('phuket', 'ภูเก็ต', 'Phuket', 'south'),
  ('ranong', 'ระนอง', 'Ranong', 'south'),
  ('satun', 'สตูล', 'Satun', 'south'),
  ('songkhla', 'สงขลา', 'Songkhla', 'south'),
  ('surat-thani', 'สุราษฎร์ธานี', 'Surat Thani', 'south'),
  ('trang', 'ตรัง', 'Trang', 'south'),
  ('yala', 'ยะลา', 'Yala', 'south');

-- Free-text "มุกดาหาร, ไทย" / "จ.เชียงใหม่" / "Chiang Mai" / "กทม" → slug. Unmatched → null (reported
-- before applying; see PROGRESS.md).
update public.startups s
set province = coalesce(
  (
    select p.slug from public.provinces p
    where lower(p.name_en) = lower(m.name)
       or p.name_th = m.name
       or p.slug = lower(m.name)
    limit 1
  ),
  case when m.name in ('กทม', 'กทม.', 'กรุงเทพ', 'กรุงเทพฯ', 'BKK') then 'bangkok' end
)
from (
  select id, btrim(regexp_replace(split_part(province, ',', 1), '^(จังหวัด|จ\.)\s*', '')) as name
  from public.startups
  where province is not null
) m
where s.id = m.id;

alter table public.startups drop constraint startups_province_check;
alter table public.startups
  add constraint startups_province_fkey foreign key (province) references public.provinces (slug);
create index startups_province_idx on public.startups (province) where province is not null;

-- ---------------------------------------------------------------------------
-- 3. tech_stack → jsonb of slugs per group (built_with stays in `ai_tools`)
-- ---------------------------------------------------------------------------
alter table public.startups add column tech_stack_v2 jsonb not null default '{}'::jsonb;

with labels (norm, grp, slug) as (
  values
    ('nextjs', 'frontend', 'next-js'),
    ('react', 'frontend', 'react'),
    ('reactnative', 'frontend', 'react-native'),
    ('vue', 'frontend', 'vue'),
    ('nuxt', 'frontend', 'nuxt'),
    ('svelte', 'frontend', 'svelte'),
    ('flutter', 'frontend', 'flutter'),
    ('swift', 'frontend', 'swift'),
    ('swiftui', 'frontend', 'swiftui'),
    ('kotlin', 'frontend', 'kotlin'),
    ('tailwindcss', 'frontend', 'tailwind-css'),
    ('expo', 'frontend', 'expo'),
    ('nodejs', 'backend', 'node-js'),
    ('python', 'backend', 'python'),
    ('go', 'backend', 'go'),
    ('laravel', 'backend', 'laravel'),
    ('django', 'backend', 'django'),
    ('fastapi', 'backend', 'fastapi'),
    ('supabase', 'backend', 'supabase'),
    ('firebase', 'backend', 'firebase'),
    ('rails', 'backend', 'rails'),
    ('postgresql', 'database', 'postgresql'),
    ('mysql', 'database', 'mysql'),
    ('mongodb', 'database', 'mongodb'),
    ('redis', 'database', 'redis'),
    ('sqlite', 'database', 'sqlite'),
    ('vercel', 'hosting', 'vercel'),
    ('cloudflare', 'hosting', 'cloudflare'),
    ('aws', 'hosting', 'aws'),
    ('googlecloud', 'hosting', 'google-cloud'),
    ('railway', 'hosting', 'railway'),
    ('render', 'hosting', 'render'),
    ('netlify', 'hosting', 'netlify'),
    ('claude', 'ai', 'claude'),
    ('openai', 'ai', 'openai'),
    ('gemini', 'ai', 'gemini'),
    ('llama', 'ai', 'llama'),
    ('mistral', 'ai', 'mistral'),
    ('stripe', 'payments', 'stripe'),
    ('revenuecat', 'payments', 'revenuecat'),
    ('omise', 'payments', 'omise'),
    ('2c2p', 'payments', '2c2p'),
    ('promptpay', 'payments', 'promptpay'),
    ('lemonsqueezy', 'payments', 'lemon-squeezy'),
    ('paddle', 'payments', 'paddle')
),
aliases (norm, target) as (
  values ('claudeapi', 'claude'), ('anthropic', 'claude'), ('postgres', 'postgresql'),
         ('gcp', 'googlecloud'), ('tailwind', 'tailwindcss'), ('rubyonrails', 'rails')
),
mapped as (
  select s.id, l.grp, l.slug
  from public.startups s
  cross join lateral unnest(s.tech_stack) as t(label)
  cross join lateral (
    select regexp_replace(lower(t.label), '[^a-z0-9]+', '', 'g') as n
  ) x
  left join aliases a on a.norm = x.n
  join labels l on l.norm = coalesce(a.target, x.n)
),
grouped as (
  select id, jsonb_object_agg(grp, slugs) as stack
  from (
    select id, grp, jsonb_agg(distinct slug) as slugs from mapped group by id, grp
  ) g
  group by id
)
update public.startups s set tech_stack_v2 = g.stack from grouped g where g.id = s.id;

alter table public.startups drop column tech_stack;
alter table public.startups rename column tech_stack_v2 to tech_stack;

-- ---------------------------------------------------------------------------
-- 4. marketing_channels → slugs or custom:<text>
-- ---------------------------------------------------------------------------
with labels (norm, slug) as (
  values
    ('lineoa', 'line-oa'),
    ('lineads', 'line-ads'),
    ('facebook', 'facebook'),
    ('facebookgroups', 'facebook-groups'),
    ('กลมfacebook', 'facebook-groups'),
    ('facebookads', 'facebook-ads'),
    ('instagram', 'instagram'),
    ('tiktok', 'tiktok'),
    ('tiktokads', 'tiktok-ads'),
    ('youtube', 'youtube'),
    ('youtubeads', 'youtube-ads'),
    ('x', 'x'),
    ('xads', 'x-ads'),
    ('linkedin', 'linkedin'),
    ('linkedinads', 'linkedin-ads'),
    ('googleads', 'google-ads'),
    ('metaads', 'meta-ads'),
    ('pantip', 'pantip'),
    ('blockdit', 'blockdit'),
    ('shopeelazadaaffiliate', 'shopee-lazada-affiliate'),
    ('seo', 'seo'),
    ('blog', 'blog'),
    ('บลอก', 'blog'),
    ('contentmarketing', 'content-marketing'),
    ('emailmarketing', 'email-marketing'),
    ('อเมลการตลาด', 'email-marketing'),
    ('influencerkol', 'influencer-kol'),
    ('wordofmouth', 'word-of-mouth'),
    ('ปากตอปาก', 'word-of-mouth'),
    ('eventsmeetups', 'events-meetups'),
    ('อเวนตมตอป', 'events-meetups')
)
update public.startups s
set marketing_channels = coalesce((
  select array_agg(distinct coalesce(l.slug, 'custom:' || left(btrim(c.v), 40)))
  from unnest(s.marketing_channels) as c(v)
  left join labels l on l.norm = regexp_replace(lower(c.v), '[^[:alnum:]]+', '', 'g')
  where btrim(c.v) <> ''
), '{}')
where cardinality(s.marketing_channels) > 0;

-- ---------------------------------------------------------------------------
-- 5. Pricing: amount + currency + period; the old free text becomes pricing_note
-- ---------------------------------------------------------------------------
alter table public.startups rename column pricing to pricing_note;
alter table public.startups rename constraint startups_pricing_check to startups_pricing_note_check;
alter table public.startups
  add column pricing_amount numeric(12, 2) check (pricing_amount >= 0 and pricing_amount < 1000000000),
  add column pricing_currency text check (pricing_currency in ('THB', 'USD')),
  add column pricing_period text check (pricing_period in ('month', 'year', 'once', 'free')),
  add constraint startups_pricing_complete check (
    pricing_period = 'free'
    or (pricing_amount is null and pricing_currency is null and pricing_period is null)
    or (pricing_amount is not null and pricing_currency is not null and pricing_period is not null)
  );

-- A bare number ("990") becomes ฿990 / month; anything else stays as the note.
update public.startups
set pricing_amount = btrim(pricing_note)::numeric,
    pricing_currency = 'THB',
    pricing_period = 'month',
    pricing_note = null
where pricing_note ~ '^\s*[0-9]{1,9}(\.[0-9]{1,2})?\s*$';

-- ---------------------------------------------------------------------------
-- 6. Demo video, founder role, longer founder message
-- ---------------------------------------------------------------------------
alter table public.startups
  add column demo_video_url text check (
    char_length(demo_video_url) <= 300
    and demo_video_url ~ '^https://(www\.)?(youtube\.com/(watch\?v=|shorts/)|youtu\.be/|loom\.com/share/|tiktok\.com/@[A-Za-z0-9._]+/video/)[A-Za-z0-9_-]'
  ),
  add column founder_role text check (char_length(founder_role) <= 60);

alter table public.startups drop constraint startups_founder_message_check;
alter table public.startups
  add constraint startups_founder_message_check check (char_length(founder_message) <= 600);

-- Vocabulary checks for the jsonb / array columns. A trigger (not a CHECK) so the validator can
-- live in the private schema, like startups_before_insert.
create function private.startups_validate_vocab()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed jsonb := jsonb_build_object(
    'frontend', '["next-js","react","react-native","vue","nuxt","svelte","flutter","swift","swiftui","kotlin","tailwind-css","expo"]'::jsonb,
    'backend', '["node-js","python","go","laravel","django","fastapi","supabase","firebase","rails"]'::jsonb,
    'database', '["postgresql","mysql","mongodb","redis","sqlite"]'::jsonb,
    'hosting', '["vercel","cloudflare","aws","google-cloud","railway","render","netlify"]'::jsonb,
    'ai', '["claude","openai","gemini","llama","mistral"]'::jsonb,
    'payments', '["stripe","revenuecat","omise","2c2p","promptpay","lemon-squeezy","paddle"]'::jsonb
  );
  grp text;
  val jsonb;
begin
  if jsonb_typeof(new.tech_stack) <> 'object' then
    raise exception 'tech_stack must be an object' using errcode = '23514';
  end if;
  for grp, val in select key, value from jsonb_each(new.tech_stack) loop
    if not allowed ? grp
       or jsonb_typeof(val) <> 'array'
       or jsonb_array_length(val) > 12
       or exists (
         select 1 from jsonb_array_elements(val) e
         where jsonb_typeof(e) <> 'string' or not (allowed -> grp) ? (e #>> '{}')
       )
    then
      raise exception 'invalid tech_stack group %', grp using errcode = '23514';
    end if;
  end loop;

  if exists (
    select 1 from unnest(new.marketing_channels) c
    where not (
      c = any (array['line-oa', 'line-ads', 'facebook', 'facebook-groups', 'facebook-ads', 'instagram', 'tiktok', 'tiktok-ads', 'youtube', 'youtube-ads', 'x', 'x-ads', 'linkedin', 'linkedin-ads', 'google-ads', 'meta-ads', 'pantip', 'blockdit', 'shopee-lazada-affiliate', 'seo', 'blog', 'content-marketing', 'email-marketing', 'influencer-kol', 'word-of-mouth', 'events-meetups'])
      or c ~ '^custom:.{1,40}$'
    )
  ) then
    raise exception 'invalid marketing channel' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.startups_validate_vocab() from public, anon, authenticated;

create trigger startups_validate_vocab
before insert or update of tech_stack, marketing_channels on public.startups
for each row execute function private.startups_validate_vocab();

-- Owners edit the new fields; tech_stack was re-created so its grants are re-issued.
grant insert (tech_stack, pricing_amount, pricing_currency, pricing_period, demo_video_url, founder_role)
  on public.startups to authenticated;
grant update (tech_stack, pricing_amount, pricing_currency, pricing_period, demo_video_url, founder_role)
  on public.startups to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Screenshots (spec 6.4 / 6.9): rows + storage bucket. Files live at
--    screenshots/{startup_id}/{uuid}.webp; the row stores that path, never a free URL.
-- ---------------------------------------------------------------------------
create table public.startup_screenshots (
  id bigint generated always as identity primary key,
  startup_id bigint not null references public.startups (id) on delete cascade,
  path text not null check (path ~ '^[0-9]{1,18}/[0-9a-f-]{36}\.webp$'),
  kind text not null check (kind in ('desktop', 'mobile', 'line')),
  caption text check (char_length(caption) <= 60),
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  position smallint not null default 0 check (position between 0 and 7),
  created_at timestamptz not null default now(),
  constraint startup_screenshots_path_in_own_folder check (split_part(path, '/', 1) = startup_id::text),
  unique (path)
);
create index startup_screenshots_startup_idx on public.startup_screenshots (startup_id, position);

create function private.startup_screenshots_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.startup_screenshots where startup_id = new.startup_id) >= 8 then
    raise exception 'max 8 screenshots per startup' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function private.startup_screenshots_limit() from public, anon, authenticated;

create trigger startup_screenshots_limit
before insert on public.startup_screenshots
for each row execute function private.startup_screenshots_limit();

alter table public.startup_screenshots enable row level security;

create policy "screenshots of visible startups are readable"
on public.startup_screenshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id
      and (s.status = 'published' or s.owner_id = (select auth.uid()))
  )
);

create policy "owners add screenshots"
on public.startup_screenshots for insert
to authenticated
with check (
  exists (select 1 from public.startups s where s.id = startup_id and s.owner_id = (select auth.uid()))
);

create policy "owners edit screenshots"
on public.startup_screenshots for update
to authenticated
using (
  exists (select 1 from public.startups s where s.id = startup_id and s.owner_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.startups s where s.id = startup_id and s.owner_id = (select auth.uid()))
);

create policy "owners delete screenshots"
on public.startup_screenshots for delete
to authenticated
using (
  exists (select 1 from public.startups s where s.id = startup_id and s.owner_id = (select auth.uid()))
);

revoke all on public.startup_screenshots from anon, authenticated;
grant select on public.startup_screenshots to anon, authenticated;
grant insert (startup_id, path, kind, caption, width, height, position) on public.startup_screenshots to authenticated;
grant update (kind, caption, position) on public.startup_screenshots to authenticated;
grant delete on public.startup_screenshots to authenticated;
grant select, insert, update, delete on public.startup_screenshots to service_role;

-- Public bucket (files served by URL). Owners write only inside their own startup's folder.
-- Files are removed by the app when a startup or screenshot is deleted (Storage forbids SQL deletes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', true, 3145728, array['image/webp'])
on conflict (id) do nothing;

create policy "owners list own screenshots"
on storage.objects for select
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners upload own screenshots"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners update own screenshots"
on storage.objects for update
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
  )
);

create policy "owners delete own screenshots"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'screenshots'
  and exists (
    select 1 from public.startups s
    where s.id::text = (storage.foldername(name))[1] and s.owner_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 8. FX rates (one row per day, written by the server cron)
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  day date primary key,
  usd_thb numeric(10, 4) not null check (usd_thb > 0 and usd_thb < 1000),
  source text not null default 'ecb' check (char_length(source) <= 20),
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS + grants for the lookup tables (public read, server-only writes)
-- ---------------------------------------------------------------------------
alter table public.provinces enable row level security;
alter table public.fx_rates enable row level security;

create policy "provinces are public" on public.provinces for select to anon, authenticated using (true);
create policy "fx rates are public" on public.fx_rates for select to anon, authenticated using (true);

revoke all on public.provinces, public.fx_rates from anon, authenticated;
grant select on public.provinces, public.fx_rates to anon, authenticated;
grant select, insert, update, delete on public.provinces, public.fx_rates to service_role;

-- ---------------------------------------------------------------------------
-- 9. Thai substring search (spec 6.8): trigram indexes ("พ่อ" finds "เจ้าพ่อ")
-- ---------------------------------------------------------------------------
create extension if not exists pg_trgm with schema extensions;

create index startups_name_trgm on public.startups using gin (name extensions.gin_trgm_ops);
create index startups_tagline_trgm on public.startups using gin (tagline extensions.gin_trgm_ops);
create index startups_description_trgm on public.startups using gin (description extensions.gin_trgm_ops);
