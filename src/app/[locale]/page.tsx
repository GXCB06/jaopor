import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

// Placeholder until Phase 1 builds the real homepage (see Project.md).
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-5xl">
        {t("headline")}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground md:text-base">
        {t("subline")}
      </p>
      <span className="rounded-bl-lg bg-amber-900/30 px-2 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
        {t("comingSoon")}
      </span>
    </main>
  );
}
