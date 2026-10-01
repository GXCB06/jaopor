import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ProfileEditor,
  type EditorInitial,
} from "@/components/profile-edit/ProfileEditor";
import { requireUserId } from "@/lib/auth";
import { providerAvatar } from "@/lib/avatar";
import {
  getMyContacts,
  getMyPositions,
  getMyProfile,
  getMySkills,
} from "@/lib/data/me";
import type { LookingFor } from "@/lib/profile";
import { logoUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/profile">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("editProfile"), robots: { index: false } };
}

// Design.md §6 Profile editor (Phase 9d).
export default async function ProfileEditPage({
  params,
}: PageProps<"/[locale]/dashboard/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/profile");
  const supabase = await createClient();
  const [profile, skills, positions, contacts, members] = await Promise.all([
    getMyProfile(userId),
    getMySkills(userId),
    getMyPositions(userId),
    getMyContacts(userId),
    supabase
      .from("startup_members")
      .select(
        "startup_id, pinned_position, startup:startups(id, name, logo_path)",
      )
      .eq("user_id", userId)
      .eq("status", "confirmed"),
  ]);
  if (!profile) return null;
  const { data: auth } = await supabase.auth.getUser();

  return (
    <ProfileEditor
      avatar={{
        url: profile.avatar_url,
        providerUrl: providerAvatar(auth.user?.user_metadata),
      }}
      initial={{
        handle: profile.handle ?? "",
        displayName: profile.display_name ?? "",
        headline: profile.headline ?? "",
        bio: profile.bio ?? "",
        province: profile.province ?? "",
        xHandle: profile.x_handle ?? "",
        status: profile.status,
        lookingFor: (profile.looking_for ?? {}) as LookingFor,
        socialLinks: (profile.social_links ?? {}) as Record<string, string>,
        visibility: (profile.field_visibility ??
          {}) as EditorInitial["visibility"],
        skills: skills.map((s) => ({
          slug: s.skill_slug,
          superpower: s.is_superpower,
        })),
        positions: positions.map((p) => ({
          key: String(p.id),
          title: p.title,
          company: p.company ?? "",
          startDate: p.start_date,
          endDate: p.end_date,
          description: p.description ?? "",
        })),
        contacts: {
          lineId: contacts.line_id ?? "",
          email: contacts.email ?? "",
        },
        works: (members.data ?? [])
          .filter((m) => m.startup)
          .map((m) => ({
            id: m.startup!.id,
            name: m.startup!.name,
            logo: logoUrl(m.startup!.logo_path),
            pinned: m.pinned_position,
          })),
      }}
    />
  );
}
