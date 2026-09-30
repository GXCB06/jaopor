"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Refresh the ISR pages that show a startup right after its owner edits it (profile in every
 * locale, home, directory). Only the owner can trigger it; anything else is a silent no-op.
 */
export async function revalidateStartup(startupId: number): Promise<void> {
  if (!Number.isSafeInteger(startupId) || startupId <= 0) return;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data } = await supabase
    .from("startups")
    .select("slug")
    .eq("id", startupId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (!data) return;
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/startup/${data.slug}`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/startups`);
  }
}
