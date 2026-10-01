import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/core/Card";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { Link } from "@/i18n/navigation";
import { requireUserId } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/me";
import type { Visibility } from "@/lib/profile";

const CONTACT = "jaopordev@gmail.com";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/dashboard/settings">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Me" });
  return { title: t("nav.settings"), robots: { index: false } };
}

// Design.md §6 Settings (Phase 9d): visibility per field, directory opt-out, account deletion
// (by email until self-service exists; /privacy §8 says the same).
export default async function SettingsPage({
  params,
}: PageProps<"/[locale]/dashboard/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const userId = await requireUserId(locale, "/dashboard/settings");
  const [t, profile] = await Promise.all([
    getTranslations("Me"),
    getMyProfile(userId),
  ]);
  if (!profile) return null;
  return (
    <main className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.settings")}</h1>
      <SettingsForm
        initial={{
          visibility: (profile.field_visibility ?? {}) as Record<
            string,
            Visibility
          >,
          showInDirectory: profile.show_in_directory,
        }}
      />
      <Card className="space-y-2 border-negative/30 p-5">
        <h2 className="text-sm font-bold">{t("deleteTitle")}</h2>
        <p className="text-caption text-muted-foreground">{t("deleteHint")}</p>
        <div className="flex flex-wrap gap-3 text-caption">
          <a
            href={`mailto:${CONTACT}?subject=${encodeURIComponent(t("deleteSubject"))}`}
            className="font-semibold text-negative hover:underline"
          >
            {t("deleteRequest")}
          </a>
          <Link
            href={{ pathname: "/privacy", hash: "live" }}
            className="text-faint hover:text-foreground"
          >
            {t("privacyLink")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
