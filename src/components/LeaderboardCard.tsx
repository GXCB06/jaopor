"use client";

import { Medal } from "./core/Medal";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
import type { BoardMetric } from "@/lib/leaderboard";
import { CornerTag, GrowthValue, Money, StartupLogo } from "./StartupBits";

/** One leaderboard row, formatted on the server (slim: only what the table shows). */
export type BoardRow = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logo: string | null;
  founder: {
    name: string;
    avatar: string | null;
    handle: string | null;
  } | null;
  value: string;
  /** Money metrics: USD cents, shown in the visitor's currency. */
  cents?: number | null;
  growth: number | null;
  /** Sample project (Design.md §5 Demo projects). */
  demo: boolean;
  /** Competition rank (lib/leaderboard): equal values share it. */
  rank: number;
  /** Another row has the same value. */
  tied: boolean;
};

const COLLAPSED = 10;

/**
 * Design.md §5 LeaderboardCard: bordered card, metric dropdown (MRR · Revenue 30d · Visitors ·
 * Commits), 10 rows then "Show all". All lists come from the server, so the page stays ISR.
 */
export function LeaderboardCard({
  boards,
  thbPerUsd,
}: {
  boards: Record<BoardMetric, BoardRow[]>;
  thbPerUsd: number | null;
}) {
  const t = useTranslations("Leaderboard");
  const [metric, setMetric] = useState<BoardMetric>(
    boards.mrr.length ? "mrr" : boards.visitors.length ? "visitors" : "mrr",
  );
  const [expanded, setExpanded] = useState(false);
  const rows = boards[metric];
  const shown = expanded ? rows : rows.slice(0, COLLAPSED);

  return (
    <section
      id="leaderboard"
      className="scroll-mt-20 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          {t("title")}
          {/* The numbers sync once a day: never "LIVE" (Design.md §5 LeaderboardCard). */}
          <span className="inline-flex items-center gap-1 text-2xs font-normal text-muted-foreground">
            <span className="size-1.5 rounded-full bg-positive" aria-hidden />
            {t("updatedDaily")}
          </span>
        </h2>
        <label className="relative">
          <span className="sr-only">{t("metric")}</span>
          <select
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value as BoardMetric);
              setExpanded(false);
            }}
            className="h-7 appearance-none rounded-lg border bg-secondary pr-7 pl-2.5 text-xs"
          >
            {(Object.keys(boards) as BoardMetric[]).map((m) => (
              <option key={m} value={m}>
                {t(`metrics.${m}`)}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <p className="text-xs text-muted-foreground">{t("empty")}</p>
          <Link
            href="/dashboard"
            className="text-caption font-medium text-brand-text hover:underline"
          >
            {t("emptyCta")} →
          </Link>
        </div>
      ) : (
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b text-2xs font-bold tracking-wider text-faint uppercase">
              <th className="w-10 py-2.5 pl-4 font-bold">#</th>
              <th className="px-3 py-2.5 font-bold">{t("startup")}</th>
              <th className="hidden w-[24%] px-3 py-2.5 font-bold sm:table-cell">
                {t("founder")}
              </th>
              <th className="w-28 px-3 py-2.5 text-right font-bold">
                {t(`metrics.${metric}`)}
              </th>
              <th className="hidden w-24 py-2.5 pr-4 pl-3 text-right font-bold sm:table-cell">
                {t("growth")}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.id}
                className="group border-b transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <td
                  className="py-3 pl-4 text-xs text-faint tabular-nums"
                  title={r.tied ? t("tied") : undefined}
                >
                  {/* A1.3: equal values share a rank, marked "=" (not hidden by age). */}
                  <span className="inline-flex items-center gap-0.5">
                    {r.rank <= 3 ? <Medal rank={r.rank} /> : r.rank}
                    {r.tied && (
                      <span aria-hidden="true" className="text-2xs">
                        =
                      </span>
                    )}
                    {r.tied && <span className="sr-only">{t("tied")}</span>}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/startup/${r.slug}`}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <StartupLogo name={r.name} src={r.logo} size={24} />
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-xs font-semibold group-hover:underline">
                          {r.name}
                        </span>
                        {r.demo && (
                          <CornerTag tone="neutral">{t("demo")}</CornerTag>
                        )}
                      </span>
                      {r.tagline && (
                        <span className="block truncate text-2xs text-faint">
                          {r.tagline}
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  {r.founder ? (
                    <FounderLink handle={r.founder.handle}>
                      <PersonPhoto
                        src={r.founder.avatar}
                        className="size-4 shrink-0 rounded-full object-cover"
                        fallback={
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary text-3xs uppercase">
                            {r.founder.name.slice(0, 1)}
                          </span>
                        }
                      />
                      <span className="truncate">{r.founder.name}</span>
                    </FounderLink>
                  ) : (
                    <span className="text-xs text-faint">–</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-xs font-bold tabular-nums">
                  {r.cents !== undefined ? (
                    <Money cents={r.cents} thbPerUsd={thbPerUsd} full />
                  ) : (
                    r.value
                  )}
                </td>
                <td className="hidden py-3 pr-4 pl-3 text-right text-xs sm:table-cell">
                  <GrowthValue pct={r.growth} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col items-center gap-2 border-t px-4 py-3">
        {rows.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-caption font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? t("showLess") : t("showAll", { count: rows.length })}
          </button>
        )}
        {/* A1.3: what this board ranks, over which period, and how ties work. */}
        <p className="text-center text-2xs text-faint">
          {t(`basis.${metric}`)}
        </p>
        {rows.some((r) => r.tied) && (
          <p className="text-center text-2xs text-faint">{t("ties")}</p>
        )}
      </div>
    </section>
  );
}

/** The founder cell: a link to the builder profile when they have a handle. */
function FounderLink({
  handle,
  children,
}: {
  handle: string | null;
  children: React.ReactNode;
}) {
  const cls = "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground";
  return handle ? (
    <Link
      href={`/u/${handle}`}
      className={`${cls} hover:text-foreground hover:underline`}
    >
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}
