import { ArrowRightIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { StartupLogo } from "@/components/StartupBits";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { searchUnclaimed } from "@/lib/data/claims";
import { logoUrl } from "@/lib/supabase/public";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/claim">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Claim" });
  return { title: t("title"), robots: { index: false } };
}

/**
 * Claim a project (Project.md item 3): find an imported listing that is yours and take it over.
 * Search by name or website, then prove ownership with a read-only key or your GitHub repo.
 */
export default async function ClaimPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dashboard/claim">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserId(locale, "/dashboard/claim");
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";
  const [t, listings] = await Promise.all([
    getTranslations("Claim"),
    searchUnclaimed(q),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-caption text-muted-foreground">{t("intro")}</p>
      </header>

      <form method="get" className="flex gap-2">
        <label className="sr-only" htmlFor="claim-q">
          {t("searchLabel")}
        </label>
        <input
          id="claim-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("searchPlaceholder")}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <SearchIcon className="size-3.5" aria-hidden="true" />
          {t("search")}
        </button>
      </form>

      {listings.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed px-5 py-12 text-center">
          <p className="text-sm font-semibold">{t("empty")}</p>
          <p className="max-w-sm text-caption text-muted-foreground">
            {t("emptyHint")}
          </p>
          <Link
            href="/new"
            className="mt-2 text-caption text-brand-text hover:underline"
          >
            {t("addNew")}
          </Link>
        </Card>
      ) : (
        <ul className="space-y-2">
          {listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/dashboard/claim/${l.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-brand/40 hover:bg-accent"
              >
                <StartupLogo
                  name={l.name}
                  src={logoUrl(l.logo_path)}
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {l.name}
                  </span>
                  {l.website_url && (
                    <span className="block truncate font-mono text-2xs text-muted-foreground">
                      {l.website_url}
                    </span>
                  )}
                  {l.tagline && (
                    <span className="block truncate text-2xs text-faint">
                      {l.tagline}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-text">
                  {t("claimThis")}
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
