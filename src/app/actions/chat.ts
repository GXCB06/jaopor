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

/** Block: closes the conversation and blocks the contact requests between the two (until unblocked). */
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

/**
 * Unblock (only whoever blocked): reopens the conversation and undoes what that block changed:
 * the request that opened the chat is accepted again (LINE / email shared as before) and other
 * requests it closed become declined. Requests blocked earlier, before this block, stay blocked
 * (the block action stamps responded_at, so they're told apart by time).
 */
export async function unblockConversation(
  conversationId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "signin" };
  const { data: c } = await supabase
    .from("conversations")
    .select("id, user_a, user_b, blocked_by, blocked_at, request_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) return { ok: false, error: "forbidden" };
  if (!c.blocked_at) return { ok: true };
  if (c.blocked_by !== user.id) return { ok: false, error: "forbidden" };
  const other = c.user_a === user.id ? c.user_b : c.user_a;
  const admin = createAdminClient();
  const { error } = await admin
    .from("conversations")
    .update({ blocked_by: null, blocked_at: null })
    .eq("id", conversationId);
  if (error) return { ok: false, error: "failed" };
  if (other) {
    const pair = `and(from_id.eq.${user.id},to_id.eq.${other}),and(from_id.eq.${other},to_id.eq.${user.id})`;
    if (c.request_id) {
      // A minute of slack for clock skew between this server and the database.
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await admin
        .from("contact_requests")
        .update({ status: "accepted" }, { count: "exact" })
        .eq("id", c.request_id)
        .eq("status", "blocked")
        .gte("responded_at", c.blocked_at);
      // The accept trigger notifies both sides; a restore isn't a new acceptance.
      if (count)
        await admin
          .from("notifications")
          .delete()
          .eq("request_id", c.request_id)
          .eq("kind", "request_accepted")
          .gte("created_at", since);
    }
    await admin
      .from("contact_requests")
      .update({ status: "declined" })
      .eq("status", "blocked")
      .gte("responded_at", c.blocked_at)
      .or(pair);
  }
  revalidatePath("/[locale]/dashboard", "layout");
  return { ok: true };
}
