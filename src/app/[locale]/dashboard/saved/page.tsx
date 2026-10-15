import { BookmarkIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { getThbPerUsd } from "@/lib/data/fx";
import { getSavedStartups } from "@/lib/data/saves";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/saved">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.saved"), robots: { index: false } };
}

// Phase 9d "ที่บันทึกไว้": the projects this user bookmarked, newest first. Reads the saves table
// (RLS: own rows only) and renders the same card the directory uses.
export default async function SavedPage({
  params,
}: PageProps<"/[locale]/dashboard/saved">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/saved");
  const [t, thbPerUsd, saved] = await Promise.all([
    getTranslations("Me"),
    getThbPerUsd(),
    getSavedStartups(userId),
  ]);

  return (
    <main className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.saved")}</h1>
      {saved.rows.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 border-dashed px-5 py-12 text-center">
          <BookmarkIcon className="size-6 text-faint" aria-hidden="true" />
          <p className="text-sm font-semibold">{t("savedEmpty")}</p>
          <p className="max-w-sm text-caption text-muted-foreground">
            {t("savedHint")}
          </p>
          <Link
            href="/startups"
            className="mt-2 text-caption text-brand-text hover:underline"
          >
            {t("browse")}
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {saved.rows.map((s) => (
            <StartupCard key={s.id} startup={s} large thbPerUsd={thbPerUsd} />
          ))}
        </div>
      )}
    </main>
  );
}
