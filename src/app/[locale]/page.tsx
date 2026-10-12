import { TrophyIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroBrand, HeroLight } from "@/components/BrandLogo";
import { LeaderboardCard, type BoardRow } from "@/components/LeaderboardCard";
import { CategoryRail } from "@/components/CategoryRail";
import { ProviderStrip } from "@/components/ProviderStrip";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { HomeTeasers } from "@/components/home/HomeTeasers";
import { TypedHeadline } from "@/components/home/TypedHeadline";
import { LiveVisitorsSection } from "@/components/live/LiveVisitorsSection";
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
import {
  BOARD_OPEN_MIN,
  boardState,
  boardValue,
  rankBoard,
} from "@/lib/leaderboard";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: localeAlternates(locale, "") };
}

const int = (n: number | null) => (n === null ? "–" : n.toLocaleString("en"));

function boardRow(
  s: StartupRow & { rank: number; tied: boolean },
  metric: BoardMetric,
): BoardRow {
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
  // The JaoPor profile (Design.md §5 LeaderboardCard), never the X handle.
  const founderName =
    s.owner?.display_name ?? (s.owner?.handle ? `@${s.owner.handle}` : null);
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    logo: logoUrl(s.logo_path),
    founder: founderName
      ? {
          name: founderName,
          avatar: s.owner?.avatar_url ?? null,
          handle: s.owner?.handle ?? null,
        }
      : null,
    value,
    cents,
    growth,
    demo: s.is_demo,
    rank: s.rank,
    tied: s.tied,
  };
}

// Design.md §6 Home: hero · Recently listed · Top traction · LeaderboardCard · teasers ·
// QuickSearch. "+ เพิ่ม Startup" appears only in the nav and the hero (spec 6.2).
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, common, nav, lb] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Common"),
    getTranslations("Nav"),
    getTranslations("Leaderboard"),
  ]);

  const [thbPerUsd, recent, traction, counts, ...lists] = await Promise.all([
    getThbPerUsd(),
    getRecent(10),
    getTopTraction(10),
    countStartups(),
    ...BOARD_METRICS.map((m) => getBoard(m, 50)),
  ]);
  const boards = Object.fromEntries(
    BOARD_METRICS.map((m, i) => [
      m,
      // A1.3: competition ranks (equal values share a rank), ties listed by name.
      rankBoard(
        lists[i],
        (s) => boardValue(s, m),
        (s) => s.name,
      ).map((s) => boardRow(s, m)),
    ]),
  ) as Record<BoardMetric, BoardRow[]>;

  const dot = <span aria-hidden="true">·</span>;
  const subLink = "hover:text-foreground";

  // Each board opens on its own once BOARD_OPEN_MIN projects can rank on it (the team's own and
  // demos never count: lib/team). Listed projects (counts.total) are a different number.
  const board = boardState(boards);
  const openBoards = Object.fromEntries(
    board.open.map((m) => [m, boards[m]]),
  ) as Partial<Record<BoardMetric, BoardRow[]>>;

  const shownRecent = new Set(recent.slice(0, 6).map((s) => s.id));
  const freshTraction = traction.filter((s) => !shownRecent.has(s.id));

  return (
    <main className="mx-auto w-full max-w-6xl px-4">
      <section className="relative isolate flex flex-col items-center pt-10 pb-10 text-center md:pt-14">
        <HeroLight />
        <HeroBrand />
        {/* Design.md §5 Hero (owner mockup 2026-10-12): big two-line headline, grey "+", blue → cyan
            "ตัวเลขจริง", typed in on arrival. */}
        <TypedHeadline
          top={t.raw("heroTop") as string}
          bottom={t.raw("heroBottom") as string}
        />
        <p className="mb-3 text-body font-medium text-foreground">
          {t("tagline")}
        </p>
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
        <CategoryRail />
      </section>

      {/* "ตัวเลขแรงสุด" skips cards already shown above and hides itself when that leaves fewer
          than 3 (UX review 2026-10-07: with few projects both rows showed the same cards). */}
      <CardRow
        title={t("recent")}
        viewAll={common("viewAll")}
        sort="newest"
        rows={recent}
        thbPerUsd={thbPerUsd}
        empty={<EmptyState text={t("emptyRecent")} />}
      />
      {freshTraction.length >= 3 && (
        <CardRow
          title={t("topTraction")}
          viewAll={common("viewAll")}
          sort="visitors"
          rows={freshTraction}
          thbPerUsd={thbPerUsd}
        />
      )}

      <LiveVisitorsSection />
      <div className="mt-12">
        {/* Thresholded home (audit 2026-10-12): a board of one or two rows reads as empty. Boards
            open one by one; with none open, say what's needed and how to get on it. */}
        {board.state !== "closed" ? (
          <LeaderboardCard
            boards={openBoards}
            thbPerUsd={thbPerUsd}
            someClosed={board.state === "sparse"}
          />
        ) : (
          <section
            id="leaderboard"
            className="flex scroll-mt-20 flex-col gap-4 rounded-xl border border-dashed bg-card p-5 sm:flex-row sm:items-center"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
              <TrophyIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold">{lb("title")}</h2>
              <p className="text-caption text-muted-foreground">
                {lb("soon", { min: BOARD_OPEN_MIN })}
              </p>
              {/* Listed vs rankable: two different numbers, both said plainly. */}
              <p className="text-caption text-faint tabular-nums">
                {lb("soonCounts", {
                  listed: counts.total,
                  eligible: board.eligible,
                })}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-caption font-semibold text-primary-foreground hover:opacity-90"
            >
              {lb("connectCta")}
            </Link>
          </section>
        )}
      </div>
      <HomeTeasers thbPerUsd={thbPerUsd} />
      <QuickSearchSection chips={false} />
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
    <section className="mt-12 first-of-type:mt-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
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
        // Phones: one swipeable row with the next card peeking (owner 2026-10-13, Design.md §5);
        // from md a grid: 6 cards below lg, 5 at lg, and fewer cards than columns get fewer, wider
        // columns so a short row fills the width (layout audit 2026-10-12).
        <div
          className={cn(
            "-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:overflow-visible md:px-0 md:pb-0",
            rows.length === 4
              ? "md:grid-cols-2 lg:grid-cols-4"
              : "md:grid-cols-3",
            rows.length >= 5 && "lg:grid-cols-5",
          )}
        >
          {rows.slice(0, 6).map((s, i) => (
            <StartupCard
              key={s.id}
              startup={s}
              thbPerUsd={thbPerUsd}
              className={cn(
                "w-[80%] shrink-0 snap-start min-[420px]:w-[46%] md:w-auto",
                i === 5 && "lg:hidden",
              )}
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
