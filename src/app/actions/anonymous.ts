"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { isAnonymousSlug } from "@/lib/anonymous";
import { realIdentity } from "@/lib/data/anonymous";
import { createClient } from "@/lib/supabase/server";

export type AnonymousResult =
  | { ok: true; slug: string }
  | { ok: false; error: "not_ready" | "forbidden" | "slug_taken" | "server" };

/**
 * Anonymous mode on / off for one of the signed-in owner's projects (Design.md §5 Anonymous
 * projects). The database trigger does the masking; this action then purges every cached page
 * that showed the project under its old name or URL, so the identity doesn't linger in ISR.
 */
export async function setProjectAnonymous(
  startupId: number,
  on: boolean,
): Promise<AnonymousResult> {
  if (!Number.isSafeInteger(startupId) || startupId <= 0)
    return { ok: false, error: "forbidden" };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "forbidden" };

  const { data: before } = await supabase
    .from("startups")
    .select("slug, category, province, owner_id")
    .eq("id", startupId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "forbidden" };
  if (isAnonymousSlug(before.slug) === on)
    return { ok: true, slug: before.slug };

  // Every URL the project had: the current slug, its old links, and (while anonymous) the real one.
  const [{ data: history }, real] = await Promise.all([
    supabase
      .from("startup_slug_history")
      .select("slug")
      .eq("startup_id", startupId),
    on ? Promise.resolve(null) : realIdentity(supabase, startupId),
  ]);

  const { error } = await supabase
    .from("startups")
    // The column isn't in the generated types until the migration is applied.
    .update({ is_anonymous: on } as never)
    .eq("id", startupId);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204")
      return { ok: false, error: "not_ready" };
    if (error.code === "23505") return { ok: false, error: "slug_taken" };
    return { ok: false, error: "server" };
  }

  const { data: after } = await supabase
    .from("startups")
    .select("slug")
    .eq("id", startupId)
    .maybeSingle();
  const { data: owner } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", auth.user.id)
    .maybeSingle();

  const slugs = new Set(
    [
      before.slug,
      after?.slug,
      real?.slug,
      ...(history ?? []).map((h) => h.slug),
    ].filter((s): s is string => Boolean(s)),
  );
  for (const locale of routing.locales) {
    // "layout" also refreshes the OG image under the page.
    for (const slug of slugs)
      revalidatePath(`/${locale}/startup/${slug}`, "layout");
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/startups`);
    revalidatePath(`/${locale}/category/${before.category}`);
    if (before.province)
      revalidatePath(`/${locale}/province/${before.province}`);
    if (owner?.handle) revalidatePath(`/${locale}/u/${owner.handle}`);
  }
  return { ok: true, slug: after?.slug ?? before.slug };
}
