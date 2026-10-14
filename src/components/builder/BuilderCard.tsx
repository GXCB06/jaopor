import { BadgeCheckIcon, MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CardGlow } from "@/components/core/CardGlow";
import { InView } from "@/components/core/InView";
import { Money } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { PersonPhoto } from "@/components/PersonPhoto";
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

  // Design.md §7 Motion: the card rises in when it scrolls into view.
  return (
    <InView mode="enter" className="card-rise h-full">
      <Link
        href={`/u/${b.handle}`}
        className="group relative isolate flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-[border-color,translate,box-shadow] duration-(--motion-base) ease-(--ease-settle) hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5 motion-safe:[@media(hover:hover)]:hover:-translate-y-1"
      >
        <CardGlow />
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-sm font-bold text-muted-foreground uppercase">
            <PersonPhoto
              src={b.avatarUrl}
              fallback={b.name.slice(0, 2)}
              loading="lazy"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate font-semibold group-hover:underline"
              title={b.name}
            >
              {b.name}
            </span>
            <span
              className="block truncate text-2xs text-faint"
              title={`@${b.handle}`}
            >
              @{b.handle}
            </span>
          </span>
        </div>

        {b.headline && (
          <p
            className="line-clamp-2 text-caption text-muted-foreground"
            title={b.headline}
          >
            {b.headline}
          </p>
        )}
        <StatusPill status={b.status} />

        {skills.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {skills.map((s) => {
              const label = localizedName(s.def!, locale);
              return (
                <li
                  key={s.slug}
                  title={label}
                  className={cn(
                    "max-w-full truncate rounded-full border px-2 py-0.5 text-2xs",
                    s.superpower
                      ? "border-brand/40 text-brand-text"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {label}
                </li>
              );
            })}
          </ul>
        )}

        {/*
          Footer (Design.md §5). Content-driven. When a location is present the row is
          `justify-between` with two children: the [works · revenue] group on the left and the
          province on the right. On one line the province sits at the right edge; if it wraps to its
          own line, `space-between` falls back to the start (a lone item is left-aligned), so a
          wrapped location lands at the left edge rather than the far right. No fixed widths, no
          sample-length assumptions, and only the groups — never the row — carry `nowrap`.
        */}
        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-caption tabular-nums",
            province && "justify-between",
          )}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
              {t("works", { n: b.works })}
            </span>
            {b.mrrCents > 0 && (
              <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 font-semibold">
                <span aria-hidden="true" className="text-faint">
                  ·
                </span>
                {/* Icon + amount stay together; the unit can drop below only if space is extreme. */}
                <span className="inline-flex min-w-0 items-center gap-1">
                  <BadgeCheckIcon
                    className="size-3.5 shrink-0 text-positive"
                    aria-hidden="true"
                  />
                  <Money cents={b.mrrCents} thbPerUsd={thbPerUsd} />
                </span>
                <span className="font-normal text-faint">{t("perMonth")}</span>
              </span>
            )}
          </span>
          {province && (
            <span className="flex min-w-0 items-center gap-1 text-2xs text-faint">
              <MapPinIcon className="size-3 shrink-0" aria-hidden="true" />
              <span
                className="min-w-0 [overflow-wrap:anywhere]"
                title={localizedName(province, locale)}
              >
                {localizedName(province, locale)}
              </span>
            </span>
          )}
        </div>
      </Link>
    </InView>
  );
}
