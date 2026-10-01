import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { getRank } from "@/lib/data/startups";

// Phase 9d: the signed-in user's own data for the dashboard, editor and onboarding.
// Visibility-controlled profile columns aren't selectable by clients (migration builder_profiles),
// so the owner's full profile row is read here with the service role, filtered by the session's
// user id — never by an id from the request.

export type MyProfile = Tables<"profiles">;

export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function getMySkills(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_skills")
    .select("skill_slug, is_superpower, position")
    .eq("user_id", userId)
    .order("position");
  return data ?? [];
}

export async function getMyPositions(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("positions")
    .select("id, title, company, start_date, end_date, description, position")
    .eq("user_id", userId)
    .order("position");
  return data ?? [];
}

export async function getMyContacts(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("private_contacts")
    .select("line_id, email")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { line_id: null, email: null };
}

export type RequestRow = {
  id: number;
  topic: string;
  message: string;
  status: string;
  created_at: string;
  other: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
    headline: string | null;
  } | null;
  /** The other side's private contacts, only after an accepted request (RLS decides). */
  contacts: { line_id: string | null; email: string | null } | null;
  incoming: boolean;
};

const PERSON = "id, handle, display_name, avatar_url, headline";

/** Requests to and from me, newest first, with the other person's public card. */
export async function getMyRequests(userId: string): Promise<RequestRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_requests")
    .select(
      `id, topic, message, status, created_at, from_id, to_id,
       sender:profiles!contact_requests_from_id_fkey(${PERSON}),
       recipient:profiles!contact_requests_to_id_fkey(${PERSON})`,
    )
    .or(`from_id.eq.${userId},to_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = data ?? [];
  const accepted = rows.filter((r) => r.status === "accepted");
  const otherIds = accepted.map((r) =>
    r.to_id === userId ? r.from_id : r.to_id,
  );
  const { data: contacts } = otherIds.length
    ? await supabase
        .from("private_contacts")
        .select("user_id, line_id, email")
        .in("user_id", otherIds)
    : { data: [] };
  const byUser = new Map((contacts ?? []).map((c) => [c.user_id, c]));
  return rows.map((r) => {
    const incoming = r.to_id === userId;
    const otherId = incoming ? r.from_id : r.to_id;
    const c = r.status === "accepted" ? byUser.get(otherId) : undefined;
    return {
      id: r.id,
      topic: r.topic,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      other: (incoming ? r.sender : r.recipient) ?? null,
      contacts: c ? { line_id: c.line_id, email: c.email } : null,
      incoming,
    };
  });
}

export async function unreadNotifications(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type DashboardStartup = Tables<"startups"> & {
  role: string;
  visitors7d: number | null;
  rank: number | null;
};

/** Everything the overview needs, in parallel. */
export async function getDashboard(userId: string) {
  const supabase = await createClient();
  const weekAgo = isoDay(new Date(Date.now() - 7 * 86_400_000));

  const { data: memberships } = await supabase
    .from("startup_members")
    .select("startup_id, role")
    .eq("user_id", userId)
    .eq("status", "confirmed");
  const ids = (memberships ?? []).map((m) => m.startup_id);
  const roleOf = new Map(
    (memberships ?? []).map((m) => [m.startup_id, m.role]),
  );

  const [
    startupsRes,
    trafficRes,
    shotsRes,
    viewsRes,
    requests7dRes,
    pendingRes,
  ] = await Promise.all([
    ids.length
      ? supabase
          .from("startups")
          .select("*")
          .in("id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Tables<"startups">[] }),
    ids.length
      ? supabase
          .from("traffic_snapshots")
          .select("startup_id, visitors")
          .in("startup_id", ids)
          .gte("day", weekAgo)
      : Promise.resolve({
          data: [] as { startup_id: number; visitors: number }[],
        }),
    ids.length
      ? supabase
          .from("startup_screenshots")
          .select("id", { count: "exact", head: true })
          .in("startup_id", ids)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("profile_views")
      .select("viewer_hash", { count: "exact", head: true })
      .eq("profile_id", userId)
      .gte("day", weekAgo),
    supabase
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("to_id", userId)
      .gte("created_at", `${weekAgo}T00:00:00Z`),
    supabase
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("to_id", userId)
      .eq("status", "pending"),
  ]);

  const traffic = new Map<number, number>();
  for (const t of trafficRes.data ?? [])
    traffic.set(t.startup_id, (traffic.get(t.startup_id) ?? 0) + t.visitors);

  const startups: DashboardStartup[] = await Promise.all(
    (startupsRes.data ?? []).map(async (s) => ({
      ...s,
      role: roleOf.get(s.id) ?? "founder",
      visitors7d: s.traffic_provider ? (traffic.get(s.id) ?? 0) : null,
      rank: await getRank({ ...s, owner: null }),
    })),
  );

  return {
    startups,
    screenshots: shotsRes.count ?? 0,
    views7d: viewsRes.count ?? 0,
    requests7d: requests7dRes.count ?? 0,
    pendingRequests: pendingRes.count ?? 0,
    weekVisitors: startups.reduce((sum, s) => sum + (s.visitors7d ?? 0), 0),
  };
}
