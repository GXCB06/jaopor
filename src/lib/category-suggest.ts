// Category suggestion from a pasted website (owner-approved 2026-10-12): the wizard shows it as a
// one-click chip, never as a preselected value (UX audit M-9: a default category silently
// miscategorised projects). Pure keyword part; the AI part lives in the preview route.

import { CATEGORY_ALIASES } from "./config/category-aliases";
import { CATEGORY_LIST, type Category } from "./config/categories";
import { normalizeSearch } from "./search-text";

/** Latin words shorter than 4 letters are too ambiguous ("app", "ai" inside other words); Thai
 *  words are short in letters ("เกม"), so 3 is enough. */
const longEnough = (w: string) => w.length >= (/[฀-๿]/.test(w) ? 3 : 4);

const WORDS: { slug: Category; words: string[] }[] = CATEGORY_LIST.filter(
  (c) => c.slug !== "other",
).map((c) => ({
  slug: c.slug,
  words: [
    ...new Set(
      `${c.nameTh} ${c.nameEn} ${CATEGORY_ALIASES[c.slug] ?? ""}`
        .split(/[\s/]+/)
        .map(normalizeSearch)
        .filter(longEnough),
    ),
  ],
}));

/** The category whose words appear most in the text, or null when none clearly does. */
export function keywordCategory(text: string): Category | null {
  const hay = normalizeSearch(text);
  if (!hay) return null;
  let best: { slug: Category; score: number } | null = null;
  let tie = false;
  for (const { slug, words } of WORDS) {
    const score = words.filter((w) => hay.includes(w)).length;
    if (!score || (best && score < best.score)) continue;
    tie = best !== null && score === best.score;
    if (!tie) best = { slug, score };
  }
  // Two categories equally likely: no suggestion beats a wrong one.
  return tie ? null : (best?.slug ?? null);
}

/**
 * Which category the wizard shows after a website preview resolves (Issue 2). A category the
 * founder chose always wins, even when the preview lands later; otherwise a confident suggestion
 * pre-fills the field, and an unusable (null) suggestion leaves whatever is there untouched.
 */
export function resolveCategory(
  current: string,
  suggestion: string | null,
  userChose: boolean,
): string {
  if (userChose) return current;
  return suggestion ?? current;
}
