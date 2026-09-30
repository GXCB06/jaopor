"use client";

import { Medal } from "./core/Medal";
import { ChevronDownIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { BoardMetric } from "@/lib/data/startups";
import { CornerTag, GrowthValue, Money, StartupLogo } from "./StartupBits";

/** One leaderboard row, formatted on the server (slim: only what the table shows). */
export type BoardRow = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logo: string | null;
  founder: { name: string; avatar: string | null } | null;
  value: string;
  /** Money metrics: USD cents, shown in the visitor's currency. */
  cents?: number | null;
  growth: number | null;
  /** Sample project (Design.md §5 Demo projects). */
  demo: boolean;
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
          <span className="inline-flex items-center gap-1 text-3xs font-bold tracking-wider text-positive uppercase">
            <span className="size-1.5 rounded-full bg-positive" aria-hidden />
            {t("live")}
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
            {shown.map((r, i) => (
              <tr
                key={r.id}
                className="group border-b transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <td className="py-3 pl-4 text-xs text-faint tabular-nums">
                  {i < 3 ? <Medal rank={i + 1} /> : i + 1}
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
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      {r.founder.avatar ? (
                        <Image
                          src={r.founder.avatar}
                          alt=""
                          width={16}
                          height={16}
                          className="size-4 rounded-full"
                        />
                      ) : (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary text-3xs uppercase">
                          {r.founder.name.slice(0, 1)}
                        </span>
                      )}
                      <span className="truncate">{r.founder.name}</span>
                    </span>
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
        <p className="text-center text-2xs text-faint">{t("footer")}</p>
      </div>
    </section>
  );
}
