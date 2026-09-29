// Public (browser-safe) config with defaults for the `mrrmafia` project, so the site runs
// before .env.local exists. Secrets are NOT here — see src/lib/env.ts.
//
// Env values from dashboards are often empty strings or missing "https://", so every value
// is normalized instead of trusted (an invalid NEXT_PUBLIC_SITE_URL once broke the Vercel build).
// NOTE: each NEXT_PUBLIC_* must be read as a literal `process.env.X` so Next can inline it.

/** Empty/whitespace → undefined. */
function clean(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/** Returns a valid absolute origin ("https://host[:port]") or undefined. Adds https:// if missing. */
export function toOrigin(value: string | undefined): string | undefined {
  const v = clean(value);
  if (!v) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.origin;
  } catch {
    return undefined;
  }
}

export const publicEnv = {
  supabaseUrl:
    toOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    "https://letfxefyqxxrfujpwtri.supabase.co",
  supabasePublishableKey:
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    "sb_publishable_Jz9ha-2sWCh7c8Ax0ZCWlA_lAWEKHxg",
  siteUrl:
    toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    // Set automatically by Vercel for Next.js projects (production domain, no protocol).
    toOrigin(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
    "http://localhost:3000",
};
