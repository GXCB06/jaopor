import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupWizard } from "@/components/wizard/StartupWizard";
import { anonymousModeReady } from "@/lib/data/anonymous";
import { requireUser } from "@/lib/auth";
import { githubLoginOf } from "@/lib/data/connections";
import { getMyProfile } from "@/lib/data/me";
import { getConnections } from "@/lib/data/connections";
import { getOwnStartup } from "@/lib/data/owner-startups";
import type { Screenshot } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { logoUrl } from "@/lib/supabase/public";
import { detailsCompleteRow } from "@/lib/wizard-details";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * Design.md wizard v4 "Draft until complete": ?draft={id} reopens one of the owner's own private
 * drafts at its first incomplete step. Anything else (not theirs, already public) starts fresh.
 */
async function loadDraft(userId: string, raw: string | string[] | undefined) {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const supabase = await createClient();
  const s = await getOwnStartup(supabase, id).catch(() => null);
  if (!s || s.owner_id !== userId || s.status !== "private") return null;
  const [shots, connections] = await Promise.all([
    supabase
      .from("startup_screenshots")
      .select("id, path, kind, caption, width, height, position")
      .eq("startup_id", id)
      .order("position")
      .order("id"),
    getConnections(id),
  ]);
  return {
    id: s.id,
    slug: s.slug,
    website: s.website_url,
    name: s.name,
    logoSrc: logoUrl(s.logo_path),
    detailsDone: detailsCompleteRow(s),
    shots: (shots.data ?? []) as Screenshot[],
    connections,
  };
}

export default async function NewStartupPage({
  params,
  searchParams,
}: PageProps<"/[locale]/new">) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  // One Auth round trip for both the id and the GitHub login (was two in a row).
  const [user, t] = await Promise.all([
    requireUser(locale, "/new"),
    getTranslations("Wizard"),
  ]);
  // The project's province starts as the founder's own (Olympics; UX audit M-10). `province` is a
  // visibility-controlled column clients can't select, so it's read server-side like the dashboard
  // does; an empty field (the founder picks) if that fails.
  const [me, anonymousReady, resume] = await Promise.all([
    getMyProfile(user.id).catch(() => null),
    anonymousModeReady(),
    loadDraft(user.id, sp.draft),
  ]);

  return (
    // Design.md §5 Add-startup wizard v3: wider page for the form + live side panel.
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>
      <StartupWizard
        userId={user.id}
        githubLogin={githubLoginOf(user)}
        defaultProvince={me?.province ?? ""}
        anonymousReady={anonymousReady}
        resume={resume}
      />
    </main>
  );
}
