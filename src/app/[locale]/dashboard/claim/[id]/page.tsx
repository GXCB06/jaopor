import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { StartupLogo } from "@/components/StartupBits";
import { VerifyPanel } from "@/components/wizard/VerifyPanel";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { getUnclaimed } from "@/lib/data/claims";
import { getGithubLogin } from "@/lib/data/connections";
import { ownWebsiteHost } from "@/lib/links";
import { logoUrl } from "@/lib/supabase/public";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/claim/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Claim" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * Prove an imported listing is yours (Project.md item 3). Only asset-bound sources are offered
 * (the listing's website or its GitHub repo); a successful connect transfers ownership and the
 * founder is sent to the dashboard. Revenue keys can't claim anything.
 */
export default async function ClaimDetailPage({
  params,
}: PageProps<"/[locale]/dashboard/claim/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireUserId(locale, `/dashboard/claim/${id}`);
  const startupId = Number(id);
  if (!Number.isSafeInteger(startupId) || startupId <= 0) notFound();
  const [t, listing, githubLogin] = await Promise.all([
    getTranslations("Claim"),
    getUnclaimed(startupId),
    getGithubLogin(),
  ]);
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/claim"
        className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        {t("title")}
      </Link>

      <Card className="flex items-center gap-3 p-4">
        <StartupLogo
          name={listing.name}
          src={logoUrl(listing.logo_path)}
          size={44}
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight">
            {listing.name}
          </h1>
          {listing.website_url && (
            <p className="truncate font-mono text-2xs text-muted-foreground">
              {listing.website_url}
            </p>
          )}
        </div>
      </Card>

      <p className="text-caption text-muted-foreground">{t("intro")}</p>

      <VerifyPanel
        startupId={listing.id}
        connections={[]}
        websiteHost={ownWebsiteHost(listing.website_url)}
        githubLogin={githubLogin}
        order={["traffic", "build"]}
        recommend="traffic"
        showTitle={false}
        claim
      />
    </main>
  );
}
