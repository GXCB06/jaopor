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

/**
 * Canonical origin for OG images, share links and the visitor snippet.
 * Vercel's own production domain wins over NEXT_PUBLIC_SITE_URL: that variable is set by hand and
 * went stale when the domain was renamed, which pointed OG images at a dead host. Locally neither is
 * set, so it falls back to NEXT_PUBLIC_SITE_URL, then localhost.
 */
export function resolveSiteUrl(env: {
  productionUrl?: string;
  siteUrl?: string;
}): string {
  return (
    toOrigin(env.productionUrl) ??
    toOrigin(env.siteUrl) ??
    "http://localhost:3000"
  );
}

export const publicEnv = {
  supabaseUrl:
    toOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    "https://letfxefyqxxrfujpwtri.supabase.co",
  supabasePublishableKey:
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    "sb_publishable_Jz9ha-2sWCh7c8Ax0ZCWlA_lAWEKHxg",
  siteUrl: resolveSiteUrl({
    productionUrl: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  }),
};
