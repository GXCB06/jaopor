import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandPill } from "@/components/BrandLogo";
import { LeaderboardCard, type BoardRow } from "@/components/LeaderboardCard";
import { ProviderStrip } from "@/components/ProviderStrip";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { HomeTeasers } from "@/components/home/HomeTeasers";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import {
  BOARD_METRICS,
  countStartups,
  getBoard,
  getRecent,
  getTopTraction,
  type BoardMetric,
  type StartupRow,
} from "@/lib/data/startups";
import { getThbPerUsd } from "@/lib/data/fx";
import { growthPct } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";

export const revalidate = 60;

const int = (n: number | null) => (n === null ? "–" : n.toLocaleString("en"));

function boardRow(s: StartupRow, metric: BoardMetric): BoardRow {
  // Money metrics keep raw cents so the client can show them in the visitor's currency.
  const cents =
    metric === "mrr"
      ? s.mrr_cents
      : metric === "revenue30d"
        ? s.revenue_30d_cents
        : undefined;
  const value =
    metric === "visitors"
      ? int(s.visitors_30d)
      : metric === "commits"
        ? int(s.build_commits)
        : "";
  const growth =
    metric === "visitors"
      ? growthPct(s.visitors_30d, s.visitors_prev_30d)
      : metric === "commits"
        ? null
        : growthPct(s.revenue_30d_cents, s.revenue_prev_30d_cents);
  const founderName = s.owner?.x_handle
    ? `@${s.owner.x_handle}`
    : (s.owner?.display_name ?? null);
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    logo: logoUrl(s.logo_path),
    founder: founderName
      ? { name: founderName, avatar: s.owner?.avatar_url ?? null }
      : null,
    value,
    cents,
    growth,
    demo: s.is_demo,
  };
}

// Design.md §6 Home: hero · Recently listed · Top traction · LeaderboardCard · teasers ·
// QuickSearch. "+ เพิ่ม Startup" appears only in the nav and the hero (spec 6.2).
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, nav] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Common"),
    getTranslations("Nav"),
  ]);

  const [thbPerUsd, recent, traction, counts, ...lists] = await Promise.all([
    getThbPerUsd(),
    getRecent(10),
    getTopTraction(10),
    countStartups(),
    ...BOARD_METRICS.map((m) => getBoard(m, 50)),
  ]);
  const boards = Object.fromEntries(
    BOARD_METRICS.map((m, i) => [m, lists[i].map((s) => boardRow(s, m))]),
  ) as Record<BoardMetric, BoardRow[]>;

  const dot = <span aria-hidden="true">·</span>;
  const subLink = "hover:text-foreground";

  return (
    <main className="mx-auto w-full max-w-5xl px-4">
      <section className="flex flex-col items-center pt-10 pb-10 text-center md:pt-12">
        <BrandPill />
        <h1 className="mb-3 text-2xl leading-tight font-bold tracking-tight md:text-[2.125rem]">
          <span className="block">{t("headline1")}</span>
          <span className="block">{t("headline2")}</span>
        </h1>
        <p className="mb-5 max-w-2xl text-body text-muted-foreground">
          {t("subline")}{" "}
          <Link
            href="/startups"
            className="whitespace-nowrap text-foreground underline underline-offset-4"
          >
            {/* Spec 6.2: a small number reads as "empty site", so the count shows from 20. */}
            {counts.total >= 20
              ? t("explore", { total: counts.total })
              : t("exploreAll")}
          </Link>
        </p>
        <div className="mb-6">
          <ProviderStrip />
        </div>
        <div className="flex w-full max-w-xl items-start gap-2 text-left">
          <QuickSearch />
          <AddStartupButton />
        </div>
        <nav className="mt-3 flex items-center gap-2 text-caption text-faint">
          <Link href="/categories" className={subLink}>
            {nav("categories")}
          </Link>
          {dot}
          <Link href="/olympics" className={subLink}>
            {nav("olympics")}
          </Link>
          {dot}
          <Link
            href={{ pathname: "/", hash: "leaderboard" }}
            className={subLink}
          >
            {nav("leaderboard")}
          </Link>
        </nav>
      </section>

      <CardRow
        title={t("recent")}
        viewAll={common("viewAll")}
        sort="newest"
        rows={recent}
        thbPerUsd={thbPerUsd}
        empty={<EmptyState text={t("emptyRecent")} />}
      />
      {traction.length > 0 && (
        <CardRow
          title={t("topTraction")}
          viewAll={common("viewAll")}
          sort="visitors"
          rows={traction}
          thbPerUsd={thbPerUsd}
        />
      )}

      <div className="mt-9">
        <LeaderboardCard boards={boards} thbPerUsd={thbPerUsd} />
      </div>
      <HomeTeasers thbPerUsd={thbPerUsd} />
      <QuickSearchSection add={false} chips={false} />
    </main>
  );
}

function CardRow({
  title,
  viewAll,
  sort,
  rows,
  thbPerUsd,
  empty,
}: {
  title: string;
  viewAll: string;
  sort: string;
  rows: StartupRow[];
  thbPerUsd: number | null;
  empty?: React.ReactNode;
}) {
  return (
    <section className="mt-9 first-of-type:mt-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        <Link
          href={{ pathname: "/startups", query: { sort } }}
          className="text-caption text-faint hover:text-foreground"
        >
          {viewAll} ›
        </Link>
      </div>
      {rows.length === 0 ? (
        empty
      ) : (
        // Plain grid, no horizontal scrolling (Design.md §5): 6 cards below lg, 5 at lg.
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {rows.slice(0, 6).map((s, i) => (
            <StartupCard
              key={s.id}
              startup={s}
              thbPerUsd={thbPerUsd}
              className={i === 5 ? "lg:hidden" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// No button here: the hero's "+ เพิ่ม Startup" is right above (spec 6.2: the CTA at most twice).
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
