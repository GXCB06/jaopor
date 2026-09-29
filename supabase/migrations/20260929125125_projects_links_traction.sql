-- JaoPor v2: every kind of AI-built project, not just websites with Stripe.
-- Why (docs/research/fb-showoff-thread-and-metrics.md §2b): builders ship LINE OA bots, mobile
-- apps and GitHub repos, brag in users/visitors/commits more than MRR, and ask for users/feedback.
--   * Project links: website OR App Store / Google Play / LINE OA / GitHub (at least one).
--   * "Looking for" asks + a short build story (owner-editable).
--   * Server-only verified traction: RevenueCat active users, visitors (Plausible / Umami),
--     GitHub build proof. Same model as revenue: cached on startups, no client UPDATE grant.

-- ---------------------------------------------------------------------------
-- Owner-editable project fields
-- ---------------------------------------------------------------------------
alter table public.startups
  alter column website_url drop not null,
  add column app_store_url text check (
    app_store_url ~ '^https://apps\.apple\.com/' and char_length(app_store_url) <= 300
  ),
  add column play_store_url text check (
    play_store_url ~ '^https://play\.google\.com/store/apps/details\?id=' and char_length(play_store_url) <= 300
  ),
  add column line_url text check (
    line_url ~ '^https://(lin\.ee|line\.me|page\.line\.me)/' and char_length(line_url) <= 300
  ),
  add column github_url text check (
    github_url ~ '^https://github\.com/[A-Za-z0-9-]{1,39}(/[A-Za-z0-9._-]{1,100})?/?$'
  ),
  add column looking_for text[] not null default '{}' check (
    looking_for <@ array['users', 'feedback', 'testers', 'cofounder', 'buyer', 'investor']::text[]
  ),
  add column build_story text check (char_length(build_story) <= 280),
  add constraint startups_has_a_link check (
    num_nonnulls(website_url, app_store_url, play_store_url, line_url, github_url) >= 1
  );

-- "Claude" (claude.ai chat / Artifacts) joins the AI tool vocabulary: many builders never used Claude Code.
alter table public.startups drop constraint startups_ai_tools_check;
alter table public.startups add constraint startups_ai_tools_check check (
  ai_tools <@ array['claude-code', 'claude', 'opencode', 'cursor', 'codex', 'windsurf', 'lovable', 'v0', 'replit', 'bolt', 'other']::text[]
);

-- ---------------------------------------------------------------------------
-- Server-only verified metrics (no INSERT/UPDATE grant to authenticated)
-- ---------------------------------------------------------------------------
alter table public.startups drop constraint startups_verified_provider_check;
alter table public.startups add constraint startups_verified_provider_check check (
  verified_provider in ('stripe', 'revenuecat')
);

alter table public.startups
  add column active_users integer check (active_users >= 0),
  add column traffic_provider text check (traffic_provider in ('plausible', 'umami')),
  add column visitors_30d integer check (visitors_30d >= 0),
  add column visitors_prev_30d integer check (visitors_prev_30d >= 0),
  add column traffic_synced_at timestamptz,
  add column github_repo text check (github_repo ~ '^[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  add column build_first_commit_at timestamptz,
  add column build_commits integer check (build_commits >= 0),
  add column build_ai_commits integer check (build_ai_commits >= 0),
  add column build_stars integer check (build_stars >= 0),
  add column build_synced_at timestamptz;

create index startups_looking_for_idx on public.startups using gin (looking_for);
create index startups_traffic_idx on public.startups (visitors_30d desc nulls last)
  where status = 'published' and visitors_30d is not null;

-- ---------------------------------------------------------------------------
-- provider_connections: more providers; non-secret settings in `config`
-- ---------------------------------------------------------------------------
alter table public.provider_connections drop constraint provider_connections_provider_check;
alter table public.provider_connections add constraint provider_connections_provider_check check (
  provider in ('stripe', 'revenuecat', 'plausible', 'umami', 'github')
);
-- GitHub build proof reads public repos with our own token: nothing to store.
alter table public.provider_connections
  alter column encrypted_key drop not null,
  add column config jsonb not null default '{}'::jsonb check (pg_column_size(config) <= 2048);

-- One revenue source and one traffic source per startup (numbers must have a single origin).
create unique index provider_connections_one_revenue_idx on public.provider_connections (startup_id)
  where provider in ('stripe', 'revenuecat');
create unique index provider_connections_one_traffic_idx on public.provider_connections (startup_id)
  where provider in ('plausible', 'umami');

-- ---------------------------------------------------------------------------
-- traffic_snapshots: daily visitors per startup (for the visitors chart)
-- ---------------------------------------------------------------------------
create table public.traffic_snapshots (
  startup_id bigint not null references public.startups (id) on delete cascade,
  day date not null,
  visitors integer not null default 0 check (visitors >= 0),
  primary key (startup_id, day)
);

alter table public.traffic_snapshots enable row level security;

create policy "traffic of published startups is public, owners see own"
on public.traffic_snapshots for select
to anon, authenticated
using (
  exists (
    select 1 from public.startups s
    where s.id = startup_id
      and (s.status = 'published' or s.owner_id = (select auth.uid()))
  )
);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.traffic_snapshots from anon, authenticated;
grant select on public.traffic_snapshots to anon, authenticated;
grant select, insert, update, delete on public.traffic_snapshots to service_role;

grant insert (app_store_url, play_store_url, line_url, github_url, looking_for, build_story)
  on public.startups to authenticated;
grant update (app_store_url, play_store_url, line_url, github_url, looking_for, build_story)
  on public.startups to authenticated;
