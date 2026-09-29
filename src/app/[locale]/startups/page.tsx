import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchBar } from "@/components/SearchBar";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { AI_TOOLS, CATEGORIES, isAiTool, isCategory } from "@/lib/catalog";
import { PAGE_SIZE, listStartups } from "@/lib/data/startups";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/startups">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Directory" });
  return { title: t("title") };
}

// Design.md §6 /startups: H1 + count · filter chips · card grid · pagination.
export default async function StartupsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/startups">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const q = one(sp.q)?.slice(0, 60);
  const category = isCategory(one(sp.category))
    ? (one(sp.category) as (typeof CATEGORIES)[number])
    : undefined;
  const tool = isAiTool(one(sp.tool))
    ? (one(sp.tool) as (typeof AI_TOOLS)[number])
    : undefined;
  const verified = one(sp.verified) === "1";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [t, cat, toolT, { rows, total }] = await Promise.all([
    getTranslations("Directory"),
    getTranslations("Catalog.category"),
    getTranslations("Catalog.tool"),
    listStartups({ q, category, tool, verified, page }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const base = { q, category, tool, verified: verified ? "1" : undefined };
  const href = (patch: Record<string, string | undefined>) => ({
    pathname: "/startups" as const,
    query: Object.fromEntries(
      Object.entries({ ...base, page: undefined, ...patch }).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    ) as Record<string, string>,
  });
  const chip = (active: boolean) =>
    cn(
      "rounded-md border px-2 py-0.5 text-xs transition-colors hover:border-primary/30 hover:text-foreground",
      active ? "border-brand/60 text-foreground" : "text-muted-foreground",
    );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("count", { count: total })}
          </p>
        </div>
        <div className="w-full md:max-w-md">
          <SearchBar locale={locale} defaultValue={q} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Link href={href({ category: undefined })} className={chip(!category)}>
          {t("allCategories")}
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={href({ category: c })}
            className={chip(category === c)}
          >
            {cat(c)}
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={href({ tool: undefined })} className={chip(!tool)}>
          {t("allTools")}
        </Link>
        {AI_TOOLS.filter((x) => x !== "other").map((x) => (
          <Link key={x} href={href({ tool: x })} className={chip(tool === x)}>
            {toolT(x)}
          </Link>
        ))}
        <Link
          href={href({ verified: verified ? undefined : "1" })}
          className={chip(verified)}
        >
          ✓ {t("verifiedOnly")}
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <StartupCard key={s.id} startup={s} large />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-4 text-xs">
          {page > 1 ? (
            <Link
              href={href({ page: String(page - 1) })}
              className="text-muted-foreground hover:text-foreground"
            >
              ‹ {t("prev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            {t("page", { page, pages })}
          </span>
          {page < pages ? (
            <Link
              href={href({ page: String(page + 1) })}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("next")} ›
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
