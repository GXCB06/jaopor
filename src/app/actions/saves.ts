"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Saves / bookmarks ("ที่บันทึกไว้", Phase 9d). The profile page is ISR-cached and cookie-free, so
// it can't know whether the viewer has saved a project: the SaveButton asks these actions instead.
// RLS on public.saves (migration 20261015120000) enforces "your own rows only"; these actions just
// translate the database's answer into an error key for the UI.

export type SaveResult = { ok: true } | { ok: false; error: string };
export type SaveState = { signedIn: boolean; saved: boolean };

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Whether the current viewer is signed in and has saved this project (for the button's state). */
export async function getSaveState(startupId: number): Promise<SaveState> {
  const { supabase, user } = await me();
  if (!user) return { signedIn: false, saved: false };
  const { data } = await supabase
    .from("saves")
    .select("startup_id")
    .eq("user_id", user.id)
    .eq("startup_id", startupId)
    .maybeSingle();
  return { signedIn: true, saved: Boolean(data) };
}

/** Save / unsave a project. Idempotent on both sides so a double tap never errors. */
export async function setSave(
  startupId: number,
  save: boolean,
): Promise<SaveResult> {
  if (!Number.isSafeInteger(startupId) || startupId <= 0)
    return { ok: false, error: "invalid" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { error } = save
    ? await supabase
        .from("saves")
        .upsert(
          { user_id: user.id, startup_id: startupId },
          { onConflict: "user_id,startup_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("saves")
        .delete()
        .eq("user_id", user.id)
        .eq("startup_id", startupId);
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/[locale]/dashboard/saved", "page");
  return { ok: true };
}
