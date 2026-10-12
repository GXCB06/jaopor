import { routing } from "@/i18n/routing";

// Search metadata shared by every public page (product audit 2026-10-12, Design.md §4 SEO): the
// canonical URL plus its Thai / English twins, so search engines show the right language and don't
// treat /th and /en as duplicates. Paths are relative; the layout's metadataBase makes them absolute.

/** `alternates` for a page at `path` (no locale, starting with "/" or ""). */
export function localeAlternates(locale: string, path: string) {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}${path}`]),
  );
  languages["x-default"] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}

/** Pages with nothing on them yet (a category or province with 0 projects): followed, not indexed. */
export const EMPTY_PAGE_ROBOTS = { index: false, follow: true } as const;
