-- Spec Phase 4 (6.8 QuickSearch): startup search for the one search box used everywhere.
-- Categories and provinces live in src/lib/config (names in both languages), so the API route
-- matches those in TypeScript; this function only searches startups.
--
-- Thai has no spaces between words, so matching is substring ILIKE ("พ่อ" finds "เจ้าพ่อ") on
-- name / slug / tagline / description, plus pg_trgm similarity on the name for small typos.
-- Ranking (spec): exact name match → name prefix → verified (not demo) → MRR → similarity.
-- security invoker: runs with the caller's rights, so RLS (published startups only) applies.
create or replace function public.search_startups(q text, max_rows integer default 6)
returns table (
  id bigint,
  slug text,
  name text,
  tagline text,
  logo_path text,
  category text,
  verification_status text,
  verified_provider text,
  is_demo boolean,
  mrr_cents bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with raw as (
    select lower(btrim(left(coalesce(q, ''), 60))) as t
  ),
  term as (
    -- LIKE wildcards typed by the user are literal characters, not patterns.
    select raw.t, esc.e || '%' as prefix, '%' || esc.e || '%' as pattern
    from raw,
      lateral (
        select replace(replace(replace(raw.t, '\', '\\'), '%', '\%'), '_', '\_') as e
      ) esc
  )
  select s.id, s.slug, s.name, s.tagline, s.logo_path, s.category, s.verification_status,
         s.verified_provider, s.is_demo, s.mrr_cents
  from public.startups s, term
  where s.status = 'published'
    and term.t <> ''
    and (
      s.name ilike term.pattern
      or s.slug ilike term.pattern
      or s.tagline ilike term.pattern
      or s.description ilike term.pattern
      or extensions.similarity(lower(s.name), term.t) > 0.3
    )
  order by
    lower(s.name) = term.t desc,
    lower(s.name) like term.prefix desc,
    (s.verification_status = 'verified' and not s.is_demo) desc,
    s.mrr_cents desc nulls last,
    extensions.similarity(lower(s.name), term.t) desc,
    s.id
  limit least(greatest(coalesce(max_rows, 6), 1), 20);
$$;

revoke execute on function public.search_startups(text, integer) from public;
grant execute on function public.search_startups(text, integer) to anon, authenticated, service_role;
