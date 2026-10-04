import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DocPage } from "@/components/DocPage";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/security">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Security" });
  return {
    title: t("metaTitle"),
    description: t("intro"),
    alternates: { canonical: `/${locale}/security` },
  };
}

// Design.md §6 Trust pages. Content lives in messages/*.json (Security.sections).
export default async function Page({
  params,
}: PageProps<"/[locale]/security">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DocPage namespace="Security" />;
}
