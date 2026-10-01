import "server-only";
import { unreadByConversation } from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

// Phase 11 chat reads, with the viewer's own client (RLS: only my conversations and messages).
// conversations has three foreign keys to profiles (user_a, user_b, blocked_by), so embeds name
// theirs.

export type ChatPerson = {
  id: string;
  handle: string | null;
  name: string;
  avatarUrl: string | null;
};

export type ChatMessage = {
  id: number;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: number;
  /** null when the other person deleted their account. */
  other: ChatPerson | null;
  blocked: boolean;
  last: { body: string; mine: boolean; at: string } | null;
  unread: number;
};

type Person = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
} | null;

const SELECT = `id, user_a, user_b, blocked_at, blocked_by, last_message_at, created_at,
  a:profiles!conversations_user_a_fkey(id, handle, display_name, avatar_url),
  b:profiles!conversations_user_b_fkey(id, handle, display_name, avatar_url)`;

const person = (p: Person): ChatPerson | null =>
  p
    ? {
        id: p.id,
        handle: p.handle,
        name: p.display_name ?? p.handle ?? "—",
        avatarUrl: p.avatar_url,
      }
    : null;

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, viewer: (data?.claims.sub as string | undefined) ?? null };
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { supabase, viewer } = await me();
  if (!viewer) return [];
  const { data, error } = await supabase
    .from("conversations")
    .select(SELECT)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`listConversations: ${error.message}`);
  const rows = data ?? [];
  const [unread, lasts] = await Promise.all([
    unreadByConversation(supabase, viewer, 50),
    Promise.all(
      rows.map((c) =>
        supabase
          .from("chat_messages")
          .select("body, sender_id, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then((r) => r.data),
      ),
    ),
  ]);
  return rows.map((c, i) => {
    const otherRow = c.user_a === viewer ? c.b : c.a;
    const last = lasts[i];
    return {
      id: c.id,
      other: person(otherRow as Person),
      blocked: c.blocked_at !== null,
      last: last
        ? {
            body: last.body,
            mine: last.sender_id === viewer,
            at: last.created_at,
          }
        : null,
      unread: unread.get(c.id) ?? 0,
    };
  });
}

/** One conversation with its latest 200 messages (oldest first), or null if it isn't mine. */
export async function getConversation(id: number) {
  const { supabase, viewer } = await me();
  if (!viewer || !Number.isSafeInteger(id)) return null;
  const { data: c } = await supabase
    .from("conversations")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!c) return null;
  const { data: msgs, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`getConversation: ${error.message}`);
  return {
    id: c.id,
    viewer,
    other: person((c.user_a === viewer ? c.b : c.a) as Person),
    blocked: c.blocked_at !== null,
    /** Only the person who blocked can unblock. */
    blockedByMe: c.blocked_at !== null && c.blocked_by === viewer,
    messages: (msgs ?? []).reverse().map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

/** My conversation with this person, if any (profile / requests "ส่งข้อความ"). */
export async function conversationWith(
  otherId: string,
): Promise<number | null> {
  const { supabase, viewer } = await me();
  if (!viewer || viewer === otherId) return null;
  const [ua, ub] = viewer < otherId ? [viewer, otherId] : [otherId, viewer];
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", ua)
    .eq("user_b", ub)
    .maybeSingle();
  return data?.id ?? null;
}

/** Dashboard sidebar badge. */
export async function myUnreadMessages(): Promise<number> {
  const { supabase, viewer } = await me();
  if (!viewer) return 0;
  const m = await unreadByConversation(supabase, viewer);
  return [...m.values()].reduce((s, n) => s + n, 0);
}
