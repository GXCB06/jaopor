import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandPill } from "@/components/BrandLogo";
import { LeaderboardCard, type BoardRow } from "@/components/LeaderboardCard";
import { ProviderStrip } from "@/components/ProviderStrip";
import { SearchBar } from "@/components/SearchBar";
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
import { growthPct, moneyFull } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";

export const revalidate = 60;

const int = (n: number | null) => (n === null ? "–" : n.toLocaleString("en"));

function boardRow(s: StartupRow, metric: BoardMetric): BoardRow {
  const value = {
    mrr: () => moneyFull(s.mrr_cents),
    revenue30d: () => moneyFull(s.revenue_30d_cents),
    visitors: () => int(s.visitors_30d),
    commits: () => int(s.build_commits),
  }[metric]();
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
    growth,
    demo: s.is_demo,
  };
}

// Design.md §6 Home: hero · Recently listed · Top traction · LeaderboardCard.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, nav] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Common"),
    getTranslations("Nav"),
  ]);

  const [recent, traction, counts, ...lists] = await Promise.all([
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
            {t("explore", { total: counts.total })}
          </Link>
        </p>
        <div className="mb-6">
          <ProviderStrip />
        </div>
        <div className="w-full max-w-xl">
          <SearchBar locale={locale} />
        </div>
        <nav className="mt-3 flex items-center gap-2 text-caption text-faint">
          <Link href="/new" className={subLink}>
            {nav("addStartup")}
          </Link>
          {dot}
          <Link
            href={{ pathname: "/", hash: "leaderboard" }}
            className={subLink}
          >
            {nav("leaderboard")}
          </Link>
          {dot}
          <Link href="/dashboard" className={subLink}>
            {nav("dashboard")}
          </Link>
        </nav>
      </section>

      <CardRow
        title={t("recent")}
        viewAll={common("viewAll")}
        sort="newest"
        rows={recent}
        empty={<EmptyState text={t("emptyRecent")} />}
      />
      {traction.length > 0 && (
        <CardRow
          title={t("topTraction")}
          viewAll={common("viewAll")}
          sort="visitors"
          rows={traction}
        />
      )}

      <div className="mt-9">
        <LeaderboardCard boards={boards} />
      </div>
    </main>
  );
}

function CardRow({
  title,
  viewAll,
  sort,
  rows,
  empty,
}: {
  title: string;
  viewAll: string;
  sort: string;
  rows: StartupRow[];
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
        // Mobile: horizontal snap row; lg: 5-up grid (Design.md §5 compact card).
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {rows.slice(0, 10).map((s, i) => (
            <StartupCard
              key={s.id}
              startup={s}
              className={
                i >= 5
                  ? "w-56 shrink-0 snap-start lg:hidden"
                  : "w-56 shrink-0 snap-start lg:w-auto"
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

async function EmptyState({ text }: { text: string }) {
  const nav = await getTranslations("Nav");
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
      <Link
        href="/new"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3.5 text-xs font-semibold text-primary-foreground"
      >
        {nav("addStartup")}
      </Link>
    </div>
  );
}
