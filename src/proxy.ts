import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { publicEnv } from "./lib/public-env";

// Next.js 16 renamed Middleware to Proxy.
// 1) next-intl picks/redirects the locale.  2) Supabase refreshes the auth cookie on that response.
const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intl(request);

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  // Refreshes an expiring session; must run before any response is returned.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  // Skip API routes, Next internals, and any path with a file extension.
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
