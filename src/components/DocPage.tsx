import { getTranslations } from "next-intl/server";

type Item = { b?: string; t: string };
type Section = { id?: string; title: string; body?: string; items?: Item[] };

/**
 * Design.md §6 Trust pages: the Privacy page's frame for text pages whose content lives in
 * messages/*.json under `namespace` (title, updated, intro, contact, email, sections; optional
 * `note`, a status callout such as "draft, not yet legally reviewed").
 */
export async function DocPage({ namespace }: { namespace: string }) {
  const t = await getTranslations(namespace);
  const sections = t.raw("sections") as Section[];
  const email = t("email");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-caption text-faint">{t("updated")}</p>
      {t.has("note") && (
        <p
          role="note"
          className="mt-4 rounded-lg border border-warning/40 bg-warning/5 px-4 py-3 text-caption leading-relaxed text-warning"
        >
          {t("note")}
        </p>
      )}
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
          </section>
        ))}
      </div>
    </main>
  );
}
