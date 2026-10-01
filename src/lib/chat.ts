// Phase 11 chat: helpers shared by the server pages and the browser (header badge, thread).
// Everything reads with the caller's own client, so RLS limits it to their conversations.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export const MAX_MESSAGE = 2000;
export const MESSAGE_WARN_AT = 1800;

type Db = SupabaseClient<Database>;

/** Unread messages (from the other person, newer than my "read up to") per recent conversation. */
export async function unreadByConversation(
  db: Db,
  me: string,
  limit = 30,
): Promise<Map<number, number>> {
  const { data: convs } = await db
    .from("conversations")
    .select("id")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  const ids = (convs ?? []).map((c) => c.id);
  if (!ids.length) return new Map();
  const { data: reads } = await db
    .from("conversation_reads")
    .select("conversation_id, last_read_at")
    .in("conversation_id", ids);
  const readAt = new Map(
    (reads ?? []).map((r) => [r.conversation_id, r.last_read_at]),
  );
  const counts = await Promise.all(
    ids.map(async (id) => {
      let q = db
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", id)
        .neq("sender_id", me);
      const read = readAt.get(id);
      if (read) q = q.gt("created_at", read);
      const { count } = await q;
      return [id, count ?? 0] as const;
    }),
  );
  return new Map(counts.filter(([, n]) => n > 0));
}

export const totalUnread = (m: Map<number, number>) =>
  [...m.values()].reduce((s, n) => s + n, 0);

/** "YYYY-MM-DD" in the visitor's time zone, for day separators. */
export const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Messages grouped into runs: a new run starts on a new day or a new sender. */
export function groupMessages<
  T extends { senderId: string; createdAt: string },
>(messages: T[]): { day: string; runs: { senderId: string; items: T[] }[] }[] {
  const days: { day: string; runs: { senderId: string; items: T[] }[] }[] = [];
  for (const m of messages) {
    const day = localDay(m.createdAt);
    let d = days.at(-1);
    if (!d || d.day !== day) {
      d = { day, runs: [] };
      days.push(d);
    }
    const run = d.runs.at(-1);
    if (run && run.senderId === m.senderId) run.items.push(m);
    else d.runs.push({ senderId: m.senderId, items: [m] });
  }
  return days;
}
