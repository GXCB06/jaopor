import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user's id, or null (no redirect). */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.sub as string | undefined) ?? null;
}

/**
 * The signed-in user (checked with the Auth server), or a redirect to /login?next=<path>. For
 * pages that also need the user's identities (e.g. the GitHub login): one Auth round trip
 * instead of requireUserId + a second getUser().
 */
export async function requireUser(locale: string, path: string): Promise<User> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect({
      href: { pathname: "/login", query: { next: `/${locale}${path}` } },
      locale,
    });
  }
  return data.user as User;
}

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
