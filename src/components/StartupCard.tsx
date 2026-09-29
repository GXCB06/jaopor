import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StartupRow } from "@/lib/data/startups";
import type { LookingFor } from "@/lib/links";
import { growthPct } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "./CopyLinkButton";
import {
  CornerTag,
  GrowthValue,
  Money,
  MetricLabel,
  StartupLogo,
} from "./StartupBits";

/**
 * Design.md §5 StartupCard. `compact` (home rows): 24px logo, 3 tiny metrics under a divider.
 * `large` (directory, "More startups"): 36px logo, category chip, 2-line tagline.
 * Metrics: verified revenue → Revenue (30d) · MRR · Growth; else verified traction →
 * Visitors · Growth · Commits; else "Not verified yet".
 */
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact" }).format(n);

type Metric = { label: string; value: React.ReactNode };

function useMetrics(
  s: StartupRow,
  large: boolean,
  thbPerUsd: number | null,
): Metric[] | null {
  const t = useTranslations("Card");
  if (s.verification_status === "verified") {
    return [
      {
        label: large ? t("revenue30d") : t("revenueShort"),
        value: <Money cents={s.revenue_30d_cents} thbPerUsd={thbPerUsd} />,
      },
      {
        label: t("mrr"),
        value: <Money cents={s.mrr_cents} thbPerUsd={thbPerUsd} />,
      },
      {
        label: t("growth"),
        value: (
          <GrowthValue
            pct={growthPct(s.revenue_30d_cents, s.revenue_prev_30d_cents)}
          />
        ),
      },
    ];
  }
  if (s.visitors_30d !== null || s.build_commits !== null) {
    return [
      {
        label: large ? t("visitors") : t("visitorsShort"),
        value: s.visitors_30d !== null ? compact(s.visitors_30d) : "–",
      },
      {
        label: t("growth"),
        value: (
          <GrowthValue pct={growthPct(s.visitors_30d, s.visitors_prev_30d)} />
        ),
      },
      {
        label: t("commits"),
        value: s.build_commits !== null ? compact(s.build_commits) : "–",
      },
    ];
  }
  return null;
}

function Tag({ startup, large }: { startup: StartupRow; large: boolean }) {
  const t = useTranslations("Card");
  const lf = useTranslations("LookingFor");
  // Compact cards show the demo label under the name (DemoTag) so the name keeps its width.
  if (startup.is_demo)
    return large ? <CornerTag tone="neutral">{t("demo")}</CornerTag> : null;
  const verified =
    startup.verification_status === "verified" || startup.visitors_30d !== null;
  // Compact cards are narrow: the verified tag shrinks to its check so the name stays readable.
  if (verified)
    return (
      <CornerTag tone="positive">
        <span aria-hidden={!large}>✓</span>
        <span className={large ? "ml-1" : "sr-only"}>{t("verified")}</span>
      </CornerTag>
    );
  const ask = startup.looking_for[0] as LookingFor | undefined;
  if (ask) return <CornerTag tone="warning">{lf(ask)}</CornerTag>;
  return null;
}

function DemoTag() {
  const t = useTranslations("Card");
  return (
    <CornerTag tone="neutral" className="px-1 py-0">
      {t("demo")}
    </CornerTag>
  );
}

export function StartupCard({
  startup,
  large = false,
  thbPerUsd = null,
  className,
}: {
  startup: StartupRow;
  large?: boolean;
  /** THB per USD for the currency switch (Design.md §3 Currency); null = USD only. */
  thbPerUsd?: number | null;
  className?: string;
}) {
  const cat = useTranslations("Catalog.category");
  const common = useTranslations("Common");
  const metrics = useMetrics(startup, large, thbPerUsd);
  const href = `/startup/${startup.slug}`;

  const metricRow = (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 border-t",
        large ? "mt-4 pt-4" : "mt-3 pt-2",
      )}
    >
      {metrics ? (
        metrics.map((m) => (
          <div key={m.label} className="min-w-0 space-y-0.5">
            <MetricLabel className={cn("truncate", large && "text-2xs")}>
              {m.label}
            </MetricLabel>
            <p className="truncate text-2xs font-bold tabular-nums">
              {m.value}
            </p>
          </div>
        ))
      ) : (
        <p className="col-span-3 text-2xs text-faint">
          {common("notVerified")}
        </p>
      )}
    </div>
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col border bg-card transition-colors hover:border-foreground/20",
        large ? "justify-between rounded-xl p-4" : "rounded-lg p-3",
        className,
      )}
    >
      <Link
        href={href}
        className="absolute inset-0"
        aria-label={startup.name}
      />
      <div>
        <div className="flex items-start gap-2.5">
          <StartupLogo
            name={startup.name}
            src={logoUrl(startup.logo_path)}
            size={large ? 36 : 24}
            className={large ? "rounded-lg" : undefined}
          />
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate font-semibold",
                large ? "text-body font-bold" : "text-xs",
              )}
            >
              {startup.name}
            </h3>
            {large ? (
              <span className="mt-1 inline-flex rounded-sm border bg-secondary px-1.5 text-3xs text-muted-foreground">
                {cat(startup.category)}
              </span>
            ) : (
              <p className="flex min-w-0 items-center gap-1.5 text-2xs text-faint">
                <span className="truncate">{cat(startup.category)}</span>
                {startup.is_demo && <DemoTag />}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {large && <CopyLinkButton path={href} />}
            <Tag startup={startup} large={large} />
          </div>
        </div>
        {large && (
          <p className="mt-3 line-clamp-2 min-h-[2.5em] text-caption text-muted-foreground">
            {startup.tagline}
          </p>
        )}
      </div>
      {metricRow}
    </article>
  );
}
