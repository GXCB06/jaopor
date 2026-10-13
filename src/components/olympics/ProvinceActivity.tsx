import { FlagIcon, SparklesIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { ProjectName } from "@/components/core/ProjectName";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { localizedName } from "@/lib/config/localized";
import { getProvince, type Region } from "@/lib/config/provinces";
import {
  newestProjects,
  provincePioneers,
  type ActivityProject,
} from "@/lib/olympics";
import { renderNow, timeAgo } from "@/lib/posts";
import { logoUrl } from "@/lib/supabase/public";
import { ProvinceBadge } from "./ProvinceBadge";

const LIMIT = 6;

/**
 * Design.md §5 Olympics page — "ผู้บุกเบิกจังหวัด" and "มาใหม่ล่าสุด" (owner-approved 2026-10-12):
 * under the open-provinces card, so the page has life before many provinces have numbers. Every
 * published project counts, verified or not.
 */
export async function ProvinceActivity({
  rows,
  region,
}: {
  rows: ActivityProject[];
  region: Region | null;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("Olympics"),
    getLocale(),
  ]);
  const now = renderNow();
  const pioneers = provincePioneers(rows, region).slice(0, LIMIT);
  const newest = newestProjects(rows, LIMIT, region);
  if (!pioneers.length && !newest.length) return null;

  const owner = (r: ActivityProject) =>
    r.owner?.display_name ?? (r.owner?.handle ? `@${r.owner.handle}` : null);

  const item = (r: ActivityProject & { province: string }, line: string) => {
    const p = getProvince(r.province)!;
    return (
      <li key={`${r.slug}-${line}`}>
        <Link
          href={`/startup/${r.slug}`}
          className="group flex items-center gap-3 rounded-md py-1.5"
        >
          <StartupLogo name={r.name} src={logoUrl(r.logo_path)} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold group-hover:underline">
              <ProjectName name={r.name} slug={r.slug} />
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              {line}
            </span>
          </span>
          <ProvinceBadge
            region={p.region}
            province={p.slug}
            className="h-6 w-9 shrink-0"
          />
        </Link>
      </li>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {pioneers.length > 0 && (
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <FlagIcon className="size-3.5 text-brand-text" aria-hidden="true" />
            {t("pioneersTitle")}
          </h2>
          <p className="mt-1 text-caption text-muted-foreground">
            {t("pioneersSub")}
          </p>
          <ul className="mt-3 divide-y">
            {pioneers.map((r) =>
              item(
                r,
                [
                  t("firstIn", {
                    province: localizedName(getProvince(r.province)!, locale),
                  }),
                  owner(r),
                  timeAgo(r.created_at, locale, now),
                ]
                  .filter(Boolean)
                  .join(" · "),
              ),
            )}
          </ul>
        </Card>
      )}
      {newest.length > 0 && (
        <Card className="p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <SparklesIcon
              className="size-3.5 text-brand-text"
              aria-hidden="true"
            />
            {t("newestTitle")}
          </h2>
          <p className="mt-1 text-caption text-muted-foreground">
            {t("newestSub")}
          </p>
          <ul className="mt-3 divide-y">
            {newest.map((r) =>
              item(
                r,
                [
                  localizedName(getProvince(r.province)!, locale),
                  owner(r),
                  timeAgo(r.created_at, locale, now),
                ]
                  .filter(Boolean)
                  .join(" · "),
              ),
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
