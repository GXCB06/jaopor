import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { postLoginPath, safeNextPath } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

// OAuth redirect target (Google/GitHub → Supabase → here). Exchanges the code for a session cookie,
// then sends the user on (Design.md §6 Sign-in routing): onboarding for new users, else back to
// where they were, else the dashboard (has a startup) or the startups list.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const raw = url.searchParams.get("locale");
  const locale = (routing.locales as readonly string[]).includes(raw ?? "")
    ? (raw as string)
    : routing.defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const [profile, owned] = await Promise.all([
        supabase
          .from("profiles")
          .select("handle")
          .eq("id", data.user.id)
          .maybeSingle(),
        supabase
          .from("startups")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", data.user.id),
      ]);
      const target = postLoginPath({
        locale,
        next,
        hasHandle: !!profile.data?.handle,
        hasStartups: (owned.count ?? 0) > 0,
      });
      return NextResponse.redirect(new URL(target, url.origin));
    }
  }
  return NextResponse.redirect(
    new URL(`/${locale}/login?error=auth`, url.origin),
  );
}
