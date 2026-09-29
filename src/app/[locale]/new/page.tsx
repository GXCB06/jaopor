import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StartupWizard } from "@/components/wizard/StartupWizard";
import { requireUserId } from "@/lib/auth";
import { getGithubLogin } from "@/lib/data/connections";

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
  const userId = await requireUserId(locale, "/new");
  const [t, githubLogin] = await Promise.all([
    getTranslations("Wizard"),
    getGithubLogin(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <StartupWizard userId={userId} githubLogin={githubLogin} />
    </main>
  );
}
