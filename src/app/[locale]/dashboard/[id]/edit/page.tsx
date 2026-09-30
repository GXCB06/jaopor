import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupEditForm } from "@/components/wizard/StartupEditForm";
import { requireUserId } from "@/lib/auth";
import { getConnections, getGithubLogin } from "@/lib/data/connections";
import type { Screenshot } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

export const metadata = { robots: { index: false } };

// Single-page editor for every field. The profile's "+ Add" cards deep-link here with #<field>.
export default async function EditStartupPage({
  params,
}: PageProps<"/[locale]/dashboard/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, `/dashboard/${id}/edit`);

  const supabase = await createClient();
  const { data: startup } = await supabase
    .from("startups")
    .select("*")
    .eq("id", Number(id))
    .eq("owner_id", userId)
    .maybeSingle();
  if (!startup) notFound();

  const [t, connections, githubLogin, shots] = await Promise.all([
    getTranslations("Profile"),
    getConnections(startup.id),
    getGithubLogin(),
    // The owner's session (RLS) also sees screenshots of a hidden project.
    supabase
      .from("startup_screenshots")
      .select("id, path, kind, caption, width, height, position")
      .eq("startup_id", startup.id)
      .order("position")
      .order("id"),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">
        {t("editProfile")} · {startup.name}
      </h1>
      <StartupEditForm
        userId={userId}
        startup={startup}
        connections={connections}
        githubLogin={githubLogin}
        screenshots={(shots.data ?? []) as Screenshot[]}
      />
    </main>
  );
}
