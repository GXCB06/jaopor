"use server";

import { revalidatePath } from "next/cache";
import { MAX_MESSAGE } from "@/lib/chat";
import { postErrorKey } from "@/lib/posts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Phase 11 chat actions. Messages and read state go through the user's own client (RLS + the
// guard trigger: participant only, open conversation, 200 a day). Blocking uses the service role
// after checking, with the user's client, that the caller is in the conversation.

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export async function sendMessage(
  conversationId: number,
  body: string,
): Promise<
  | {
      ok: true;
      message: {
        id: number;
        senderId: string;
        body: string;
        createdAt: string;
      };
    }
  | { ok: false; error: string }
> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const text = body.trim();
  if (!text || text.length > MAX_MESSAGE) return { ok: false, error: "body" };
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select("id, sender_id, body, created_at")
    .single();
  if (error || !data) return { ok: false, error: postErrorKey(error?.code) };
  // I've obviously read everything up to my own message.
  await supabase.from("conversation_reads").upsert({
    conversation_id: conversationId,
    user_id: user.id,
    last_read_at: data.created_at,
  });
  return {
    ok: true,
    message: {
      id: data.id,
      senderId: data.sender_id,
      body: data.body,
      createdAt: data.created_at,
    },
  };
}

export async function markRead(conversationId: number): Promise<void> {
  const { supabase, user } = await me();
  if (!user) return;
  await supabase.from("conversation_reads").upsert({
    conversation_id: conversationId,
    user_id: user.id,
    last_read_at: new Date().toISOString(),
  });
}

/** Block: closes the conversation for good and blocks the contact request between the two. */
export async function blockConversation(
  conversationId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  // RLS: this only returns the conversation if I'm in it.
  const { data: c } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, blocked_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) return { ok: false, error: "forbidden" };
  if (c.blocked_at) return { ok: true };
  const other = c.user_a === user.id ? c.user_b : c.user_a;
  const admin = createAdminClient();
  const { error } = await admin
    .from("conversations")
    .update({ blocked_by: user.id, blocked_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (error) return { ok: false, error: "failed" };
  if (other) {
    // Stop sharing LINE / email and prevent new requests (contact_accepted / guard read this).
    await admin
      .from("contact_requests")
      .update({ status: "blocked", responded_at: new Date().toISOString() })
      .in("status", ["pending", "accepted", "declined"])
      .or(
        `and(from_id.eq.${user.id},to_id.eq.${other}),and(from_id.eq.${other},to_id.eq.${user.id})`,
      );
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
