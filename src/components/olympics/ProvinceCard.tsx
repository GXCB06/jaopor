import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { Medal } from "@/components/core/Medal";
import { Money, StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { getProvince } from "@/lib/config/provinces";
import {
  isMoneyMetric,
  type OlympicMetric,
  type ProvinceRank,
} from "@/lib/olympics";
import { logoUrl } from "@/lib/supabase/public";
import { ProvinceBadge, RegionChip } from "./ProvinceBadge";

const count = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n);

function Value({
  value,
  metric,
  thbPerUsd,
}: {
  value: number;
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  return isMoneyMetric(metric) ? (
    <Money cents={value} thbPerUsd={thbPerUsd} />
  ) : (
    <>{count(value)}</>
  );
}

/**
 * Design.md §5 ProvinceCard (spec 6.7): rank · badge · name + region + count · total, then the
 * province's top 5 with their share of the total. The header links to the province page.
 */
export async function ProvinceCard({
  row,
  rank,
  metric,
  thbPerUsd,
}: {
  row: ProvinceRank;
  rank: number;
  metric: OlympicMetric;
  thbPerUsd: number | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Olympics"),
    getLocale(),
  ]);
  const p = getProvince(row.province)!;
  const [main, other] =
    locale === "th" ? [p.nameTh, p.nameEn] : [p.nameEn, p.nameTh];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className="flex w-7 shrink-0 justify-center text-sm font-bold text-faint tabular-nums"
          aria-label={t("rank", { rank })}
        >
          {rank <= 3 ? <Medal rank={rank} /> : rank}
        </span>
        <Link
          href={`/province/${p.slug}`}
          className="group flex min-w-0 flex-1 items-center gap-3"
        >
          <ProvinceBadge region={p.region} />
          <span className="min-w-0 space-y-1">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-sm font-bold group-hover:underline">
                {main}
              </span>
              <span className="hidden truncate text-caption text-faint sm:inline">
                {other}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <RegionChip region={p.region} locale={locale} />
              <span className="text-2xs text-muted-foreground">
                {t("startups", { count: row.startups })}
              </span>
            </span>
          </span>
        </Link>
        <span className="shrink-0 text-right text-lg font-bold tracking-tight tabular-nums">
          <Value value={row.total} metric={metric} thbPerUsd={thbPerUsd} />
        </span>
      </div>

      <ol className="mt-4 space-y-3 border-t pt-3">
        {row.top.map((s) => {
          const pct = row.total > 0 ? (s.value / row.total) * 100 : null;
          return (
            <li key={s.slug} className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <Link
                  href={`/startup/${s.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
                >
                  <StartupLogo
                    name={s.name}
                    src={logoUrl(s.logo_path)}
                    size={20}
                  />
                  <span className="truncate text-xs font-semibold">
                    {s.name}
                  </span>
                </Link>
                {pct !== null && (
                  <span
                    className="shrink-0 text-2xs text-faint tabular-nums"
                    title={t("share", { pct: Math.round(pct) })}
                  >
                    {Math.round(pct)}%
                  </span>
                )}
                <span className="w-20 shrink-0 text-right text-xs font-bold tabular-nums">
                  <Value
                    value={s.value}
                    metric={metric}
                    thbPerUsd={thbPerUsd}
                  />
                </span>
              </div>
              <div
                aria-hidden="true"
                className="h-1 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
