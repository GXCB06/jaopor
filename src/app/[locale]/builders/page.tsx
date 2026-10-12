import { SearchIcon, SlidersHorizontalIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandPill } from "@/components/BrandLogo";
import { BuilderCard } from "@/components/builder/BuilderCard";
import { MultiChoice } from "@/components/core/MultiChoice";
import { Link } from "@/i18n/navigation";
import {
  BUILDERS_PAGE_SIZE,
  filterBuilders,
  sortBuilders,
  type BuilderFilters,
} from "@/lib/builders";
import { AI_TOOLS, isAiTool } from "@/lib/catalog";
import { localizedName } from "@/lib/config/localized";
import {
  REGIONS,
  getProvince,
  isProvince,
  type Region,
} from "@/lib/config/provinces";
import {
  SKILL_GROUPS,
  SKILL_GROUP_LABEL,
  SKILL_LIST,
  isSkill,
} from "@/lib/config/skills";
import { provinceGroups } from "@/lib/config/choice-options";
import { aiToolLabel } from "@/lib/config/stack";
import { joinList, parseList } from "@/lib/url-list";
import { listBuilders } from "@/lib/data/builder";
import { getThbPerUsd } from "@/lib/data/fx";
import { PROFILE_STATUSES, type ProfileStatus } from "@/lib/profile";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/builders">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Builders" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: localeAlternates(locale, `/builders`),
  };
}

// Design.md §5 Builders directory (spec 9c): hero with people search · filter sidebar + card grid.
export default async function BuildersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/builders">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const q = one(sp.q)?.trim().slice(0, 60) || undefined;
  // Multi-choice filters (Design.md §5 Dropdowns); `area` mixes regions and provinces.
  const skill = parseList<string>(sp.skill, isSkill);
  const area = parseList<string>(
    sp.area,
    (x) => REGIONS.includes(x as Region) || isProvince(x),
  );
  const region = area.filter((x): x is Region => REGIONS.includes(x as Region));
  const province = area.filter(isProvince);
  const status = parseList<string>(sp.status, (x) =>
    PROFILE_STATUSES.includes(x as ProfileStatus),
  );
  const tool = parseList<string>(sp.tool, isAiTool);
  const verified = one(sp.verified) === "1";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const filters: BuilderFilters = {
    q,
    skill,
    region,
    province,
    status,
    tool,
    verified,
  };
  const [t, tb, all, thbPerUsd] = await Promise.all([
    getTranslations("Builders"),
    getTranslations("Builder"),
    listBuilders(),
    getThbPerUsd(),
  ]);
  const matches = sortBuilders(
    filterBuilders(all, filters, (p) => getProvince(p)?.region),
  );
  const total = matches.length;
  const pages = Math.max(1, Math.ceil(total / BUILDERS_PAGE_SIZE));
  const rows = matches.slice(
    (page - 1) * BUILDERS_PAGE_SIZE,
    page * BUILDERS_PAGE_SIZE,
  );

  const base = {
    q,
    skill: joinList(skill),
    area: joinList(area),
    status: joinList(status),
    tool: joinList(tool),
    verified: verified ? "1" : undefined,
  };
  const href = (patch: Record<string, string | undefined>) => ({
    pathname: "/builders" as const,
    query: Object.fromEntries(
      Object.entries({ ...base, ...patch }).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    ) as Record<string, string>,
  });
  const activeFilters =
    skill.length +
    area.length +
    status.length +
    tool.length +
    (verified ? 1 : 0);

  // GET form; each MultiChoice posts one comma-joined field (same pattern as /startups).
  const filterForm = (
    <form
      action={`/${locale}/builders`}
      method="get"
      className="hidden space-y-4 rounded-xl border bg-card p-4 peer-checked:block lg:block"
    >
      {q && <input type="hidden" name="q" value={q} />}
      <Field label={t("skill")}>
        <MultiChoice
          name="skill"
          defaultValue={skill}
          placeholder={t("anySkill")}
          groups={SKILL_GROUPS.map((g) => ({
            label: localizedName(SKILL_GROUP_LABEL[g], locale),
            options: SKILL_LIST.filter((s) => s.group === g).map((s) => ({
              value: s.slug,
              label: localizedName(s, locale),
              keywords: `${s.nameTh} ${s.nameEn}`,
            })),
          }))}
        />
      </Field>
      <Field label={t("area")}>
        <MultiChoice
          name="area"
          defaultValue={area}
          placeholder={t("anyArea")}
          groups={provinceGroups(locale, (region) =>
            t("wholeRegion", { region }),
          )}
        />
      </Field>
      <Field label={t("status")}>
        <MultiChoice
          name="status"
          defaultValue={status}
          placeholder={t("anyStatus")}
          options={PROFILE_STATUSES.map((s) => ({
            value: s,
            label: tb(`status.${s}`),
          }))}
        />
      </Field>
      <Field label={t("tool")}>
        <MultiChoice
          name="tool"
          defaultValue={tool}
          placeholder={t("anyTool")}
          options={AI_TOOLS.filter((x) => x !== "other").map((x) => ({
            value: x,
            label: aiToolLabel(x, locale),
          }))}
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
          href={{ pathname: "/builders", query: q ? { q } : {} }}
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
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <section className="mx-auto flex max-w-2xl flex-col items-center pt-10 pb-8 text-center">
        <BrandPill />
        <h1 className="mb-3 text-2xl leading-tight font-bold tracking-tight md:text-[2.125rem]">
          {t("title")}
        </h1>
        <p className="mb-6 text-body text-muted-foreground">{t("subline")}</p>
        <div className="flex w-full max-w-xl items-start gap-2 text-left">
          <form
            action={`/${locale}/builders`}
            method="get"
            role="search"
            className="relative flex-1"
          >
            {Object.entries(base)
              .filter(([k, v]) => k !== "q" && v)
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <input
              name="q"
              defaultValue={q}
              maxLength={60}
              aria-label={t("search")}
              placeholder={t("searchPh")}
              className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-xs placeholder:text-faint focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </form>
          <Link
            href="/dashboard/profile"
            aria-label={t("createProfile")}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-3.5"
          >
            <UserPlusIcon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t("createProfile")}</span>
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <p className="mb-2 hidden text-3xs font-semibold tracking-wider text-faint uppercase lg:block">
            {t("filters")}
          </p>
          <input
            type="checkbox"
            id="builder-filters-toggle"
            defaultChecked={activeFilters > 0}
            className="peer sr-only"
          />
          <label
            htmlFor="builder-filters-toggle"
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
          {filterForm}
        </aside>

        <section>
          <p className="mb-3 text-caption text-muted-foreground tabular-nums">
            {t("found", { count: total })}
          </p>
          {rows.length === 0 ? (
            <div className="space-y-2 rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              <p>{t("empty")}</p>
              {(activeFilters > 0 || q) && (
                <Link
                  href="/builders"
                  className="text-brand-text hover:underline"
                >
                  {t("clearFilters")}
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((b) => (
                <li key={b.id}>
                  <BuilderCard builder={b} thbPerUsd={thbPerUsd} />
                </li>
              ))}
            </ul>
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
