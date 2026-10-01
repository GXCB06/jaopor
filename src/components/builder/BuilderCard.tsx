import { BadgeCheckIcon, MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Money } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import type { DirectoryBuilder } from "@/lib/builders";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import { getSkill } from "@/lib/config/skills";
import { cn } from "@/lib/utils";
import { StatusPill } from "./StatusPill";

/** Design.md §5 BuilderCard (/builders): the whole card links to the builder's profile. */
export function BuilderCard({
  builder: b,
  thbPerUsd,
}: {
  builder: DirectoryBuilder;
  thbPerUsd: number | null;
}) {
  const t = useTranslations("Builders");
  const locale = useLocale();
  const province = b.province ? getProvince(b.province) : undefined;
  const skills = b.skills
    .map((s) => ({ ...s, def: getSkill(s.slug) }))
    .filter((s) => s.def)
    .slice(0, 3);

  return (
    <Link
      href={`/u/${b.handle}`}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-sm font-bold text-muted-foreground uppercase">
          {b.avatarUrl?.startsWith("https://") ? (
            // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
            <img
              src={b.avatarUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            b.name.slice(0, 2)
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold group-hover:underline">
            {b.name}
          </span>
          <span className="block truncate text-2xs text-faint">
            @{b.handle}
          </span>
        </span>
      </div>

      {b.headline && (
        <p className="line-clamp-2 text-caption text-muted-foreground">
          {b.headline}
        </p>
      )}
      <StatusPill status={b.status} />

      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <li
              key={s.slug}
              className={cn(
                "rounded-full border px-2 py-0.5 text-2xs",
                s.superpower
                  ? "border-brand/40 text-brand-text"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {localizedName(s.def!, locale)}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center gap-2 border-t pt-3 text-caption tabular-nums">
        <span className="text-muted-foreground">
          {t("works", { n: b.works })}
        </span>
        {b.mrrCents > 0 && (
          <span className="flex items-center gap-1 font-semibold">
            <span aria-hidden="true" className="text-faint">
              ·
            </span>
            <BadgeCheckIcon
              className="size-3.5 text-positive"
              aria-hidden="true"
            />
            <Money cents={b.mrrCents} thbPerUsd={thbPerUsd} />
            <span className="font-normal text-faint">{t("perMonth")}</span>
          </span>
        )}
        {province && (
          <span className="ml-auto flex min-w-0 items-center gap-1 text-2xs text-faint">
            <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{localizedName(province, locale)}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
