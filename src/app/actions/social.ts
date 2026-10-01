"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Phase 9b: follow and contact requests from a public profile. RLS + the contact_requests guard
// trigger enforce the rules (signed in, 5 per day, 1 pending per pair, blocks); these actions only
// translate the database's answer into an error key for the UI.

export type SocialResult = { ok: true } | { ok: false; error: string };

const TOPICS = ["cofounder", "job", "collab", "other"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function setFollow(
  targetId: string,
  follow: boolean,
  handle: string,
): Promise<SocialResult> {
  if (!UUID.test(targetId)) return { ok: false, error: "invalid" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  if (user.id === targetId) return { ok: false, error: "self" };
  const { error } = follow
    ? await supabase
        .from("follows")
        .upsert(
          { follower_id: user.id, following_id: targetId },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
  if (error) return { ok: false, error: "failed" };
  revalidatePath(`/[locale]/u/${handle}`, "page");
  return { ok: true };
}

export async function sendRequest(
  toId: string,
  topic: string,
  message: string,
  handle: string,
): Promise<SocialResult> {
  if (!UUID.test(toId) || !(TOPICS as readonly string[]).includes(topic))
    return { ok: false, error: "invalid" };
  const text = message.trim().slice(0, 500);
  if (!text) return { ok: false, error: "empty" };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  if (user.id === toId) return { ok: false, error: "self" };
  const { error } = await supabase.from("contact_requests").insert({
    from_id: user.id,
    to_id: toId,
    topic,
    message: text,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "pending" };
    if (error.code === "54000") return { ok: false, error: "limit" };
    if (error.code === "42501") return { ok: false, error: "blocked" };
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/[locale]/u/${handle}`, "page");
  return { ok: true };
}
