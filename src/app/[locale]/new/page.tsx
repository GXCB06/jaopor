import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupWizard } from "@/components/wizard/StartupWizard";
import { anonymousModeReady } from "@/lib/data/anonymous";
import { requireUser } from "@/lib/auth";
import { githubLoginOf } from "@/lib/data/connections";
import { getMyProfile } from "@/lib/data/me";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Wizard" });
  return { title: t("title"), robots: { index: false } };
}

export default async function NewStartupPage({
  params,
}: PageProps<"/[locale]/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // One Auth round trip for both the id and the GitHub login (was two in a row).
  const [user, t] = await Promise.all([
    requireUser(locale, "/new"),
    getTranslations("Wizard"),
  ]);
  // The project's province starts as the founder's own (Olympics; UX audit M-10). `province` is a
  // visibility-controlled column clients can't select, so it's read server-side like the dashboard
  // does; an empty field (the founder picks) if that fails.
  const [me, anonymousReady] = await Promise.all([
    getMyProfile(user.id).catch(() => null),
    anonymousModeReady(),
  ]);

  return (
    // Design.md §5 Add-startup wizard v3: wider page for the form + live side panel.
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("subtitle")}</p>
      <StartupWizard
        userId={user.id}
        githubLogin={githubLoginOf(user)}
        defaultProvince={me?.province ?? ""}
        anonymousReady={anonymousReady}
      />
    </main>
  );
}
