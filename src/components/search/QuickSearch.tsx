"use client";

import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { CATEGORY_LIST, getCategory } from "@/lib/config/categories";
import { localizedName } from "@/lib/config/localized";
import { highlightParts } from "@/lib/search-text";
import { cn } from "@/lib/utils";
import { StartupLogo } from "../StartupBits";

type StartupHit = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  logo: string | null;
  source: string | null;
};
type VocabHit = { slug: string; label: string; sub?: string };
type Results = {
  q: string;
  startups: StartupHit[];
  categories: VocabHit[];
  provinces: VocabHit[];
};
type Option = {
  key: string;
  href: string;
  group: "startups" | "categories" | "provinces" | "all";
};

const TOP_CATEGORIES = CATEGORY_LIST.slice(0, 8);

function Highlight({ text, q }: { text: string; q: string }) {
  return (
    <>
      {highlightParts(text, q).map((p, i) =>
        p.match ? (
          <mark key={i} className="rounded-sm bg-brand/20 text-foreground">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Design.md §5 QuickSearch (spec 6.8): one search box for the hero, the bottom section and the
 * "/" shortcut. Searches as you type (200 ms debounce, stale requests aborted), grouped results,
 * keyboard navigation, opens upward near the page bottom, full-screen sheet on phones.
 */
export function QuickSearch({
  defaultValue = "",
  autoFocus = false,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("Search");
  const nav = useTranslations("Nav");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [up, setUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [active, setActive] = useState(-1);

  // Debounced fetch; an older request is aborted when the user keeps typing.
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?${new URLSearchParams({ q: q.trim(), locale })}`,
          { signal: ctrl.signal },
        );
        if (res.ok) setResults((await res.json()) as Results);
      } catch {
        // aborted or offline: keep the previous results
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, open, locale]);

  // The full-screen sheet owns the scroll while it is open.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  // Click outside closes (the sheet has its own close button).
  useEffect(() => {
    if (!open || sheet) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, sheet]);

  function openPanel() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setUp(window.innerHeight - rect.bottom < 440);
    if (window.innerWidth < 640) setSheet(true);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setSheet(false);
    setActive(-1);
  }

  const query = q.trim();
  const showResults = results && results.q === query;
  const options: Option[] = [];
  if (showResults) {
    for (const s of results.startups)
      options.push({
        key: `s-${s.id}`,
        href: `/startup/${s.slug}`,
        group: "startups",
      });
    for (const c of results.categories)
      options.push({
        key: `c-${c.slug}`,
        href: `/category/${c.slug}`,
        group: "categories",
      });
    for (const p of results.provinces)
      options.push({
        key: `p-${p.slug}`,
        href: `/province/${p.slug}`,
        group: "provinces",
      });
    if (query)
      options.push({
        key: "all",
        href: `/startups?q=${encodeURIComponent(query)}`,
        group: "all",
      });
  }
  const optId = (i: number) => `${listId}-opt-${i}`;
  const go = (href: string) => {
    close();
    router.push(href);
  };

  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(optId(active))
        ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optId is stable per render
  }, [active]);

  const hasAny =
    showResults &&
    (results.startups.length > 0 ||
      results.categories.length > 0 ||
      results.provinces.length > 0);

  const input = (
    <input
      ref={inputRef}
      name="q"
      role="combobox"
      aria-expanded={open}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? optId(active) : undefined}
      aria-label={nav("search")}
      autoComplete="off"
      maxLength={60}
      value={q}
      autoFocus={autoFocus}
      placeholder={t("placeholder")}
      onFocus={openPanel}
      onChange={(e) => {
        setQ(e.target.value);
        setActive(-1);
        if (!open) openPanel();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!open) openPanel();
          setActive((a) => Math.min(options.length - 1, a + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => Math.max(-1, a - 1));
        } else if (e.key === "Enter" && active >= 0 && options[active]) {
          e.preventDefault();
          go(options[active].href);
        } else if (e.key === "Escape") {
          close();
          inputRef.current?.blur();
        }
      }}
      className="h-9 w-full rounded-md border border-input bg-card pr-10 pl-9 text-xs placeholder:text-faint focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    />
  );

  let index = -1;
  const row = (
    group: Option["group"],
    content: React.ReactNode,
    href: string,
  ) => {
    index++;
    const i = index;
    return (
      <li
        key={options[i]?.key ?? href}
        id={optId(i)}
        role="option"
        aria-selected={i === active}
        onMouseEnter={() => setActive(i)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => go(href)}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5",
          i === active && "bg-accent",
          group === "all" && "text-caption font-medium text-brand-text",
        )}
      >
        {content}
      </li>
    );
  };
  const header = (label: string) => (
    <li
      role="presentation"
      className="px-2 pt-2 pb-1 text-3xs font-semibold tracking-wider text-faint uppercase"
    >
      {label}
    </li>
  );

  const panelBody = (
    <ul id={listId} role="listbox" aria-label={nav("search")}>
      {!showResults || loading ? (
        Array.from({ length: 3 }, (_, i) => (
          <li
            key={i}
            role="presentation"
            className="flex items-center gap-2.5 px-2 py-1.5"
          >
            <span className="size-7 animate-pulse rounded-md bg-muted" />
            <span className="h-3 flex-1 animate-pulse rounded bg-muted" />
          </li>
        ))
      ) : (
        <>
          {results.startups.length > 0 &&
            header(query ? t("groupStartups") : t("popular"))}
          {results.startups.map((s) =>
            row(
              "startups",
              <>
                <StartupLogo
                  name={s.name}
                  src={s.logo}
                  size={28}
                  className="rounded-md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="truncate">
                      <Highlight text={s.name} q={query} />
                    </span>
                    {s.source && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-2xs font-normal text-positive">
                        <BadgeCheckIcon className="size-3" aria-hidden="true" />
                        {s.source}
                      </span>
                    )}
                  </span>
                  {s.tagline && (
                    <span className="block truncate text-2xs text-muted-foreground">
                      {s.tagline}
                    </span>
                  )}
                </span>
              </>,
              `/startup/${s.slug}`,
            ),
          )}
          {results.categories.length > 0 && header(t("groupCategories"))}
          {results.categories.map((c) => {
            const Icon = getCategory(c.slug)?.icon ?? TagIcon;
            return row(
              "categories",
              <>
                <span className="flex size-7 items-center justify-center rounded-md border bg-secondary">
                  <Icon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-xs">
                  <Highlight text={c.label} q={query} />
                </span>
              </>,
              `/category/${c.slug}`,
            );
          })}
          {results.provinces.length > 0 && header(t("groupProvinces"))}
          {results.provinces.map((p) =>
            row(
              "provinces",
              <>
                <span className="flex size-7 items-center justify-center rounded-md border bg-secondary">
                  <MapPinIcon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-xs">
                  <Highlight text={p.label} q={query} />
                  {p.sub && (
                    <span className="ml-1.5 text-2xs text-faint">{p.sub}</span>
                  )}
                </span>
              </>,
              `/province/${p.slug}`,
            ),
          )}
          {query && !hasAny && (
            <li
              role="presentation"
              className="px-2 py-3 text-caption text-muted-foreground"
            >
              {t("noResults", { q: query })}{" "}
              <Link
                href="/new"
                onClick={close}
                className="text-brand-text hover:underline"
              >
                {t("addFirst")}
              </Link>
            </li>
          )}
          {query &&
            row(
              "all",
              <>{t("seeAll", { q: query })} →</>,
              `/startups?q=${encodeURIComponent(query)}`,
            )}
          {!query && (
            <li
              role="presentation"
              className="flex flex-wrap gap-1.5 px-2 pt-2 pb-1"
            >
              {TOP_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  onClick={close}
                  className="rounded-full border bg-secondary px-2.5 py-0.5 text-2xs text-muted-foreground hover:text-foreground"
                >
                  {localizedName(c, locale)}
                </Link>
              ))}
            </li>
          )}
        </>
      )}
    </ul>
  );

  return (
    // Mobile: the same element becomes the full-screen sheet (no remount, so the input keeps the
    // focus from the user's tap and the phone keyboard stays open).
    <div
      ref={rootRef}
      role={sheet ? "dialog" : undefined}
      aria-modal={sheet || undefined}
      aria-label={sheet ? nav("search") : undefined}
      className={cn(
        sheet
          ? "fixed inset-0 z-50 flex flex-col bg-background p-3"
          : "relative w-full",
      )}
    >
      <div className="flex items-center gap-2">
        {sheet && (
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
          </button>
        )}
        <form
          action={`/${locale}/startups`}
          method="get"
          role="search"
          className="relative flex-1"
        >
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          {input}
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-sm border bg-secondary px-1.5 text-2xs text-muted-foreground sm:inline"
          >
            /
          </kbd>
        </form>
      </div>

      {open && (
        <div
          className={cn(
            "text-left",
            sheet
              ? "mt-2 min-h-0 flex-1 overflow-y-auto"
              : cn(
                  "absolute inset-x-0 z-30 max-h-[420px] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg",
                  up ? "bottom-full mb-2" : "top-full mt-2",
                ),
          )}
        >
          {panelBody}
        </div>
      )}
    </div>
  );
}

/** "+ เพิ่ม Startup" next to the search box. */
export function AddStartupButton() {
  const nav = useTranslations("Nav");
  return (
    <Link
      href="/new"
      aria-label={nav("addStartup")}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-3.5"
    >
      <PlusIcon className="size-3.5" aria-hidden="true" />
      <span className="hidden sm:inline">{nav("addStartup")}</span>
    </Link>
  );
}
