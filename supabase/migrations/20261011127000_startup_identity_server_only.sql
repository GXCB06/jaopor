-- Advisor WARN after 20261011126000_anonymous_mode (authenticated_security_definer_function_
-- executable): startup_identity() was callable by signed-in users. It only ever answered the
-- owner, but the app now reads it with the server key after checking ownership itself
-- (lib/data/owner-startups.ts, app/actions/anonymous.ts), so the client grant goes.
-- Applied 2026-10-11 together with anonymous_mode (owner approval).
revoke execute on function public.startup_identity(bigint) from authenticated;
