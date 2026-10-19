import { notFound } from "next/navigation";
import { getOwnStartup } from "@/lib/data/owner-startups";
import { anonymousModeReady } from "@/lib/data/anonymous";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupEditForm } from "@/components/wizard/StartupEditForm";
import { requireUserId } from "@/lib/auth";
import { getConnections, getGithubLogin } from "@/lib/data/connections";
import type { Screenshot } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { AnonymousChip } from "@/components/core/AnonymousChip";
import { getThbPerUsdDated } from "@/lib/data/fx";
import { getListingStats, getOwnerListing } from "@/lib/data/listing";
import { SOURCE_NAME, isSource } from "@/lib/sources/catalog";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata = { robots: { index: false } };

// Single-page editor for every field. The profile's "+ Add" cards deep-link here with #<field>.
export default async function EditStartupPage({
  params,
}: PageProps<"/[locale]/dashboard/[id]/edit">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, `/dashboard/${id}/edit`);

  const supabase = await createClient();
  // R2: the owner's real numbers via get_my_startup_metrics once the migration is live.
  const startup = Number.isSafeInteger(Number(id))
    ? await getOwnStartup(supabase, Number(id))
    : null;
  if (!startup || startup.owner_id !== userId) notFound();

  const [
    t,
    connections,
    githubLogin,
    shots,
    anonymousReady,
    listing,
    listingStats,
    fx,
    publicRevenue,
  ] = await Promise.all([
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
      anonymousModeReady(),
      // For-sale listing: ownership is checked above, so the raw fields may be shown.
      getOwnerListing(startup.id),
      getListingStats(startup.id),
      getThbPerUsdDated(),
      // The preview uses what visitors see (public copies; nothing while the project is private).
      createPublicClient()
        .from("startups")
        .select("public_revenue_level, public_mrr_cents, public_verified_provider")
        .eq("id", startup.id)
        .maybeSingle(),
    ]);
  const pub = publicRevenue.data;
  const level = pub?.public_revenue_level;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">
        {t("editProfile")} · {startup.name}
      </h1>
      {startup.anonymous && (
        <div className="-mt-4 mb-6">
          <AnonymousChip />
        </div>
      )}
      <StartupEditForm
        userId={userId}
        startup={startup}
        connections={connections}
        githubLogin={githubLogin}
        screenshots={(shots.data ?? []) as Screenshot[]}
        anonymousReady={anonymousReady}
        sale={{
          listing,
          stats: listingStats,
          preview: {
            status: startup.status,
            isDemo: startup.is_demo,
            revenueLevel:
              level === "exact" ||
              level === "band" ||
              level === "growth" ||
              level === "badge"
                ? level
                : null,
            mrrCents: pub?.public_mrr_cents ?? null,
            source: isSource(pub?.public_verified_provider)
              ? SOURCE_NAME[pub.public_verified_provider]
              : null,
            fx,
          },
        }}
      />
    </main>
  );
}
