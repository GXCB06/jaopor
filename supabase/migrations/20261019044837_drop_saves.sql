-- Owner decision 2026-10-18/19: remove saves (bookmarks), "we don't need it yet". The app code was
-- removed in 316f506; this drops the table that 20261015120000_saves created. Owner-approved and
-- applied 2026-10-19 (remote version 20261019052905).
--
-- Checked on production 2026-10-19 (read-only): 0 rows; no views, foreign keys, functions or
-- triggers depend on it. Dropping it also drops its own 3 policies and 3 indexes. No CASCADE: if
-- anything did depend on it, the drop fails instead of taking that object with it.
-- If bookmarks come back (e.g. the marketplace's "buyers interested"), re-create from
-- 20261015120000_saves.sql.

drop table public.saves;
