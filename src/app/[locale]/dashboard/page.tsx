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
  StartupLogo,
} from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { moneyCompact } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";
import { logoUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title"), robots: { index: false } };
}

/** Fields that make a profile "complete" (Design.md §5 Dashboard startup card). */
function completeness(s: Tables<"startups">) {
  const checks = [
    s.verification_status === "verified",
    Boolean(s.logo_path),
    Boolean(s.tagline),
    Boolean(s.description),
    Boolean(s.founded_on),
    Boolean(s.value_proposition),
    Boolean(s.problem_solved),
    Boolean(s.audience),
    Boolean(s.pricing),
    Boolean(s.team_size),
    Boolean(s.funding),
    s.tech_stack.length > 0,
    s.marketing_channels.length > 0,
    Boolean(s.founder_message),
  ];
  const done = checks.filter(Boolean).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}

export default async function DashboardPage({
  params,
}: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard");

  const supabase = await createClient();
  const { data: startups } = await supabase
    .from("startups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const [t, nav, format] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Nav"),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
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
            const verified = s.verification_status === "verified";
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
                          verified && "border-brand/40 text-brand",
                          status === "statusError" &&
                            "border-amber-400/40 text-amber-400",
                          status === "statusUnverified" &&
                            "text-muted-foreground",
                        )}
                      >
                        {verified ? "✓ " : ""}
                        {t(status)}
                      </span>
                      <FoundingBadge n={s.founding_number} />
                      {s.status === "hidden" && (
                        <span className="text-[10px] text-amber-400">
                          {t("hidden")}
                        </span>
                      )}
                    </div>
                  </div>
                  <DashboardActions
                    id={s.id}
                    slug={s.slug}
                    name={s.name}
                    connected={s.verification_status !== "unverified"}
                    verified={verified}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3">
                  <div>
                    <MetricLabel>{t("mrr")}</MetricLabel>
                    <p className="text-sm font-bold tabular-nums">
                      {verified ? moneyCompact(s.mrr_cents) : "—"}
                    </p>
                  </div>
                  <div>
                    <MetricLabel>{t("revenue30d")}</MetricLabel>
                    <p className="text-sm font-bold tabular-nums">
                      {verified ? moneyCompact(s.revenue_30d_cents) : "—"}
                    </p>
                  </div>
                  <div>
                    <MetricLabel>{t("lastSyncLabel")}</MetricLabel>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {s.last_synced_at
                        ? format.relativeTime(new Date(s.last_synced_at))
                        : t("neverSynced")}
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
                        className="text-brand hover:underline"
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
