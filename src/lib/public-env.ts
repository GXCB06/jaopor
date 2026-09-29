// Public (browser-safe) config with defaults for the `mrrmafia` project, so the site runs
// before .env.local exists. Secrets are NOT here — see src/lib/env.ts.
export const publicEnv = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://letfxefyqxxrfujpwtri.supabase.co",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable_Jz9ha-2sWCh7c8Ax0ZCWlA_lAWEKHxg",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
