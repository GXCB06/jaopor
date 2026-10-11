// Anonymous projects (Design.md §5 Anonymous projects; migration 20261011126000_anonymous_mode).
// While a project is anonymous its public row only holds placeholders: name "Anonymous", slug
// "anon-<10 hex>", no logo or links. The real identity is readable by its owner only
// (public.startup_identity). The slug shape is reserved for anonymous projects, so the UI can
// recognise one from any row, embed or search result without an extra column.

export const ANON_NAME = "Anonymous";
const ANON_SLUG = /^anon-[0-9a-f]{10}$/;

export function isAnonymousSlug(slug: string | null | undefined): boolean {
  return !!slug && ANON_SLUG.test(slug);
}

/** What an anonymous project hides from visitors (the owner still sees and edits all of it). */
export const ANONYMOUS_HIDES = [
  "name",
  "logo",
  "links",
  "screenshots",
  "demoVideo",
  "oldUrls",
] as const;

const CONSONANTS = "bdfgklmnprstvz";
const VOWELS = "aeiou";

/**
 * A made-up word shown blurred in place of an anonymous project's name (TrustMRR-style "hidden"
 * look). Built only from the random slug, so it carries nothing of the real name; the same
 * project always gets the same shape.
 */
export function anonymousMask(slug: string): string {
  const hex = slug.replace(/^anon-/, "") || "0";
  const digit = (i: number) => parseInt(hex[i % hex.length], 16) || 0;
  const length = 6 + (digit(0) % 5);
  let word = "";
  for (let i = 0; i < length; i++)
    word +=
      i % 2
        ? VOWELS[digit(i + 1) % VOWELS.length]
        : CONSONANTS[digit(i + 1) % CONSONANTS.length];
  return word[0].toUpperCase() + word.slice(1);
}
