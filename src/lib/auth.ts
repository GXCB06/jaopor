import "server-only";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/** Returns the signed-in user's id, or redirects to /login?next=<current path>. */
export async function requireUserId(
  locale: string,
  path: string,
): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    redirect({
      href: { pathname: "/login", query: { next: `/${locale}${path}` } },
      locale,
    });
  }
  return userId as string;
}
