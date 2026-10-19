-- Owner-approved 2026-10-19 (RLS smoke T122b). NOT APPLIED until the owner reviews it.
--
-- Bug: PostgreSQL fires BEFORE triggers for the same event in alphabetical order of trigger name.
-- `startups_public_metrics` (computes public_proof_level from owner_verified_at and the public
-- levels) sorted BEFORE `startups_reset_owner_verified` (clears owner_verified_at when the website
-- changes). So a website change cleared the badge only after the public proof level had been
-- computed from it, leaving public_proof_level stale at 1 until the row's next update.
--
-- Fix: rename the reset trigger so it fires before startups_public_metrics. Nothing else changes:
-- same event (BEFORE UPDATE OF website_url), same function (private.startups_reset_owner_verified,
-- untouched), same row-level timing. RENAME keeps the trigger definition byte for byte.
--
-- Ordering contract for the new name (BEFORE UPDATE triggers on public.startups, C collation):
--   startups_anonymity                              (must run first: on anonymous projects it
--                                                    stashes the website and clears the badge itself)
--   startups_clear_owner_verified_on_website_change (this trigger)
--   startups_owner_status                           (status only; order-independent)
--   startups_public_metrics                         (must run after the badge is cleared)
--   startups_reserve_old_slugs, startups_set_updated_at, startups_validate_vocab (independent)
-- No data backfill: on 2026-10-19 every row's public_proof_level matched a recomputation and no row
-- had the badge, so no stale value exists.

alter trigger startups_reset_owner_verified on public.startups
  rename to startups_clear_owner_verified_on_website_change;

comment on trigger startups_clear_owner_verified_on_website_change on public.startups is
  'Clears owner_verified_at when website_url changes. Its name must sort after startups_anonymity and '
  'before startups_public_metrics: PostgreSQL fires BEFORE triggers in name order, and public_proof_level '
  'must be computed from the cleared badge (migration 20261019034825, RLS smoke T122b–T122f).';
