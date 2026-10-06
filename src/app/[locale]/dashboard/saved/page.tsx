import { BookmarkIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { requireUserId } from "@/lib/auth";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/saved">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.saved"), robots: { index: false } };
}

// Phase 9d "ที่บันทึกไว้": the data model has no bookmarks table yet (Project.md §7), so this is
// an honest placeholder rather than a fake list.
export default async function SavedPage({
  params,
}: PageProps<"/[locale]/dashboard/saved">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireUserId(locale, "/dashboard/saved");
  const t = await getTranslations("Me");
  return (
    <main className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.saved")}</h1>
      <Card className="flex flex-col items-center gap-2 border-dashed px-5 py-12 text-center">
        <BookmarkIcon className="size-6 text-faint" aria-hidden="true" />
        <p className="text-sm font-semibold">{t("savedSoon")}</p>
        <p className="max-w-sm text-caption text-muted-foreground">
          {t("savedSoonHint")}
        </p>
      </Card>
    </main>
  );
}
