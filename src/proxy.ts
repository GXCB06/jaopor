import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { atPathTarget } from "./lib/at-path";
import { markdownPathTarget } from "./lib/llms";
import { publicEnv } from "./lib/public-env";

// Next.js 16 renamed Middleware to Proxy.
// 1) next-intl picks/redirects the locale.  2) Supabase refreshes the auth cookie on that response.
const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // An AI agent that asks for Markdown gets the profile's .md twin (Design.md §4 SEO).
  const markdown = markdownPathTarget(
    request.nextUrl.pathname,
    request.headers.get("accept"),
  );
  if (markdown) return NextResponse.rewrite(new URL(markdown, request.url));

  // /@handle → /{locale}/u/{handle} (Phase 9b short profile links).
  const at = atPathTarget(request.nextUrl.pathname, routing.defaultLocale);
  const response = at
    ? NextResponse.rewrite(new URL(at, request.url))
    : intl(request);

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
