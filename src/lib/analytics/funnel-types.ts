// Funnel whitelists shared by the browser helper, the server route and the parity test. Kept free
// of any directive or client import so server code can read it too. These lists must stay equal to
// the SQL whitelists in supabase/migrations/*_add_funnel_events.sql (checked by add-funnel.test.ts).

/** Client-authored events. `verify_result` is server-only (public.log_verify_result) and excluded. */
export const FUNNEL_EVENTS = [
  "add_opened",
  "add_failed",
  "add_created",
  "verify_chose",
  "add_finished",
] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export const ADD_FAILED_CODES = [
  "invalid_link",
  "already_listed",
  "limit_reached",
  "province_missing",
  "category_missing",
  "logo_too_big",
  "slug_taken",
  "server",
] as const;
export type AddFailedCode = (typeof ADD_FAILED_CODES)[number];

/** A2: the verify chooser is metric-first, so we record the metric the founder picked. */
export const VERIFY_CHOICES = ["revenue", "traffic", "build"] as const;
export type VerifyChoice = (typeof VERIFY_CHOICES)[number];

export const VERIFY_SOURCES = [
  "stripe",
  "revenuecat",
  "jaopor",
  "plausible",
  "umami",
  "cloudflare",
  "github",
] as const;
export type VerifySource = (typeof VERIFY_SOURCES)[number];

export const VERIFY_CODES = [
  "invalid_key",
  "not_read_only",
  "missing_permission",
  "rate_limited",
  "upstream",
  "not_found",
  "domain_mismatch",
  "not_owner",
  "no_github_identity",
  "no_website",
  "duplicate_listing",
  "server",
] as const;
export type VerifyCode = (typeof VERIFY_CODES)[number];

export type AddEventProps = {
  code?: string;
  choice?: string;
  skipped?: boolean;
};
