import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LiveOptOutControl } from "@/components/live/LiveOptOutControl";
import { routing } from "@/i18n/routing";

type Item = { b?: string; t: string };
type Section = { id?: string; title: string; body?: string; items?: Item[] };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return {
    title: t("metaTitle"),
    description: t("intro"),
    alternates: { canonical: `/${locale}/privacy` },
  };
}

// Design.md §6 Privacy page: wording approved by the owner on 2026-10-01 (docs/privacy-draft.md).
// Content lives in messages/*.json (Privacy.sections); §5 carries the live-map opt-out switch.
export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  const sections = t.raw("sections") as Section[];
  const email = t("email");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-caption text-faint">{t("updated")}</p>
      <p className="mt-5 text-body leading-relaxed text-muted-foreground">
        {t("intro")}
      </p>
      <p className="mt-3 text-body">
        {t("contact")}{" "}
        <a
          href={`mailto:${email}`}
          className="text-brand-text underline-offset-4 hover:underline"
        >
          {email}
        </a>
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title} id={s.id} className="scroll-mt-20 space-y-3">
            <h2 className="text-base font-bold">{s.title}</h2>
            {s.body && (
              <p className="text-body leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            )}
            {s.items && (
              <ul className="list-disc space-y-2 pl-5 text-body leading-relaxed text-muted-foreground marker:text-faint">
                {s.items.map((i) => (
                  <li key={i.t}>
                    {i.b && (
                      <b className="font-semibold text-foreground">{i.b} </b>
                    )}
                    {i.t}
                  </li>
                ))}
              </ul>
            )}
            {s.id === "live" && <LiveOptOutControl />}
          </section>
        ))}
      </div>
    </main>
  );
}
