import { stackCount } from "@/lib/config/display";
import { hasPricing } from "@/lib/pricing";
import type { Metadata } from "next";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { DashboardActions } from "@/components/DashboardActions";
import {
  FoundingBadge,
  MetricLabel,
  Money,
  StartupLogo,
} from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { isSource, type SourceId } from "@/lib/sources/catalog";
import { getThbPerUsd } from "@/lib/data/fx";
import type { Tables } from "@/lib/supabase/database.types";
import { logoUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/startups">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title"), robots: { index: false } };
}

/** Any verified source: revenue, visitors or build proof. */
function hasVerifiedNumbers(s: Tables<"startups">) {
  return (
    s.verification_status === "verified" ||
    s.visitors_30d !== null ||
    s.build_commits !== null
  );
}

/** Source to re-sync from the card menu (revenue first). */
function refreshSource(s: Tables<"startups">): SourceId | null {
  const candidates = [s.verified_provider, s.traffic_provider];
  const found = candidates.find((c): c is SourceId => isSource(c));
  return found ?? (s.github_repo ? "github" : null);
}

/** Fields that make a profile "complete" (Design.md §5 Dashboard startup card). */
function completeness(s: Tables<"startups">) {
  const checks = [
    hasVerifiedNumbers(s),
    Boolean(s.logo_path),
    Boolean(s.tagline),
    Boolean(s.description),
    Boolean(s.founded_on),
    Boolean(s.value_proposition),
    Boolean(s.problem_solved),
    Boolean(s.audience),
    hasPricing(s),
    Boolean(s.team_size),
    Boolean(s.funding),
    stackCount(s.tech_stack) > 0,
    s.marketing_channels.length > 0,
    Boolean(s.founder_message),
    Boolean(s.build_story),
  ];
  const done = checks.filter(Boolean).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}

// Design.md §5 Dashboard startup cards (moved from /dashboard in Phase 9d; the overview now has
// the compact table).
export default async function DashboardStartupsPage({
  params,
}: PageProps<"/[locale]/dashboard/startups">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/startups");

  const supabase = await createClient();
  const { data: startups } = await supabase
    .from("startups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const [t, nav, p, format, thbPerUsd] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Nav"),
    getTranslations("Profile"),
    getFormatter(),
    getThbPerUsd(),
  ]);

  return (
    <main className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <Link
          href="/new"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          + {nav("addStartup")}
        </Link>
      </div>

      {!startups?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Link
            href="/new"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            + {nav("addStartup")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {startups.map((s) => {
            const verified = hasVerifiedNumbers(s);
            const status = verified
              ? "statusVerified"
              : s.verification_status === "error"
                ? "statusError"
                : "statusUnverified";
            const { pct, missing } = completeness(s);
            return (
              <li key={s.id} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <StartupLogo
                    name={s.name}
                    src={logoUrl(s.logo_path)}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
                          verified && "border-brand/40 text-brand-text",
                          status === "statusError" &&
                            "border-warning/40 text-warning",
                          status === "statusUnverified" &&
                            "text-muted-foreground",
                        )}
                      >
                        {verified ? "✓ " : ""}
                        {t(status)}
                      </span>
                      <FoundingBadge n={s.founding_number} />
                      {s.status === "hidden" && (
                        <span className="text-[10px] text-warning">
                          {t("hidden")}
                        </span>
                      )}
                    </div>
                  </div>
                  <DashboardActions
                    id={s.id}
                    slug={s.slug}
                    name={s.name}
                    refreshSource={refreshSource(s)}
                    verified={verified}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3">
                  <div>
                    <MetricLabel>{t("mrr")}</MetricLabel>
                    <p className="text-sm font-bold tabular-nums">
                      {s.verification_status === "verified" ? (
                        <Money cents={s.mrr_cents} thbPerUsd={thbPerUsd} />
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                  <div>
                    <MetricLabel>{p("visitors30d")}</MetricLabel>
                    <p className="text-sm font-bold tabular-nums">
                      {s.visitors_30d !== null
                        ? format.number(s.visitors_30d, { notation: "compact" })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <MetricLabel>{p("buildProof")}</MetricLabel>
                    <p className="text-sm font-bold tabular-nums">
                      {s.build_commits !== null
                        ? p("commits", { count: s.build_commits })
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {t("completeness", { pct })}
                    </span>
                    {missing > 0 && (
                      <Link
                        href={`/startup/${s.slug}`}
                        className="text-brand-text hover:underline"
                      >
                        {t("addMore", { count: missing })} ›
                      </Link>
                    )}
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-brand transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
