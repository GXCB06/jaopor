import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { LookingFor } from "@/lib/profile";
import { orderSkills, type DirectoryBuilder } from "@/lib/builders";
import { sumSeries } from "@/lib/builder";
import { getChartSeries } from "@/lib/data/startups";
import { isProvince } from "@/lib/config/provinces";

// Phase 9b public builder profile. Visibility-controlled fields come from get_profile (server-only,
// masked for this viewer); skills and positions are read with the viewer's own client so RLS
// (private.can_see) decides; private contacts only load when RLS allows (owner or accepted).

export type PublicProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  x_handle: string | null;
  headline: string | null;
  status: string;
  created_at: string;
  bio: string | null;
  province: string | null;
  social_links: Record<string, string> | null;
  looking_for: LookingFor | null;
  followers: number;
  following: number;
};

export type BuilderWork = Tables<"startups"> & {
  role: string;
  pinned: number | null;
};

const viewerId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims.sub as string | undefined) ?? null;
});

export const getPublicProfile = cache(
  async (handle: string): Promise<PublicProfile | null> => {
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) return null;
    const { data } = await createAdminClient().rpc("get_profile", {
      p_handle: handle,
      p_viewer: (await viewerId()) ?? undefined,
    });
    return (data as PublicProfile | null) ?? null;
  },
);

export async function getBuilderPage(
  profile: PublicProfile,
  year: number | null,
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const viewer = await viewerId();
  const isOwner = viewer === profile.id;
  const end = year ? new Date(Date.UTC(year, 11, 31)) : new Date();
  const from = new Date(end.getTime() - 371 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [
    skills,
    positions,
    members,
    activity,
    years,
    userNumber,
    follow,
    pending,
    contacts,
  ] = await Promise.all([
    supabase
      .from("profile_skills")
      .select("skill_slug, is_superpower, position")
      .eq("user_id", profile.id)
      .order("position"),
    supabase
      .from("positions")
      .select("id, title, company, start_date, end_date, description, position")
      .eq("user_id", profile.id)
      .order("position"),
    supabase
      .from("startup_members")
      .select("role, pinned_position, startup:startups(*)")
      .eq("user_id", profile.id)
      .eq("status", "confirmed"),
    admin.rpc("profile_activity", {
      p_user: profile.id,
      p_from: iso(from),
      p_to: iso(end),
      p_viewer: viewer ?? undefined,
    }),
    // Any activity last year? (enables the year switcher)
    admin.rpc("profile_activity", {
      p_user: profile.id,
      p_from: `${new Date().getUTCFullYear() - 1}-01-01`,
      p_to: iso(new Date()),
      p_viewer: viewer ?? undefined,
    }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .lte("created_at", profile.created_at),
    viewer && !isOwner
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewer)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    viewer && !isOwner
      ? supabase
          .from("contact_requests")
          .select("id, status, from_id")
          .or(
            `and(from_id.eq.${viewer},to_id.eq.${profile.id}),and(from_id.eq.${profile.id},to_id.eq.${viewer})`,
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    viewer
      ? supabase
          .from("private_contacts")
          .select("line_id, email")
          .eq("user_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const works: BuilderWork[] = (members.data ?? [])
    .filter((m) => m.startup)
    .map((m) => ({ ...m.startup!, role: m.role, pinned: m.pinned_position }));

  return {
    viewer,
    isOwner,
    skills: skills.data ?? [],
    positions: positions.data ?? [],
    works,
    activity: activity.data ?? [],
    hasLastYear: (years.data ?? []).some(
      (a) => a.day < `${new Date().getUTCFullYear()}-01-01`,
    ),
    userNumber: userNumber.count ?? null,
    following: Boolean(follow.data),
    lastRequest: pending.data as {
      id: number;
      status: string;
      from_id: string;
    } | null,
    contacts: contacts.data,
  };
}

/**
 * The profile OG card: what an anonymous visitor may see (no viewer, so hidden fields stay masked)
 * plus the verified MRR summed over confirmed works (demo projects excluded).
 */
export const getProfileCard = cache(async (handle: string) => {
  if (!/^[a-z0-9_]{3,30}$/.test(handle)) return null;
  const admin = createAdminClient();
  const { data } = await admin.rpc("get_profile", { p_handle: handle });
  const profile = data as PublicProfile | null;
  if (!profile) return null;
  const { data: members } = await admin
    .from("startup_members")
    .select("startup:startups(mrr_cents, verification_status, is_demo, status)")
    .eq("user_id", profile.id)
    .eq("status", "confirmed");
  const published = (members ?? [])
    .map((m) => m.startup)
    .filter((s) => s?.status === "published");
  const verified = published.filter(
    (s) => s!.verification_status === "verified" && !s!.is_demo,
  );
  return {
    profile,
    works: published.length,
    verifiedWorks: verified.length,
    mrrCents: verified.reduce((s, w) => s + (w!.mrr_cents ?? 0), 0),
  };
});

/** Fields an anonymous visitor may see (field_visibility missing = public). */
const isPublic = (fv: unknown, field: string) =>
  ((fv as Record<string, string> | null)?.[field] ?? "public") === "public";

/**
 * Phase 9c directory rows: every profile with a handle and show_in_directory, built from the
 * anonymous view (a province or skills set to "members" / "hidden" are left out, so filters can't
 * reveal them). Works = confirmed memberships of published startups; revenue = verified, non-demo.
 * Filtering happens in TypeScript (lib/builders.ts); fine while the directory is small.
 */
export const listBuilders = cache(async (): Promise<DirectoryBuilder[]> => {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(
      `id, handle, display_name, avatar_url, headline, status, province, field_visibility, created_at,
       profile_skills(skill_slug, is_superpower, position),
       startup_members!startup_members_user_id_fkey(status, startup:startups(status, verification_status, is_demo, mrr_cents, ai_tools))`,
    )
    .eq("show_in_directory", true)
    .not("handle", "is", null)
    .limit(2000);
  if (error) throw new Error(`listBuilders: ${error.message}`);
  return (data ?? []).map((p) => {
    const works = p.startup_members
      .filter(
        (m) => m.status === "confirmed" && m.startup?.status === "published",
      )
      .map((m) => m.startup!);
    const verified = works.filter(
      (w) => w.verification_status === "verified" && !w.is_demo,
    );
    return {
      id: p.id,
      handle: p.handle!,
      name: p.display_name ?? p.handle!,
      avatarUrl: p.avatar_url,
      headline: p.headline,
      status: p.status,
      province:
        isPublic(p.field_visibility, "province") && isProvince(p.province)
          ? p.province
          : null,
      skills: isPublic(p.field_visibility, "skills")
        ? orderSkills(p.profile_skills)
        : [],
      tools: [...new Set(works.flatMap((w) => w.ai_tools))],
      works: works.length,
      verifiedWorks: verified.length,
      mrrCents: verified.reduce((s, w) => s + (w.mrr_cents ?? 0), 0),
      createdAt: p.created_at,
    };
  });
});

/**
 * Profile v2 revenue card: daily verified revenue / MRR summed over the builder's verified,
 * non-demo works (USD cents; the chart converts to ฿). Null when none has verified revenue.
 */
export async function getBuilderChart(works: BuilderWork[]) {
  const verified = works.filter(
    (w) => w.verification_status === "verified" && !w.is_demo,
  );
  if (!verified.length) return null;
  const series = await Promise.all(
    verified.map((w) => getChartSeries({ ...w, owner: null })),
  );
  const sum = sumSeries(series);
  return sum && (sum.revenue || sum.mrr) ? sum : null;
}

/** "+12": followers gained in the last 30 days, and posts in the last 6 months. */
export async function getBuilderCounts(profileId: string) {
  const supabase = await createClient();
  const since = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toISOString();
  const [followers, posts] = await Promise.all([
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId)
      .gte("created_at", since(30)),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profileId)
      .eq("is_auto", false)
      .is("hidden_at", null)
      .gte("created_at", since(182)),
  ]);
  return { newFollowers: followers.count ?? 0, posts6m: posts.count ?? 0 };
}
