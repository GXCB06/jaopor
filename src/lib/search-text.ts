// Spec 6.8 QuickSearch text matching for the config vocabularies (categories, provinces) and the
// match highlighting. Thai tone marks / vowel signs don't block a match ("เชียงใหม" finds
// "เชียงใหม่"), case and punctuation are ignored, and slugs match too ("mukda" → มุกดาหาร).
import { CATEGORY_LIST } from "./config/categories";
import { localizedName } from "./config/localized";
import { PROVINCE_LIST, getRegion } from "./config/provinces";

export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯัิ-ฺ็-๎]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export type VocabHit = { slug: string; label: string; sub?: string };

function rank(q: string, fields: string[]): number {
  let best = -1;
  for (const f of fields) {
    const n = normalizeSearch(f);
    if (!n) continue;
    if (n === q) return 3;
    if (n.startsWith(q)) best = Math.max(best, 2);
    else if (n.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

function search<T>(
  q: string,
  list: readonly T[],
  fields: (item: T) => string[],
  toHit: (item: T) => VocabHit,
  max: number,
): VocabHit[] {
  const n = normalizeSearch(q);
  if (!n) return [];
  return list
    .map((item) => ({ item, r: rank(n, fields(item)) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => b.r - a.r)
    .slice(0, max)
    .map((x) => toHit(x.item));
}

export function searchCategories(
  q: string,
  locale: string,
  max = 4,
): VocabHit[] {
  return search(
    q,
    CATEGORY_LIST,
    (c) => [c.nameTh, c.nameEn, c.slug],
    (c) => ({ slug: c.slug, label: localizedName(c, locale) }),
    max,
  );
}

export function searchProvinces(
  q: string,
  locale: string,
  max = 4,
): VocabHit[] {
  return search(
    q,
    PROVINCE_LIST,
    (p) => [p.nameTh, p.nameEn, p.slug],
    (p) => ({
      slug: p.slug,
      label: localizedName(p, locale),
      sub: localizedName(getRegion(p.region), locale),
    }),
    max,
  );
}

/**
 * Split `text` around the first case-insensitive occurrence of `q` for <mark> highlighting.
 * Plain substring only (what the user sees typed); no match → one unhighlighted part.
 */
export function highlightParts(
  text: string,
  q: string,
): { text: string; match: boolean }[] {
  const needle = q.trim().toLowerCase();
  const i = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (i < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, i), match: false },
    { text: text.slice(i, i + needle.length), match: true },
    { text: text.slice(i + needle.length), match: false },
  ].filter((p) => p.text);
}
