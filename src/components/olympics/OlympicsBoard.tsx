"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useState } from "react";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import {
  PROVINCE_LIST,
  REGION_LIST,
  getProvince,
  getRegion,
} from "@/lib/config/provinces";
import { setMyProvince, useMyProvince } from "@/lib/my-province";
import {
  gapToNext,
  hasPrevious,
  type OlympicMetric,
  type ProvinceRank,
} from "@/lib/olympics";
import { normalizeSearch } from "@/lib/search-text";
import { cn } from "@/lib/utils";
import { OlympicValue } from "./OlympicValue";
import { ProvinceBadge } from "./ProvinceBadge";

const PAGE = 10;

/** ▲3 / ▼1 / – / ใหม่ (Design.md §5 RankChange). */
export function RankChange({
  row,
  metric,
}: {
  row: ProvinceRank;
  metric: OlympicMetric;
}) {
  const t = useTranslations("Olympics");
  if (!hasPrevious(metric)) return <span className="text-faint">–</span>;
  if (row.change === null)
    return (
      <span className="text-2xs font-bold text-brand-text">{t("new")}</span>
    );
  if (row.change === 0) return <span className="text-faint">–</span>;
  const up = row.change > 0;
  return (
    <span
      className={cn(
        "text-2xs font-bold tabular-nums",
        up ? "text-positive" : "text-negative",
      )}
      aria-label={t(up ? "movedUp" : "movedDown", { n: Math.abs(row.change) })}
    >
      {up ? "▲" : "▼"} {Math.abs(row.change)}
    </span>
  );
}

function Growth({ value }: { value: number | null }) {
  if (value === null) return <span className="text-faint">–</span>;
  const pct = Math.round(value * 100);
  return (
    <span
      className={cn(
        "tabular-nums",
        pct > 0 ? "text-positive" : pct < 0 ? "text-negative" : "text-faint",
      )}
    >
      {pct > 0 ? "↑" : pct < 0 ? "↓" : ""} {Math.abs(pct)}%
    </span>
  );
}

/**
 * Design.md §5 OlympicsBoard (Olympics v3): the visitor's province bar ("you are #9, ฿X to pass
 * #8"), a province search, and the standings table from #4 with expandable rows (top projects +
 * share bars). The visitor's own row is highlighted.
 */
export function OlympicsBoard({
  board,
  metric,
  thbPerUsd,
}: {
  board: ProvinceRank[];
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  const t = useTranslations("Olympics");
  const locale = useLocale();
  const mine = useMyProvince();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const q = normalizeSearch(query);
  const name = (slug: string) => {
    const p = getProvince(slug)!;
    return {
      main: localizedName(p, locale),
      other: locale === "th" ? p.nameEn : p.nameTh,
    };
  };
  // Searching looks at the whole board (incl. the podium); otherwise the table starts at #4.
  const rows = q
    ? board.filter((r) => {
        const p = getProvince(r.province)!;
        return [p.nameTh, p.nameEn, p.slug].some((v) =>
          normalizeSearch(v).includes(q),
        );
      })
    : board.slice(3);
  const shown = showAll || q ? rows : rows.slice(0, PAGE);
  const value = (v: number) => (
    <OlympicValue value={v} metric={metric} thbPerUsd={thbPerUsd} />
  );

  const myRow = mine ? board.find((r) => r.province === mine) : undefined;
  const gap = myRow ? gapToNext(board, myRow.province) : null;

  return (
    <div className="space-y-3">
      {/* Your province */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3 text-caption">
        <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-brand-text uppercase">
          <MapPinIcon className="size-3.5" aria-hidden="true" />
          {t("yourProvince")}
        </span>
        {mine ? (
          <>
            <Link
              href={`/province/${mine}`}
              className="flex items-center gap-2 font-semibold hover:underline"
            >
              <ProvinceBadge
                region={getProvince(mine)!.region}
                className="h-7 w-10"
              />
              {name(mine).main}
            </Link>
            {myRow ? (
              <>
                <span className="font-bold tabular-nums">#{myRow.rank}</span>
                <RankChange row={myRow} metric={metric} />
                <span className="text-muted-foreground">
                  {gap ? (
                    <>
                      {t.rich("gapToPass", {
                        gap: () => (
                          <b className="font-bold text-foreground tabular-nums">
                            {value(gap.gap)}
                          </b>
                        ),
                        ahead: name(gap.ahead.province).main,
                        rank: gap.ahead.rank,
                      })}
                    </>
                  ) : (
                    t("leading")
                  )}
                </span>
              </>
            ) : (
              <Link href="/new" className="text-brand-text hover:underline">
                {t("yourProvinceEmpty")} →
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMyProvince(null)}
              className="ml-auto text-2xs text-faint hover:text-foreground"
            >
              {t("changeProvince")}
            </button>
          </>
        ) : (
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-muted-foreground">{t("finderTitle")}</span>
            <span className="relative min-w-40 flex-1 sm:max-w-56">
              <select
                defaultValue=""
                onChange={(e) => setMyProvince(e.target.value || null)}
                className="h-8 w-full appearance-none rounded-md border border-input bg-background pr-7 pl-2.5 text-caption"
              >
                <option value="" disabled>
                  {t("finderPlaceholder")}
                </option>
                {REGION_LIST.map((r) => (
                  <optgroup key={r.slug} label={localizedName(r, locale)}>
                    {PROVINCE_LIST.filter((p) => p.region === r.slug).map(
                      (p) => (
                        <option key={p.slug} value={p.slug}>
                          {localizedName(p, locale)}
                        </option>
                      ),
                    )}
                  </optgroup>
                ))}
              </select>
              <ChevronDownIcon
                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
            </span>
          </label>
        )}
      </div>

      {/* Search */}
      <label className="relative block">
        <span className="sr-only">{t("searchProvince")}</span>
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchProvince")}
          className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-caption"
        />
      </label>

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b text-2xs font-bold tracking-wider text-faint uppercase">
                <th className="w-10 py-2.5 pl-4 font-bold">#</th>
                <th className="w-12 py-2.5 font-bold">
                  <span className="sr-only">{t("change")}</span>
                </th>
                <th className="py-2.5 pr-2 font-bold">{t("province")}</th>
                <th className="hidden w-16 px-2 py-2.5 text-right font-bold md:table-cell">
                  {t("projects")}
                </th>
                <th className="w-28 px-2 py-2.5 text-right font-bold sm:w-32">
                  {t(`metrics.${metric}`)}
                </th>
                <th className="hidden w-20 px-2 py-2.5 text-right font-bold sm:table-cell">
                  {t("growthCol")}
                </th>
                <th className="hidden w-24 px-2 py-2.5 font-bold lg:table-cell">
                  {t("topProjects")}
                </th>
                <th className="w-10 py-2.5 pr-3">
                  <span className="sr-only">{t("expand")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const p = getProvince(row.province)!;
                const n = name(row.province);
                const isOpen = open === row.province;
                const isMine = row.province === mine;
                return (
                  <Fragment key={row.province}>
                    <tr
                      className={cn(
                        "border-b transition-colors last:border-b-0 hover:bg-accent/40",
                        isMine &&
                          "bg-brand/5 shadow-[inset_3px_0_0_var(--brand)]",
                      )}
                    >
                      <td className="py-3 pl-4 text-xs font-bold tabular-nums">
                        {row.rank}
                      </td>
                      <td className="py-3">
                        <RankChange row={row} metric={metric} />
                      </td>
                      <td className="py-3 pr-2">
                        <Link
                          href={`/province/${p.slug}`}
                          className="group flex min-w-0 items-center gap-2.5"
                        >
                          <ProvinceBadge
                            region={p.region}
                            className="h-8 w-11"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold group-hover:underline">
                              {n.main}
                              {isMine && (
                                <span className="ml-1.5 text-2xs font-normal text-brand-text">
                                  · {t("you")}
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-2xs text-faint">
                              {localizedName(getRegion(p.region), locale)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-2 py-3 text-right text-xs text-muted-foreground tabular-nums md:table-cell">
                        {row.startups}
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-bold tabular-nums">
                        {value(row.total)}
                      </td>
                      <td className="hidden px-2 py-3 text-right text-xs sm:table-cell">
                        <Growth value={row.growth} />
                      </td>
                      <td className="hidden px-2 py-3 lg:table-cell">
                        <span className="flex -space-x-1.5">
                          {row.top.slice(0, 3).map((s) => (
                            <StartupLogo
                              key={s.slug}
                              name={s.name}
                              src={s.logo_url ?? null}
                              size={18}
                              className="ring-2 ring-card"
                            />
                          ))}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={t("expandProvince", { name: n.main })}
                          onClick={() => setOpen(isOpen ? null : row.province)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-accent hover:text-foreground"
                        >
                          <ChevronDownIcon
                            className={cn(
                              "size-4 transition-transform",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b bg-background/40 last:border-b-0">
                        <td colSpan={8} className="px-4 py-3 sm:pl-24">
                          <ul className="space-y-2.5">
                            {row.top.map((s) => {
                              const pct =
                                row.total > 0 ? (s.value / row.total) * 100 : 0;
                              return (
                                <li key={s.slug} className="space-y-1">
                                  <span className="flex items-center gap-2 text-xs">
                                    <StartupLogo
                                      name={s.name}
                                      src={s.logo_url ?? null}
                                      size={18}
                                    />
                                    <Link
                                      href={`/startup/${s.slug}`}
                                      className="min-w-0 truncate font-semibold hover:underline"
                                    >
                                      {s.name}
                                    </Link>
                                    <span className="text-2xs text-faint tabular-nums">
                                      {Math.round(pct)}%
                                    </span>
                                    <span className="ml-auto font-bold tabular-nums">
                                      {value(s.value)}
                                    </span>
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="block h-1 overflow-hidden rounded-full bg-secondary"
                                  >
                                    <span
                                      className="block h-full rounded-full bg-brand"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          <Link
                            href={`/province/${p.slug}`}
                            className="mt-3 inline-flex items-center gap-1 text-caption text-brand-text hover:underline"
                          >
                            {t("allInProvince", {
                              name: n.main,
                              n: row.startups,
                            })}
                            <ArrowRightIcon
                              className="size-3"
                              aria-hidden="true"
                            />
                          </Link>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!q && !showAll && rows.length > PAGE && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full border-t py-2.5 text-caption text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            >
              {t("showRanks", { from: PAGE + 4, to: board.length })} ↓
            </button>
          )}
        </div>
      ) : (
        q && (
          <p className="rounded-xl border border-dashed bg-card px-4 py-6 text-center text-caption text-muted-foreground">
            {t("noProvinceMatch", { q: query })}
          </p>
        )
      )}
    </div>
  );
}
