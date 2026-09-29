import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/public-env";
import type { Database } from "./database.types";

/**
 * Anonymous, cookie-free client for public pages. No cookies → pages stay static/ISR-cacheable.
 * Sees exactly what the `anon` role may see (published startups, profiles, snapshots).
 */
export function createPublicClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Demo projects ship their logos as static files (Design.md §5 Demo projects). */
const DEMO_LOGO = /^demo-logos\/[a-z0-9-]{1,40}\.png$/;

/**
 * Public logo URL. Normal logos live in the `logos` Storage bucket; the only other accepted form is
 * a bundled demo logo (`demo-logos/<name>.png`, returned site-relative, or absolute for renderers).
 */
export function logoUrl(
  path: string | null,
  { absolute = false }: { absolute?: boolean } = {},
): string | null {
  if (!path) return null;
  if (DEMO_LOGO.test(path))
    return `${absolute ? publicEnv.siteUrl : ""}/${path}`;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/logos/${path}`;
}
