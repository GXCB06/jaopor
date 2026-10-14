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
import { MultiChoice } from "@/components/core/MultiChoice";
import { AI_TOOLS, CATEGORIES, isAiTool, isCategory } from "@/lib/catalog";
import { provinceGroups } from "@/lib/config/choice-options";
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
import { isProvince } from "@/lib/config/provinces";
import { categoryName } from "@/lib/config/display";
import { aiToolLabel } from "@/lib/config/stack";
import { joinList, parseList } from "@/lib/url-list";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/startups">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Directory" });
  // Filtered views (?category=…) all point at the one directory URL.
  return { title: t("title"), alternates: localeAlternates(locale, "/startups") };
}

const pick = <T extends string>(list: readonly T[], v: string | undefined) =>
  list.includes(v as T) ? (v as T) : undefined;

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
  // Multi-choice filters (Design.md §5 Dropdowns): ?category=saas,ai matches either.
  const category = parseList<(typeof CATEGORIES)[number]>(sp.category, isCategory);
  const tool = parseList<(typeof AI_TOOLS)[number]>(sp.tool, isAiTool);
  const verified = one(sp.verified) === "1";
  const type = parseList<ProjectType>(sp.type, (x) =>
    PROJECT_TYPES.includes(x as ProjectType),
  );
  const lookingFor = parseList<LookingFor>(sp.lookingFor, (x) =>
    LOOKING_FOR.includes(x as LookingFor),
  );
  const province = parseList<string>(sp.province, isProvince);
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
    category: joinList(category),
    tool: joinList(tool),
    verified: verified ? "1" : undefined,
    type: joinList(type),
    lookingFor: joinList(lookingFor),
    province: joinList(province),
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
  const activeFilters =
    category.length +
    tool.length +
    type.length +
    lookingFor.length +
    province.length +
    (verified ? 1 : 0);

  // GET form; each MultiChoice posts one comma-joined field. Changes apply with "Apply".
  const filters = (
    <form
      action={`/${locale}/startups`}
      method="get"
      className="hidden space-y-4 rounded-xl border bg-card p-4 peer-checked:block lg:block"
    >
      {q && <input type="hidden" name="q" value={q} />}
      {sort !== "mrr" && <input type="hidden" name="sort" value={sort} />}
      <Field label={t("category")}>
        <MultiChoice
          name="category"
          defaultValue={category}
          placeholder={t("allCategories")}
          options={CATEGORIES.map((c) => ({
            value: c,
            label: categoryName(c, locale),
          }))}
        />
      </Field>
      <Field label={t("province")}>
        <MultiChoice
          name="province"
          defaultValue={province}
          placeholder={t("allProvinces")}
          groups={provinceGroups(locale)}
        />
      </Field>
      <Field label={t("tool")}>
        <MultiChoice
          name="tool"
          defaultValue={tool}
          placeholder={t("allTools")}
          options={AI_TOOLS.filter((x) => x !== "other").map((x) => ({
            value: x,
            label: aiToolLabel(x, locale),
          }))}
        />
      </Field>
      <Field label={t("type")}>
        <MultiChoice
          name="type"
          defaultValue={type}
          placeholder={t("anyType")}
          options={PROJECT_TYPES.map((x) => ({
            value: x,
            label: t(`types.${x}`),
          }))}
        />
      </Field>
      <Field label={lf("title")}>
        <MultiChoice
          name="lookingFor"
          defaultValue={lookingFor}
          placeholder={t("any")}
          options={LOOKING_FOR.map((x) => ({ value: x, label: lf(x) }))}
        />
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
    <main className="mx-auto w-full max-w-page px-4">
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

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    // A <label> around the dropdown's button: clicking the label text opens it too.
    <label className="block space-y-1.5">
      <span className="block text-caption font-medium">{label}</span>
      {children}
    </label>
  );
}
