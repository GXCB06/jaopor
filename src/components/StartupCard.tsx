import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StartupRow } from "@/lib/data/startups";
import type { LookingFor } from "@/lib/links";
import { growthPct, moneyCompact } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "./CopyLinkButton";
import {
  FoundingBadge,
  GrowthValue,
  MetricLabel,
  StartupLogo,
} from "./StartupBits";

/**
 * Design.md §5 StartupCard. Not-for-sale variant: Revenue (30d) · MRR · Growth; without verified
 * revenue it shows verified traction instead (Visitors · Growth · Commits).
 */
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n);

export function StartupCard({
  startup,
  large = false,
  className,
}: {
  startup: StartupRow;
  large?: boolean;
  className?: string;
}) {
  const t = useTranslations("Card");
  const cat = useTranslations("Catalog.category");
  const common = useTranslations("Common");
  const lf = useTranslations("LookingFor");
  const verified = startup.verification_status === "verified";
  const traction =
    startup.visitors_30d !== null || startup.build_commits !== null;
  const ask = startup.looking_for[0] as LookingFor | undefined;
  const href = `/startup/${startup.slug}`;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-background/60 p-3 transition-all hover:border-primary/30 hover:bg-background",
        className,
      )}
    >
      <Link
        href={href}
        className="absolute inset-0"
        aria-label={startup.name}
      />
      <div className="flex items-start gap-2.5">
        <StartupLogo name={startup.name} src={logoUrl(startup.logo_path)} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{startup.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {cat(startup.category)}
          </p>
        </div>
        <CopyLinkButton path={href} />
      </div>

      {large && startup.tagline && (
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
          {startup.tagline}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {verified ? (
          <>
            <div>
              <MetricLabel>{t("revenue30d")}</MetricLabel>
              <p className="text-sm font-bold tabular-nums">
                {moneyCompact(startup.revenue_30d_cents)}
              </p>
            </div>
            <div>
              <MetricLabel>{t("mrr")}</MetricLabel>
              <p className="text-sm font-bold tabular-nums">
                {moneyCompact(startup.mrr_cents)}
              </p>
            </div>
            <div>
              <MetricLabel>{t("growth")}</MetricLabel>
              <GrowthValue
                className="text-sm font-bold"
                pct={growthPct(
                  startup.revenue_30d_cents,
                  startup.revenue_prev_30d_cents,
                )}
              />
            </div>
          </>
        ) : traction ? (
          <>
            <div>
              <MetricLabel>{t("visitors")}</MetricLabel>
              <p className="text-sm font-bold tabular-nums">
                {startup.visitors_30d !== null
                  ? compact(startup.visitors_30d)
                  : "—"}
              </p>
            </div>
            <div>
              <MetricLabel>{t("growth")}</MetricLabel>
              <GrowthValue
                className="text-sm font-bold"
                pct={growthPct(startup.visitors_30d, startup.visitors_prev_30d)}
              />
            </div>
            <div>
              <MetricLabel>{t("commits")}</MetricLabel>
              <p className="text-sm font-bold tabular-nums">
                {startup.build_commits !== null
                  ? compact(startup.build_commits)
                  : "—"}
              </p>
            </div>
          </>
        ) : (
          <p className="col-span-3 text-xs text-muted-foreground">
            {common("notVerified")}
          </p>
        )}
      </div>

      {(startup.founding_number !== null || ask) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <FoundingBadge n={startup.founding_number} />
          {ask && (
            <span className="text-[9px] font-bold text-brand uppercase">
              {lf("tag", { what: lf(ask) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
