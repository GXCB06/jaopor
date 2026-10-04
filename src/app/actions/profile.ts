"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { isProvince } from "@/lib/config/provinces";
import { MAX_SKILLS, MAX_SUPERPOWERS, isSkill } from "@/lib/config/skills";
import {
  PROFILE_STATUSES,
  SOCIAL_KEYS,
  VISIBILITIES,
  VISIBILITY_FIELDS,
  cleanLookingFor,
  handleProblem,
  normalizeSocial,
  type LookingFor,
} from "@/lib/profile";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import {
  AVATAR_BUCKET,
  MAX_AVATAR_UPLOAD,
  avatarType,
  providerPhoto,
} from "@/lib/avatar";
import {
  changeAvatar,
  type AvatarOutcome,
  type AvatarPorts,
} from "@/lib/avatar-flow";
import { drainStorageCleanup } from "@/lib/storage-cleanup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Phase 9d server actions. Every write goes through the user's own Supabase client, so RLS + the
// column grants of migration builder_profiles decide what's allowed; the checks here only turn
// bad input into friendly errors before the database refuses it.

export type ActionResult = { ok: true } | { ok: false; error: string };

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

function refresh() {
  revalidatePath("/[locale]/dashboard", "layout");
}

/** Username availability for the onboarding / editor live check. */
export async function checkHandle(
  raw: string,
): Promise<"ok" | "invalid" | "reserved" | "taken"> {
  const problem = handleProblem(raw);
  if (problem) return problem;
  const { supabase } = await me();
  const { data } = await supabase.rpc("handle_available", {
    p_handle: raw.trim().toLowerCase(),
  });
  return data ? "ok" : "taken";
}

export type ProfileInput = {
  handle?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  province?: string | null;
  status?: string;
  lookingFor?: LookingFor;
  socialLinks?: Partial<Record<string, string>>;
  showInDirectory?: boolean;
  visibility?: Partial<Record<string, string>>;
  xHandle?: string;
};

export async function saveProfile(input: ProfileInput): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const patch: TablesUpdate<"profiles"> = {};

  if (input.handle !== undefined) {
    const h = input.handle.trim().toLowerCase();
    const problem = await checkHandle(h);
    // My own current handle comes back "ok" from handle_available (it excludes my row).
    if (problem !== "ok") return { ok: false, error: `handle_${problem}` };
    patch.handle = h;
  }
  if (input.displayName !== undefined) {
    const v = input.displayName.trim().slice(0, 80);
    if (!v) return { ok: false, error: "display_name_required" };
    patch.display_name = v;
  }
  if (input.headline !== undefined)
    patch.headline = input.headline.trim().slice(0, 80) || null;
  if (input.bio !== undefined)
    patch.bio = input.bio.trim().slice(0, 280) || null;
  if (input.province !== undefined) {
    if (input.province !== null && !isProvince(input.province))
      return { ok: false, error: "province_invalid" };
    patch.province = input.province;
  }
  if (input.status !== undefined) {
    if (!(PROFILE_STATUSES as readonly string[]).includes(input.status))
      return { ok: false, error: "status_invalid" };
    patch.status = input.status;
  }
  if (input.lookingFor !== undefined)
    patch.looking_for = cleanLookingFor(input.lookingFor) as Json;
  if (input.socialLinks !== undefined) {
    const links: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) {
      const raw = input.socialLinks[key];
      if (!raw?.trim()) continue;
      const url = normalizeSocial(raw);
      if (!url) return { ok: false, error: `social_${key}` };
      links[key] = url;
    }
    patch.social_links = links;
  }
  if (input.showInDirectory !== undefined)
    patch.show_in_directory = Boolean(input.showInDirectory);
  if (input.visibility !== undefined) {
    const vis: Record<string, string> = {};
    for (const f of VISIBILITY_FIELDS) {
      const v = input.visibility[f];
      if (
        v &&
        (VISIBILITIES as readonly string[]).includes(v) &&
        v !== "public"
      )
        vis[f] = v;
    }
    patch.field_visibility = vis;
  }
  if (input.xHandle !== undefined) {
    const x = input.xHandle.trim().replace(/^@/, "");
    if (x && !/^[A-Za-z0-9_]{1,15}$/.test(x))
      return { ok: false, error: "x_invalid" };
    patch.x_handle = x || null;
  }
  if (!Object.keys(patch).length) return { ok: true };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "handle_taken" };
    return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}

/** Replace my skills (order = position; at most 20, 3 superpowers). */
export async function saveSkills(
  skills: { slug: string; superpower: boolean }[],
): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const clean = skills.filter(
    (s, i, all) =>
      isSkill(s.slug) && all.findIndex((x) => x.slug === s.slug) === i,
  );
  if (clean.length > MAX_SKILLS) return { ok: false, error: "skills_too_many" };
  if (clean.filter((s) => s.superpower).length > MAX_SUPERPOWERS)
    return { ok: false, error: "superpowers_too_many" };
  const del = await supabase
    .from("profile_skills")
    .delete()
    .eq("user_id", user.id);
  if (del.error) return { ok: false, error: "save_failed" };
  if (clean.length) {
    const { error } = await supabase.from("profile_skills").insert(
      clean.map((s, i) => ({
        user_id: user.id,
        skill_slug: s.slug,
        is_superpower: s.superpower,
        position: i,
      })),
    );
    if (error) return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}

export type PositionInput = {
  title: string;
  company?: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Replace my experience timeline (order = position; at most 20). */
export async function savePositions(
  list: PositionInput[],
): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  if (list.length > 20) return { ok: false, error: "positions_too_many" };
  const rows = [];
  for (const [i, p] of list.entries()) {
    const title = p.title.trim().slice(0, 80);
    if (!title || !DATE.test(p.startDate))
      return { ok: false, error: "position_invalid" };
    const end = p.endDate && DATE.test(p.endDate) ? p.endDate : null;
    if (end && end < p.startDate) return { ok: false, error: "position_dates" };
    rows.push({
      user_id: user.id,
      title,
      company: p.company?.trim().slice(0, 80) || null,
      start_date: p.startDate,
      end_date: end,
      description: p.description?.trim().slice(0, 200) || null,
      position: i,
    });
  }
  const del = await supabase.from("positions").delete().eq("user_id", user.id);
  if (del.error) return { ok: false, error: "save_failed" };
  if (rows.length) {
    const { error } = await supabase.from("positions").insert(rows);
    if (error) return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}

/** LINE ID / email shown only after I accept someone's request. */
export async function saveContacts(input: {
  lineId?: string;
  email?: string;
}): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const line = input.lineId?.trim().replace(/^@/, "@") ?? "";
  const email = input.email?.trim() ?? "";
  if (line && !/^[A-Za-z0-9._@-]{1,50}$/.test(line))
    return { ok: false, error: "line_invalid" };
  if (
    email &&
    (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
  )
    return { ok: false, error: "email_invalid" };
  const { error } = await supabase.from("private_contacts").upsert({
    user_id: user.id,
    line_id: line || null,
    email: email || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "save_failed" };
  refresh();
  return { ok: true };
}

/** Accept / decline / block a request sent to me. */
export async function answerRequest(
  id: number,
  answer: "accepted" | "declined" | "blocked",
): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  if (
    !Number.isSafeInteger(id) ||
    !["accepted", "declined", "blocked"].includes(answer)
  )
    return { ok: false, error: "invalid" };
  const { data, error } = await supabase
    .from("contact_requests")
    .update({ status: answer })
    .eq("id", id)
    .eq("to_id", user.id)
    .select("id, from_id, responded_at");
  if (error || !data?.length) return { ok: false, error: "save_failed" };
  // Blocking someone also closes our chat, if we have one (as blocking from the chat does).
  if (answer === "blocked") {
    const other = data[0].from_id;
    const { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", user.id < other ? user.id : other)
      .eq("user_b", user.id < other ? other : user.id)
      .is("blocked_at", null)
      .maybeSingle();
    if (convo)
      await createAdminClient()
        .from("conversations")
        .update({ blocked_by: user.id, blocked_at: data[0].responded_at })
        .eq("id", convo.id);
  }
  refresh();
  return { ok: true };
}

/** Withdraw a pending request I sent. */
export async function withdrawRequest(id: number): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const { error } = await supabase
    .from("contact_requests")
    .delete()
    .eq("id", id)
    .eq("from_id", user.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: "save_failed" };
  refresh();
  return { ok: true };
}

export async function markNotificationsRead(): Promise<void> {
  const { supabase, user } = await me();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .in("kind", ["request_received", "request_accepted"])
    .is("read_at", null);
  refresh();
}

/** Pin up to 6 of my confirmed works, in this order (others unpinned). */
export async function savePins(startupIds: number[]): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const ids = [...new Set(startupIds.filter(Number.isSafeInteger))].slice(0, 6);
  const { data: mine, error } = await supabase
    .from("startup_members")
    .select("startup_id, pinned_position")
    .eq("user_id", user.id)
    .eq("status", "confirmed");
  if (error) return { ok: false, error: "save_failed" };
  for (const m of mine ?? []) {
    const want = ids.indexOf(m.startup_id);
    const next = want === -1 ? null : want;
    if (next === m.pinned_position) continue;
    const { error: upErr } = await supabase
      .from("startup_members")
      .update({ pinned_position: next })
      .eq("startup_id", m.startup_id)
      .eq("user_id", user.id);
    if (upErr) return { ok: false, error: "save_failed" };
  }
  refresh();
  return { ok: true };
}

/**
 * Profile photo (migration profile_avatars_v2). The browser sends a square 512 px WebP (JPEG from
 * Safari). Nothing it says is trusted: the type comes from the file's first bytes, the size from
 * the bytes received, the name is ignored. Who it is comes from the session (getUser verifies the
 * token with Auth), and the path and the profile row are derived from that id only. Clients can't
 * write the bucket or avatar_url, so the upload and the update use the service role; the
 * database still checks the URL (profiles_avatar_url_source) and rate-limits (20 a day).
 */
export async function uploadAvatar(form: FormData): Promise<AvatarResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "avatar_type" };
  if (file.size === 0 || file.size > MAX_AVATAR_UPLOAD)
    return { ok: false, error: "avatar_size" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_AVATAR_UPLOAD)
    return { ok: false, error: "avatar_size" };
  const ext = avatarType(bytes);
  if (!ext) return { ok: false, error: "avatar_type" };
  const limited = await takeAvatarChange(supabase);
  if (limited) return limited;
  return finish(
    await changeAvatar(
      avatarPorts(),
      user.id,
      { upload: { bytes, ext, id: crypto.randomUUID() } },
      Date.now(),
    ),
    supabase,
    user.id,
  );
}

/** Back to the Google / GitHub photo ("provider") or to initials ("none"). */
export async function resetAvatar(
  mode: "provider" | "none",
): Promise<AvatarResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "unauthorized" };
  // From the provider identity, never from user_metadata (user-editable).
  const url = mode === "provider" ? providerPhoto(user) : null;
  if (mode === "provider" && !url) return { ok: false, error: "invalid" };
  const limited = await takeAvatarChange(supabase);
  if (limited) return limited;
  return finish(
    await changeAvatar(avatarPorts(), user.id, { url }, Date.now()),
    supabase,
    user.id,
  );
}

async function takeAvatarChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AvatarResult | null> {
  const { error } = await supabase.rpc("take_avatar_change");
  if (!error) return null;
  return {
    ok: false,
    error: error.code === "54000" ? "avatar_limit" : "save_failed",
  };
}

/** The avatar actions also return the URL now stored, so the editor and header show it. */
export type AvatarResult =
  { ok: true; url: string | null } | { ok: false; error: string };

async function finish(
  result: AvatarOutcome,
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<AvatarResult> {
  if (!result.ok) return { ok: false, error: "save_failed" };
  refresh();
  revalidatePath("/[locale]/u/[username]", "page");
  await revalidateOwnedStartups(supabase, userId);
  return { ok: true, url: result.url };
}

/**
 * The owner's photo is shown on their projects' cached (ISR) pages: the product page's founder
 * card and founder message, the home cards / leaderboard and the directory. Refresh those right
 * away (same paths as revalidateStartup), otherwise they keep the old photo until the next
 * revalidation. Not exported: only the avatar actions call it, for the signed-in user's own
 * projects (read with their own client, so RLS applies).
 */
async function revalidateOwnedStartups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from("startups")
    .select("slug")
    .eq("owner_id", userId)
    .limit(50);
  for (const locale of routing.locales) {
    for (const { slug } of data ?? [])
      revalidatePath(`/${locale}/startup/${slug}`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/startups`);
  }
}

function avatarPorts(): AvatarPorts {
  const admin = createAdminClient();
  const bucket = admin.storage.from(AVATAR_BUCKET);
  return {
    async listOwn(userId) {
      const { data } = await bucket.list(userId, { limit: 100 });
      return (data ?? []).map((f) => ({
        path: `${userId}/${f.name}`,
        createdAt: f.created_at ? Date.parse(f.created_at) : 0,
      }));
    },
    async upload(path, bytes, contentType) {
      const { error } = await bucket.upload(path, bytes, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });
      return !error;
    },
    async remove(paths) {
      const { error } = await bucket.remove(paths);
      return !error;
    },
    async current(userId) {
      const { data } = await admin
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();
      return data?.avatar_url ?? null;
    },
    async set(userId, url) {
      const { error, count } = await admin
        .from("profiles")
        .update({ avatar_url: url }, { count: "exact" })
        .eq("id", userId);
      return !error && count === 1;
    },
    async queue(path) {
      await admin
        .from("storage_cleanup")
        .upsert(
          { bucket: AVATAR_BUCKET, path },
          { onConflict: "bucket,path", ignoreDuplicates: true },
        );
    },
    async drain(paths) {
      await drainStorageCleanup({ paths });
    },
    publicUrl: (path) => bucket.getPublicUrl(path).data.publicUrl,
  };
}
