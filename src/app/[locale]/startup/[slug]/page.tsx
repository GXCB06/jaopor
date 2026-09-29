import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {
  EmptyValue,
  OwnerBar,
  OwnerProvider,
} from "@/components/profile/Owner";
import {
  LookingForBanner,
  ProjectLinks,
  TractionTiles,
} from "@/components/profile/ProjectBlocks";
import {
  FounderMessage,
  InsightsGrid,
  StatTile,
  VerifiedStamp,
} from "@/components/ProfileBlocks";
import { RevenueChart } from "@/components/RevenueChart";
import {
  FoundingBadge,
  GrowthValue,
  MetricLabel,
  StartupLogo,
} from "@/components/StartupBits";
import {
  getRank,
  getRevenueSeries,
  getStartupBySlug,
} from "@/lib/data/startups";
import { growthPct, moneyFull } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";

export const revalidate = 60;

// No slugs at build time: each profile is rendered on first visit, then cached (ISR, 60 s).
export async function generateStaticParams() {
  return [];
}

type Props = PageProps<"/[locale]/startup/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const startup = await getStartupBySlug(slug);
  if (!startup) return {};
  const verified = startup.verification_status === "verified";
  const title = verified
    ? `${startup.name} — ${moneyFull(startup.mrr_cents)} MRR`
    : startup.name;
  return { title, description: startup.tagline ?? undefined };
}

// Design.md §6 /startup/[slug] + §5 InfoCard: every section is always shown (TrustMRR pattern);
// empty ones invite the owner to "+ Add" and read "Not added" for visitors.
export default async function StartupPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const startup = await getStartupBySlug(slug);
  if (!startup) notFound();

  const verified = startup.verification_status === "verified";
  const [t, common, format, rank, series] = await Promise.all([
    getTranslations("Profile"),
    getTranslations("Common"),
    getFormatter(),
    getRank(startup),
    verified ? getRevenueSeries(startup.id, 60) : Promise.resolve([]),
  ]);
  const growth = growthPct(
    startup.revenue_30d_cents,
    startup.revenue_prev_30d_cents,
  );
  const location = [startup.province, startup.country]
    .filter(Boolean)
    .join(", ");
  const tractionFirst =
    !verified &&
    (startup.visitors_30d !== null || startup.build_commits !== null);
  const notVerified = (
    <EmptyValue field="revenue" visitorText={common("notVerified")} />
  );

  return (
    <OwnerProvider ownerId={startup.owner_id} startupId={startup.id}>
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
        <OwnerBar />

        <header className="space-y-3">
          <div className="flex items-start gap-3">
            <StartupLogo
              name={startup.name}
              src={logoUrl(startup.logo_path)}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {startup.name}
              </h1>
              {startup.tagline ? (
                <p className="text-sm text-muted-foreground">
                  {startup.tagline}
                </p>
              ) : (
                <div className="mt-1">
                  <EmptyValue field="tagline" visitorText="" />
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <FoundingBadge n={startup.founding_number} />
              </div>
            </div>
          </div>
          <ProjectLinks startup={startup} />
          <LookingForBanner startup={startup} />
          <div className="rounded-lg border p-3">
            <MetricLabel>{t("description")}</MetricLabel>
            <div className="mt-1">
              {startup.description ? (
                <p className="text-sm whitespace-pre-line">
                  {startup.description}
                </p>
              ) : (
                <EmptyValue field="description" />
              )}
            </div>
          </div>
        </header>

        {/* A project without verified revenue leads with the numbers it does have (visitors, build). */}
        {tractionFirst && <TractionTiles startup={startup} />}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            label={t("revenue30d")}
            value={verified ? moneyFull(startup.revenue_30d_cents) : "—"}
            caption={
              verified ? (
                <>
                  <GrowthValue pct={growth} /> {t("vsPrev")}
                </>
              ) : (
                notVerified
              )
            }
          />
          <StatTile
            label={t("mrr")}
            value={verified ? moneyFull(startup.mrr_cents) : "—"}
            caption={
              verified
                ? t("subscriptions", {
                    count: startup.active_subscriptions ?? 0,
                  })
                : notVerified
            }
          />
          <StatTile
            label={t("allTime")}
            value={verified ? moneyFull(startup.revenue_all_time_cents) : "—"}
            caption={
              verified ? (rank ? t("rank", { rank }) : undefined) : notVerified
            }
          />
          <StatTile
            label={t("founded")}
            value={
              startup.founded_on ? (
                <span className="text-base md:text-lg">
                  {format.dateTime(new Date(startup.founded_on), {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              ) : (
                "—"
              )
            }
            caption={location || <EmptyValue field="founded" />}
          />
        </section>

        {verified && startup.verified_provider === "stripe" ? (
          <section className="space-y-3 rounded-lg border p-4">
            <RevenueChart
              current={series.slice(30)}
              previous={series.slice(0, 30)}
            />
            <VerifiedStamp startup={startup} />
          </section>
        ) : (
          startup.verification_status !== "unverified" && (
            <div className="flex justify-center">
              <VerifiedStamp startup={startup} />
            </div>
          )
        )}

        {!tractionFirst && <TractionTiles startup={startup} />}

        <InsightsGrid startup={startup} />
        <FounderMessage
          message={startup.founder_message}
          owner={startup.owner}
          name={startup.name}
        />
      </main>
    </OwnerProvider>
  );
}
