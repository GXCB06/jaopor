import { getTranslations, setRequestLocale } from "next-intl/server";
import { AiToolChips } from "@/components/AiToolChips";
import { BrandMark } from "@/components/BrandLogo";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ProviderStrip } from "@/components/ProviderStrip";
import { SearchBar } from "@/components/SearchBar";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { countStartups, getLeaderboard, getRecent } from "@/lib/data/startups";

export const revalidate = 60;

// Design.md §6 Home: logo · H1 · subline · search · recently added · leaderboard.
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const common = await getTranslations("Common");

  const [recent, leaderboard, counts] = await Promise.all([
    getRecent(12),
    getLeaderboard(50),
    countStartups(),
  ]);

  return (
    <main className="w-full">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-12 pb-8 text-center md:pt-16">
        <BrandMark className="mb-4 size-9" />
        {/* Design.md §5 Hero headline: two deliberate lines. */}
        <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          <span className="block">{t("headline1")}</span>
          <span className="block">{t("headline2")}</span>
        </h1>
        <p className="mx-auto mb-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          {t("subline")}
        </p>
        <div className="mb-3">
          <ProviderStrip />
        </div>
        <p className="mb-6 text-xs text-muted-foreground tabular-nums md:mb-8">
          {t("stats", { total: counts.total, verified: counts.verified })}
        </p>
        <SearchBar locale={locale} />
        <div className="mt-5 space-y-2">
          <p className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("builtWith")}
          </p>
          <AiToolChips />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("recent")}</h2>
          <Link
            href="/startups"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {common("viewAll")} ›
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState text={t("emptyRecent")} />
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {recent.map((s) => (
              <StartupCard
                key={s.id}
                startup={s}
                className="w-64 shrink-0 snap-start"
              />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-10 w-full max-w-2xl px-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("leaderboard")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("leaderboardHint")}
          </span>
        </div>
        {leaderboard.length === 0 ? (
          <EmptyState text={t("emptyLeaderboard")} />
        ) : (
          <LeaderboardTable rows={leaderboard} />
        )}
      </section>
    </main>
  );
}

async function EmptyState({ text }: { text: string }) {
  const nav = await getTranslations("Nav");
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link
        href="/new"
        className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        {nav("addStartup")}
      </Link>
    </div>
  );
}
