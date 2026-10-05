import { WelcomeBanner } from "@/components/WelcomeBanner";
import { SlidersHorizontalIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandPill } from "@/components/BrandLogo";
import { ProviderStrip } from "@/components/ProviderStrip";
import { AddStartupButton, QuickSearch } from "@/components/search/QuickSearch";
import { QuickSearchSection } from "@/components/search/QuickSearchSection";
import { StartupCard } from "@/components/StartupCard";
import { Link } from "@/i18n/navigation";
import { AI_TOOLS, CATEGORIES, isAiTool, isCategory } from "@/lib/catalog";
import {
  DIRECTORY_SORTS,
  PAGE_SIZE,
  PROJECT_TYPES,
  listStartups,
  type DirectorySort,
  type ProjectType,
} from "@/lib/data/startups";
import { getThbPerUsd } from "@/lib/data/fx";
import { LOOKING_FOR, type LookingFor } from "@/lib/links";
import { localizedName } from "@/lib/config/localized";
import { PROVINCE_LIST, REGION_LIST, isProvince } from "@/lib/config/provinces";
import { categoryName } from "@/lib/config/display";
import { aiToolLabel } from "@/lib/config/stack";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/startups">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Directory" });
  return { title: t("title") };
}

const pick = <T extends string>(list: readonly T[], v: string | undefined) =>
  list.includes(v as T) ? (v as T) : undefined;

const selectCls =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-caption";

// Design.md §6 /startups (Figma "Marketplace"): hero · FilterSidebar + results + grid.
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
  const type = pick<ProjectType>(PROJECT_TYPES, one(sp.type));
  const lookingFor = pick<LookingFor>(LOOKING_FOR, one(sp.lookingFor));
  const province = isProvince(one(sp.province)) ? one(sp.province) : undefined;
  const sort = pick<DirectorySort>(DIRECTORY_SORTS, one(sp.sort)) ?? "mrr";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [t, lf, { rows, total }, thbPerUsd] = await Promise.all([
    getTranslations("Directory"),
    getTranslations("LookingFor"),
    listStartups({
      q,
      category,
      tool,
      verified,
      type,
      lookingFor,
      province,
      sort,
      page,
    }),
    getThbPerUsd(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const base = {
    q,
    category,
    tool,
    verified: verified ? "1" : undefined,
    type,
    lookingFor,
    province,
    sort: sort === "mrr" ? undefined : sort,
  };
  const href = (patch: Record<string, string | undefined>) => ({
    pathname: "/startups" as const,
    query: Object.fromEntries(
      Object.entries({ ...base, page: undefined, ...patch }).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    ) as Record<string, string>,
  });
  const activeFilters = [
    category,
    tool,
    verified || undefined,
    type,
    lookingFor,
    province,
  ].filter(Boolean).length;

  // GET form: works without JS. Changing a select needs "Apply" (no client code here).
  const filters = (
    <form
      action={`/${locale}/startups`}
      method="get"
      className="hidden space-y-4 rounded-xl border bg-card p-4 peer-checked:block lg:block"
    >
      {q && <input type="hidden" name="q" value={q} />}
      {sort !== "mrr" && <input type="hidden" name="sort" value={sort} />}
      <Field label={t("category")}>
        <select
          name="category"
          defaultValue={category ?? ""}
          className={selectCls}
        >
          <option value="">{t("allCategories")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryName(c, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("province")}>
        <select
          name="province"
          defaultValue={province ?? ""}
          className={selectCls}
        >
          <option value="">{t("allProvinces")}</option>
          {REGION_LIST.map((r) => (
            <optgroup key={r.slug} label={localizedName(r, locale)}>
              {PROVINCE_LIST.filter((p) => p.region === r.slug).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {localizedName(p, locale)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label={t("tool")}>
        <select name="tool" defaultValue={tool ?? ""} className={selectCls}>
          <option value="">{t("allTools")}</option>
          {AI_TOOLS.filter((x) => x !== "other").map((x) => (
            <option key={x} value={x}>
              {aiToolLabel(x, locale)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("type")}>
        <select name="type" defaultValue={type ?? ""} className={selectCls}>
          <option value="">{t("anyType")}</option>
          {PROJECT_TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`types.${x}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={lf("title")}>
        <select
          name="lookingFor"
          defaultValue={lookingFor ?? ""}
          className={selectCls}
        >
          <option value="">{t("any")}</option>
          {LOOKING_FOR.map((x) => (
            <option key={x} value={x}>
              {lf(x)}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-caption">
        <input
          type="checkbox"
          name="verified"
          value="1"
          defaultChecked={verified}
          className="accent-(--brand)"
        />
        {t("verifiedOnly")}
      </label>
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Link
          href={{ pathname: "/startups", query: q ? { q } : {} }}
          className="text-caption text-faint hover:text-foreground"
        >
          {t("reset")}
        </Link>
        <button
          type="submit"
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("apply")}
        </button>
      </div>
    </form>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4">
      <section className="mx-auto flex max-w-2xl flex-col items-center pt-10 pb-8 text-center">
        <BrandPill />
        <h1 className="mb-3 text-2xl leading-tight font-bold tracking-tight md:text-[2.125rem]">
          {t("title")}
        </h1>
        <p className="mb-5 text-body text-muted-foreground">{t("subline")}</p>
        <div className="mb-6">
          <ProviderStrip />
        </div>
        <div className="flex w-full max-w-xl items-start gap-2 text-left">
          <QuickSearch defaultValue={q} autoFocus={one(sp.focus) === "1"} />
          <AddStartupButton />
        </div>
      </section>

      {one(sp.welcome) === "1" && <WelcomeBanner />}

      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
        <aside>
          <p className="mb-2 hidden text-3xs font-semibold tracking-wider text-faint uppercase lg:block">
            {t("filters")}
          </p>
          {/* One form for every breakpoint: a CSS-only checkbox opens it below lg (no JS, no duplicate DOM). */}
          <input
            type="checkbox"
            id="filters-toggle"
            defaultChecked={activeFilters > 0}
            className="peer sr-only"
          />
          <label
            htmlFor="filters-toggle"
            className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground peer-focus-visible:text-foreground lg:hidden"
          >
            <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
            {t("filters")}
            {activeFilters > 0 && (
              <span className="rounded-full bg-secondary px-1.5 text-2xs tabular-nums">
                {activeFilters}
              </span>
            )}
          </label>
          {filters}
        </aside>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-muted-foreground tabular-nums">
              {t("found", { count: total })}
            </p>
            <nav aria-label={t("sort")} className="flex flex-wrap gap-1">
              {DIRECTORY_SORTS.map((s) => (
                <Link
                  key={s}
                  href={href({ sort: s === "mrr" ? undefined : s })}
                  aria-current={sort === s ? "true" : undefined}
                  className={
                    sort === s
                      ? "rounded-md border bg-secondary px-2 py-1 text-caption font-semibold"
                      : "rounded-md border border-transparent px-2 py-1 text-caption text-muted-foreground hover:text-foreground"
                  }
                >
                  {t(`sorts.${s}`)}
                </Link>
              ))}
            </nav>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((s) => (
                <StartupCard
                  key={s.id}
                  startup={s}
                  large
                  thbPerUsd={thbPerUsd}
                />
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
              <span className="text-faint tabular-nums">
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
        </section>
      </div>
      <QuickSearchSection />
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-caption font-medium">{label}</span>
      {children}
    </label>
  );
}
