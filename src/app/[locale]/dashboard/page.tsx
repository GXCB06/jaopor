import type { Metadata } from "next";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { DashboardActions } from "@/components/DashboardActions";
import { FoundingBadge, StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { moneyCompact } from "@/lib/format";
import { logoUrl } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  return { title: t("title"), robots: { index: false } };
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
    .select(
      "id, slug, name, logo_path, status, verification_status, mrr_cents, last_synced_at, founding_number",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const [t, nav, common, format] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Nav"),
    getTranslations("Common"),
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
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {startups.map((s) => (
            <li key={s.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <StartupLogo
                  name={s.name}
                  src={logoUrl(s.logo_path)}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {s.verification_status === "verified"
                      ? `MRR ${moneyCompact(s.mrr_cents)}`
                      : common("notVerified")}
                    {s.last_synced_at &&
                      ` · ${t("lastSync", { time: format.dateTime(new Date(s.last_synced_at), { dateStyle: "medium", timeStyle: "short" }) })}`}
                  </p>
                  {s.status === "hidden" && (
                    <p className="text-xs text-amber-400">{t("hidden")}</p>
                  )}
                </div>
                <FoundingBadge n={s.founding_number} />
              </div>
              <DashboardActions
                id={s.id}
                slug={s.slug}
                name={s.name}
                connected={s.verification_status !== "unverified"}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
